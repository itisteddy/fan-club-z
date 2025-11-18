import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

export const walletWrite = Router();

/**
 * POST /api/wallet/log-transaction
 * Log a withdrawal transaction to the database immediately
 * This ensures we have the transaction hash even before server-side reconciliation
 */
const LogTransactionSchema = z.object({
  userId: z.string().uuid('Invalid userId'),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['USD', 'USDC']).default('USDC'),
  direction: z.enum(['credit', 'debit']).default('debit'),
  channel: z.string().default('escrow_withdraw'),
  status: z.enum(['pending', 'success', 'failed']).default('pending'),
  description: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

walletWrite.post('/log-transaction', async (req, res) => {
  try {
    const body = LogTransactionSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: body.error.issues,
        version: VERSION,
      });
    }

    const { userId, txHash, amount, currency, direction, channel, status, description, meta } = body.data;

    console.log(`[walletWrite] Logging transaction for user ${userId}:`, {
      txHash,
      amount,
      currency,
      direction,
      channel,
      status,
    });

    // Insert transaction record with idempotency check
    // Use provider='crypto-base-usdc' and external_ref=txHash to prevent duplicates
    const { data: transaction, error } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        direction,
        type: direction === 'credit' ? 'credit' : 'debit',
        channel,
        provider: 'crypto-base-usdc',
        amount: direction === 'debit' ? -amount : amount,
        currency,
        status,
        external_ref: txHash,
        tx_hash: txHash,
        description: description || `Base USDC ${direction === 'debit' ? 'withdrawal' : 'deposit'}`,
        meta: meta || {},
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate (unique constraint violation)
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        console.log(`[walletWrite] Transaction ${txHash} already logged (idempotent)`);
        // Fetch the existing transaction
        const { data: existing } = await supabase
          .from('wallet_transactions')
          .select()
          .eq('provider', 'crypto-base-usdc')
          .eq('external_ref', txHash)
          .maybeSingle();

        return res.json({
          success: true,
          message: 'Transaction already logged',
          transaction: existing,
          version: VERSION,
        });
      }

      console.error('[walletWrite] Error logging transaction:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to log transaction',
        details: error.message,
        version: VERSION,
      });
    }

    console.log(`[walletWrite] ✅ Transaction logged successfully:`, transaction?.id);

    return res.json({
      success: true,
      message: 'Transaction logged successfully',
      transaction,
      version: VERSION,
    });
  } catch (error) {
    console.error('[walletWrite] Unhandled error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to log transaction',
      version: VERSION,
    });
  }
});

/**
 * PATCH /api/wallet/update-transaction-status
 * Update transaction status (e.g., from 'pending' to 'success' after confirmation)
 */
const UpdateStatusSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  status: z.enum(['pending', 'success', 'failed']),
  meta: z.record(z.any()).optional(),
});

walletWrite.patch('/update-transaction-status', async (req, res) => {
  try {
    const body = UpdateStatusSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid payload',
        details: body.error.issues,
        version: VERSION,
      });
    }

    const { txHash, status, meta } = body.data;

    console.log(`[walletWrite] Updating transaction status:`, { txHash, status });

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (meta) {
      // Merge with existing meta
      const { data: existing } = await supabase
        .from('wallet_transactions')
        .select('meta')
        .eq('provider', 'crypto-base-usdc')
        .eq('external_ref', txHash)
        .maybeSingle();

      updateData.meta = { ...(existing?.meta || {}), ...meta };
    }

    const { data: transaction, error } = await supabase
      .from('wallet_transactions')
      .update(updateData)
      .eq('provider', 'crypto-base-usdc')
      .eq('external_ref', txHash)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[walletWrite] Error updating transaction status:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update transaction status',
        details: error.message,
        version: VERSION,
      });
    }

    if (!transaction) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Transaction not found',
        version: VERSION,
      });
    }

    console.log(`[walletWrite] ✅ Transaction status updated:`, transaction.id);

    return res.json({
      success: true,
      message: 'Transaction status updated',
      transaction,
      version: VERSION,
    });
  } catch (error) {
    console.error('[walletWrite] Unhandled error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update transaction status',
      version: VERSION,
    });
  }
});

