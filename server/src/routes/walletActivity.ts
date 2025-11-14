import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

export const walletActivity = Router();

export type ActivityItem = {
  id: string;
  kind: 'deposit' | 'withdraw' | 'lock' | 'unlock' | 'bet_placed' | 'bet_refund';
  amount: number;
  txHash?: string;
  createdAt: string;
};

/**
 * GET /api/wallet/activity?userId=<id>&limit=20&cursor=<ts-or-id>
 * Returns activity feed from wallet_transactions, escrow_locks, and prediction_entries
 * Stable, reverse-chronological ordering with cursor support
 */
walletActivity.get('/activity', async (req, res) => {
  try {
    const { userId, limit = '20', cursor } = req.query as {
      userId?: string;
      limit?: string;
      cursor?: string;
    };

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId query parameter is required',
        version: VERSION
      });
    }

    const limitNum = Math.min(parseInt(limit) || 20, 100);

    console.log(`[FCZ-PAY] Fetching activity for user: ${userId}, limit: ${limitNum}`);

    // Fetch wallet transactions (crypto only)
    // Support multiple provider formats: 'crypto-base-usdc', 'base/usdc', 'base-usdc'
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, direction, channel, amount, currency, external_ref, created_at, meta')
      .eq('user_id', userId)
      .in('provider', ['crypto-base-usdc', 'base/usdc', 'base-usdc'])
      .in('channel', ['crypto', 'escrow_deposit', 'escrow_withdraw', 'escrow_consumed'])
      .order('created_at', { ascending: false })
      .limit(limitNum * 2); // Fetch more to account for filtering

    if (txError) {
      console.error('[FCZ-PAY] Error fetching transactions:', txError);
    }

    // Fetch escrow locks
    const { data: locks, error: locksError } = await supabase
      .from('escrow_locks')
      .select('id, user_id, status, amount, tx_ref, created_at, prediction_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (locksError) {
      console.error('[FCZ-PAY] Error fetching escrow locks:', locksError);
    }

    // Fetch prediction entries (for bet_placed)
    const { data: entries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('id, user_id, prediction_id, amount, created_at, escrow_lock_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (entriesError) {
      console.error('[FCZ-PAY] Error fetching prediction entries:', entriesError);
    }

    // Map transactions to activity items
    const activityItems: ActivityItem[] = [];

    // Process transactions
    if (transactions) {
      for (const tx of transactions) {
        let kind: ActivityItem['kind'] | null = null;

        // Determine kind from channel and direction
        if (tx.channel === 'escrow_deposit' && tx.direction === 'credit') {
          kind = 'deposit';
        } else if (tx.channel === 'escrow_withdraw' && tx.direction === 'debit') {
          kind = 'withdraw';
        } else if (tx.channel === 'escrow_consumed' && tx.direction === 'debit') {
          kind = 'bet_placed';
        } else if (tx.channel === 'escrow_consumed' && tx.direction === 'credit') {
          kind = 'bet_refund';
        }

        if (kind) {
          activityItems.push({
            id: tx.id,
            kind,
            amount: Math.abs(Number(tx.amount || 0)),
            txHash: tx.external_ref || undefined,
            createdAt: tx.created_at
          });
        }
      }
    }

    // Process locks (only locked/unlocked, not consumed - consumed is handled by transactions)
    if (locks) {
      for (const lock of locks) {
        if (lock.status === 'locked') {
          activityItems.push({
            id: `lock_${lock.id}`,
            kind: 'lock',
            amount: Number(lock.amount || 0),
            txHash: lock.tx_ref || undefined,
            createdAt: lock.created_at
          });
        } else if (lock.status === 'released') {
          activityItems.push({
            id: `unlock_${lock.id}`,
            kind: 'unlock',
            amount: Number(lock.amount || 0),
            txHash: lock.tx_ref || undefined,
            createdAt: lock.created_at
          });
        }
      }
    }

    // Sort by created_at descending, then by id for stability
    activityItems.sort((a, b) => {
      const dateCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    });

    // Apply cursor if provided
    let items = activityItems;
    if (cursor) {
      const cursorIndex = items.findIndex(item => item.id === cursor || item.createdAt === cursor);
      if (cursorIndex >= 0) {
        items = items.slice(cursorIndex + 1);
      }
    }

    // Limit results
    items = items.slice(0, limitNum);

    console.log(`[FCZ-PAY] Found ${items.length} activity items for ${userId}`);

    return res.json({ items });
  } catch (error) {
    console.error('[FCZ-PAY] Unhandled error in wallet activity:', error);
    // Degrade gracefully - return an empty feed rather than erroring the UI
    return res.json({ items: [] });
  }
});

