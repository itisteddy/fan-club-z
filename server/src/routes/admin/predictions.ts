import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';
import { settleDemoRail } from '../settlement';
import { upsertSettlementResult, computeSettlementAggregates } from '../../services/settlementResults';

export const predictionsRouter = Router();

const DEMO_PROVIDER = 'demo-wallet';

function isSchemaMismatch(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  // Postgres undefined_column / undefined_table, plus common PostgREST schema cache errors
  return (
    code === '42703' || // undefined_column
    code === '42P01' || // undefined_table
    code === 'PGRST200' ||
    msg.includes('does not exist') ||
    msg.toLowerCase().includes('schema cache') ||
    msg.toLowerCase().includes('could not find the')
  );
}

const SearchSchema = z.object({
  q: z.string().optional(),
  // Note: UI uses 'active' but DB stores 'open' - we map it below
  status: z.enum(['active', 'open', 'pending', 'closed', 'settled', 'voided', 'cancelled', 'all']).default('all'),
  rail: z.enum(['demo', 'crypto', 'hybrid', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
});

// Map UI status values to actual DB values
function mapStatusToDb(status: string): string {
  if (status === 'active') return 'open'; // UI says "active", DB stores "open"
  return status;
}

const OutcomeSchema = z.object({
  optionId: z.string().uuid(),
  reason: z.string().optional(),
  actorId: z.string().uuid().optional(),
});

/**
 * GET /api/v2/admin/predictions
 * List/search predictions with filtering
 */
predictionsRouter.get('/', async (req, res) => {
  try {
    const parsed = SearchSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { q, status, rail, limit, offset } = parsed.data;

    // Pre-filter by rail when requested (based on prediction_entries.provider)
    // demo: provider === 'demo-wallet'
    // crypto: provider !== 'demo-wallet'
    // hybrid: both demo and crypto providers exist
    let allowedIds: Set<string> | null = null;
    if (rail !== 'all') {
      const { data: entryRows, error: entryErr } = await supabase
        .from('prediction_entries')
        .select('prediction_id, provider')
        .limit(5000);

      if (entryErr) {
        console.error('[Admin/Predictions] Rail prefilter error:', entryErr);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to apply rail filter',
          version: VERSION,
        });
      }

      const demoIds = new Set<string>();
      const cryptoIds = new Set<string>();
      for (const r of entryRows || []) {
        const pid = (r as any).prediction_id as string | undefined;
        if (!pid) continue;
        const provider = String((r as any).provider || '');
        if (provider === 'demo-wallet') demoIds.add(pid);
        else cryptoIds.add(pid);
      }

      if (rail === 'demo') {
        allowedIds = new Set([...demoIds].filter((id) => !cryptoIds.has(id)));
      } else if (rail === 'crypto') {
        allowedIds = new Set([...cryptoIds].filter((id) => !demoIds.has(id)));
      } else if (rail === 'hybrid') {
        allowedIds = new Set([...demoIds].filter((id) => cryptoIds.has(id)));
      }

      if (!allowedIds || allowedIds.size === 0) {
        return res.json({ items: [], total: 0, limit, offset, version: VERSION });
      }
    }

    const EXTENDED_SELECT = `
      id, title, description, status, created_at,
      entry_deadline, end_date, closed_at, settled_at, resolution_date,
      winning_option_id, creator_id, platform_fee_percentage, creator_fee_percentage,
      users!predictions_creator_id_fkey(username, full_name)
    `;
    const BASE_SELECT = `
      id, title, description, status, created_at,
      entry_deadline,
      winning_option_id, creator_id, platform_fee_percentage, creator_fee_percentage,
      users!predictions_creator_id_fkey(username, full_name)
    `;

    const buildQuery = (select: string) =>
      supabase
        .from('predictions')
        .select(select, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    let query = buildQuery(EXTENDED_SELECT);

    // Status filter (map 'active' -> 'open' for DB)
    if (status !== 'all') {
      const dbStatus = mapStatusToDb(status);
      query = query.eq('status', dbStatus);
    }

    // Text search
    if (q) {
      // Search by title, id, or creator username
      query = query.or(`title.ilike.%${q}%,id.eq.${q.length === 36 ? q : '00000000-0000-0000-0000-000000000000'}`);
    }

    if (allowedIds) {
      query = query.in('id', Array.from(allowedIds));
    }

    let { data, error, count } = await query;
    // Some deployments have different prediction schema; retry with minimal select.
    if (error && isSchemaMismatch(error)) {
      console.warn('[Admin/Predictions] Select schema mismatch, retrying with base select:', error);
      let fallbackQuery = buildQuery(BASE_SELECT);
      if (status !== 'all') fallbackQuery = fallbackQuery.eq('status', mapStatusToDb(status));
      if (q) {
        fallbackQuery = fallbackQuery.or(
          `title.ilike.%${q}%,id.eq.${q.length === 36 ? q : '00000000-0000-0000-0000-000000000000'}`
        );
      }
      if (allowedIds) fallbackQuery = fallbackQuery.in('id', Array.from(allowedIds));
      ({ data, error, count } = await fallbackQuery);
    }

    if (error) {
      console.error('[Admin/Predictions] Search error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search predictions',
        version: VERSION,
      });
    }

    // Compute rail summary for returned rows
    const predictionIds = (data || []).map((p: any) => p.id);
    const railsMap: Record<string, { hasDemo: boolean; hasCrypto: boolean }> = {};
    if (predictionIds.length > 0) {
      const { data: rows } = await supabase
        .from('prediction_entries')
        .select('prediction_id, provider')
        .in('prediction_id', predictionIds);
      for (const r of rows || []) {
        const pid = (r as any).prediction_id as string;
        if (!railsMap[pid]) railsMap[pid] = { hasDemo: false, hasCrypto: false };
        const provider = String((r as any).provider || '');
        if (provider === 'demo-wallet') railsMap[pid].hasDemo = true;
        else railsMap[pid].hasCrypto = true;
      }
    }

    return res.json({
      items: (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        createdAt: p.created_at,
        // Use whichever date fields are present in this environment/schema
        closesAt: p.entry_deadline || p.end_date || null,
        closedAt: p.closed_at || null,
        settledAt: p.settled_at || p.resolution_date || null,
        endDate: p.end_date || p.entry_deadline || null,
        resolutionDate: p.resolution_date || p.settled_at || null,
        winningOptionId: p.winning_option_id,
        creatorId: p.creator_id,
        creatorUsername: p.users?.username || null,
        creatorName: p.users?.full_name || null,
        platformFee: p.platform_fee_percentage,
        creatorFee: p.creator_fee_percentage,
        railsSummary: railsMap[p.id] || { hasDemo: false, hasCrypto: false },
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Predictions] Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search predictions',
      version: VERSION,
    });
  }
});

/**
 * GET /api/v2/admin/predictions/:predictionId
 * Get detailed info about a single prediction
 */
predictionsRouter.get('/:predictionId', async (req, res) => {
  try {
    const { predictionId } = req.params;

    // Get prediction with creator info and category
    const { data: prediction, error } = await supabase
      .from('predictions')
      .select(`
        *,
        users!predictions_creator_id_fkey(id, username, full_name, email),
        category:categories!predictions_category_id_fkey(id, slug, label, icon)
      `)
      .eq('id', predictionId)
      .maybeSingle();

    if (error || !prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    // Get options
    const OPTIONS_EXT = 'id, label, text, odds, probability, current_odds, total_staked, created_at';
    const OPTIONS_BASE = 'id, label, created_at';
    let options: any[] = [];
    const optFirst = await supabase
      .from('prediction_options')
      .select(OPTIONS_EXT)
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: true });
    if (optFirst.error && isSchemaMismatch(optFirst.error)) {
      const optFallback = await supabase
        .from('prediction_options')
        .select(OPTIONS_BASE)
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: true });
      options = (optFallback.data as any[]) || [];
    } else if (optFirst.error) {
      console.error('[Admin/Predictions] Options query error:', optFirst.error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch options', version: VERSION });
    } else {
      options = (optFirst.data as any[]) || [];
    }

    // Get entry stats
    const ENTRIES_EXT = 'id, user_id, option_id, amount, provider, created_at, status';
    const ENTRIES_BASE = 'id, user_id, option_id, amount, created_at, status';
    let entries: any[] = [];
    const entFirst = await supabase
      .from('prediction_entries')
      .select(ENTRIES_EXT)
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false });
    if (entFirst.error && isSchemaMismatch(entFirst.error)) {
      const entFallback = await supabase
        .from('prediction_entries')
        .select(ENTRIES_BASE)
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false });
      entries = ((entFallback.data as any[]) || []).map((e: any) => ({ ...e, provider: 'unknown' }));
    } else if (entFirst.error) {
      console.error('[Admin/Predictions] Entries query error:', entFirst.error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch entries', version: VERSION });
    } else {
      entries = (entFirst.data as any[]) || [];
    }

    // Get settlement info
    const { data: settlement } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', predictionId)
      .maybeSingle();

    // Disputes (optional table; return [] if missing)
    let disputes: any[] = [];
    try {
      const { data: d } = await supabase
        .from('prediction_disputes' as any)
        .select('*')
        .eq('prediction_id', predictionId);
      disputes = (d as any[]) || [];
    } catch {
      disputes = [];
    }

    // Aggregate stats
    const totalStake = (entries || []).reduce((sum, e) => sum + Number((e as any).amount || 0), 0);
    const uniqueBettors = new Set((entries || []).map(e => (e as any).user_id)).size;
    const stakeByOption: Record<string, number> = {};
    for (const e of entries || []) {
      stakeByOption[(e as any).option_id] = (stakeByOption[(e as any).option_id] || 0) + Number((e as any).amount || 0);
    }

    const demoEntries = (entries || []).filter((e: any) => String(e.provider || '') === 'demo-wallet');
    const cryptoEntries = (entries || []).filter((e: any) => String(e.provider || '') !== 'demo-wallet');

    const potDemo = demoEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const potCrypto = cryptoEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const pctPlatform = Number((prediction as any).platform_fee_percentage || 0);
    const pctCreator = Number((prediction as any).creator_fee_percentage || 0);
    const feeDemoPlatform = pctPlatform ? (potDemo * pctPlatform) / 100 : 0;
    const feeDemoCreator = pctCreator ? (potDemo * pctCreator) / 100 : 0;
    const feeCryptoPlatform = pctPlatform ? (potCrypto * pctPlatform) / 100 : 0;
    const feeCryptoCreator = pctCreator ? (potCrypto * pctCreator) / 100 : 0;

    // Get category info
    const categoryInfo = (prediction as any).category;
    const categoryLabel = categoryInfo?.label || (prediction as any).category || 'Custom';

    return res.json({
      prediction: {
        id: prediction.id,
        title: prediction.title,
        description: prediction.description,
        status: prediction.status,
        category: categoryLabel, // Include category label
        categoryId: categoryInfo?.id || (prediction as any).category_id || null,
        categoryObj: categoryInfo ? {
          id: categoryInfo.id,
          slug: categoryInfo.slug,
          label: categoryInfo.label,
          icon: categoryInfo.icon,
        } : null,
        createdAt: prediction.created_at,
        // Prefer entry_deadline if present; fall back to end_date legacy
        closesAt: (prediction as any).entry_deadline || (prediction as any).end_date || null,
        closedAt: (prediction as any).closed_at || null,
        settledAt: (prediction as any).settled_at || (prediction as any).resolution_date || null,
        endDate: (prediction as any).end_date || (prediction as any).entry_deadline || null,
        resolutionDate: (prediction as any).resolution_date || (prediction as any).settled_at || null,
        winningOptionId: (prediction as any).winning_option_id || null,
        platformFee: (prediction as any).platform_fee_percentage,
        creatorFee: (prediction as any).creator_fee_percentage,
      },
      creator: prediction.users ? {
        id: (prediction.users as any).id,
        username: (prediction.users as any).username,
        fullName: (prediction.users as any).full_name,
        email: (prediction.users as any).email,
      } : null,
      options: (options || []).map((o: any) => ({
        id: o.id,
        // Keep legacy keys for existing admin UI, but map from new schema when needed
        text: o.text ?? o.label ?? '',
        odds: o.odds ?? o.current_odds ?? null,
        probability: o.probability ?? null,
        totalStake: stakeByOption[o.id] || Number(o.total_staked || 0),
      })),
      stats: {
        totalStake,
        uniqueBettors,
        entryCount: (entries || []).length,
      },
      entries: entries || [],
      settlement: settlement || null,
      disputes,
      aggregates: {
        demo: {
          pot: potDemo,
          fees: { platform: feeDemoPlatform, creator: feeDemoCreator },
          entriesCount: demoEntries.length,
        },
        crypto: {
          pot: potCrypto,
          fees: { platform: feeCryptoPlatform, creator: feeCryptoCreator },
          entriesCount: cryptoEntries.length,
        },
        total: {
          pot: totalStake,
          entriesCount: (entries || []).length,
        },
      },
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Predictions] Detail error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch prediction details',
      version: VERSION,
    });
  }
});

/**
 * POST /api/v2/admin/predictions/:predictionId/outcome
 * Set winning option for a prediction AND trigger immediate settlement.
 * This is the admin tool for settling predictions - it does the full flow.
 */
predictionsRouter.post('/:predictionId/outcome', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = OutcomeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { optionId, reason, actorId } = parsed.data;

    // Verify prediction exists with full details needed for settlement
    const { data: prediction, error: predErr } = await supabase
      .from('predictions')
      .select('id, status, title, creator_id, platform_fee_percentage, creator_fee_percentage')
      .eq('id', predictionId)
      .maybeSingle();

    if (predErr || !prediction) {
      return res.status(404).json({ error: 'Not Found', message: 'Prediction not found', version: VERSION });
    }

    const status = String((prediction as any).status || '').toLowerCase();
    if (status === 'voided' || status === 'cancelled') {
      return res.status(400).json({ error: 'Bad Request', message: 'Cannot set outcome for voided/cancelled prediction', version: VERSION });
    }

    // Check if already settled (idempotent)
    if (status === 'settled') {
      return res.json({ 
        success: true, 
        predictionId, 
        winningOptionId: optionId, 
        message: 'Already settled',
        alreadySettled: true,
        version: VERSION 
      });
    }

    // Verify option belongs to prediction
    const { data: opt, error: optErr } = await supabase
      .from('prediction_options')
      .select('id, prediction_id, label, text')
      .eq('id', optionId)
      .maybeSingle();

    if (optErr || !opt || String((opt as any).prediction_id) !== predictionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Option does not belong to prediction',
        version: VERSION,
      });
    }

    const winningOptionText = (opt as any).text || (opt as any).label || 'Unknown';

    console.log(`[Admin/Settlement] Starting settlement for prediction ${predictionId}`);
    console.log(`[Admin/Settlement] Winning option: ${optionId} (${winningOptionText})`);

    // Get all entries for this prediction
    const { data: allEntries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId);

    if (entriesError) {
      console.error('[Admin/Settlement] Failed to fetch entries:', entriesError);
      return res.status(500).json({ error: 'Database error', message: 'Failed to fetch entries', version: VERSION });
    }

    // Split entries by provider
    const demoEntries = (allEntries || []).filter((e: any) => e?.provider === DEMO_PROVIDER);
    const cryptoEntries = (allEntries || []).filter((e: any) => e?.provider !== DEMO_PROVIDER);
    const hasDemoRail = demoEntries.length > 0;
    const hasCryptoRail = cryptoEntries.length > 0;

    const platformFeePercent = Number.isFinite((prediction as any).platform_fee_percentage) 
      ? Number((prediction as any).platform_fee_percentage) : 2.5;
    const creatorFeePercent = Number.isFinite((prediction as any).creator_fee_percentage) 
      ? Number((prediction as any).creator_fee_percentage) : 1.0;

    // ============ DEMO RAIL SETTLEMENT ============
    let demoSummary = { demoEntriesCount: 0, demoPlatformFee: 0, demoCreatorFee: 0, demoPayoutPool: 0 };
    if (hasDemoRail) {
      console.log(`[Admin/Settlement] Processing ${demoEntries.length} demo entries`);
      demoSummary = await settleDemoRail({
        predictionId,
        predictionTitle: (prediction as any).title || 'Prediction',
        winningOptionId: optionId,
        creatorId: (prediction as any).creator_id,
        platformFeePercent,
        creatorFeePercent,
      });
      console.log('[Admin/Settlement] Demo settlement complete:', demoSummary);
    }

    // ============ CRYPTO RAIL SETTLEMENT ============
    let cryptoPlatformFee = 0;
    let cryptoCreatorFee = 0;
    let cryptoPayoutPool = 0;

    if (hasCryptoRail) {
      console.log(`[Admin/Settlement] Processing ${cryptoEntries.length} crypto entries`);
      
      const cryptoWinners = cryptoEntries.filter((e: any) => e.option_id === optionId);
      const cryptoLosers = cryptoEntries.filter((e: any) => e.option_id !== optionId);
      const totalCryptoWinningStake = cryptoWinners.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
      const totalCryptoLosingStake = cryptoLosers.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

      // Fees on losing stakes only
      cryptoPlatformFee = Math.round((totalCryptoLosingStake * platformFeePercent) / 100 * 100) / 100;
      cryptoCreatorFee = Math.round((totalCryptoLosingStake * creatorFeePercent) / 100 * 100) / 100;
      const cryptoPrizePool = Math.max(totalCryptoLosingStake - cryptoPlatformFee - cryptoCreatorFee, 0);
      cryptoPayoutPool = totalCryptoWinningStake + cryptoPrizePool;

      // Track stakes and payouts by user and provider for canonical results
      const cryptoUserStakes = new Map<string, Map<string, number>>();
      const cryptoUserPayouts = new Map<string, Map<string, number>>();

      // Calculate per-user payouts for crypto winners
      for (const winner of cryptoWinners) {
        const stake = Number(winner.amount || 0);
        const provider = winner.provider || 'crypto-base-usdc';
        const share = totalCryptoWinningStake > 0 ? stake / totalCryptoWinningStake : 0;
        const payout = Math.round((stake + cryptoPrizePool * share) * 100) / 100;

        // Track stake
        if (!cryptoUserStakes.has(winner.user_id)) cryptoUserStakes.set(winner.user_id, new Map());
        const userStakes = cryptoUserStakes.get(winner.user_id)!;
        userStakes.set(provider, (userStakes.get(provider) || 0) + stake);

        // Track payout
        if (!cryptoUserPayouts.has(winner.user_id)) cryptoUserPayouts.set(winner.user_id, new Map());
        const userPayouts = cryptoUserPayouts.get(winner.user_id)!;
        userPayouts.set(provider, (userPayouts.get(provider) || 0) + payout);

        // Update entry status
        await supabase
          .from('prediction_entries')
          .update({ status: 'won', actual_payout: payout, updated_at: new Date().toISOString() } as any)
          .eq('id', winner.id);
      }

      // Update crypto losers
      for (const loser of cryptoLosers) {
        const stake = Number(loser.amount || 0);
        const provider = loser.provider || 'crypto-base-usdc';

        // Track stake
        if (!cryptoUserStakes.has(loser.user_id)) cryptoUserStakes.set(loser.user_id, new Map());
        const userStakes = cryptoUserStakes.get(loser.user_id)!;
        userStakes.set(provider, (userStakes.get(provider) || 0) + stake);

        await supabase
          .from('prediction_entries')
          .update({ status: 'lost', actual_payout: 0, updated_at: new Date().toISOString() } as any)
          .eq('id', loser.id);
      }

      // Persist canonical results for crypto winners
      for (const [userId, userPayouts] of cryptoUserPayouts.entries()) {
        const userStakes = cryptoUserStakes.get(userId) || new Map();
        for (const [provider, totalPayout] of userPayouts.entries()) {
          const totalStake = userStakes.get(provider) || 0;
          try {
            await upsertSettlementResult({
              predictionId,
              userId,
              provider,
              stakeTotal: totalStake,
              returnedTotal: totalPayout,
              net: totalPayout - totalStake,
              status: 'win',
              claimStatus: 'not_applicable',
            });
          } catch (err) {
            console.error('[Admin/Settlement] Failed to persist crypto winner result:', err);
          }
        }
      }

      // Persist canonical results for crypto losers
      for (const [userId, userStakes] of cryptoUserStakes.entries()) {
        if (cryptoUserPayouts.has(userId)) continue; // Already handled as winner
        for (const [provider, totalStake] of userStakes.entries()) {
          try {
            await upsertSettlementResult({
              predictionId,
              userId,
              provider,
              stakeTotal: totalStake,
              returnedTotal: 0,
              net: -totalStake,
              status: 'loss',
              claimStatus: 'not_applicable',
            });
          } catch (err) {
            console.error('[Admin/Settlement] Failed to persist crypto loser result:', err);
          }
        }
      }

      console.log('[Admin/Settlement] Crypto settlement complete:', {
        winners: cryptoWinners.length,
        losers: cryptoLosers.length,
        platformFee: cryptoPlatformFee,
        creatorFee: cryptoCreatorFee,
        payoutPool: cryptoPayoutPool,
      });
    }

    // ============ UPDATE PREDICTION STATUS TO SETTLED ============
    const { error: updateError } = await supabase
      .from('predictions')
      .update({
        winning_option_id: optionId,
        status: 'settled',
        settled_at: new Date().toISOString(),
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', predictionId);

    if (updateError) {
      console.error('[Admin/Settlement] Failed to update prediction status:', updateError);
    }

    // Mark winning option
    try {
      await supabase
        .from('prediction_options')
        .update({ is_winning_outcome: null } as any)
        .eq('prediction_id', predictionId);
      await supabase
        .from('prediction_options')
        .update({ is_winning_outcome: true } as any)
        .eq('id', optionId);
    } catch {
      // ignore schema differences
    }

    // ============ CREATE/UPDATE SETTLEMENT RECORD ============
    const totalPlatformFee = demoSummary.demoPlatformFee + cryptoPlatformFee;
    const totalCreatorFee = demoSummary.demoCreatorFee + cryptoCreatorFee;
    const totalPayoutPool = demoSummary.demoPayoutPool + cryptoPayoutPool;

    const { error: settlementError } = await supabase
      .from('bet_settlements')
      .upsert({
        bet_id: predictionId,
        winning_option_id: optionId,
        total_payout: totalPayoutPool,
        platform_fee_collected: totalPlatformFee,
        creator_payout_amount: totalCreatorFee,
        settlement_time: new Date().toISOString(),
        status: 'completed',
      }, { onConflict: 'bet_id' });

    if (settlementError) {
      console.error('[Admin/Settlement] Failed to create settlement record:', settlementError);
    }

    // Log admin action
    if (actorId) {
      await logAdminAction({
        actorId,
        action: 'admin_settle_prediction',
        targetType: 'prediction',
        targetId: predictionId,
        reason: reason || undefined,
        meta: { 
          optionId, 
          winningOptionText,
          demoEntries: demoEntries.length,
          cryptoEntries: cryptoEntries.length,
          totalPlatformFee,
          totalCreatorFee,
          totalPayoutPool,
        },
      });
    }

    // Compute aggregates for response
    let aggregates: any = {};
    try {
      aggregates = await computeSettlementAggregates(predictionId, allEntries || []);
      if (aggregates.demo) {
        aggregates.demo.platformFee = demoSummary.demoPlatformFee;
        aggregates.demo.creatorFee = demoSummary.demoCreatorFee;
      }
      if (aggregates.crypto) {
        aggregates.crypto.platformFee = cryptoPlatformFee;
        aggregates.crypto.creatorFee = cryptoCreatorFee;
      }
    } catch (err) {
      console.error('[Admin/Settlement] Failed to compute aggregates:', err);
    }

    console.log(`[Admin/Settlement] ✅ Settlement complete for prediction ${predictionId}`);

    return res.json({ 
      success: true, 
      predictionId, 
      winningOptionId: optionId,
      winningOptionText,
      settlement: {
        demoEntriesCount: demoEntries.length,
        cryptoEntriesCount: cryptoEntries.length,
        demoPlatformFee: demoSummary.demoPlatformFee,
        demoCreatorFee: demoSummary.demoCreatorFee,
        cryptoPlatformFee,
        cryptoCreatorFee,
        totalPlatformFee,
        totalCreatorFee,
        totalPayoutPool,
      },
      aggregates,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Predictions] Set outcome + settlement error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to settle prediction', version: VERSION });
  }
});

const VoidSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/predictions/:predictionId/void
 * Void a prediction and refund all bets
 */
predictionsRouter.post('/:predictionId/void', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = VoidSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { reason, actorId } = parsed.data;

    // Get prediction
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, title, status, creator_id')
      .eq('id', predictionId)
      .maybeSingle();

    if (predError || !prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    if (prediction.status === 'voided' || prediction.status === 'cancelled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction is already voided or cancelled',
        version: VERSION,
      });
    }

    // Get all entries to refund
    const { data: entries } = await supabase
      .from('prediction_entries')
      .select('id, user_id, amount, provider')
      .eq('prediction_id', predictionId)
      .eq('status', 'active');

    // Start refund process
    const refundResults: { success: number; failed: number; byProvider: Record<string, number> } = { 
      success: 0, 
      failed: 0,
      byProvider: {},
    };

    for (const entry of entries || []) {
      try {
        const provider = entry.provider || 'demo-wallet';
        
        // Determine currency and amount based on provider
        let currency = 'USD';
        let amount = entry.amount;
        let refundType = 'stake_refund';
        
        if (provider === 'fiat-paystack') {
          currency = 'NGN';
          // For fiat, amount is stored in NGN, we need to convert to kobo for the transaction
          amount = Number(entry.amount) * 100; // kobo
          refundType = 'stake_refund';
        } else if (provider === 'demo-wallet') {
          currency = 'DEMO_USD';
        }

        // Credit back to wallet (idempotent)
        const { error: txError } = await supabase.from('wallet_transactions').insert({
          user_id: entry.user_id,
          direction: 'credit',
          type: refundType,
          channel: 'refund',
          provider,
          amount,
          currency,
          status: 'completed',
          prediction_id: predictionId,
          description: `Refund: Prediction voided - "${prediction.title}"`,
          external_ref: `void-${predictionId}-${entry.id}`,
          meta: { reason, voided_by: actorId, originalAmount: entry.amount },
        });

        if (txError) {
          // Check if it's a duplicate (idempotent)
          if ((txError as any)?.code === '23505') {
            console.log(`[Admin/Void] Refund already exists for entry ${entry.id}`);
          } else {
            console.error('[Admin/Void] Refund tx error:', txError);
            refundResults.failed++;
            continue;
          }
        }

        // Update entry status
        await supabase
          .from('prediction_entries')
          .update({ status: 'refunded' })
          .eq('id', entry.id);

        // Update wallet balance for demo only (crypto/fiat handled by ledger)
        if (provider === 'demo-wallet') {
          await supabase.rpc('increment_wallet_balance', {
            p_user_id: entry.user_id,
            p_amount: Number(entry.amount),
          });
        }

        refundResults.success++;
        refundResults.byProvider[provider] = (refundResults.byProvider[provider] || 0) + 1;
      } catch (e) {
        console.error('[Admin/Void] Entry refund error:', e);
        refundResults.failed++;
      }
    }

    // Update prediction status to voided
    await supabase
      .from('predictions')
      .update({
        status: 'voided',
        resolution_date: new Date().toISOString(),
      })
      .eq('id', predictionId);

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'prediction_void',
      targetType: 'prediction',
      targetId: predictionId,
      reason,
      meta: {
        title: prediction.title,
        refunds: refundResults,
      },
    });

    return res.json({
      success: true,
      message: 'Prediction voided and bets refunded',
      refunds: refundResults,
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Predictions] Void error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to void prediction',
      version: VERSION,
    });
  }
});

const CancelSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/predictions/:predictionId/cancel
 * Cancel a prediction (no refunds, typically for spam/fraud)
 */
predictionsRouter.post('/:predictionId/cancel', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = CancelSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { reason, actorId } = parsed.data;

    // Get prediction
    const { data: prediction } = await supabase
      .from('predictions')
      .select('id, title, status')
      .eq('id', predictionId)
      .maybeSingle();

    if (!prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    if (prediction.status === 'voided' || prediction.status === 'cancelled') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction is already voided or cancelled',
        version: VERSION,
      });
    }

    // Update prediction status
    await supabase
      .from('predictions')
      .update({
        status: 'cancelled',
        resolution_date: new Date().toISOString(),
      })
      .eq('id', predictionId);

    // Mark entries as cancelled (no refund)
    await supabase
      .from('prediction_entries')
      .update({ status: 'cancelled' })
      .eq('prediction_id', predictionId)
      .eq('status', 'active');

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'prediction_cancel',
      targetType: 'prediction',
      targetId: predictionId,
      reason,
      meta: {
        title: prediction.title,
      },
    });

    return res.json({
      success: true,
      message: 'Prediction cancelled',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Predictions] Cancel error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to cancel prediction',
      version: VERSION,
    });
  }
});

const ResetSchema = z.object({
  actorId: z.string().uuid(),
});

/**
 * POST /api/v2/admin/predictions/:predictionId/reset
 * Reset a prediction back to active (undo settlement)
 */
predictionsRouter.post('/:predictionId/reset', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const parsed = ResetSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId } = parsed.data;

    // Get prediction
    const { data: prediction } = await supabase
      .from('predictions')
      .select('id, title, status')
      .eq('id', predictionId)
      .maybeSingle();

    if (!prediction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Prediction not found',
        version: VERSION,
      });
    }

    if (prediction.status === 'active') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction is already active',
        version: VERSION,
      });
    }

    // Check if any payouts have been claimed (can't reset if so)
    const { data: claimedPayouts } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('prediction_id', predictionId)
      .eq('channel', 'payout')
      .eq('status', 'completed')
      .limit(1);

    if (claimedPayouts && claimedPayouts.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot reset: payouts have already been claimed',
        version: VERSION,
      });
    }

    // Reset prediction
    await supabase
      .from('predictions')
      .update({
        status: 'active',
        winning_option_id: null,
        resolution_date: null,
      })
      .eq('id', predictionId);

    // Reset entries back to active
    await supabase
      .from('prediction_entries')
      .update({ status: 'active' })
      .eq('prediction_id', predictionId)
      .in('status', ['settled', 'won', 'lost']);

    // Delete settlement record
    await supabase
      .from('bet_settlements')
      .delete()
      .eq('bet_id', predictionId);

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'prediction_reset',
      targetType: 'prediction',
      targetId: predictionId,
      meta: {
        title: prediction.title,
        previousStatus: prediction.status,
      },
    });

    return res.json({
      success: true,
      message: 'Prediction reset to active',
      version: VERSION,
    });
  } catch (error) {
    console.error('[Admin/Predictions] Reset error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset prediction',
      version: VERSION,
    });
  }
});

