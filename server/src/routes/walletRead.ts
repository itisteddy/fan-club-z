import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { reconcileWallet } from '../services/walletReconciliation';

export const walletRead = Router();

/**
 * GET /api/wallet/summary/:userId
 * Get wallet summary (available, reserved, total)
 * Uses v_wallet_summary view for fast reads
 */
walletRead.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const rawWalletAddr = (req.query?.walletAddress as string | undefined)?.toLowerCase?.() || undefined;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId is required',
        version: VERSION
      });
    }

    console.log(`[walletRead] Fetching summary for user: ${userId}`);

    // Get database wallet balance (source of truth for available funds after settlements)
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('available_balance, reserved_balance, total_deposited, total_withdrawn, updated_at')
      .eq('user_id', userId)
      .eq('currency', 'USD')
      .maybeSingle();

    if (walletError) {
      console.error('[walletRead] Error fetching wallet:', walletError);
    }

    // Fetch most recent linked wallet address (if any)
    const { data: addressRow } = await supabase
      .from('crypto_addresses')
      .select('address')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Determine preferred wallet address: prefer caller-provided value if present
    const preferredAddress = rawWalletAddr || addressRow?.address || null;

    // Also fetch on-chain escrow snapshot to power available/reserved/escrow in UI
    let onchain: Awaited<ReturnType<typeof reconcileWallet>> | null = null;
    try {
      onchain = await reconcileWallet({
        userId,
        walletAddress: preferredAddress ?? undefined
      });
    } catch (reconErr) {
      console.warn('[walletRead] On-chain reconcile failed; falling back to cached DB balances', reconErr);
    }

    // Persist association of wallet address to user for future calls (best-effort)
    try {
      if (rawWalletAddr) {
        await supabase
          .from('crypto_addresses')
          .upsert(
            {
              user_id: userId,
              chain_id: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
              address: rawWalletAddr,
            },
            { onConflict: 'chain_id,address' }
          );
      }
    } catch (addrErr) {
      console.warn('[walletRead] Failed to upsert crypto address:', addrErr);
    }

    // Use database balance as the source of truth
    // After settlement, the database wallet is updated with winnings
    const available = Number(wallet?.available_balance ?? 0);
    const reserved = Number(wallet?.reserved_balance ?? 0);
    const total = available + reserved;

    const summary = {
      user_id: userId,
      currency: 'USD',
      available: Number(available.toFixed(2)),
      reserved: Number(reserved.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalDeposited: Number((wallet?.total_deposited ?? 0).toFixed(2)),
      totalWithdrawn: Number((wallet?.total_withdrawn ?? 0).toFixed(2)),
      updatedAt: wallet?.updated_at ?? new Date().toISOString(),
      walletAddress: preferredAddress,
      // Populate escrow metrics from on-chain snapshot when available
      availableToStakeUSDC: Number(
        (onchain?.availableToStakeUSDC ??
          (Number.isFinite(available) && Number.isFinite(reserved) ? Math.max(0, total - reserved) : 0)
        ).toFixed(2)
      ),
      reservedUSDC: Number((onchain?.reservedUSDC ?? reserved).toFixed(2)),
      escrowUSDC: Number((onchain?.escrowUSDC ?? total).toFixed(2))
    };

    console.log(`[walletRead] Summary for ${userId}:`, summary);

    return res.json(summary);
  } catch (error) {
    console.error('[walletRead] Unhandled error (degraded to 200):', error);
    try {
      // Best-effort degraded response
      const { userId } = req.params;
      return res.json({
        user_id: userId,
        currency: 'USD',
        available: 0,
        reserved: 0,
        total: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        updatedAt: new Date().toISOString(),
        walletAddress: null,
        availableToStakeUSDC: 0,
        reservedUSDC: 0,
        escrowUSDC: 0,
        version: VERSION,
      });
    } catch {
      return res.status(200).json({});
    }
  }
});

/**
 * GET /api/wallet/activity
 * Get wallet activity feed
 * Query params: userId (required), limit (optional, default 25)
 */
walletRead.get('/activity', async (req, res) => {
  try {
    const { userId, limit = '25' } = req.query as { userId?: string; limit?: string };

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userId query parameter is required',
        version: VERSION
      });
    }

    const limitNum = Math.min(parseInt(limit) || 25, 200); // Max 200

    console.log(`[walletRead] Fetching activity for user: ${userId}, limit: ${limitNum}`);

    // Query wallet_transactions with provider filter
    // Note: platform_fee is excluded from all users (internal platform revenue)
    // creator_fee is shown to creators who earned it
    const allowedChannels = ['escrow_deposit', 'escrow_withdraw', 'escrow_consumed', 'escrow_released', 'escrow_unlock', 'payout', 'creator_fee', 'settlement_loss'];

    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, channel, amount, currency, created_at, meta, provider, status, type, description, tx_hash, prediction_id, entry_id')
      .eq('user_id', userId)
      .in('channel', allowedChannels)
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (error) {
      console.error('[walletRead] Error fetching activity:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch wallet activity',
        version: VERSION
      });
    }

    // Map transactions to activity items
    const items = (transactions || []).map((t) => {
      let kind: 'deposit' | 'withdraw' | 'lock' | 'unlock' | 'bet_placed' | 'bet_refund' | 'payout' | 'creator_fee' | 'loss' | 'refund';

      switch (t.channel) {
        case 'escrow_deposit':
          kind = 'deposit';
          break;
        case 'escrow_withdraw':
          kind = 'withdraw';
          break;
        case 'escrow_consumed':
          // If consumed with loss reason after settlement, show as loss; else during bet placement show as placed
          kind = (t.meta && (t.meta.reason === 'loss' || t.meta.reason === 'settled_loss')) ? 'loss' : 'bet_placed';
          break;
        case 'escrow_released':
        case 'escrow_unlock':
          kind = t.meta && t.meta.reason === 'refund' ? 'refund' : 'unlock';
          break;
        case 'payout':
          kind = 'payout';
          break;
        case 'settlement_loss':
          kind = 'loss';
          break;
        case 'creator_fee':
          kind = 'creator_fee';
          break;
        default:
          kind = 'withdraw';
      }

      return {
        id: t.id,
        user_id: t.user_id,
        kind,
        amount: Number(t.amount || 0),
        currency: (t.currency || 'USD') as 'USD' | 'USDC',
        created_at: t.created_at,
        provider: t.provider,
        status: t.status,
        description: t.description,
        tx_hash: t.tx_hash,
        prediction_id: t.prediction_id,
        entry_id: t.entry_id,
        meta: t.meta || {}
      };
    });

    console.log(`[walletRead] Found ${items.length} activity items for ${userId}`);

    return res.json({ items });
  } catch (error) {
    console.error('[walletRead] Unhandled error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch wallet activity',
      version: VERSION
    });
  }
});

