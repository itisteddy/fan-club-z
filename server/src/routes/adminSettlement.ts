import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { submitFinalizeTx } from '../services/relayer';
import { computeMerkleSettlementCryptoOnly, recordOnchainPosted, resolveTreasuryUserId } from './settlement';

export const adminSettlement = Router();

function requireAdmin(req: any, res: any, next: any) {
  const adminKey = req.headers['x-admin-key'] || req.headers['authorization'];
  if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Admin key required', version: VERSION });
  }
  return next();
}

async function audit(actorId: string, action: string, targetId?: string, meta?: any) {
  try {
    await supabase.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      target_id: targetId || null,
      meta: meta || null,
    } as any);
  } catch (e) {
    console.warn('[adminSettlement] audit insert failed (non-fatal):', e);
  }
}

const FinalizeParams = z.object({
  actorId: z.string().uuid(),
});

// POST /api/v2/admin/settlement/:predictionId/finalize
adminSettlement.post('/:predictionId/finalize', requireAdmin, async (req, res) => {
  const predictionId = req.params.predictionId;
  const parsed = FinalizeParams.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid payload', details: parsed.error.issues, version: VERSION });
  }
  const actorId = parsed.data.actorId;

  // Create or load job (prevent duplicates for queued/running)
  const { data: existingJob } = await supabase
    .from('settlement_finalize_jobs')
    .select('*')
    .eq('prediction_id', predictionId)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let jobId = (existingJob as any)?.id as string | undefined;
  if (!jobId) {
    const { data: created, error: createErr } = await supabase
      .from('settlement_finalize_jobs')
      .insert({ prediction_id: predictionId, requested_by: actorId, status: 'queued' } as any)
      .select('id')
      .single();
    if (createErr || !created?.id) {
      return res.status(500).json({ error: 'Internal', message: 'Failed to create finalize job', version: VERSION });
    }
    jobId = created.id as any;
  }

  // Mark running
  await supabase.from('settlement_finalize_jobs').update({ status: 'running', updated_at: new Date().toISOString() } as any).eq('id', jobId);

  try {
    // Load prediction + settlement
    const { data: pred } = await supabase
      .from('predictions')
      .select('id,title,creator_id,winning_option_id')
      .eq('id', predictionId)
      .maybeSingle();
    const { data: betSettlement } = await supabase
      .from('bet_settlements')
      .select('bet_id,winning_option_id,status,meta')
      .eq('bet_id', predictionId)
      .maybeSingle();

    const winningOptionId = (pred?.winning_option_id || (betSettlement as any)?.winning_option_id) as string | null;
    if (!winningOptionId) throw new Error('Prediction has no winning option');

    // Compute crypto-only merkle
    const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId });

    // Resolve treasury wallet address (must be an EVM address registered in crypto_addresses)
    const treasuryUserId = await resolveTreasuryUserId();
    if (!treasuryUserId) {
      throw new Error('Platform treasury is not configured');
    }
    const { data: treasuryAddr } = await supabase
      .from('crypto_addresses')
      .select('address')
      .eq('user_id', treasuryUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!treasuryAddr?.address) {
      throw new Error('Platform treasury address missing');
    }

    if (!pred) {
      throw new Error('Prediction not found');
    }

    const { data: creatorAddrRow } = await supabase
      .from('crypto_addresses')
      .select('address')
      .eq('user_id', pred.creator_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!creatorAddrRow?.address) {
      throw new Error('Creator wallet address missing');
    }

    // Ensure a bet_settlements row exists so claimable flow can rely on status='onchain_posted'
    await supabase
      .from('bet_settlements')
      .upsert(
        {
          bet_id: predictionId,
          winning_option_id: winningOptionId,
          total_payout: settlement.payoutPoolUSD,
          platform_fee_collected: settlement.platformFeeUSD,
          creator_payout_amount: settlement.creatorFeeUSD,
          settlement_time: new Date().toISOString(),
          status: 'pending_onchain',
          meta: {
            merkle_root: settlement.root,
            winners: settlement.winners.length,
          },
        } as any,
        { onConflict: 'bet_id' } as any
      );

    // Submit on-chain finalize via relayer
    const { txHash } = await submitFinalizeTx({
      predictionId,
      merkleRoot: settlement.root,
      creatorAddress: creatorAddrRow.address as any,
      creatorFeeUnits: BigInt(settlement.creatorFeeUnits.toString()),
      platformAddress: treasuryAddr.address as any,
      platformFeeUnits: BigInt(settlement.platformFeeUnits.toString()),
    });

    // Persist on-chain posted status + run demo off-chain payouts (idempotent) + record fee activity
    await recordOnchainPosted({ predictionId, txHash, root: settlement.root });

    await supabase
      .from('settlement_finalize_jobs')
      .update({ status: 'finalized', tx_hash: txHash, error: null, updated_at: new Date().toISOString() } as any)
      .eq('id', jobId);

    await audit(actorId, 'settlement_finalize', predictionId, { tx_hash: txHash });

    return res.json({ success: true, status: 'finalized', txHash, version: VERSION });
  } catch (e: any) {
    const msg = String(e?.message || e || 'Finalize failed').slice(0, 500);
    await supabase
      .from('settlement_finalize_jobs')
      .update({ status: 'failed', error: msg, updated_at: new Date().toISOString() } as any)
      .eq('id', jobId);
    await audit(actorId, 'settlement_finalize_failed', predictionId, { error: msg });
    return res.status(500).json({ error: 'Internal', message: 'Finalization failed', version: VERSION });
  }
});

// GET /api/v2/admin/settlement/:predictionId/finalize/status
adminSettlement.get('/:predictionId/finalize/status', requireAdmin, async (req, res) => {
  const predictionId = req.params.predictionId;
  const { data } = await supabase
    .from('settlement_finalize_jobs')
    .select('*')
    .eq('prediction_id', predictionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return res.json({ success: true, job: data || null, version: VERSION });
});

// POST /api/v2/admin/settlement/:predictionId/finalize/retry
adminSettlement.post('/:predictionId/finalize/retry', requireAdmin, async (req, res) => {
  const predictionId = req.params.predictionId;
  const parsed = FinalizeParams.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid payload', details: parsed.error.issues, version: VERSION });
  }
  const actorId = parsed.data.actorId;

  const { data: job } = await supabase
    .from('settlement_finalize_jobs')
    .select('*')
    .eq('prediction_id', predictionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job || (job as any).status !== 'failed') {
    return res.status(400).json({ error: 'Bad Request', message: 'Can only retry a failed job', version: VERSION });
  }

  await supabase
    .from('settlement_finalize_jobs')
    .update({ status: 'queued', error: null, updated_at: new Date().toISOString() } as any)
    .eq('id', (job as any).id);

  await audit(actorId, 'settlement_finalize_retry', predictionId, null);

  // Do not auto-run here; admin can call finalize endpoint again (explicit)
  return res.json({ success: true, status: 'queued', version: VERSION });
});

// POST /api/v2/admin/settlement/disputes/:disputeId/resolve
// Admin resolves a dispute (accept/dismiss)
const ResolveDisputeParams = z.object({
  actorId: z.string().uuid(),
  resolution: z.enum(['resolved', 'dismissed']),
  resolutionReason: z.string().min(1).max(1000).optional(),
});

adminSettlement.post('/disputes/:disputeId/resolve', requireAdmin, async (req, res) => {
  const { disputeId } = req.params;
  const parsed = ResolveDisputeParams.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'Invalid payload', details: parsed.error.issues, version: VERSION });
  }
  const { actorId, resolution, resolutionReason } = parsed.data;

  // Get the dispute
  const { data: dispute, error: disputeErr } = await supabase
    .from('settlement_validations')
    .select('id, prediction_id, user_id, action, status')
    .eq('id', disputeId)
    .single();

  if (disputeErr || !dispute) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Dispute not found', version: VERSION });
  }

  if ((dispute as any).action !== 'dispute') {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'This is not a dispute', version: VERSION });
  }

  if ((dispute as any).status !== 'pending') {
    return res.status(409).json({ code: 'INVALID_STATE', message: 'Dispute already resolved', version: VERSION });
  }

  // Update the dispute
  const { error: updateErr } = await supabase
    .from('settlement_validations')
    .update({
      status: resolution,
      resolution_reason: resolutionReason || null,
      resolved_by: actorId,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', disputeId);

  if (updateErr) {
    console.error('Error resolving dispute:', updateErr);
    return res.status(500).json({ code: 'INTERNAL', message: 'Failed to resolve dispute', version: VERSION });
  }

  // Check if there are other pending disputes for this prediction
  const { data: otherDisputes } = await supabase
    .from('settlement_validations')
    .select('id')
    .eq('prediction_id', (dispute as any).prediction_id)
    .eq('action', 'dispute')
    .eq('status', 'pending');

  // If no more pending disputes, clear the flag on the prediction
  if (!otherDisputes || otherDisputes.length === 0) {
    await supabase
      .from('predictions')
      .update({ has_pending_dispute: false, updated_at: new Date().toISOString() } as any)
      .eq('id', (dispute as any).prediction_id);
  }

  await audit(actorId, 'dispute_resolved', disputeId, { resolution, resolutionReason });

  return res.json({ success: true, status: resolution, version: VERSION });
});

// GET /api/v2/admin/settlement/disputes - List all pending disputes across predictions
adminSettlement.get('/disputes', requireAdmin, async (req, res) => {
  const status = (req.query.status as string) || 'pending';
  const limit = parseInt(req.query.limit as string || '50', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const { data: disputes, error } = await supabase
    .from('settlement_validations')
    .select(`
      id, prediction_id, user_id, action, reason, proof_url, status, 
      resolution_reason, resolved_at, resolved_by, created_at, updated_at
    `)
    .eq('action', 'dispute')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // Handle table doesn't exist gracefully
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return res.json({ success: true, data: { disputes: [], total: 0 }, version: VERSION });
    }
    return res.status(500).json({ code: 'INTERNAL', message: 'Failed to fetch disputes', version: VERSION });
  }

  // Get user info for disputes
  const userIds = [...new Set((disputes || []).map((d: any) => d.user_id).filter(Boolean))];
  let usersMap: Record<string, { username?: string; full_name?: string }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, username, full_name').in('id', userIds);
    if (users) {
      usersMap = Object.fromEntries(users.map((u: any) => [u.id, { username: u.username, full_name: u.full_name }]));
    }
  }

  // Get prediction info for disputes
  const predictionIds = [...new Set((disputes || []).map((d: any) => d.prediction_id).filter(Boolean))];
  let predictionsMap: Record<string, { title?: string }> = {};
  if (predictionIds.length > 0) {
    const { data: predictions } = await supabase.from('predictions').select('id, title').in('id', predictionIds);
    if (predictions) {
      predictionsMap = Object.fromEntries(predictions.map((p: any) => [p.id, { title: p.title }]));
    }
  }

  const enrichedDisputes = (disputes || []).map((d: any) => ({
    ...d,
    user: usersMap[d.user_id] || null,
    prediction: predictionsMap[d.prediction_id] || null,
  }));

  return res.json({ success: true, data: { disputes: enrichedDisputes, total: enrichedDisputes.length }, version: VERSION });
});

