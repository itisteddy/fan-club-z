import { Router } from 'express';
import { z } from 'zod';
import { VERSION } from '@fanclubz/shared';

import { reconcileWallet } from '../services/walletReconciliation';
import { supabase } from '../config/database';

export const walletReconcile = Router();

const BodySchema = z.object({
  userId: z.string().uuid(),
  walletAddress: z.string().optional(),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional(),
  // Optional helpers so the server can reliably log the specific tx even if periodic reconciliation already updated totals.
  // This avoids "deposit happened but not in activity" back-and-forth.
  txType: z.enum(['deposit', 'withdraw']).optional(),
  amountUSD: z.number().positive().optional(),
});

walletReconcile.post('/reconcile', async (req, res) => {
  try {
    const body = BodySchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: body.error.issues,
        version: VERSION,
      });
    }

    let snapshot;
    try {
      snapshot = await reconcileWallet({
        userId: body.data.userId,
        walletAddress: body.data.walletAddress,
        recordTransactions: true,
        txHash: body.data.txHash,
      });
    } catch (err) {
      // IMPORTANT: Do NOT return fake zeros (it makes balances look like they vanished).
      // Return 503 so the client retries and keeps its last-known-good snapshot.
      console.warn('[FCZ-PAY] reconcileWallet failed in POST /reconcile:', err);
      return res.status(503).json({
        error: 'degraded',
        message: 'On-chain wallet snapshot unavailable',
        version: VERSION,
      });
    }

    // Best-effort: record the specific txHash as a wallet_transaction so activity feed updates immediately.
    // This is idempotent via external_ref=txHash.
    try {
      const txHash = body.data.txHash;
      const txType = body.data.txType;
      const amountUSD = body.data.amountUSD;
      if (txHash && txType && amountUSD) {
        const channel = txType === 'deposit' ? 'escrow_deposit' : 'escrow_withdraw';
        const direction = txType === 'deposit' ? 'credit' : 'debit';

        const { error } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: body.data.userId,
            type: txType,
            direction,
            status: 'completed',
            channel,
            provider: 'crypto-base-usdc',
            amount: amountUSD,
            currency: 'USD',
            external_ref: txHash,
            tx_hash: txHash,
            description: txType === 'deposit' ? 'Base USDC deposit' : 'Base USDC withdrawal',
            meta: {
              kind: txType,
              tx_hash: txHash,
            },
          } as any);
        if (error && (error as any).code !== '23505') {
          console.warn('[FCZ-PAY] Failed to insert wallet_transactions for reconcile tx (non-fatal):', error);
        }
      }
    } catch (e) {
      console.warn('[FCZ-PAY] reconcile tx logging failed (non-fatal):', e);
    }

    return res.json({
      message: 'Wallet reconciled',
      summary: {
        currency: 'USD' as const,
        walletAddress: snapshot.walletAddress,
        escrowUSDC: snapshot.escrowUSDC,
        reservedUSDC: snapshot.reservedUSDC,
        availableToStakeUSDC: snapshot.availableToStakeUSDC,
        totalDepositedUSDC: snapshot.totalDepositedUSDC,
        totalWithdrawnUSDC: snapshot.totalWithdrawnUSDC,
        lastUpdated: snapshot.updatedAt,
      },
      version: VERSION,
    });
  } catch (error) {
    console.error('[FCZ-PAY] Wallet reconciliation failed (outer):', error);
    return res.status(503).json({
      error: 'degraded',
      message: 'On-chain wallet snapshot unavailable',
      version: VERSION,
    });
  }
});




