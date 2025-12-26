import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = Router();

type MaybeArray<T> = T | T[] | null | undefined;

const pickFirst = <T>(value: MaybeArray<T>): T | null => {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
};

const getOptionLabel = (option: MaybeArray<{ label?: string }>): string | null => {
  return pickFirst(option)?.label ?? null;
};

// GET /api/v2/activity/predictions/:id - Get activity feed for a prediction
router.get('/predictions/:id', async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    const { cursor, limit = '25' } = req.query;

    if (!predictionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction ID is required',
        version: VERSION
      });
    }

    const limitNum = Math.min(parseInt(limit as string, 10) || 25, 100);
    const cursorIso = typeof cursor === 'string' && cursor.trim().length ? cursor : undefined;

    let entriesQuery = supabase
      .from('prediction_entries')
      .select(`
        id,
        created_at,
        amount,
        potential_payout,
        status,
        option_id,
        prediction_id,
        user:users!prediction_entries_user_id_fkey(id, username, full_name, avatar_url, is_verified),
        option:prediction_options!prediction_entries_option_id_fkey(label)
      `)
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (cursorIso) {
      entriesQuery = entriesQuery.lt('created_at', cursorIso);
    }

    const { data: betEntries, error: betError } = await entriesQuery;

    if (betError) {
      console.error('[activity] Failed to load prediction entries:', betError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction activity',
        version: VERSION
      });
    }

    const { data: betTransactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select(`
        id,
        created_at,
        amount,
        currency,
        meta,
        user:users!wallet_transactions_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `)
      .eq('channel', 'escrow_consumed')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (txError) {
      console.error('[activity] Failed to load wallet bet transactions:', txError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction activity',
        version: VERSION
      });
    }

    const entryItems = (betEntries || []).map((entry) => ({
      id: `entry_${entry.id}`,
      timestamp: entry.created_at,
      type: 'entry.create',
      actor: entry.user ?? null,
      data: {
        amount: Number(entry.amount || 0),
        potential_payout: Number(entry.potential_payout || 0),
        status: entry.status,
        option_id: entry.option_id,
        option_label: getOptionLabel(entry.option as MaybeArray<{ label?: string }>),
      }
    }));

    const transactionItems = (betTransactions || []).map((tx) => ({
      id: `wallet_${tx.id}`,
      timestamp: tx.created_at,
      type: 'bet_placed',
      actor: tx.user ?? null,
      data: {
        amount: Number(tx.amount || 0),
        currency: tx.currency || 'USD',
        option_label: tx.meta?.option_label ?? null,
        option_id: tx.meta?.option_id ?? null,
      }
    }));

    const merged = [...entryItems, ...transactionItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const items = merged.slice(0, limitNum);
    const hasMore = merged.length === limitNum;
    const nextCursor = hasMore ? items[items.length - 1]?.timestamp : null;

    return res.json({
      items,
      nextCursor,
      hasMore,
      version: VERSION
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity feed',
      version: VERSION
    });
  }
});

// GET /api/v2/activity/user/:userId - Get activity feed for a user across all predictions
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = '25' } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required',
        version: VERSION
      });
    }

    const limitNum = Math.min(parseInt(limit as string, 10) || 25, 100);
    const cursorIso = typeof cursor === 'string' && cursor.trim().length ? cursor : undefined;

    let userEntriesQuery = supabase
      .from('prediction_entries')
      .select(`
        id,
        created_at,
        amount,
        potential_payout,
        status,
        option_id,
        prediction_id,
        prediction:predictions!prediction_entries_prediction_id_fkey(id, title, status),
        option:prediction_options!prediction_entries_option_id_fkey(label)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (cursorIso) {
      userEntriesQuery = userEntriesQuery.lt('created_at', cursorIso);
    }

    let createdPredictionsQuery = supabase
      .from('predictions')
      .select('id, title, status, created_at, entry_deadline, category')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (cursorIso) {
      createdPredictionsQuery = createdPredictionsQuery.lt('created_at', cursorIso);
    }

    const [{ data: betEntries, error: betError }, { data: createdPredictions, error: createdError }] = await Promise.all([
      userEntriesQuery,
      createdPredictionsQuery,
    ]);

    if (betError) {
      console.error('[activity] Failed to load user bet entries:', betError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user activity',
        version: VERSION
      });
    }

    if (createdError) {
      console.error('[activity] Failed to load user created predictions:', createdError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user activity',
        version: VERSION
      });
    }

    // Include wallet transactions so the feed reflects *actual wallet movements* (deposits, withdraws, bet locks, etc).
    // We'll de-dupe bet entries when we have an escrow_consumed wallet tx for the same entry.
    const walletChannels = ['escrow_consumed', 'escrow_deposit', 'escrow_withdraw', 'escrow_unlock', 'payout', 'settlement_loss', 'platform_fee', 'creator_fee'];

    console.log(`[activity] Fetching wallet_transactions for user: ${userId}, channels: ${walletChannels.join(', ')}`);

    const { data: betTransactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('id, created_at, amount, currency, meta, prediction_id, channel, description, direction, provider, entry_id')
      .in('channel', walletChannels)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (txError) {
      console.error('[activity] Failed to load user wallet transactions:', txError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user activity',
        version: VERSION
      });
    }

    console.log(`[activity] Found ${betTransactions?.length ?? 0} wallet transactions for user ${userId}`, {
      sampleTx: betTransactions?.slice(0, 3).map(tx => ({
        id: tx.id,
        channel: tx.channel,
        direction: (tx as any).direction,
        provider: (tx as any).provider,
        amount: tx.amount,
        prediction_id: tx.prediction_id
      }))
    });

    const entryIdsWithWalletTx = new Set(
      (betTransactions || [])
        .map((tx: any) => String(tx.entry_id || tx.meta?.entry_id || tx.meta?.prediction_entry_id || ''))
        .filter((v) => v && v !== 'null' && v !== 'undefined')
    );

    const betEvents = (betEntries || [])
      .filter((entry) => !entryIdsWithWalletTx.has(String(entry.id)))
      .map((entry) => {
        const prediction = pickFirst(entry.prediction as MaybeArray<{ id?: string; title?: string; status?: string }>);
        return {
          id: `bet_${entry.id}`,
          timestamp: entry.created_at,
          type: 'entry.create',
          actor: null,
          predictionId: prediction?.id ?? entry.prediction_id,
          predictionTitle: prediction?.title ?? null,
          predictionStatus: prediction?.status ?? null,
          data: {
            amount: Number(entry.amount || 0),
            potential_payout: Number(entry.potential_payout || 0),
            status: entry.status,
            option_id: entry.option_id,
            option_label: getOptionLabel(entry.option as MaybeArray<{ label?: string }>),
          }
        };
      });

    const transactionEvents = (betTransactions || []).map((tx: any) => {
      const amount = Math.abs(Number(tx.amount || 0));
      const predictionId = tx.prediction_id ?? tx.meta?.prediction_id ?? null;
      const predictionTitle = tx.meta?.prediction_title ?? null;

      switch (tx.channel) {
        case 'escrow_consumed':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.bet_lock',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
              option_label: tx.meta?.option_label ?? null,
              option_id: tx.meta?.option_id ?? null,
              entry_id: tx.entry_id ?? tx.meta?.entry_id ?? null,
            },
          };
        case 'escrow_deposit':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.deposit',
            actor: null,
            predictionId: null,
            predictionTitle: null,
            predictionStatus: null,
            data: { amount },
          };
        case 'escrow_withdraw':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.withdraw',
            actor: null,
            predictionId: null,
            predictionTitle: null,
            predictionStatus: null,
            data: { amount },
          };
        case 'payout':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.payout',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
              option_label: tx.meta?.option_label ?? null,
              entry_id: tx.meta?.prediction_entry_id ?? (tx as Record<string, any>).entry_id ?? null,
            },
          };
        case 'platform_fee':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.platform_fee',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
            },
          };
        case 'creator_fee':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.creator_fee',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
            },
          };
        case 'escrow_unlock':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.unlock',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
              reason: tx.description ?? null,
            },
          };
        case 'settlement_loss':
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.loss',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
              option_label: tx.meta?.option_label ?? null,
              entry_id: tx.entry_id ?? tx.meta?.prediction_entry_id ?? tx.meta?.entry_id ?? null,
            },
          };
        default:
          // For any other channel, skip it to avoid duplicates
          return {
            id: `wallet_${tx.id}`,
            timestamp: tx.created_at,
            type: 'wallet.other',
            actor: null,
            predictionId,
            predictionTitle,
            predictionStatus: null,
            data: {
              amount,
              channel: tx.channel,
              option_label: tx.meta?.option_label ?? null,
              option_id: tx.meta?.option_id ?? null,
            },
          };
      }
    });

    const createdEvents = (createdPredictions || []).map((prediction: any) => ({
      id: `prediction_${prediction.id}`,
      timestamp: prediction.created_at,
      type: 'prediction.created',
      actor: null,
      predictionId: prediction.id,
      predictionTitle: prediction.title,
      predictionStatus: prediction.status,
      data: {
        entry_deadline: prediction.entry_deadline,
        category: prediction.category,
      }
    }));

    const merged = [...betEvents, ...transactionEvents, ...createdEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Deduplicate any historical duplicates (e.g., settlement retries that double-inserted wallet tx rows).
    // Keep the newest item when duplicates exist.
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const item of merged) {
      const predictionId = item.predictionId ?? (item.data?.prediction_id ?? null);
      const entryId =
        item.data?.entry_id ??
        item.data?.prediction_entry_id ??
        null;
      const type = item.type ?? '';
      // Stable key: type + prediction + entry (when available), otherwise fall back to id.
      const key = entryId && predictionId ? `${type}:${predictionId}:${entryId}` : String(item.id);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    const items = deduped.slice(0, limitNum);
    const hasMore =
      (betEntries?.length ?? 0) === limitNum ||
      (createdPredictions?.length ?? 0) === limitNum ||
      (betTransactions?.length ?? 0) === limitNum;
    const nextCursor = hasMore ? items[items.length - 1]?.timestamp : null;

    return res.json({
      items,
      nextCursor,
      hasMore,
      version: VERSION
    });
  } catch (error) {
    console.error('User activity feed error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user activity feed',
      version: VERSION
    });
  }
});

export default router;