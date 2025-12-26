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



