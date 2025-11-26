import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';

const router = Router();

/**
 * POST /api/wallet/log-transaction
 * Log on-chain transactions for activity tracking and debugging
 * 
 * This is the central logging endpoint for all blockchain transactions.
 * Transactions are logged with:
 * - pending status when tx is submitted
 * - completed status when tx receipt is confirmed
 * - failed status when tx reverts or errors
 * 
 * Body: {
 *   userId: string;
 *   walletAddress: string;
 *   txHash: string;
 *   type: 'approval' | 'deposit' | 'withdraw' | 'settlement' | 'claim' | 'bet_lock' | 'bet_release' | 'post_root';
 *   status: 'pending' | 'completed' | 'failed';
 *   amount?: number;
 *   error?: string;
 *   timestamp: string;
 *   predictionId?: string;
 * }
 */
router.post('/log-transaction', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      type: z.enum([
        'approval',
        'deposit',
        'withdraw',
        'settlement',
        'claim',
        'bet_lock',
        'bet_release',
        'post_root',
        'fee',
      ]),
      status: z.enum(['pending', 'completed', 'failed']),
      amount: z.number().optional(),
      error: z.string().nullable().optional(),
      timestamp: z.string().optional(),
      predictionId: z.string().optional(),
      chainId: z.number().optional(),
      feeUSD: z.number().optional(),
      blockNumber: z.number().optional(),
      gasUsed: z.number().optional(),
      gasPrice: z.number().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const body = schema.parse(req.body);

    console.log('[FCZ-TX-LOG] Logging transaction:', {
      type: body.type,
      status: body.status,
      txHash: body.txHash.slice(0, 16) + '...',
      userId: body.userId.slice(0, 8) + '...',
      predictionId: body.predictionId?.slice(0, 8),
    });

    const metadataPayload = {
      ...(body.metadata || {}),
      predictionId: body.predictionId || null,
      chainId: body.chainId ?? 84532,
      feeUSD: body.feeUSD ?? null,
    };

    const txRecord: Record<string, unknown> = {
      user_id: body.userId,
      wallet_address: body.walletAddress.toLowerCase(),
      tx_hash: body.txHash.toLowerCase(),
      type: body.type,
      status: body.status,
      amount: body.amount ?? 0,
      error_message: body.error || null,
      block_number: body.blockNumber ?? null,
      gas_used: body.gasUsed ?? null,
      gas_price: body.gasPrice ?? null,
      metadata: metadataPayload,
    };

    if (body.timestamp) {
      txRecord.created_at = new Date(body.timestamp).toISOString();
    }

    const { error: txError } = await supabase
      .from('blockchain_transactions')
      .upsert(txRecord, {
        onConflict: 'tx_hash',
        ignoreDuplicates: false,
      });

    if (txError) {
      console.error('[FCZ-TX-LOG] Database error:', txError);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to log transaction',
        version: VERSION,
      });
    }

    // Create wallet_transaction record for completed deposits/withdrawals
    if (body.status === 'completed' && (body.type === 'deposit' || body.type === 'withdraw') && body.amount) {
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: body.userId,
          type: body.type,
          status: 'completed',
          channel: 'blockchain',
          provider: 'crypto-base-usdc',
          amount: body.amount,
          currency: 'USD',
          external_ref: body.txHash,
          description: `${body.type === 'deposit' ? 'Deposited' : 'Withdrew'} ${body.amount} USDC on Base`,
          meta: {
            tx_hash: body.txHash,
            wallet_address: body.walletAddress,
            chain_id: body.chainId ?? 84532,
            fee_usd: body.feeUSD ?? null,
          },
        })
        .then(({ error }) => {
          if (error) {
            console.warn('[FCZ-TX-LOG] wallet_transactions insert error (non-fatal):', error);
          }
        });
    }

    // Create wallet_transaction record for completed claims
    if (body.status === 'completed' && body.type === 'claim' && body.amount) {
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: body.userId,
          type: 'claim',
          status: 'completed',
          channel: 'blockchain',
          provider: 'crypto-base-usdc',
          amount: body.amount,
          currency: 'USD',
          external_ref: body.txHash,
          description: `Claimed ${body.amount} USDC from prediction ${body.predictionId?.slice(0, 8) || 'unknown'}`,
          meta: {
            tx_hash: body.txHash,
            wallet_address: body.walletAddress,
            chain_id: body.chainId ?? 84532,
            prediction_id: body.predictionId,
          },
          prediction_id: body.predictionId || null,
        })
        .then(({ error }) => {
          if (error) {
            console.warn('[FCZ-TX-LOG] wallet_transactions insert error (non-fatal):', error);
          }
        });
    }

    // Create wallet_transaction record for completed settlements
    if (body.status === 'completed' && body.type === 'settlement' && body.predictionId) {
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: body.userId,
          type: 'settlement',
          status: 'completed',
          channel: 'blockchain',
          provider: 'crypto-base-usdc',
          amount: body.amount || 0,
          currency: 'USD',
          external_ref: body.txHash,
          description: `Settlement posted for prediction ${body.predictionId.slice(0, 8)}`,
          meta: {
            tx_hash: body.txHash,
            wallet_address: body.walletAddress,
            chain_id: body.chainId ?? 84532,
            prediction_id: body.predictionId,
            fee_usd: body.feeUSD ?? null,
          },
          prediction_id: body.predictionId,
        })
        .then(({ error }) => {
          if (error) {
            console.warn('[FCZ-TX-LOG] wallet_transactions insert error (non-fatal):', error);
          }
        });
    }

    if (body.status === 'completed' && body.type === 'fee' && body.amount) {
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: body.userId,
          type: 'fee',
          status: 'completed',
          channel: 'escrow_fee',
          provider: 'crypto-base-usdc',
          amount: body.amount,
          currency: 'USD',
          external_ref: body.txHash,
          description: `Fee charged (${body.amount} USDC)`,
          meta: {
            tx_hash: body.txHash,
            wallet_address: body.walletAddress,
            chain_id: body.chainId ?? 84532,
          },
        })
        .then(({ error }) => {
          if (error) {
            console.warn('[FCZ-TX-LOG] wallet_transactions fee insert error (non-fatal):', error);
          }
        });
    }

    // Emit event for real-time updates
    await supabase
      .from('event_log')
      .insert({
        source: 'blockchain_transaction',
        kind: `blockchain.${body.type}.${body.status}`,
        ref: body.txHash,
        payload: {
          user_id: body.userId,
          wallet_address: body.walletAddress,
          tx_hash: body.txHash,
          type: body.type,
          status: body.status,
          amount: body.amount,
          prediction_id: body.predictionId,
          fee_usd: body.feeUSD,
        },
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[FCZ-TX-LOG] event_log insert error (non-fatal):', error);
        }
      });

    console.log('[FCZ-TX-LOG] Transaction logged successfully:', body.txHash.slice(0, 16));

    return res.status(200).json({
      ok: true,
      txHash: body.txHash,
      status: body.status,
      version: VERSION,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'invalid_body',
        details: error.issues,
        version: VERSION,
      });
    }

    console.error('[FCZ-TX-LOG] Unhandled error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to log transaction',
      version: VERSION,
    });
  }
});

/**
 * GET /api/wallet/transactions/:userId
 * Get transaction history for a user
 */
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;
    
    // Validate userId
    if (!userId || !userId.match(/^[a-f0-9-]{36}$/)) {
      return res.status(400).json({
        error: 'invalid_user_id',
        message: 'Invalid user ID format',
        version: VERSION,
      });
    }

    let query = supabase
      .from('blockchain_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('tx_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[FCZ-TX-LOG] Query error:', error);
      return res.status(500).json({
        error: 'database_error',
        message: 'Failed to fetch transactions',
        version: VERSION,
      });
    }

    return res.json({
      transactions: data || [],
      count: data?.length || 0,
      version: VERSION,
    });
  } catch (error) {
    console.error('[FCZ-TX-LOG] Unhandled error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to fetch transactions',
      version: VERSION,
    });
  }
});

export default router;
