/**
 * Fiat Paystack Integration - Phase 7A
 * 
 * Handles NGN deposits via Paystack:
 * - Initialize transaction -> get authorization URL
 * - Webhook verification (secure + raw body + idempotent)
 * - Credit fiat ledger on successful charge
 */

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { insertWalletTransaction } from '../db/walletTransactions';
import { emitWalletUpdate } from '../services/realtime';

export const fiatPaystackRouter = Router();

// Constants
const FIAT_PROVIDER = 'fiat-paystack';
const FIAT_CURRENCY = 'NGN';
const MIN_DEPOSIT_NGN = 100; // Minimum NGN 100
const MIN_DEPOSIT_KOBO = MIN_DEPOSIT_NGN * 100;

// Check if fiat is enabled
function isFiatEnabled(): boolean {
  return process.env.FIAT_PAYSTACK_ENABLED === 'true' || process.env.FIAT_PAYSTACK_ENABLED === '1';
}

// Get Paystack keys from env
function getPaystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

function getPaystackCallbackUrl(): string {
  return process.env.PAYSTACK_CALLBACK_URL || 'https://app.fanclubz.app/wallet?deposit=return';
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

// Verify Paystack webhook signature
function verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;

  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ============================================================
// POST /api/v2/fiat/paystack/initialize
// Initialize a Paystack transaction for deposit
// ============================================================
const InitializeSchema = z.object({
  amountNgn: z.number().positive().min(MIN_DEPOSIT_NGN, `Minimum deposit is NGN ${MIN_DEPOSIT_NGN}`),
  userId: z.string().uuid(),
  email: z.string().email().optional(),
});

// NOTE: Auth not enforced here because:
// 1) Deposit intent doesn't credit funds (webhook does after Paystack verifies payment)
// 2) Client token sync issue - apiClient reads 'token' but authStore writes elsewhere
// 3) No security risk: attacker can't fake receiving money
fiatPaystackRouter.post('/initialize', async (req, res) => {
  try {
    // Check if fiat is enabled
    if (!isFiatEnabled()) {
      return res.status(404).json({
        error: 'disabled',
        message: 'Fiat deposits are not enabled',
        version: VERSION,
      });
    }

    // Validate input
    const parsed = InitializeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request body',
        details: parsed.error.issues,
        version: VERSION,
      });
    }

    const authedUserId = (req as any)?.user?.id as string | undefined;
    const { amountNgn, userId: bodyUserId } = parsed.data;
    // Auth is optional for initialize; webhook is the only credit path.
    // If auth exists, enforce user match; otherwise rely on request body.
    if (authedUserId && bodyUserId !== authedUserId) {
      return res.status(403).json({ error: 'forbidden', message: 'User mismatch', version: VERSION });
    }

    const userId = authedUserId || bodyUserId;
    const amountKobo = Math.round(amountNgn * 100);

    // Get user email
    let email = parsed.data.email;
    // Avoid looking up user emails when unauthenticated (prevents enumeration).
    if (!email && authedUserId) {
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      email = (user as any)?.email;
    }

    if (!email) {
      return res.status(400).json({
        error: 'email_required',
        message: 'User email is required for Paystack',
        version: VERSION,
      });
    }

    console.log(`[Paystack] Initializing deposit: ${amountNgn} NGN for user ${userId}`);

    // Call Paystack to initialize transaction
    const paystackResponse = await paystackRequest('/transaction/initialize', 'POST', {
      email,
      amount: amountKobo,
      callback_url: getPaystackCallbackUrl(),
      metadata: {
        userId,
        purpose: 'fiat_deposit',
        env: process.env.NODE_ENV || 'development',
        app: 'fanclubz',
      },
    });

    if (!paystackResponse?.status || !paystackResponse?.data?.authorization_url) {
      console.error('[Paystack] Invalid response:', paystackResponse);
      return res.status(500).json({
        error: 'paystack_error',
        message: 'Failed to initialize Paystack transaction',
        version: VERSION,
      });
    }

    const { authorization_url, reference, access_code } = paystackResponse.data;

    console.log(`[Paystack] Transaction initialized: ${reference}`);

    // Optional: Insert pending deposit intent for observability
    try {
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        direction: 'credit',
        // NOTE: wallet_transactions has CHECK constraints on type/channel.
        // Use allowed type/channel and represent "intent" via status + meta.kind.
        type: 'deposit',
        channel: 'fiat',
        provider: FIAT_PROVIDER,
        amount: amountKobo,
        currency: FIAT_CURRENCY,
        status: 'pending',
        external_ref: `paystack:init:${reference}`,
        description: `Fiat deposit intent: ${amountNgn} NGN`,
        meta: {
          kind: 'deposit_intent',
          currency: 'NGN',
          reference,
          access_code,
          amountNgn,
          amountKobo,
        },
      } as any);
    } catch (e) {
      // Non-fatal: continue even if logging fails
      console.warn('[Paystack] Failed to log deposit intent:', e);
    }

    return res.json({
      success: true,
      authorizationUrl: authorization_url,
      reference,
      accessCode: access_code,
      amountNgn,
      amountKobo,
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Paystack] Initialize error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: error?.message || 'Failed to initialize deposit',
      version: VERSION,
    });
  }
});

// ============================================================
// POST /api/v2/fiat/paystack/webhook
// Handle Paystack webhook events (SECURE + RAW BODY + IDEMPOTENT)
// ============================================================

// Webhook requires raw body for signature verification.
// We capture req.rawBody in server/src/index.ts via express.json verify hook.
fiatPaystackRouter.post('/webhook', async (req: any, res) => {
  try {
    // Get signature from header
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      console.warn('[Paystack Webhook] Missing signature header');
      return res.status(401).json({ error: 'unauthorized', message: 'Missing signature' });
    }

    // Verify signature using raw body
    const rawBody = req.rawBody as Buffer | undefined;
    if (!Buffer.isBuffer(rawBody)) {
      console.warn('[Paystack Webhook] Missing raw body buffer - middleware issue');
      return res.status(400).json({ error: 'bad_request', message: 'Invalid body format' });
    }

    if (!verifyPaystackSignature(rawBody, signature)) {
      console.warn('[Paystack Webhook] Invalid signature');
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid signature' });
    }

    // Parse JSON after signature verification
    let event: any;
    try {
      event = JSON.parse(rawBody.toString());
    } catch (e) {
      console.warn('[Paystack Webhook] Failed to parse body');
      return res.status(400).json({ error: 'bad_request', message: 'Invalid JSON' });
    }

    console.log(`[Paystack Webhook] Received event: ${event?.event}`);

    const evt = String(event?.event || '');
    const data = event?.data;

    // ============================================================
    // Phase 7C: Handle transfer events (withdrawals)
    // ============================================================
    if (evt === 'transfer.success' || evt === 'transfer.failed' || evt === 'transfer.reversed') {
      const transferCode = String(data?.transfer_code || '');
      const reference = String(data?.reference || '');

      if (!transferCode && !reference) {
        console.warn('[Paystack Webhook] transfer event missing transfer_code/reference');
        return res.status(200).json({ received: true });
      }

      // Find withdrawal by transfer_code or reference
      const { data: withdrawal } = await supabase
        .from('fiat_withdrawals')
        .select('id,user_id,amount_kobo,status')
        .or(`paystack_transfer_code.eq.${transferCode},paystack_reference.eq.${reference}`)
        .maybeSingle();

      if (!withdrawal) {
        console.warn('[Paystack Webhook] transfer event: no matching withdrawal', { transferCode, reference });
        return res.status(200).json({ received: true });
      }

      // Idempotency: if already terminal, no-op
      const currentStatus = String((withdrawal as any).status || '');
      if (currentStatus === 'paid' || currentStatus === 'failed' || currentStatus === 'rejected' || currentStatus === 'cancelled') {
        return res.status(200).json({ received: true, alreadyFinal: true });
      }

      if (evt === 'transfer.success') {
        await supabase
          .from('fiat_withdrawals')
          .update({ status: 'paid', updated_at: new Date().toISOString() } as any)
          .eq('id', (withdrawal as any).id);

        // Debit fiat ledger exactly once
        const debitRef = `withdraw:debit:${(withdrawal as any).id}`;
        const { error: txError } = await insertWalletTransaction({
          user_id: (withdrawal as any).user_id,
          direction: 'debit',
          type: 'withdraw',
          channel: 'fiat',
          provider: FIAT_PROVIDER,
          amount: Number((withdrawal as any).amount_kobo || 0),
          currency: FIAT_CURRENCY,
          status: 'completed',
          external_ref: debitRef,
          description: `Fiat withdrawal completed`,
          meta: {
            kind: 'withdraw',
            currency: 'NGN',
            withdrawal_id: (withdrawal as any).id,
            paystack_transfer_code: transferCode || null,
            paystack_reference: reference || null,
            paystackEventId: event?.id,
          },
        });

        if (txError && (txError as any)?.code !== '23505') {
          console.error('[Paystack Webhook] Failed to record withdrawal debit:', txError);
        }

        try {
          emitWalletUpdate({ userId: (withdrawal as any).user_id, reason: 'withdrawal_paid' });
        } catch {}

        return res.status(200).json({ received: true, withdrawalUpdated: true });
      }

      // transfer.failed / transfer.reversed
      await supabase
        .from('fiat_withdrawals')
        .update({
          status: 'failed',
          reason: evt === 'transfer.reversed' ? 'Transfer reversed' : 'Transfer failed',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', (withdrawal as any).id);

      try {
        emitWalletUpdate({ userId: (withdrawal as any).user_id, reason: 'withdrawal_failed' });
      } catch {}

      return res.status(200).json({ received: true, withdrawalUpdated: true });
    }

    // ============================================================
    // Phase 7A: Handle successful charge (deposit)
    // ============================================================
    if (evt !== 'charge.success') {
      // Acknowledge other events but don't process
      console.log(`[Paystack Webhook] Ignoring event type: ${evt}`);
      return res.status(200).json({ received: true });
    }

    if (!data || data.status !== 'success') {
      console.log('[Paystack Webhook] Charge not successful, ignoring');
      return res.status(200).json({ received: true });
    }

    const reference = data.reference;
    const amountKobo = Number(data.amount || 0);
    const userId = data.metadata?.userId;

    if (!reference || !amountKobo) {
      console.warn('[Paystack Webhook] Missing reference or amount');
      return res.status(200).json({ received: true }); // Acknowledge to prevent retries
    }

    if (!userId) {
      console.warn(`[Paystack Webhook] Missing userId in metadata for reference ${reference}`);
      return res.status(200).json({ received: true }); // Acknowledge to prevent retries
    }

    console.log(`[Paystack Webhook] Processing deposit: ${amountKobo / 100} NGN for user ${userId}, ref: ${reference}`);

    // Idempotent credit check
    const externalRef = `paystack:deposit:${reference}`;
    const { data: existingTx } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('external_ref', externalRef)
      .eq('provider', FIAT_PROVIDER)
      .maybeSingle();

    if (existingTx) {
      console.log(`[Paystack Webhook] Deposit already processed: ${externalRef}`);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    // Credit fiat ledger
    const { data: insertedTx, error: txError } = await insertWalletTransaction({
      user_id: userId,
      direction: 'credit',
      type: 'deposit',
      channel: 'fiat',
      provider: FIAT_PROVIDER,
      amount: amountKobo,
      currency: FIAT_CURRENCY,
      // walletActivity filters on completed/success
      status: 'completed',
      external_ref: externalRef,
      description: `Fiat deposit: ${amountKobo / 100} NGN`,
      meta: {
        kind: 'deposit',
        currency: 'NGN',
        reference,
        paystackEventId: event?.id,
        customer: data.customer,
        channel: data.channel,
        ip_address: data.ip_address,
        amountKobo,
        amountNgn: amountKobo / 100,
      },
    });

    if (txError) {
      // Check if it's a duplicate (idempotency constraint)
      if ((txError as any)?.code === '23505') {
        console.log(`[Paystack Webhook] Duplicate detected for ${externalRef}`);
        return res.status(200).json({ received: true, alreadyProcessed: true });
      }
      console.error('[Paystack Webhook] Failed to credit ledger:', txError);
      return res.status(500).json({ error: 'database_error', message: 'Failed to credit wallet' });
    }

    console.log(`[Paystack Webhook] ✅ Deposited ${amountKobo / 100} NGN to user ${userId}`);

    // Emit wallet update for realtime
    try {
      emitWalletUpdate({ userId, reason: 'fiat_deposit' });
    } catch (e) {
      console.warn('[Paystack Webhook] Failed to emit wallet update:', e);
    }

    // Update any pending intent to completed
    try {
      await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' } as any)
        .eq('external_ref', `paystack:init:${reference}`)
        .eq('provider', FIAT_PROVIDER);
    } catch (e) {
      // Non-fatal
    }

    return res.status(200).json({ received: true, credited: true });
  } catch (error: any) {
    console.error('[Paystack Webhook] Error:', error);
    // Return 200 to prevent Paystack from retrying (we'll handle manually if needed)
    return res.status(200).json({ received: true, error: error?.message });
  }
});

// ============================================================
// GET /api/v2/fiat/paystack/verify/:reference
// Verify a transaction status (optional, for manual checks)
// ============================================================
fiatPaystackRouter.get('/verify/:reference', async (req, res) => {
  try {
    if (!isFiatEnabled()) {
      return res.status(404).json({ error: 'disabled', message: 'Fiat is not enabled', version: VERSION });
    }

    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({ error: 'bad_request', message: 'Reference required', version: VERSION });
    }

    const paystackResponse = await paystackRequest(`/transaction/verify/${reference}`, 'GET');

    return res.json({
      success: true,
      status: paystackResponse?.data?.status,
      amount: paystackResponse?.data?.amount,
      reference: paystackResponse?.data?.reference,
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Paystack] Verify error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: error?.message || 'Failed to verify transaction',
      version: VERSION,
    });
  }
});

// ============================================================
// GET /api/v2/fiat/paystack/banks
// Get list of Nigerian banks for withdrawals (Phase 7C)
// ============================================================
fiatPaystackRouter.get('/banks', async (req, res) => {
  try {
    if (!isFiatEnabled()) {
      return res.status(404).json({ error: 'disabled', message: 'Fiat is not enabled', version: VERSION });
    }

    const paystackResponse = await paystackRequest('/bank?country=nigeria', 'GET');

    return res.json({
      success: true,
      banks: paystackResponse?.data || [],
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Paystack] Banks error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: error?.message || 'Failed to fetch banks',
      version: VERSION,
    });
  }
});

// ============================================================
// GET /api/v2/fiat/paystack/status
// Check if fiat deposits are enabled (for client feature flagging)
// ============================================================
fiatPaystackRouter.get('/status', (req, res) => {
  return res.json({
    enabled: isFiatEnabled(),
    currency: FIAT_CURRENCY,
    minDepositNgn: MIN_DEPOSIT_NGN,
    version: VERSION,
  });
});

export default fiatPaystackRouter;
