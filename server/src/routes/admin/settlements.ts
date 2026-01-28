import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction, getFallbackAdminActorId } from './audit';
import { settleDemoRail } from '../settlement';
import { createNotification } from '../../services/notifications';

export const settlementsRouter = Router();

function isSchemaMismatch(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return (
    code === '42703' || // undefined_column
    code === '42P01' || // undefined_table
    code === 'PGRST200' ||
    msg.includes('does not exist') ||
    msg.toLowerCase().includes('schema cache') ||
    msg.toLowerCase().includes('could not find the')
  );
}

const SyncSchema = z.object({
  actorId: z.string().uuid().optional(),
  note: z.string().optional(),
});

/**
 * POST /api/v2/admin/settlements/:predictionId/sync
 * Best-effort idempotent sync:
 * - if outcome set and prediction not marked settled, mark settled (no payout math changes here)
 * - ensure a settlement_finalize_jobs row exists (queued) so existing workers can process
 */
settlementsRouter.post('/:predictionId/sync', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = SyncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId: providedActorId, note } = parsed.data;

    const { data: pred, error: predErr } = await supabase
      .from('predictions')
      .select('id, title, status, winning_option_id, settled_at, resolution_date, creator_id, platform_fee_percentage, creator_fee_percentage')
      .eq('id', predictionId)
      .maybeSingle();

    if (predErr || !pred) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    // actorId is optional in admin-key-only mode; use creator_id for required uuid fields.
    const auditActorId = providedActorId || getFallbackAdminActorId();
    const requestedBy = auditActorId || ((pred as any).creator_id as string | undefined) || null;

    const hasOutcome = Boolean((pred as any).winning_option_id);
    if (!hasOutcome) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot sync settlement without an outcome (winning_option_id)',
        version: VERSION,
      });
    }

    const isAlreadySettled = Boolean((pred as any).settled_at || (pred as any).resolution_date) || String((pred as any).status || '').toLowerCase() === 'settled';
    
    // Apply offchain settlement (demo rail) if not already settled (idempotent via external_ref in settleDemoRail)
    if (!isAlreadySettled) {
      await supabase
        .from('predictions')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          resolution_date: new Date().toISOString(),
        } as any)
        .eq('id', predictionId);

      // Call settlement logic to apply demo payouts/fees (idempotent)
      try {
        await settleDemoRail({
          predictionId,
          predictionTitle: (pred as any).title,
          winningOptionId: (pred as any).winning_option_id,
          creatorId: ((pred as any).creator_id || ''),
          platformFeePercent: ((pred as any).platform_fee_percentage || 2.5),
          creatorFeePercent: ((pred as any).creator_fee_percentage || 1.0),
        });
      } catch (settleErr) {
        console.error('[Admin/Settlements] Demo settlement failed during sync:', settleErr);
        // Continue anyway - queue the finalize job so it can be retried
      }
    }

    // Ensure a finalize job exists (idempotent upsert)
    // Ensure a finalize job exists (idempotent upsert). requested_by is best-effort.
    await supabase
      .from('settlement_finalize_jobs')
      .upsert(
        {
          prediction_id: predictionId,
          requested_by: requestedBy,
          status: 'queued',
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'prediction_id' } as any
      );

    if (auditActorId) {
      await logAdminAction({
        actorId: auditActorId,
        action: 'admin_settlement_sync',
        targetType: 'prediction',
        targetId: predictionId,
        reason: note || undefined,
        meta: {
          alreadySettled: isAlreadySettled,
          winningOptionId: (pred as any).winning_option_id,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Settlement sync queued',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Sync error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync settlement',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements/queue
 * Finalize Queue for admin attention:
 * - closed and needs outcome
 * - needs offchain settlement sync
 * - needs onchain finalize
 */
settlementsRouter.get('/queue', async (req, res) => {
  try {
    const nowIso = new Date().toISOString();

    // Fetch recent predictions; filter in-memory (schema differs between environments)
    const EXT_SELECT =
      'id, title, status, entry_deadline, end_date, closed_at, settled_at, resolution_date, winning_option_id, created_at';
    const BASE_SELECT = 'id, title, status, entry_deadline, winning_option_id, created_at';

    const first = await supabase
      .from('predictions')
      .select(EXT_SELECT)
      .order('created_at', { ascending: false })
      .limit(500);
    let preds: any[] = (first.data as any[]) || [];
    let predErr: any = first.error;

    if (predErr && isSchemaMismatch(predErr)) {
      console.warn('[Admin/Settlements] Queue select schema mismatch, retrying with base select:', predErr);
      const fallback = await supabase
        .from('predictions')
        .select(BASE_SELECT)
        .order('created_at', { ascending: false })
        .limit(500);
      preds = (fallback.data as any[]) || [];
      predErr = fallback.error;
    }

    if (predErr) {
      console.error('[Admin/Settlements] Queue predictions query error:', predErr);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch settlement queue',
        version: VERSION,
      });
    }

    const predictionIds = (preds || []).map((p: any) => p.id);
    if (predictionIds.length === 0) {
      return res.json({ items: [], version: VERSION });
    }

    // Fetch bet_settlements and finalize jobs for these predictions
    const [{ data: settlements }, { data: jobs }, { data: entryRows }] = await Promise.all([
      supabase.from('bet_settlements').select('bet_id, status, meta').in('bet_id', predictionIds),
      supabase.from('settlement_finalize_jobs').select('prediction_id, status, tx_hash, error, updated_at').in('prediction_id', predictionIds),
      supabase.from('prediction_entries').select('prediction_id, provider').in('prediction_id', predictionIds),
    ]);

    const settlementMap: Record<string, any> = {};
    for (const s of settlements || []) {
      settlementMap[(s as any).bet_id] = s;
    }

    const jobMap: Record<string, any> = {};
    for (const j of jobs || []) {
      const pid = (j as any).prediction_id;
      // Keep the latest-ish record (no strict ordering here)
      jobMap[pid] = j;
    }

    const railsMap: Record<string, { hasDemo: boolean; hasCrypto: boolean }> = {};
    for (const r of entryRows || []) {
      const pid = (r as any).prediction_id as string;
      if (!railsMap[pid]) railsMap[pid] = { hasDemo: false, hasCrypto: false };
      const provider = String((r as any).provider || '');
      if (provider === 'demo-wallet') railsMap[pid].hasDemo = true;
      else railsMap[pid].hasCrypto = true;
    }

    const items = (preds || [])
      .filter((p: any) => {
        const status = String(p.status || '').toLowerCase();
        if (status === 'cancelled' || status === 'voided') return false;
        const closesAt = p.entry_deadline || p.end_date || null;
        const closedAt = p.closed_at || null;
        const isClosedByTime = closesAt ? String(closesAt) < nowIso : false;
        // Keep backend "closed" rules aligned with UI (`client/src/lib/predictionStatusUi.ts`)
        const isClosed =
          Boolean(closedAt) || status === 'closed' || status === 'awaiting_settlement' || isClosedByTime;
        if (!isClosed) return false;
        return true;
      })
      .map((p: any) => {
        const status = String(p.status || '').toLowerCase();
        const closesAt = p.entry_deadline || p.end_date || null;
        const closedAt = p.closed_at || null;
        const settledAt = p.settled_at || p.resolution_date || null;
        const isClosedByTime = closesAt ? String(closesAt) < nowIso : false;
        // Keep backend "closed" rules aligned with UI (`client/src/lib/predictionStatusUi.ts`)
        const isClosed =
          Boolean(closedAt) || status === 'closed' || status === 'awaiting_settlement' || isClosedByTime;
        const isSettled = Boolean(settledAt) || status === 'settled' || status === 'complete';
        const hasOutcome = Boolean(p.winning_option_id);

        const rails = railsMap[p.id] || { hasDemo: false, hasCrypto: false };
        const settlement = settlementMap[p.id] || null;
        const job = jobMap[p.id] || null;
        const hasMerkleRoot = Boolean(settlement?.meta?.merkle_root || settlement?.meta?.merkleRoot);

        const needsOutcome = isClosed && !hasOutcome;
        const needsOffchainSettlement = isClosed && hasOutcome && !isSettled;
        const needsOnchainFinalize =
          rails.hasCrypto &&
          (settlement?.status === 'pending_onchain' ||
            (hasMerkleRoot && String(job?.status || '') !== 'finalized'));

        return {
          predictionId: p.id,
          title: p.title,
          status: p.status,
          closesAt,
          closedAt,
          settledAt,
          settlementStatus: settlement?.status || null,
          rails,
          needs: {
            needsOutcome,
            needsOffchainSettlement,
            needsOnchainFinalize,
          },
          job: job
            ? {
                status: job.status,
                txHash: job.tx_hash || null,
                error: job.error || null,
                updatedAt: job.updated_at || null,
              }
            : null,
        };
      })
      .filter((i: any) => i.needs.needsOutcome || i.needs.needsOffchainSettlement || i.needs.needsOnchainFinalize);

    return res.json({ items, version: VERSION });
  } catch (error) {
    console.error('[Admin/Settlements] Queue error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch settlement queue',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements
 * List settlements with filtering
 */
settlementsRouter.get('/', async (req, res) => {
  try {
    const status = req.query.status as string || 'all';
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;

    // Get predictions that need settlement attention
    let query = supabase
      .from('predictions')
      .select(`
        id, title, status, created_at, end_date, resolution_date, winning_option_id,
        creator_id, platform_fee_percentage, creator_fee_percentage,
        users!predictions_creator_id_fkey(username, full_name)
      `, { count: 'exact' })
      .order('end_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Status filter (Note: DB uses 'open' not 'active' for active predictions)
    if (status === 'pending') {
      // Predictions past end date but not settled
      query = query.eq('status', 'open').lt('end_date', new Date().toISOString());
    } else if (status === 'settled') {
      query = query.eq('status', 'settled');
    } else if (status === 'active') {
      query = query.eq('status', 'open').gte('end_date', new Date().toISOString());
    }

    const { data: predictions, error, count } = await query;

    if (error) {
      console.error('[Admin/Settlements] Query error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch settlements',
        version: VERSION,
      });
    }

    // Get settlement jobs for these predictions
    const predictionIds = (predictions || []).map(p => p.id);
    const { data: jobs } = await supabase
      .from('settlement_finalize_jobs')
      .select('*')
      .in('prediction_id', predictionIds);

    const jobMap: Record<string, any> = {};
    for (const job of jobs || []) {
      jobMap[job.prediction_id] = job;
    }

    // Get entry counts
    const { data: entryCounts } = await supabase
      .from('prediction_entries')
      .select('prediction_id')
      .in('prediction_id', predictionIds);

    const entryCountMap: Record<string, number> = {};
    for (const e of entryCounts || []) {
      entryCountMap[e.prediction_id] = (entryCountMap[e.prediction_id] || 0) + 1;
    }

    return res.json({
      items: (predictions || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.created_at,
        endDate: p.end_date,
        resolutionDate: p.resolution_date,
        winningOptionId: p.winning_option_id,
        creatorId: p.creator_id,
        creatorUsername: p.users?.username || null,
        creatorName: p.users?.full_name || null,
        platformFee: p.platform_fee_percentage,
        creatorFee: p.creator_fee_percentage,
        entryCount: entryCountMap[p.id] || 0,
        settlementJob: jobMap[p.id] || null,
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch settlements',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements/stats
 * Get settlement statistics
 */
settlementsRouter.get('/stats', async (req, res) => {
  try {
    const now = new Date().toISOString();

    // Count by status
    // Note: DB uses 'open' not 'active' for active predictions
    const [
      { count: activeCount },
      // pending settlement is computed below (the old logic was wrong)
      { count: settledCount },
      { count: voidedCount },
    ] = await Promise.all([
      supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('status', 'settled'),
      supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('status', 'voided'),
    ]);

    // Pending settlements: closed/closed-by-time with no settlement yet (schema-tolerant)
    // Try extended select first, fall back to minimal if columns don't exist
    const EXT_SELECT = 'id, status, entry_deadline, end_date, closed_at, settled_at, resolution_date, winning_option_id';
    const BASE_SELECT = 'id, status, entry_deadline, end_date, winning_option_id';
    
    let predsRows: any[] = [];
    let predsError: any = null;
    
    const predsFirst = await supabase
      .from('predictions')
      .select(EXT_SELECT)
      .limit(5000);
    
    if (predsFirst.error && isSchemaMismatch(predsFirst.error)) {
      console.warn('[Admin/Settlements] Stats schema mismatch, trying base select:', predsFirst.error.message);
      const predsFallback = await supabase
        .from('predictions')
        .select(BASE_SELECT)
        .limit(5000);
      predsRows = (predsFallback.data as any[]) || [];
      predsError = predsFallback.error;
    } else {
      predsRows = (predsFirst.data as any[]) || [];
      predsError = predsFirst.error;
    }
    
    const pendingSettlement = predsRows.filter((p: any) => {
      const status = String(p.status || '').toLowerCase();
      if (status === 'voided' || status === 'cancelled') return false;

      const settledAt = p.settled_at || p.resolution_date || null;
      const isSettled = Boolean(settledAt) || status === 'settled' || status === 'complete';
      if (isSettled) return false;

      const closesAt = p.entry_deadline || p.end_date || null;
      const closedAt = p.closed_at || null;
      const isClosedByTime = closesAt ? String(closesAt) < now : false;
      // Keep backend "closed" rules aligned with UI (`client/src/lib/predictionStatusUi.ts`)
      const isClosed =
        Boolean(closedAt) || status === 'closed' || status === 'awaiting_settlement' || isClosedByTime;

      return isClosed;
    }).length;
    
    if (predsError) {
      console.error('[Admin/Settlements] Failed to fetch predictions for pending count:', predsError);
    }

    // Settlement job stats
    let jobStats: any[] = [];
    const jobRes = await supabase.from('settlement_finalize_jobs').select('status');
    if ((jobRes as any).error && isSchemaMismatch((jobRes as any).error)) {
      jobStats = [];
    } else {
      jobStats = (jobRes as any).data || [];
    }

    const jobCounts = {
      queued: 0,
      running: 0,
      finalized: 0,
      failed: 0,
    };
    for (const j of jobStats || []) {
      if (j.status in jobCounts) {
        jobCounts[j.status as keyof typeof jobCounts]++;
      }
    }

    // Total stake across all predictions
    const { data: stakeData } = await supabase
      .from('prediction_entries')
      .select('amount');
    const totalStake = (stakeData || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Recent settlements (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentSettlements } = await supabase
      .from('predictions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'settled')
      .gte('resolution_date', weekAgo);

    return res.json({
      predictions: {
        active: activeCount || 0,
        pendingSettlement,
        settled: settledCount || 0,
        voided: voidedCount || 0,
      },
      jobs: jobCounts,
      totalStake,
      recentSettlements: recentSettlements || 0,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Stats error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch stats',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements/finalize-queue
 * Get predictions that are settled off-chain but not finalized on-chain
 */
settlementsRouter.get('/finalize-queue', async (req, res) => {
  try {
    // actorId optional in admin-key-only mode

    // Get predictions that are settled but don't have finalized on-chain status
    const { data: settledPredictions, error: predError } = await supabase
      .from('predictions')
      .select(`
        id, title, status, settled_at, winning_option_id, creator_id,
        users!predictions_creator_id_fkey(username, full_name)
      `)
      .eq('status', 'settled')
      .order('settled_at', { ascending: false })
      .limit(100);

    if (predError) {
      console.error('[Admin/Settlements] Finalize queue query error:', predError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch finalize queue',
        version: VERSION,
      });
    }

    // Get bet_settlements to check merkle root and status
    const predictionIds = (settledPredictions || []).map(p => p.id);
    const { data: settlements } = await supabase
      .from('bet_settlements')
      .select('bet_id, status, meta')
      .in('bet_id', predictionIds);

    const settlementMap: Record<string, any> = {};
    for (const s of settlements || []) {
      settlementMap[s.bet_id] = s;
    }

    // Get finalize jobs
    const { data: jobs } = await supabase
      .from('settlement_finalize_jobs')
      .select('prediction_id, status, tx_hash, error, created_at')
      .in('prediction_id', predictionIds)
      .order('created_at', { ascending: false });

    const jobMap: Record<string, any> = {};
    for (const j of jobs || []) {
      if (!jobMap[j.prediction_id]) {
        jobMap[j.prediction_id] = j;
      }
    }

    // Filter to only those that need finalization (have crypto entries or merkle root but not finalized)
    const queue = (settledPredictions || [])
      .filter((p: any) => {
        const settlement = settlementMap[p.id];
        const job = jobMap[p.id];
        // Include if:
        // 1. Has merkle root in settlement meta (crypto rail exists)
        // 2. Settlement status is 'pending_onchain' or job status is not 'finalized'
        const hasMerkleRoot = settlement?.meta?.merkle_root || settlement?.meta?.merkleRoot;
        const needsFinalize = settlement?.status === 'pending_onchain' || 
                              (hasMerkleRoot && job?.status !== 'finalized');
        return needsFinalize;
      })
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        creatorId: p.creator_id,
        creatorUsername: p.users?.username || null,
        creatorName: p.users?.full_name || null,
        settledAt: p.settled_at,
        winningOptionId: p.winning_option_id,
        merkleRoot: settlementMap[p.id]?.meta?.merkle_root || settlementMap[p.id]?.meta?.merkleRoot || null,
        settlementStatus: settlementMap[p.id]?.status || null,
        jobStatus: jobMap[p.id]?.status || null,
        jobTxHash: jobMap[p.id]?.tx_hash || null,
        jobError: jobMap[p.id]?.error || null,
        jobCreatedAt: jobMap[p.id]?.created_at || null,
      }));

    return res.json({
      items: queue,
      total: queue.length,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Finalize queue error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch finalize queue',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/settlements/:predictionId/finalize-onchain
 * Admin finalize on-chain settlement (uses relayer)
 */
settlementsRouter.post('/:predictionId/finalize-onchain', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const actorId = (req.body as any)?.actorId || getFallbackAdminActorId();
    const reason = (req.body as any)?.reason || 'Admin finalization';

    if (!actorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'actorId required (or configure ADMIN_USER_IDS for admin-key-only ops)',
        version: VERSION,
      });
    }

    // Check if relayer is configured
    if (!process.env.RELAYER_PRIVATE_KEY || !process.env.RELAYER_RPC_URL) {
      return res.status(500).json({
        error: 'Relayer not configured',
        message: 'RELAYER_PRIVATE_KEY and RELAYER_RPC_URL must be set',
        version: VERSION,
      });
    }

    // Import relayer and settlement functions
    const { submitFinalizeTx } = await import('../../services/relayer');
    const { computeMerkleSettlementCryptoOnly, recordOnchainPosted, resolveTreasuryUserId } = await import('../settlement');

    // Get prediction
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, title, creator_id, winning_option_id, status')
      .eq('id', predictionId)
      .maybeSingle();

    if (predError || !prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    if (prediction.status !== 'settled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction must be settled before finalization',
        version: VERSION,
      });
    }

    const winningOptionId = prediction.winning_option_id;
    if (!winningOptionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction must have a winning option',
        version: VERSION,
      });
    }

    // Compute merkle settlement (crypto rail only)
    const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId });

    // Get creator address
    const { data: creatorAddrRow } = await supabase
      .from('wallet_addresses')
      .select('address')
      .eq('user_id', prediction.creator_id)
      .eq('chain_id', 84532)
      .maybeSingle();

    if (!creatorAddrRow?.address) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Creator wallet address not found',
        version: VERSION,
      });
    }

    // Get treasury address
    const treasuryUserId = await resolveTreasuryUserId();
    if (!treasuryUserId) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Treasury user not configured',
        version: VERSION,
      });
    }

    const { data: treasuryAddr } = await supabase
      .from('wallet_addresses')
      .select('address')
      .eq('user_id', treasuryUserId)
      .eq('chain_id', 84532)
      .maybeSingle();

    if (!treasuryAddr?.address) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Treasury wallet address not found',
        version: VERSION,
      });
    }

    // Ensure bet_settlements row exists
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

    // Record on-chain posted status
    await recordOnchainPosted({ predictionId, txHash, root: settlement.root });

    // Update/create finalize job
    await supabase
      .from('settlement_finalize_jobs')
      .upsert(
        {
          prediction_id: predictionId,
          requested_by: actorId,
          status: 'finalized',
          tx_hash: txHash,
          error: null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'prediction_id' } as any
      );

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'settlement_finalize_onchain',
      targetType: 'prediction',
      targetId: predictionId,
      reason,
      meta: {
        tx_hash: txHash,
        merkle_root: settlement.root,
      },
    });

    return res.json({
      success: true,
      txHash,
      message: 'Settlement finalized on-chain',
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Settlements] Finalize onchain error:', error);
    const errorMessage = error?.message || 'Failed to finalize on-chain';
    
    // If relayer not configured, return clear error
    if (errorMessage.includes('RELAYER') || errorMessage.includes('relayer')) {
      return res.status(500).json({
        error: 'Relayer not configured',
        message: errorMessage,
        version: VERSION,
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: errorMessage,
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/settlements/:predictionId/finalize
 * Alias for finalize-onchain to match admin UI spec.
 * Idempotent: if already finalized, no-op success.
 */
settlementsRouter.post('/:predictionId/finalize', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const actorId = (req.body as any)?.actorId || getFallbackAdminActorId();
    const reason = (req.body as any)?.reason || 'Admin finalize';

    // actorId is optional in admin-key-only mode; we’ll skip audit if missing.

    // If job already finalized, no-op
    const { data: existingJob } = await supabase
      .from('settlement_finalize_jobs')
      .select('status, tx_hash')
      .eq('prediction_id', predictionId)
      .maybeSingle();

    if (existingJob?.status === 'finalized') {
      if (actorId) {
        await logAdminAction({
          actorId,
          action: 'admin_settlement_finalize_noop',
          targetType: 'prediction',
          targetId: predictionId,
          reason,
          meta: { tx_hash: existingJob.tx_hash || null },
        });
      }
      return res.json({
        success: true,
        message: 'Already finalized',
        txHash: existingJob.tx_hash || null,
        version: VERSION,
      });
    }

    // Same behavior as finalize-onchain, but with spec-friendly path name.
    if (!process.env.RELAYER_PRIVATE_KEY || !process.env.RELAYER_RPC_URL) {
      return res.status(500).json({
        error: 'Relayer not configured',
        message: 'RELAYER_PRIVATE_KEY and RELAYER_RPC_URL must be set',
        version: VERSION,
      });
    }

    const { submitFinalizeTx } = await import('../../services/relayer');
    const { computeMerkleSettlementCryptoOnly, recordOnchainPosted, resolveTreasuryUserId } = await import('../settlement');

    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, title, creator_id, winning_option_id, status')
      .eq('id', predictionId)
      .maybeSingle();

    if (predError || !prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    // Best-effort uuid for DB fields that may require it (jobs requested_by, etc.)
    const requestedBy = actorId || (prediction as any).creator_id || null;

    if (prediction.status !== 'settled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction must be settled before finalization',
        version: VERSION,
      });
    }

    const winningOptionId = prediction.winning_option_id;
    if (!winningOptionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction must have a winning option',
        version: VERSION,
      });
    }

    const settlement = await computeMerkleSettlementCryptoOnly({ predictionId, winningOptionId });

    const { data: creatorAddrRow } = await supabase
      .from('wallet_addresses')
      .select('address')
      .eq('user_id', prediction.creator_id)
      .eq('chain_id', 84532)
      .maybeSingle();

    if (!creatorAddrRow?.address) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Creator wallet address not found',
        version: VERSION,
      });
    }

    const treasuryUserId = await resolveTreasuryUserId();
    if (!treasuryUserId) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Treasury user not configured',
        version: VERSION,
      });
    }

    const { data: treasuryAddr } = await supabase
      .from('wallet_addresses')
      .select('address')
      .eq('user_id', treasuryUserId)
      .eq('chain_id', 84532)
      .maybeSingle();

    if (!treasuryAddr?.address) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Treasury wallet address not found',
        version: VERSION,
      });
    }

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

    const { txHash } = await submitFinalizeTx({
      predictionId,
      merkleRoot: settlement.root,
      creatorAddress: creatorAddrRow.address as any,
      creatorFeeUnits: BigInt(settlement.creatorFeeUnits.toString()),
      platformAddress: treasuryAddr.address as any,
      platformFeeUnits: BigInt(settlement.platformFeeUnits.toString()),
    });

    await recordOnchainPosted({ predictionId, txHash, root: settlement.root });

    await supabase
      .from('settlement_finalize_jobs')
      .upsert(
        {
          prediction_id: predictionId,
          requested_by: requestedBy,
          status: 'finalized',
          tx_hash: txHash,
          error: null,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'prediction_id' } as any
      );

    if (actorId) {
      await logAdminAction({
        actorId,
        action: 'admin_settlement_finalize',
        targetType: 'prediction',
        targetId: predictionId,
        reason,
        meta: { tx_hash: txHash, merkle_root: settlement.root },
      });
    }

    return res.json({
      success: true,
      txHash,
      message: 'Settlement finalized on-chain',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Finalize alias error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to finalize settlement',
      version: VERSION,
    });
  }
});

const NoteSchema = z.object({
  actorId: z.string().uuid(),
  note: z.string().min(1).max(2000),
});

/**
 * POST /api/v2/admin/settlements/:predictionId/note
 * Audit-only note (no new table).
 */
settlementsRouter.post('/:predictionId/note', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = NoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId, note } = parsed.data;

    await logAdminAction({
      actorId,
      action: 'admin_settlement_note',
      targetType: 'prediction',
      targetId: predictionId,
      reason: note,
      meta: {},
    });

    return res.json({ success: true, message: 'Note recorded', version: VERSION });
  } catch (error) {
    console.error('[Admin/Settlements] Note error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record note',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements/:predictionId
 * Get detailed settlement info for a prediction
 */
settlementsRouter.get('/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;

    // Get prediction
    const { data: prediction } = await supabase
      .from('predictions')
      .select(`
        *,
        users!predictions_creator_id_fkey(id, username, full_name, email)
      `)
      .eq('id', predictionId)
      .maybeSingle();

    if (!prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    // Get options
    const { data: options } = await supabase
      .from('prediction_options')
      .select('id, text, odds, probability')
      .eq('prediction_id', predictionId);

    // Get entries grouped by option and provider
    const { data: entries } = await supabase
      .from('prediction_entries')
      .select('id, user_id, option_id, amount, provider, status, created_at')
      .eq('prediction_id', predictionId);

    // Entry stats
    const validEntries = (entries || []).filter((e): e is NonNullable<typeof e> => e != null);
    const entryStats = {
      total: validEntries.length,
      totalStake: validEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
      byOption: {} as Record<string, { count: number; stake: number }>,
      byProvider: {} as Record<string, { count: number; stake: number }>,
    };

    for (const e of validEntries) {
      // By option
      if (!entryStats.byOption[e.option_id]) {
        entryStats.byOption[e.option_id] = { count: 0, stake: 0 };
      }
      const optionStat = entryStats.byOption[e.option_id];
      if (optionStat) {
        optionStat.count++;
        optionStat.stake += Number(e.amount || 0);
      }

      // By provider
      const provider = e.provider || 'unknown';
      if (!entryStats.byProvider[provider]) {
        entryStats.byProvider[provider] = { count: 0, stake: 0 };
      }
      entryStats.byProvider[provider].count++;
      entryStats.byProvider[provider].stake += Number(e.amount || 0);
    }

    // Get settlement job
    const { data: job } = await supabase
      .from('settlement_finalize_jobs')
      .select('*')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get bet_settlements record
    const { data: settlement } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', predictionId)
      .maybeSingle();

    // Get payout transactions
    const { data: payouts } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, amount, status, created_at, channel, provider')
      .eq('prediction_id', predictionId)
      .in('channel', ['payout', 'creator_fee', 'platform_fee'])
      .order('created_at', { ascending: false });

    return res.json({
      prediction: {
        id: prediction.id,
        title: prediction.title,
        description: prediction.description,
        status: prediction.status,
        createdAt: prediction.created_at,
        endDate: prediction.end_date,
        resolutionDate: prediction.resolution_date,
        winningOptionId: prediction.winning_option_id,
        platformFee: prediction.platform_fee_percentage,
        creatorFee: prediction.creator_fee_percentage,
      },
      creator: (prediction as any).users ? {
        id: (prediction as any).users.id,
        username: (prediction as any).users.username,
        fullName: (prediction as any).users.full_name,
        email: (prediction as any).users.email,
      } : null,
      options: options || [],
      entryStats,
      job: job || null,
      settlement: settlement || null,
      payouts: payouts || [],
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Detail error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch settlement details',
      version: VERSION,
    });
  }
});

const TriggerSettlementSchema = z.object({
  winningOptionId: z.string().uuid(),
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/settlements/:predictionId/trigger
 * Manually trigger settlement for a prediction
 */
settlementsRouter.post('/:predictionId/trigger', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = TriggerSettlementSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { winningOptionId, actorId } = parsed.data;

    // Get prediction
    const { data: prediction } = await supabase
      .from('predictions')
      .select('id, title, status, winning_option_id')
      .eq('id', predictionId)
      .maybeSingle();

    if (!prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    if (prediction.status === 'settled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction is already settled',
        version: VERSION,
      });
    }

    // Verify winning option exists
    const { data: option } = await supabase
      .from('prediction_options')
      .select('id, text')
      .eq('id', winningOptionId)
      .eq('prediction_id', predictionId)
      .maybeSingle();

    if (!option) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid winning option',
        version: VERSION,
      });
    }

    // Update prediction with winning option
    await supabase
      .from('predictions')
      .update({
        status: 'settled',
        winning_option_id: winningOptionId,
        resolution_date: new Date().toISOString(),
      })
      .eq('id', predictionId);

    // Create settlement job
    await supabase
      .from('settlement_finalize_jobs')
      .insert({
        prediction_id: predictionId,
        requested_by: actorId,
        status: 'queued',
      });

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'settlement_trigger',
      targetType: 'prediction',
      targetId: predictionId,
      meta: {
        title: prediction.title,
        winningOption: option.text,
      },
    });

    return res.json({
      success: true,
      message: 'Settlement triggered',
      winningOption: option.text,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Trigger error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to trigger settlement',
      version: VERSION,
    });
  }
});

const RetrySchema = z.object({
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/settlements/:predictionId/retry
 * Retry a failed settlement
 */
settlementsRouter.post('/:predictionId/retry', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = RetrySchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId } = parsed.data;

    // Get latest job
    const { data: job } = await supabase
      .from('settlement_finalize_jobs')
      .select('*')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!job) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No settlement job found',
        version: VERSION,
      });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Cannot retry job with status '${job.status}'`,
        version: VERSION,
      });
    }

    // Reset job to queued
    await supabase
      .from('settlement_finalize_jobs')
      .update({
        status: 'queued',
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'settlement_retry',
      targetType: 'prediction',
      targetId: predictionId,
      meta: {
        previousError: job.error,
      },
    });

    return res.json({
      success: true,
      message: 'Settlement retry queued',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Retry error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retry settlement',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements/jobs
 * List all settlement jobs
 */
settlementsRouter.get('/jobs/list', async (req, res) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;

    let query = supabase
      .from('settlement_finalize_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['queued', 'running', 'finalized', 'failed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('[Admin/Settlements] Jobs query error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch jobs',
        version: VERSION,
      });
    }

    // Get prediction titles
    const predictionIds = (jobs || []).map(j => j.prediction_id);
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id, title')
      .in('id', predictionIds);

    const titleMap: Record<string, string> = {};
    for (const p of predictions || []) {
      titleMap[p.id] = p.title;
    }

    return res.json({
      items: (jobs || []).map(j => ({
        ...j,
        predictionTitle: titleMap[j.prediction_id] || null,
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Jobs error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch jobs',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/settlements/disputes
 * List all disputes (with filters)
 */
settlementsRouter.get('/disputes', async (req, res) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const offset = Number(req.query.offset) || 0;
    const actorId = (req.query.actorId || req.body.actorId) as string;

    if (!actorId) {
      return res.status(400).json({ error: 'actorId is required', version: VERSION });
    }

    let query = supabase
      .from('disputes')
      .select(`
        *,
        prediction:predictions(id, title, creator_id),
        user:users(id, username, full_name),
        resolved_by_user:users!disputes_resolved_by_user_id_fkey(id, username, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ['open', 'under_review', 'resolved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: disputes, error, count } = await query;

    if (error) {
      console.error('[Admin/Settlements] Disputes error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch disputes',
        version: VERSION,
      });
    }

    return res.json({
      items: disputes || [],
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Settlements] Disputes error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch disputes',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/settlements/disputes/:disputeId/resolve
 * Resolve a dispute (accept or reject)
 */
settlementsRouter.post('/disputes/:disputeId/resolve', async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { actorId, action, reason } = req.body as { actorId: string; action: 'accept' | 'reject'; reason: string };

    if (!actorId || !action || !reason) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'actorId, action, and reason are required',
        version: VERSION,
      });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'action must be "accept" or "reject"',
        version: VERSION,
      });
    }

    // Get dispute
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*, prediction:predictions(id, title, creator_id, status)')
      .eq('id', disputeId)
      .maybeSingle();

    if (disputeError || !dispute) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Dispute not found',
        version: VERSION,
      });
    }

    const prediction = (dispute as any).prediction;
    const disputeUserId = dispute.user_id;

    // Update dispute status
    const newStatus = action === 'accept' ? 'resolved' : 'rejected';
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        status: newStatus,
        resolution_note: reason,
        resolved_by_user_id: actorId,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (updateError) {
      console.error('[Admin/Settlements] Dispute resolution error:', updateError);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to resolve dispute',
        version: VERSION,
      });
    }

    // Phase 4C: Notify disputing user about resolution
    if (disputeUserId && prediction) {
      try {
        const statusLabel = action === 'accept' ? 'accepted' : 'rejected';
        await createNotification({
          userId: disputeUserId,
          type: 'dispute',
          title: `Dispute ${statusLabel}`,
          body: `Your dispute for "${prediction.title}" has been ${statusLabel}.`,
          href: `/predictions/${dispute.prediction_id}`,
          metadata: {
            predictionId: dispute.prediction_id,
            predictionTitle: prediction.title,
            disputeId: disputeId,
            status: newStatus,
            action,
          },
          externalRef: `notif:dispute:${disputeId}:${newStatus}:${disputeUserId}`,
        }).catch((err) => {
          console.warn(`[Notifications] Failed to notify user about dispute resolution:`, err);
        });
      } catch (err) {
        console.warn(`[Notifications] Error creating dispute resolution notification:`, err);
      }
    }

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'dispute_resolved',
      targetType: 'dispute',
      targetId: disputeId,
      reason,
      meta: {
        action,
        predictionId: dispute.prediction_id,
        originalStatus: dispute.status,
        newStatus,
      },
    });

    return res.json({
      success: true,
      message: `Dispute ${action === 'accept' ? 'accepted' : 'rejected'}`,
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Settlements] Dispute resolution error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error?.message || 'Failed to resolve dispute',
      version: VERSION,
    });
  }
});

