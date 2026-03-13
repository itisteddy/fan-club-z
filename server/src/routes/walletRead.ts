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
  getCreatorEarningsMilestoneSummary,
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

    // USD wallet carries creator earnings and legacy accounting fields.
    const { data: walletUsd, error: walletError } = await supabase
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

    // Demo wallet row is the canonical user-facing available/locked source for Zaurum.
    const { data: walletDemo, error: walletDemoError } = await supabase
      .from('wallets')
      .select('available_balance, reserved_balance, total_deposited, total_withdrawn, updated_at')
      .eq('user_id', userId)
      .eq('currency', 'DEMO_USD')
      .maybeSingle();

    if (walletDemoError) {
      console.error('[walletRead] Error fetching demo wallet:', walletDemoError);
    }
    let balanceAccounts: {
      demoCredits: number;
      creatorEarnings: number;
      stakeBalance: number;
      stakeReserved: number;
      bucketBalances: {
        claimZaurum: number;
        wonZaurum: number;
        creatorFeeZaurum: number;
        legacyMigratedZaurum: number;
      };
    };
    try {
      balanceAccounts = await getWalletBalanceAccountsSummary(userId);
    } catch (balanceErr) {
      console.warn('[walletRead] Failed to load explicit balance accounts, falling back:', balanceErr);
      balanceAccounts = {
        demoCredits: 0,
        creatorEarnings: Number(walletUsd?.creator_earnings_balance ?? 0),
        stakeBalance: Number(walletDemo?.available_balance ?? 0),
        stakeReserved: Number(walletDemo?.reserved_balance ?? 0),
        bucketBalances: {
          claimZaurum: 0,
          wonZaurum: 0,
          creatorFeeZaurum: 0,
          legacyMigratedZaurum: 0,
        },
      };
    }

    const available = Number(walletDemo?.available_balance ?? balanceAccounts.demoCredits ?? 0);
    const reserved = Number(walletDemo?.reserved_balance ?? balanceAccounts.stakeReserved ?? 0);
    const total = available + reserved;

    const summary = {
      user_id: userId,
      currency: 'USD',
      available: Number(available.toFixed(2)),
      reserved: Number(reserved.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalDeposited: Number((walletDemo?.total_deposited ?? walletUsd?.total_deposited ?? 0).toFixed(2)),
      totalWithdrawn: Number((walletDemo?.total_withdrawn ?? walletUsd?.total_withdrawn ?? 0).toFixed(2)),
      updatedAt: walletDemo?.updated_at ?? walletUsd?.updated_at ?? new Date().toISOString(),
      walletAddress: preferredAddress,
      balances: {
        demoCredits: Number((balanceAccounts.demoCredits ?? 0).toFixed(2)),
        creatorEarnings: Number((balanceAccounts.creatorEarnings ?? 0).toFixed(2)),
        stakeBalance: Number((balanceAccounts.stakeBalance ?? available).toFixed(2)),
        claimZaurum: Number((balanceAccounts.bucketBalances.claimZaurum ?? 0).toFixed(2)),
        wonZaurum: Number((balanceAccounts.bucketBalances.wonZaurum ?? 0).toFixed(2)),
        creatorFeeZaurum: Number((balanceAccounts.bucketBalances.creatorFeeZaurum ?? 0).toFixed(2)),
        legacyMigratedZaurum: Number((balanceAccounts.bucketBalances.legacyMigratedZaurum ?? 0).toFixed(2)),
      },
      demoCredits: Number((balanceAccounts.demoCredits ?? 0).toFixed(2)),
      creatorEarnings: Number((balanceAccounts.creatorEarnings ?? 0).toFixed(2)),
      stakeBalance: Number((balanceAccounts.stakeBalance ?? available).toFixed(2)),
      claimZaurum: Number((balanceAccounts.bucketBalances.claimZaurum ?? 0).toFixed(2)),
      wonZaurum: Number((balanceAccounts.bucketBalances.wonZaurum ?? 0).toFixed(2)),
      creatorFeeZaurum: Number((balanceAccounts.bucketBalances.creatorFeeZaurum ?? 0).toFixed(2)),
      legacyMigratedZaurum: Number((balanceAccounts.bucketBalances.legacyMigratedZaurum ?? 0).toFixed(2)),
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
      requestId: typeof (req.body as any)?.requestId === 'string' ? (req.body as any).requestId : undefined,
    });

    const accounts = await getWalletBalanceAccountsSummary(req.user.id);
    const milestone = await getCreatorEarningsMilestoneSummary(req.user.id);

    return res.json({
      ok: true,
      applied: result.applied,
      transactionId: result.transactionId,
      balances: {
        demoCredits: Number(accounts.demoCredits.toFixed(2)),
        creatorEarnings: Number(accounts.creatorEarnings.toFixed(2)),
        stakeBalance: Number(accounts.stakeBalance.toFixed(2)),
        creatorEarningsCumulative: Number(milestone.cumulativeCredited.toFixed(2)),
      },
      milestones: {
        first10ZaurumEarned: milestone.first10ZaurumEarned,
        first10Label: milestone.first10Label,
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
