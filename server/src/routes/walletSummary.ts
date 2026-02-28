import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { reconcileWallet } from '../services/walletReconciliation';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { getWalletBalanceAccountsSummary } from '../services/walletBalanceAccounts';

export const walletSummary = Router();

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
walletSummary.get('/summary/:userId', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  // Support path param: /summary/:userId
  const userId = req.params.userId;
  if (!req.user?.id || req.user.id !== userId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own wallet summary',
      version: VERSION,
    });
  }
  const { walletAddress, refresh } = req.query as {
    walletAddress?: string;
    refresh?: string;
  };

  return handleSummaryRequest(req, res, userId, walletAddress, refresh);
});

walletSummary.get('/summary', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
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
  if (!req.user?.id || req.user.id !== userId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own wallet summary',
      version: VERSION,
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

    // ALWAYS read wallet rows from DB (this must work regardless of crypto state)
    let demoAvailable = 0;
    let demoReserved = 0;
    let demoUpdatedAt = new Date().toISOString();
    let legacyCreatorEarnings = 0;
    let legacyStakeBalance = 0;
    try {
      const { data: demoWallet } = await supabase
        .from('wallets')
        .select('available_balance, reserved_balance, updated_at, creator_earnings_balance, stake_balance')
        .eq('user_id', userId)
        .eq('currency', 'DEMO_USD')
        .maybeSingle();
      if (demoWallet) {
        demoAvailable = Number(demoWallet.available_balance ?? 0);
        demoReserved = Number(demoWallet.reserved_balance ?? 0);
        legacyCreatorEarnings = Number(demoWallet.creator_earnings_balance ?? 0);
        legacyStakeBalance = Number(demoWallet.stake_balance ?? demoAvailable);
        demoUpdatedAt = demoWallet.updated_at || demoUpdatedAt;
      }
    } catch (demoErr) {
      console.warn('[FCZ-PAY] Demo wallet fetch failed (non-fatal):', demoErr);
    }

    let balanceAccounts = {
      demoCredits: demoAvailable,
      creatorEarnings: legacyCreatorEarnings,
      stakeBalance: legacyStakeBalance || demoAvailable,
      stakeReserved: demoReserved,
    };
    try {
      balanceAccounts = await getWalletBalanceAccountsSummary(userId);
    } catch (balanceErr) {
      console.warn('[FCZ-PAY] wallet balance accounts fetch failed, using legacy fallback:', balanceErr);
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

    const response = {
      currency: 'USD' as const,
      // Demo rail (DB ledger)
      available: Number(demoAvailable.toFixed(2)),
      reserved: Number(demoReserved.toFixed(2)),
      total: Number((demoAvailable + demoReserved).toFixed(2)),
      // Crypto rail (on-chain escrow) — zeros when crypto unavailable
      escrowUSDC: Number(cryptoEscrow.toFixed(2)),
      reservedUSDC: Number(cryptoReserved.toFixed(2)),
      availableToStakeUSDC: Number(cryptoAvailable.toFixed(2)),
      totalDepositedUSDC: Number(cryptoTotalDeposited.toFixed(2)),
      totalWithdrawnUSDC: Number(cryptoTotalWithdrawn.toFixed(2)),
      // Combined totals for UI convenience
      available_total: Number((demoAvailable + cryptoAvailable).toFixed(2)),
      reserved_total: Number((demoReserved + cryptoReserved).toFixed(2)),
      // Metadata
      walletAddress: resolvedWalletAddress,
      lastUpdated,
      updatedAt: lastUpdated,
      source: cryptoSource || 'db',
      balances: {
        demoCredits: Number((balanceAccounts.demoCredits ?? demoAvailable).toFixed(2)),
        creatorEarnings: Number((balanceAccounts.creatorEarnings ?? legacyCreatorEarnings).toFixed(2)),
        stakeBalance: Number((balanceAccounts.stakeBalance ?? legacyStakeBalance ?? demoAvailable).toFixed(2)),
      },
      demoCredits: Number((balanceAccounts.demoCredits ?? demoAvailable).toFixed(2)),
      creatorEarnings: Number((balanceAccounts.creatorEarnings ?? legacyCreatorEarnings).toFixed(2)),
      stakeBalance: Number((balanceAccounts.stakeBalance ?? legacyStakeBalance ?? demoAvailable).toFixed(2)),
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
      balances: { demoCredits: 0, creatorEarnings: 0, stakeBalance: 0 },
      demoCredits: 0,
      creatorEarnings: 0,
      stakeBalance: 0,
      walletAddress: null,
      lastUpdated: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    });
  }
}
