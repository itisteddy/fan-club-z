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

// NOTE: /activity route has been moved to walletActivity.ts to avoid duplicate routes
// The walletActivity route properly handles deposits, withdrawals, and locks with correct normalization

