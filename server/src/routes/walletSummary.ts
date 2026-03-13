import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { reconcileWallet } from '../services/walletReconciliation';
import {
  getWalletBalanceAccountsSummary,
  getCreatorEarningsMilestoneSummary,
} from '../services/walletBalanceAccounts';

export const walletSummary = Router();

async function ensureInAppWalletRow(userId: string) {
  await supabase
    .from('wallets')
    .upsert(
      {
        user_id: userId,
        currency: 'DEMO_USD',
        available_balance: 0,
        reserved_balance: 0,
        demo_credits_balance: 0,
        creator_earnings_balance: 0,
        stake_balance: 0,
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: 'user_id,currency', ignoreDuplicates: true }
    );
}

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

/**
 * GET /api/wallet/summary?userId=<id> OR /api/wallet/summary/:userId
 * Returns escrow summary (escrow locks only)
 * 
 * NOTE: walletUSDC is NOT returned here - it must come from on-chain data
 * via useUSDCBalance hook (reading ERC20 balanceOf from blockchain)
 * 
 * [PERF] Caching: private, max-age=15, ETag support for 304 responses
 * 
 * Response:
 * {
 *   currency: 'USD',
 *   escrowUSDC: number,        // total locked in escrow (from escrow_locks)
 *   reservedUSDC: number,      // reserved/locks pending consumption
 *   availableToStakeUSDC: number, // calculated from escrow data
 *   lastUpdated: string
 * }
 */
walletSummary.get('/summary/:userId', async (req, res) => {
  // Support path param: /summary/:userId
  const userId = req.params.userId;
  const { walletAddress, refresh } = req.query as {
    walletAddress?: string;
    refresh?: string;
  };

  return handleSummaryRequest(req, res, userId, walletAddress, refresh);
});

walletSummary.get('/summary', async (req, res) => {
  // Support query param: /summary?userId=...
  const { userId, walletAddress, refresh } = req.query as {
    userId?: string;
    walletAddress?: string;
    refresh?: string;
  };

  if (!userId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userId query parameter is required',
      version: VERSION
    });
  }

  return handleSummaryRequest(req, res, userId, walletAddress, refresh);
});

async function handleSummaryRequest(
  req: any,
  res: any,
  userId: string,
  walletAddress?: string,
  refresh?: string
) {
  try {
    console.log(`[FCZ-PAY] Fetching wallet summary for user: ${userId}`);

    // Harden bootstrap: ensure in-app wallet row exists for active summary reads.
    // Keep non-fatal to preserve existing fallback response behavior.
    try {
      await ensureInAppWalletRow(userId);
    } catch (bootstrapErr) {
      console.warn('[FCZ-PAY] wallet bootstrap upsert failed (non-fatal):', bootstrapErr);
    }

    // ALWAYS read demo wallet from DB (this must work regardless of crypto state)
    let demoAvailable = 0;
    let demoReserved = 0;
    let demoUpdatedAt = new Date().toISOString();
    try {
      const { data: demoWallet } = await supabase
        .from('wallets')
        .select('available_balance, reserved_balance, updated_at')
        .eq('user_id', userId)
        .eq('currency', 'DEMO_USD')
        .maybeSingle();
      if (demoWallet) {
        demoAvailable = Number(demoWallet.available_balance ?? 0);
        demoReserved = Number(demoWallet.reserved_balance ?? 0);
        demoUpdatedAt = demoWallet.updated_at || demoUpdatedAt;
      }
    } catch (demoErr) {
      console.warn('[FCZ-PAY] Demo wallet fetch failed (non-fatal):', demoErr);
    }

    // Best-effort: read crypto/escrow balances via on-chain reconciliation
    let cryptoEscrow = 0;
    let cryptoReserved = 0;
    let cryptoAvailable = 0;
    let cryptoTotalDeposited = 0;
    let cryptoTotalWithdrawn = 0;
    let resolvedWalletAddress: string | null = walletAddress || null;
    let cryptoSource: string | null = null;
    let cryptoUpdatedAt: string | null = null;

    try {
      const summary = await reconcileWallet({
        userId,
        walletAddress: walletAddress ?? undefined,
        recordTransactions: refresh === '1',
      });
      cryptoEscrow = summary.escrowUSDC;
      cryptoReserved = summary.reservedUSDC;
      cryptoAvailable = summary.availableToStakeUSDC;
      cryptoTotalDeposited = summary.totalDepositedUSDC;
      cryptoTotalWithdrawn = summary.totalWithdrawnUSDC;
      resolvedWalletAddress = summary.walletAddress || resolvedWalletAddress;
      cryptoSource = summary.source;
      cryptoUpdatedAt = summary.updatedAt;

      // Persist wallet address association if missing
      if (summary.walletAddress) {
        try {
          await supabase
            .from('crypto_addresses')
            .upsert(
              {
                user_id: userId,
                chain_id: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
                address: summary.walletAddress,
              },
              { onConflict: 'chain_id,address' }
            );
        } catch {
          // non-fatal
        }
      }
    } catch (reconcileErr) {
      console.warn('[FCZ-PAY] reconcileWallet failed — returning demo balances only:', reconcileErr);
      // Do NOT 503 — return demo balances so the UI isn't blank
    }

    const lastUpdated = cryptoUpdatedAt || demoUpdatedAt;
    let balanceAccounts = {
      demoCredits: demoAvailable,
      creatorEarnings: 0,
      stakeBalance: demoAvailable,
      stakeReserved: demoReserved,
      bucketBalances: {
        claimZaurum: 0,
        wonZaurum: 0,
        creatorFeeZaurum: 0,
        legacyMigratedZaurum: 0,
      },
    };
    let creatorMilestones = {
      cumulativeCredited: 0,
      first10ZaurumEarned: false,
      first10Label: 'First 10 Zaurum earned' as const,
    };
    try {
      balanceAccounts = await getWalletBalanceAccountsSummary(userId);
      creatorMilestones = await getCreatorEarningsMilestoneSummary(userId);
    } catch (balanceErr) {
      console.warn('[FCZ-PAY] explicit wallet balance accounts failed (non-fatal):', balanceErr);
    }

    const visibleAvailable = Number(demoAvailable.toFixed(2));
    const visibleReserved = Number(demoReserved.toFixed(2));
    const visibleTotal = Number((demoAvailable + demoReserved).toFixed(2));

    const response = {
      currency: 'USD' as const,
      // Demo rail (DB ledger)
      available: visibleAvailable,
      reserved: visibleReserved,
      total: visibleTotal,
      // Crypto rail (on-chain escrow) — zeros when crypto unavailable
      escrowUSDC: Number(cryptoEscrow.toFixed(2)),
      reservedUSDC: Number(cryptoReserved.toFixed(2)),
      availableToStakeUSDC: Number(cryptoAvailable.toFixed(2)),
      totalDepositedUSDC: Number(cryptoTotalDeposited.toFixed(2)),
      totalWithdrawnUSDC: Number(cryptoTotalWithdrawn.toFixed(2)),
      // Combined totals for UI convenience
      available_total: Number((demoAvailable + cryptoAvailable).toFixed(2)),
      reserved_total: Number((demoReserved + cryptoReserved).toFixed(2)),
      // Explicit wallet account balances (A2/A4 compatibility)
      balances: {
        // Compatibility alias: always mirror visible available to avoid legacy drift.
        demoCredits: visibleAvailable,
        creatorEarnings: Number((balanceAccounts.creatorEarnings ?? 0).toFixed(2)),
        stakeBalance: Number((balanceAccounts.stakeBalance ?? demoAvailable).toFixed(2)),
        creatorEarningsCumulative: Number((creatorMilestones.cumulativeCredited ?? 0).toFixed(2)),
        claimZaurum: Number((balanceAccounts.bucketBalances?.claimZaurum ?? 0).toFixed(2)),
        wonZaurum: Number((balanceAccounts.bucketBalances?.wonZaurum ?? 0).toFixed(2)),
        creatorFeeZaurum: Number((balanceAccounts.bucketBalances?.creatorFeeZaurum ?? 0).toFixed(2)),
        legacyMigratedZaurum: Number((balanceAccounts.bucketBalances?.legacyMigratedZaurum ?? 0).toFixed(2)),
      },
      // Compatibility alias: always mirror visible available to avoid legacy drift.
      demoCredits: visibleAvailable,
      creatorEarnings: Number((balanceAccounts.creatorEarnings ?? 0).toFixed(2)),
      stakeBalance: Number((balanceAccounts.stakeBalance ?? demoAvailable).toFixed(2)),
      creatorEarningsCumulative: Number((creatorMilestones.cumulativeCredited ?? 0).toFixed(2)),
      claimZaurum: Number((balanceAccounts.bucketBalances?.claimZaurum ?? 0).toFixed(2)),
      wonZaurum: Number((balanceAccounts.bucketBalances?.wonZaurum ?? 0).toFixed(2)),
      creatorFeeZaurum: Number((balanceAccounts.bucketBalances?.creatorFeeZaurum ?? 0).toFixed(2)),
      legacyMigratedZaurum: Number((balanceAccounts.bucketBalances?.legacyMigratedZaurum ?? 0).toFixed(2)),
      milestones: {
        first10ZaurumEarned: creatorMilestones.first10ZaurumEarned,
        first10Label: creatorMilestones.first10Label,
      },
      // Metadata
      walletAddress: resolvedWalletAddress,
      lastUpdated,
      updatedAt: lastUpdated,
      source: cryptoSource || 'db',
    };

    console.log(`[FCZ-PAY] Wallet summary for ${userId}:`, {
      demo: { available: demoAvailable, reserved: demoReserved },
      crypto: { escrow: cryptoEscrow, available: cryptoAvailable, reserved: cryptoReserved },
    });

    // [PERF] Generate ETag and check for conditional GET (304 response)
    const etag = generateETag(response);
    const ifNoneMatch = req.headers['if-none-match'];
    
    if (ifNoneMatch && ifNoneMatch === etag) {
      return res.status(304).end();
    }

    res.setHeader('Cache-Control', 'private, max-age=15');
    res.setHeader('ETag', etag);

    return res.json(response);
  } catch (error) {
    console.error('[FCZ-PAY] Unhandled error in wallet summary:', error);
    // Return zeros instead of 503 — ensures UI always gets a valid response
    return res.json({
      currency: 'USD',
      available: 0, reserved: 0, total: 0,
      escrowUSDC: 0, reservedUSDC: 0, availableToStakeUSDC: 0,
      totalDepositedUSDC: 0, totalWithdrawnUSDC: 0,
      available_total: 0, reserved_total: 0,
      balances: { demoCredits: 0, creatorEarnings: 0, stakeBalance: 0, creatorEarningsCumulative: 0 },
      demoCredits: 0,
      creatorEarnings: 0,
      stakeBalance: 0,
      creatorEarningsCumulative: 0,
      milestones: { first10ZaurumEarned: false, first10Label: 'First 10 Zaurum earned' },
      walletAddress: null,
      lastUpdated: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    });
  }
}
