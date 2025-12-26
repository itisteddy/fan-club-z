import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { reconcileWallet } from '../services/walletReconciliation';

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

    let summary;
    try {
      summary = await reconcileWallet({
        userId,
        walletAddress: walletAddress ?? undefined,
        recordTransactions: refresh === '1',
      });
    } catch (reconcileErr) {
      // IMPORTANT: Do NOT return fake zeros. It overwrites real UI state and looks like funds disappeared.
      // Instead, return 503 so clients keep cached values and retry.
      console.warn('[FCZ-PAY] reconcileWallet failed in /api/wallet/summary:', reconcileErr);
      return res.status(503).json({
        error: 'degraded',
        message: 'On-chain wallet snapshot unavailable',
        version: VERSION,
      });
    }

    // Persist wallet address association if missing
    if (summary.walletAddress) {
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
    }

    const response = {
      currency: 'USD' as const,
      escrowUSDC: summary.escrowUSDC,
      reservedUSDC: summary.reservedUSDC,
      availableToStakeUSDC: summary.availableToStakeUSDC,
      totalDepositedUSDC: summary.totalDepositedUSDC,
      totalWithdrawnUSDC: summary.totalWithdrawnUSDC,
      walletAddress: summary.walletAddress,
      lastUpdated: summary.updatedAt,
      source: summary.source,
    };

    console.log(`[FCZ-PAY] Wallet summary for ${userId}:`, response);

    // [PERF] Generate ETag and check for conditional GET (304 response)
    const etag = generateETag(response);
    const ifNoneMatch = req.headers['if-none-match'];
    
    if (ifNoneMatch && ifNoneMatch === etag) {
      // [PERF] Return 304 Not Modified if ETag matches
      return res.status(304).end();
    }

    // [PERF] Set caching headers for wallet summary
    res.setHeader('Cache-Control', 'private, max-age=15');
    res.setHeader('ETag', etag);

    return res.json(response);
  } catch (error) {
    console.error('[FCZ-PAY] Unhandled error in wallet summary:', error);
    return res.status(503).json({
      error: 'degraded',
      message: 'On-chain wallet snapshot unavailable',
      version: VERSION,
    });
  }
}
