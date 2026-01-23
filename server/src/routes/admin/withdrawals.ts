/**
 * Admin Withdrawals Queue - Phase 7C
 * 
 * Admin can:
 * - List withdrawal requests by status
 * - Approve (triggers Paystack transfer)
 * - Reject (releases hold, adds reason)
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { insertWalletTransaction } from '../../db/walletTransactions';
import { emitWalletUpdate } from '../../services/realtime';
import { logAdminAction } from './audit';

export const adminWithdrawalsRouter = Router();

// Constants
const FIAT_PROVIDER = 'fiat-paystack';
const FIAT_CURRENCY = 'NGN';

// Check if transfers are enabled
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

// ============================================================
// GET /api/v2/admin/withdrawals
// List withdrawal requests with optional status filter
// ============================================================
adminWithdrawalsRouter.get('/', async (req, res) => {
  try {
    const status = req.query.status as string;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    let query = supabase
      .from('fiat_withdrawals')
      .select(`
        *,
        users!fiat_withdrawals_user_id_fkey(id, email, username, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: withdrawals, error, count } = await query;

    if (error) {
      console.error('[Admin/Withdrawals] List error:', error);
      return res.status(500).json({ error: 'database_error', message: 'Failed to fetch withdrawals', version: VERSION });
    }

    return res.json({
      items: (withdrawals || []).map((w: any) => ({
        id: w.id,
        userId: w.user_id,
        userEmail: w.users?.email,
        userName: w.users?.full_name || w.users?.username,
        amountKobo: w.amount_kobo,
        amountNgn: w.amount_kobo / 100,
        status: w.status,
        reason: w.reason,
        bankCode: w.bank_code,
        accountNumber: `****${String(w.account_number || '').slice(-4)}`,
        accountNumberFull: w.account_number, // Admin can see full
        accountName: w.account_name,
        paystackRecipientCode: w.paystack_recipient_code,
        paystackTransferCode: w.paystack_transfer_code,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
      total: count || 0,
      limit,
      offset,
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Withdrawals] List error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to fetch withdrawals', version: VERSION });
  }
});

// ============================================================
// POST /api/v2/admin/withdrawals/:id/approve
// Approve and initiate Paystack transfer
// ============================================================
const ApproveSchema = z.object({
  actorId: z.string().uuid(),
});

adminWithdrawalsRouter.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = ApproveSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'bad_request', message: 'actorId required', version: VERSION });
    }

    const { actorId } = parsed.data;

    // Get withdrawal
    const { data: withdrawal, error } = await supabase
      .from('fiat_withdrawals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !withdrawal) {
      return res.status(404).json({ error: 'not_found', message: 'Withdrawal not found', version: VERSION });
    }

    if (withdrawal.status !== 'requested') {
      return res.status(400).json({
        error: 'bad_request',
        message: `Cannot approve withdrawal with status: ${withdrawal.status}`,
        version: VERSION,
      });
    }

    // Update to approved
    await supabase
      .from('fiat_withdrawals')
      .update({ status: 'approved', updated_at: new Date().toISOString() } as any)
      .eq('id', id);

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'withdrawal_approve',
      targetType: 'withdrawal',
      targetId: id,
      meta: {
        userId: withdrawal.user_id,
        amountKobo: withdrawal.amount_kobo,
      },
    });

    // If transfers are enabled, initiate Paystack transfer
    if (isTransferEnabled()) {
      try {
        // Create transfer recipient (if not exists)
        let recipientCode = withdrawal.paystack_recipient_code;
        
        if (!recipientCode) {
          console.log(`[Admin/Withdrawals] Creating Paystack recipient for ${id}`);
          
          const recipientResponse = await paystackRequest('/transferrecipient', 'POST', {
            type: 'nuban',
            name: withdrawal.account_name || 'Customer',
            account_number: withdrawal.account_number,
            bank_code: withdrawal.bank_code,
            currency: 'NGN',
          });

          recipientCode = recipientResponse?.data?.recipient_code;
          
          if (!recipientCode) {
            throw new Error('Failed to create transfer recipient');
          }

          // Save recipient code
          await supabase
            .from('fiat_withdrawals')
            .update({ paystack_recipient_code: recipientCode } as any)
            .eq('id', id);
        }

        // Update status to processing
        await supabase
          .from('fiat_withdrawals')
          .update({ status: 'processing', updated_at: new Date().toISOString() } as any)
          .eq('id', id);

        // Initiate transfer
        console.log(`[Admin/Withdrawals] Initiating transfer for ${id}`);
        
        const transferRef = `fcz_withdraw_${id}`;
        const transferResponse = await paystackRequest('/transfer', 'POST', {
          source: 'balance',
          amount: withdrawal.amount_kobo,
          recipient: recipientCode,
          reason: `Fan Club Z withdrawal`,
          reference: transferRef,
        });

        const transferCode = transferResponse?.data?.transfer_code;
        
        // Save transfer code
        await supabase
          .from('fiat_withdrawals')
          .update({
            paystack_transfer_code: transferCode,
            paystack_reference: transferRef,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', id);

        console.log(`[Admin/Withdrawals] Transfer initiated: ${transferCode}`);

        return res.json({
          success: true,
          message: 'Withdrawal approved and transfer initiated',
          transferCode,
          status: 'processing',
          version: VERSION,
        });
      } catch (transferError: any) {
        console.error('[Admin/Withdrawals] Transfer error:', transferError);
        
        // Revert to approved status (admin can retry)
        await supabase
          .from('fiat_withdrawals')
          .update({ status: 'approved', updated_at: new Date().toISOString() } as any)
          .eq('id', id);

        return res.status(500).json({
          error: 'transfer_error',
          message: `Transfer failed: ${transferError?.message}. Withdrawal is approved but needs manual retry.`,
          version: VERSION,
        });
      }
    }

    // Transfers not enabled - just mark as approved
    return res.json({
      success: true,
      message: 'Withdrawal approved (transfers not enabled - manual payout required)',
      status: 'approved',
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Withdrawals] Approve error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to approve withdrawal', version: VERSION });
  }
});

// ============================================================
// POST /api/v2/admin/withdrawals/:id/reject
// Reject and release hold
// ============================================================
const RejectSchema = z.object({
  actorId: z.string().uuid(),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

adminWithdrawalsRouter.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = RejectSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'actorId and reason required',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const { actorId, reason } = parsed.data;

    // Get withdrawal
    const { data: withdrawal, error } = await supabase
      .from('fiat_withdrawals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !withdrawal) {
      return res.status(404).json({ error: 'not_found', message: 'Withdrawal not found', version: VERSION });
    }

    if (withdrawal.status !== 'requested') {
      return res.status(400).json({
        error: 'bad_request',
        message: `Cannot reject withdrawal with status: ${withdrawal.status}`,
        version: VERSION,
      });
    }

    // Update status to rejected
    await supabase
      .from('fiat_withdrawals')
      .update({
        status: 'rejected',
        reason,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id);

    // Release hold (idempotent)
    const releaseRef = `withdraw:release:${id}`;
    await insertWalletTransaction({
      user_id: withdrawal.user_id,
      direction: 'credit',
      type: 'withdrawal_release',
      channel: 'withdrawal',
      provider: FIAT_PROVIDER,
      amount: withdrawal.amount_kobo,
      currency: FIAT_CURRENCY,
      status: 'confirmed',
      external_ref: releaseRef,
      description: `Withdrawal rejected: ${withdrawal.amount_kobo / 100} NGN`,
      meta: {
        kind: 'withdrawal_release',
        withdrawal_id: id,
        reason,
        rejected_by: actorId,
      },
    });

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'withdrawal_reject',
      targetType: 'withdrawal',
      targetId: id,
      reason,
      meta: {
        userId: withdrawal.user_id,
        amountKobo: withdrawal.amount_kobo,
      },
    });

    // Emit wallet update
    emitWalletUpdate({ userId: withdrawal.user_id, reason: 'withdrawal_rejected' });

    return res.json({
      success: true,
      message: 'Withdrawal rejected and funds released',
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Withdrawals] Reject error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to reject withdrawal', version: VERSION });
  }
});

// ============================================================
// POST /api/v2/admin/withdrawals/:id/mark-paid
// Manually mark a withdrawal as paid (for manual payouts)
// ============================================================
const MarkPaidSchema = z.object({
  actorId: z.string().uuid(),
  reference: z.string().optional(),
});

adminWithdrawalsRouter.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = MarkPaidSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ error: 'bad_request', message: 'actorId required', version: VERSION });
    }

    const { actorId, reference } = parsed.data;

    // Get withdrawal
    const { data: withdrawal, error } = await supabase
      .from('fiat_withdrawals')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !withdrawal) {
      return res.status(404).json({ error: 'not_found', message: 'Withdrawal not found', version: VERSION });
    }

    if (withdrawal.status === 'paid') {
      return res.json({ success: true, message: 'Already marked as paid', version: VERSION });
    }

    if (!['approved', 'processing'].includes(withdrawal.status)) {
      return res.status(400).json({
        error: 'bad_request',
        message: `Cannot mark as paid with status: ${withdrawal.status}`,
        version: VERSION,
      });
    }

    // Update status to paid
    await supabase
      .from('fiat_withdrawals')
      .update({
        status: 'paid',
        paystack_reference: reference || withdrawal.paystack_reference,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id);

    // Create final withdrawal debit (convert hold to actual withdrawal)
    const debitRef = `withdraw:debit:${id}`;
    await insertWalletTransaction({
      user_id: withdrawal.user_id,
      direction: 'debit',
      type: 'withdrawal',
      channel: 'paystack',
      provider: FIAT_PROVIDER,
      amount: withdrawal.amount_kobo,
      currency: FIAT_CURRENCY,
      status: 'confirmed',
      external_ref: debitRef,
      description: `Withdrawal completed: ${withdrawal.amount_kobo / 100} NGN`,
      meta: {
        kind: 'withdrawal',
        withdrawal_id: id,
        reference,
        marked_by: actorId,
      },
    });

    // Log admin action
    await logAdminAction({
      actorId,
      action: 'withdrawal_mark_paid',
      targetType: 'withdrawal',
      targetId: id,
      meta: {
        userId: withdrawal.user_id,
        amountKobo: withdrawal.amount_kobo,
        reference,
      },
    });

    // Emit wallet update
    emitWalletUpdate({ userId: withdrawal.user_id, reason: 'withdrawal_paid' });

    return res.json({
      success: true,
      message: 'Withdrawal marked as paid',
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Admin/Withdrawals] Mark paid error:', error);
    return res.status(500).json({ error: 'internal_error', message: error?.message || 'Failed to mark as paid', version: VERSION });
  }
});

export default adminWithdrawalsRouter;
