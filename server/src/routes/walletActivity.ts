import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

export const walletActivity = Router();

export type ActivityItem = {
  id: string;
  kind: 'deposit' | 'withdraw' | 'lock' | 'unlock' | 'bet_placed' | 'bet_refund' | 'claim' | 'settlement' | 'creator_fee' | 'platform_fee' | 'win' | 'loss' | 'payout';
  amount: number;
  txHash?: string;
  createdAt: string;
  predictionTitle?: string;
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
    // Support multiple provider formats: 'crypto-base-usdc', 'base/usdc', 'base-usdc', 'onchain-escrow'
    // Include ALL channels: deposits, withdraws, payouts (wins), losses, fees
    const { data: transactions, error: txError } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, direction, channel, amount, currency, external_ref, created_at, meta, provider, type, description, prediction_id, entry_id, tx_hash')
      .eq('user_id', userId)
      .in('provider', ['crypto-base-usdc', 'base/usdc', 'base-usdc', 'onchain-escrow'])
      .in('channel', [
        'crypto', 
        'escrow_deposit', 
        'escrow_withdraw', 
        'escrow_consumed',
        'payout',           // Settlement win payout
        'settlement_loss',  // Settlement loss record
        'creator_fee',      // Creator fee received
        'platform_fee',     // Platform fee
        'escrow_unlock'     // Escrow release/unlock
      ])
      .order('created_at', { ascending: false })
      .limit(limitNum * 2); // Fetch more to account for filtering

    if (txError) {
      console.error('[FCZ-PAY] Error fetching transactions:', txError);
    }

    // Fetch blockchain transactions (all types)
    const { data: blockchainTx, error: blockchainError } = await supabase
      .from('blockchain_transactions')
      .select('id, user_id, tx_hash, type, status, amount, created_at, wallet_address, metadata')
      .eq('user_id', userId)
      .in('type', ['deposit', 'withdraw', 'approval', 'settlement', 'claim', 'fee', 'bet_lock', 'bet_release'])
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (blockchainError) {
      console.error('[FCZ-PAY] Error fetching blockchain transactions:', blockchainError);
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

    // Process wallet transactions
    if (transactions) {
      for (const tx of transactions) {
        let kind: ActivityItem['kind'] | null = null;
        let description = tx.description || '';

        // Determine kind from channel and direction
        if (tx.channel === 'escrow_deposit' && tx.direction === 'credit') {
          kind = 'deposit';
          description = description || 'Deposited USDC to escrow';
        } else if (tx.channel === 'escrow_withdraw' && tx.direction === 'debit') {
          kind = 'withdraw';
          description = description || 'Withdrew USDC from escrow';
        } else if (tx.channel === 'escrow_consumed' && tx.direction === 'debit') {
          kind = 'bet_placed';
          description = description || 'Bet placed';
        } else if (tx.channel === 'escrow_consumed' && tx.direction === 'credit') {
          kind = 'bet_refund';
          description = description || 'Bet refunded';
        } else if (tx.channel === 'payout' && tx.direction === 'credit') {
          // Win payout from settlement
          kind = 'win';
          description = description || 'Won prediction';
        } else if (tx.channel === 'settlement_loss') {
          // Loss recorded at settlement
          kind = 'loss';
          description = description || 'Lost prediction';
        } else if (tx.channel === 'creator_fee' && tx.direction === 'credit') {
          kind = 'creator_fee';
          description = description || 'Creator fee received';
        } else if (tx.channel === 'platform_fee' && tx.direction === 'credit') {
          kind = 'platform_fee';
          description = description || 'Platform fee';
        } else if (tx.channel === 'escrow_unlock' && tx.direction === 'credit') {
          kind = 'unlock';
          description = description || 'Funds unlocked';
        }

        if (kind) {
          // Return structure that matches what normalizeWalletTransaction expects
          activityItems.push({
            id: tx.id,
            kind,
            amount: Math.abs(Number(tx.amount || 0)),
            txHash: tx.tx_hash || tx.external_ref || undefined,
            createdAt: tx.created_at,
            // Include additional fields for normalization
            user_id: tx.user_id,
            type: tx.type,
            channel: tx.channel,
            direction: tx.direction,
            currency: tx.currency,
            provider: tx.provider,
            description,
            prediction_id: tx.prediction_id,
            entry_id: tx.entry_id,
            meta: tx.meta || {},
            external_ref: tx.external_ref,
            created_at: tx.created_at
          } as any);
        }
      }
    }

    // Process blockchain transactions (all types from on-chain)
    if (blockchainTx) {
      for (const tx of blockchainTx) {
        let kind: ActivityItem['kind'] | null = null;
        let description = '';
        
        switch (tx.type) {
          case 'deposit':
            kind = 'deposit';
            description = 'Deposited USDC';
            break;
          case 'withdraw':
            kind = 'withdraw';
            description = 'Withdrew USDC';
            break;
          case 'claim':
            kind = 'claim';
            description = 'Claimed winnings';
            break;
          case 'settlement':
            kind = 'settlement';
            description = 'Settlement posted';
            break;
          case 'fee':
            kind = 'creator_fee';
            description = 'Creator fee received';
            break;
          case 'bet_lock':
            kind = 'lock';
            description = 'Bet locked';
            break;
          case 'bet_release':
            kind = 'unlock';
            description = 'Bet released';
            break;
        }
        
        if (kind) {
          // Check if we already have this tx (by tx_hash match with external_ref)
          const alreadyExists = activityItems.some(item => 
            item.txHash && tx.tx_hash && item.txHash.toLowerCase() === tx.tx_hash.toLowerCase()
          );
          
          if (!alreadyExists) {
            const predictionId = tx.metadata?.predictionId || tx.metadata?.prediction_id || null;
            activityItems.push({
              id: `bc_${tx.id}`,
              kind,
              amount: Math.abs(Number(tx.amount || 0)),
              txHash: tx.tx_hash || undefined,
              createdAt: tx.created_at,
              user_id: tx.user_id,
              type: ['deposit', 'claim', 'creator_fee', 'unlock'].includes(kind) ? 'credit' : 'debit',
              channel: `blockchain_${tx.type}`,
              direction: ['deposit', 'claim', 'creator_fee', 'unlock'].includes(kind) ? 'credit' : 'debit',
              currency: 'USD',
              provider: 'crypto-base-usdc',
              description,
              prediction_id: predictionId,
              entry_id: null,
              meta: tx.metadata || {},
              external_ref: tx.tx_hash,
              created_at: tx.created_at
            } as any);
          }
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
            createdAt: lock.created_at,
            // Include fields for normalization compatibility
            user_id: lock.user_id,
            type: 'debit',
            channel: 'escrow_locked',
            direction: 'debit',
            currency: 'USD',
            provider: 'crypto-base-usdc',
            description: 'Funds locked',
            prediction_id: lock.prediction_id,
            meta: {},
            external_ref: lock.tx_ref,
            created_at: lock.created_at
          } as any);
        } else if (lock.status === 'released') {
          activityItems.push({
            id: `unlock_${lock.id}`,
            kind: 'unlock',
            amount: Number(lock.amount || 0),
            txHash: lock.tx_ref || undefined,
            createdAt: lock.created_at,
            // Include fields for normalization compatibility
            user_id: lock.user_id,
            type: 'credit',
            channel: 'escrow_released',
            direction: 'credit',
            currency: 'USD',
            provider: 'crypto-base-usdc',
            description: 'Funds released',
            prediction_id: lock.prediction_id,
            meta: {},
            external_ref: lock.tx_ref,
            created_at: lock.created_at
          } as any);
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

    console.log(`[FCZ-PAY] Found ${items.length} activity items for ${userId}`, {
      depositCount: items.filter(i => i.kind === 'deposit').length,
      withdrawCount: items.filter(i => i.kind === 'withdraw').length,
      winCount: items.filter(i => i.kind === 'win').length,
      lossCount: items.filter(i => i.kind === 'loss').length,
      claimCount: items.filter(i => i.kind === 'claim').length,
      creatorFeeCount: items.filter(i => i.kind === 'creator_fee').length,
      lockCount: items.filter(i => i.kind === 'lock').length,
      sampleItems: items.slice(0, 5).map(i => ({ id: i.id, kind: i.kind, amount: i.amount, channel: (i as any).channel }))
    });

    // [PERF] Generate ETag and check for conditional GET (304 response)
    const etag = generateETag(items);
    const ifNoneMatch = req.headers['if-none-match'];
    
    if (ifNoneMatch && ifNoneMatch === etag) {
      // [PERF] Return 304 Not Modified if ETag matches
      return res.status(304).end();
    }

    // [PERF] Set caching headers for activity feed
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.setHeader('ETag', etag);

    return res.json({ items });
  } catch (error) {
    console.error('[FCZ-PAY] Unhandled error in wallet activity:', error);
    // Degrade gracefully - return an empty feed rather than erroring the UI
    return res.json({ items: [] });
  }
});

