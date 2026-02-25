import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { reconcileWallet } from '../services/walletReconciliation';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import {
  getWalletBalanceAccountsSummary,
  listCreatorEarningsHistory,
  transferCreatorEarningsToStake,
  WalletBalanceError,
} from '../services/walletBalanceAccounts';

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

export const walletRead = Router();

const TransferCreatorEarningsSchema = z.object({
  amount: z.number().positive(),
});

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
      .select('available_balance, reserved_balance, total_deposited, total_withdrawn, updated_at, stake_balance, creator_earnings_balance')
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
    let balanceAccounts: {
      demoCredits: number;
      creatorEarnings: number;
      stakeBalance: number;
      stakeReserved: number;
    };
    try {
      balanceAccounts = await getWalletBalanceAccountsSummary(userId);
    } catch (balanceErr) {
      console.warn('[walletRead] Failed to load explicit balance accounts, falling back:', balanceErr);
      balanceAccounts = {
        demoCredits: 0,
        creatorEarnings: Number(wallet?.creator_earnings_balance ?? 0),
        stakeBalance: Number(wallet?.stake_balance ?? wallet?.available_balance ?? 0),
        stakeReserved: Number(wallet?.reserved_balance ?? 0),
      };
    }

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
      balances: {
        demoCredits: Number((balanceAccounts.demoCredits ?? 0).toFixed(2)),
        creatorEarnings: Number((balanceAccounts.creatorEarnings ?? 0).toFixed(2)),
        stakeBalance: Number((balanceAccounts.stakeBalance ?? available).toFixed(2)),
      },
      demoCredits: Number((balanceAccounts.demoCredits ?? 0).toFixed(2)),
      creatorEarnings: Number((balanceAccounts.creatorEarnings ?? 0).toFixed(2)),
      stakeBalance: Number((balanceAccounts.stakeBalance ?? available).toFixed(2)),
      legacyAvailableBalance: Number(available.toFixed(2)),
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

    // [PERF] Generate ETag and check for conditional GET (304 response)
    const etag = generateETag(summary);
    const ifNoneMatch = req.headers['if-none-match'];
    
    if (ifNoneMatch && ifNoneMatch === etag) {
      // [PERF] Return 304 Not Modified if ETag matches
      return res.status(304).end();
    }

    // [PERF] Set caching headers for wallet summary
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.setHeader('ETag', etag);

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
        balances: { demoCredits: 0, creatorEarnings: 0, stakeBalance: 0 },
        demoCredits: 0,
        creatorEarnings: 0,
        stakeBalance: 0,
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

walletRead.post('/transfer-creator-earnings', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
    }

    const parsed = TransferCreatorEarningsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'invalid_body',
        message: 'Invalid transfer payload',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const result = await transferCreatorEarningsToStake({
      userId: req.user.id,
      amount: parsed.data.amount,
    });

    const accounts = await getWalletBalanceAccountsSummary(req.user.id);

    return res.json({
      ok: true,
      transactionId: result.transactionId,
      balances: {
        demoCredits: Number(accounts.demoCredits.toFixed(2)),
        creatorEarnings: Number(accounts.creatorEarnings.toFixed(2)),
        stakeBalance: Number(accounts.stakeBalance.toFixed(2)),
      },
      version: VERSION,
    });
  } catch (error) {
    if (error instanceof WalletBalanceError) {
      return res.status(error.status).json({
        error: error.code,
        message: error.message,
        version: VERSION,
      });
    }
    console.error('[walletRead] transfer creator earnings failed:', error);
    return res.status(500).json({
      error: 'internal',
      message: 'Failed to move creator earnings to balance',
      version: VERSION,
    });
  }
});

walletRead.get('/creator-earnings/history', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
    }
    const limit = Number((req.query as any)?.limit ?? 20);
    const items = await listCreatorEarningsHistory(req.user.id, limit);
    return res.json({ ok: true, items, version: VERSION });
  } catch (error) {
    console.error('[walletRead] creator earnings history failed:', error);
    return res.status(500).json({
      error: 'internal',
      message: 'Failed to load creator earnings history',
      version: VERSION,
    });
  }
});

// NOTE: /activity route has been moved to walletActivity.ts to avoid duplicate routes
// The walletActivity route properly handles deposits, withdrawals, and locks with correct normalization
