/**
 * Fiat Withdrawals - Phase 7C
 * 
 * User requests withdrawal -> Admin reviews -> Paystack transfer
 * All operations are idempotent and audit-logged.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { insertWalletTransaction } from '../db/walletTransactions';
import { emitWalletUpdate } from '../services/realtime';

export const fiatWithdrawalsRouter = Router();

// Constants
const FIAT_PROVIDER = 'fiat-paystack';
const FIAT_CURRENCY = 'NGN';
const MIN_WITHDRAWAL_NGN = 200;
const MIN_WITHDRAWAL_KOBO = MIN_WITHDRAWAL_NGN * 100;

// Check if fiat is enabled
function isFiatEnabled(): boolean {
  return process.env.FIAT_PAYSTACK_ENABLED === 'true' || process.env.FIAT_PAYSTACK_ENABLED === '1';
}

// Check if transfers are enabled (for staged rollout)
function isTransferEnabled(): boolean {
  return process.env.PAYSTACK_TRANSFER_ENABLED === 'true' || process.env.PAYSTACK_TRANSFER_ENABLED === '1';
}

// Get Paystack secret key
function getPaystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

// Paystack API helper
async function paystackRequest(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<any> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }

  const response = await fetch(`https://api.paystack.co${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json() as any;
  
  if (!response.ok) {
    console.error('[Paystack] API error:', data);
    throw new Error(data?.message || 'Paystack API error');
  }

  return data;
}

/**
 * Get user's available fiat balance (total - locked)
 */
async function getAvailableFiatKobo(userId: string): Promise<number> {
  const { data: txns } = await supabase
    .from('wallet_transactions')
    .select('direction, amount, type')
    .eq('user_id', userId)
    .eq('provider', FIAT_PROVIDER)
    .eq('currency', FIAT_CURRENCY)
    .in('status', ['confirmed', 'completed']);

  let totalCredits = 0;
  let totalDebits = 0;
  let locked = 0;

  for (const tx of txns || []) {
    const amount = Number((tx as any).amount || 0);
    const direction = String((tx as any).direction || '');
    const type = String((tx as any).type || '');

    if (direction === 'credit') totalCredits += amount;
    else if (direction === 'debit') totalDebits += amount;

    // Track pending withdrawal holds
    if (type === 'withdrawal_hold' && direction === 'debit') {
      locked += amount;
    } else if (type === 'withdrawal_release' && direction === 'credit') {
      locked = Math.max(0, locked - amount);
    }
  }

  // Also check pending withdrawals that haven't been processed yet
  const { data: pendingWithdrawals } = await supabase
    .from('fiat_withdrawals')
    .select('amount_kobo')
    .eq('user_id', userId)
    .in('status', ['requested', 'approved', 'processing']);

  for (const w of pendingWithdrawals || []) {
    locked += Number((w as any).amount_kobo || 0);
  }

  const total = Math.max(0, totalCredits - totalDebits);
  return Math.max(0, total - locked);
}

// ============================================================
// POST /api/v2/fiat/withdrawals
// Create a withdrawal request (user)
// ============================================================
const CreateWithdrawalSchema = z.object({
  amountNgn: z.number().positive().min(MIN_WITHDRAWAL_NGN, `Minimum withdrawal is NGN ${MIN_WITHDRAWAL_NGN}`),
  userId: z.string().uuid(),
  bankCode: z.string().min(3, 'Bank code required'),
  accountNumber: z.string().min(10, 'Account number must be at least 10 digits').max(10, 'Account number must be 10 digits'),
  accountName: z.string().optional(),
});

fiatWithdrawalsRouter.post('/', async (req, res) => {
  try {
    if (!isFiatEnabled()) {
      return res.status(404).json({ error: 'disabled', message: 'Fiat withdrawals are not enabled', version: VERSION });
    }

    const parsed = CreateWithdrawalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request body',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { amountNgn, userId, bankCode, accountNumber, accountName } = parsed.data;
    const amountKobo = Math.round(amountNgn * 100);

    // Check available balance
    const availableKobo = await getAvailableFiatKobo(userId);
    if (availableKobo < amountKobo) {
      return res.status(400).json({
        error: 'insufficient_funds',
        message: `Insufficient balance. Available: ${availableKobo / 100} NGN, Requested: ${amountNgn} NGN`,
        available: availableKobo / 100,
        requested: amountNgn,
        version: VERSION,
      });
    }

    // Generate unique external_ref for idempotency
    const withdrawalId = crypto.randomUUID();
    const externalRef = `withdraw:req:${userId}:${withdrawalId}`;

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('fiat_withdrawals')
      .insert({
        id: withdrawalId,
        user_id: userId,
        amount_kobo: amountKobo,
        currency: FIAT_CURRENCY,
        status: 'requested',
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName || null,
        external_ref: externalRef,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)
      .select('*')
      .single();

    if (withdrawalError) {
      console.error('[Withdrawals] Create error:', withdrawalError);
      return res.status(500).json({ error: 'database_error', message: 'Failed to create withdrawal request', version: VERSION });
    }

    // Create hold transaction (reserve the funds)
    const holdRef = `withdraw:hold:${withdrawalId}`;
    await insertWalletTransaction({
      user_id: userId,
      direction: 'debit',
      type: 'withdrawal_hold',
      channel: 'withdrawal',
      provider: FIAT_PROVIDER,
      amount: amountKobo,
      currency: FIAT_CURRENCY,
      status: 'confirmed',
      external_ref: holdRef,
      description: `Withdrawal hold: ${amountNgn} NGN`,
      meta: {
        kind: 'withdrawal_hold',
        withdrawal_id: withdrawalId,
        amountKobo,
        amountNgn,
      },
    });

    console.log(`[Withdrawals] Created withdrawal request: ${withdrawalId} for ${amountNgn} NGN`);

    return res.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amountKobo: withdrawal.amount_kobo,
        amountNgn: withdrawal.amount_kobo / 100,
        status: withdrawal.status,
        bankCode: withdrawal.bank_code,
        accountNumber: `****${withdrawal.account_number.slice(-4)}`,
        createdAt: withdrawal.created_at,
      },
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Withdrawals] Create error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to create withdrawal', version: VERSION });
  }
});

// ============================================================
// GET /api/v2/fiat/withdrawals?userId=<uuid>
// List user's withdrawal requests
// ============================================================
fiatWithdrawalsRouter.get('/', async (req, res) => {
  try {
    if (!isFiatEnabled()) {
      return res.status(404).json({ error: 'disabled', message: 'Fiat is not enabled', version: VERSION });
    }

    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'bad_request', message: 'userId required', version: VERSION });
    }

    const { data: withdrawals, error } = await supabase
      .from('fiat_withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Withdrawals] List error:', error);
      return res.status(500).json({ error: 'database_error', message: 'Failed to fetch withdrawals', version: VERSION });
    }

    return res.json({
      success: true,
      withdrawals: (withdrawals || []).map((w: any) => ({
        id: w.id,
        amountKobo: w.amount_kobo,
        amountNgn: w.amount_kobo / 100,
        status: w.status,
        reason: w.reason,
        bankCode: w.bank_code,
        accountNumber: `****${String(w.account_number || '').slice(-4)}`,
        accountName: w.account_name,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Withdrawals] List error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to fetch withdrawals', version: VERSION });
  }
});

// ============================================================
// POST /api/v2/fiat/withdrawals/:id/cancel
// Cancel a pending withdrawal (user)
// ============================================================
fiatWithdrawalsRouter.post('/:id/cancel', async (req, res) => {
  try {
    if (!isFiatEnabled()) {
      return res.status(404).json({ error: 'disabled', message: 'Fiat is not enabled', version: VERSION });
    }

    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'bad_request', message: 'userId required', version: VERSION });
    }

    // Get withdrawal
    const { data: withdrawal, error } = await supabase
      .from('fiat_withdrawals')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !withdrawal) {
      return res.status(404).json({ error: 'not_found', message: 'Withdrawal not found', version: VERSION });
    }

    if (withdrawal.status !== 'requested') {
      return res.status(400).json({
        error: 'bad_request',
        message: `Cannot cancel withdrawal with status: ${withdrawal.status}`,
        version: VERSION,
      });
    }

    // Update status to cancelled
    await supabase
      .from('fiat_withdrawals')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    // Release hold
    const releaseRef = `withdraw:release:${id}`;
    await insertWalletTransaction({
      user_id: userId,
      direction: 'credit',
      type: 'withdrawal_release',
      channel: 'withdrawal',
      provider: FIAT_PROVIDER,
      amount: withdrawal.amount_kobo,
      currency: FIAT_CURRENCY,
      status: 'confirmed',
      external_ref: releaseRef,
      description: `Withdrawal cancelled: ${withdrawal.amount_kobo / 100} NGN`,
      meta: {
        kind: 'withdrawal_release',
        withdrawal_id: id,
        reason: 'user_cancelled',
      },
    });

    emitWalletUpdate({ userId, reason: 'withdrawal_cancelled' });

    return res.json({ success: true, message: 'Withdrawal cancelled', version: VERSION });
  } catch (error: any) {
    console.error('[Withdrawals] Cancel error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to cancel withdrawal', version: VERSION });
  }
});

export default fiatWithdrawalsRouter;
