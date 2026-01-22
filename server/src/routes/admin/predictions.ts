import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction } from './audit';

export const predictionsRouter = Router();

const SearchSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'pending', 'settled', 'voided', 'cancelled', 'all']).default('all'),
  rail: z.enum(['demo', 'crypto', 'hybrid', 'all']).default('all'),
  limit: z.coerce.number().min(1).max(100).default(25),
  offset: z.coerce.number().min(0).default(0),
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

    let query = supabase
      .from('predictions')
      .select(`
        id, title, description, status, created_at, entry_deadline, end_date, closed_at, settled_at, resolution_date,
        winning_option_id, creator_id, platform_fee_percentage, creator_fee_percentage,
        users!predictions_creator_id_fkey(username, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Text search
    if (q) {
      // Search by title, id, or creator username
      query = query.or(`title.ilike.%${q}%,id.eq.${q.length === 36 ? q : '00000000-0000-0000-0000-000000000000'}`);
    }

    if (allowedIds) {
      query = query.in('id', Array.from(allowedIds));
    }

    const { data, error, count } = await query;

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

    // Get prediction with creator info
    const { data: prediction, error } = await supabase
      .from('predictions')
      .select(`
        *,
        users!predictions_creator_id_fkey(id, username, full_name, email)
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
    const { data: options } = await supabase
      .from('prediction_options')
      .select('id, label, text, odds, probability, current_odds, total_staked, created_at')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: true });

    // Get entry stats
    const { data: entries } = await supabase
      .from('prediction_entries')
      .select('id, user_id, option_id, amount, provider, created_at, status')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false });

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
    const totalStake = (entries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const uniqueBettors = new Set((entries || []).map(e => e.user_id)).size;
    const stakeByOption: Record<string, number> = {};
    for (const e of entries || []) {
      stakeByOption[e.option_id] = (stakeByOption[e.option_id] || 0) + Number(e.amount || 0);
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

    return res.json({
      prediction: {
        id: prediction.id,
        title: prediction.title,
        description: prediction.description,
        status: prediction.status,
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
    const refundResults: { success: number; failed: number } = { success: 0, failed: 0 };

    for (const entry of entries || []) {
      try {
        // Credit back to wallet
        const { error: txError } = await supabase.from('wallet_transactions').insert({
          user_id: entry.user_id,
          direction: 'credit',
          type: 'deposit',
          channel: 'refund',
          provider: entry.provider || 'demo-wallet',
          amount: entry.amount,
          currency: 'USD',
          status: 'completed',
          prediction_id: predictionId,
          description: `Refund: Prediction voided - "${prediction.title}"`,
          external_ref: `void-${predictionId}-${entry.id}`,
          meta: { reason, voided_by: actorId },
        });

        if (txError) {
          console.error('[Admin/Void] Refund tx error:', txError);
          refundResults.failed++;
          continue;
        }

        // Update entry status
        await supabase
          .from('prediction_entries')
          .update({ status: 'refunded' })
          .eq('id', entry.id);

        // Update wallet balance
        await supabase.rpc('increment_wallet_balance', {
          p_user_id: entry.user_id,
          p_amount: Number(entry.amount),
        });

        refundResults.success++;
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

