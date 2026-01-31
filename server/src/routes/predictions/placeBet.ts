import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { getAddress } from 'viem';
import crypto from 'crypto';
import { reconcileWallet } from '../../services/walletReconciliation';
import { emitPredictionUpdate, emitWalletUpdate } from '../../services/realtime';
import { recomputePredictionState } from '../../services/predictionMath';
import { enrichPredictionWithOddsV2 } from '../../utils/enrichPredictionOddsV2';
import { requireSupabaseAuth } from '../../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../../middleware/auth';

export const placeBetRouter = Router();

/** Generate a short request id for logging and client debugging. */
function requestId(): string {
  return crypto.randomUUID?.() ?? `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Map DB/Supabase errors to HTTP status + FCZ error code + user-facing message.
 * Returns { status, code, message } or null if unknown (caller uses 500).
 */
function mapDbError(err: any): { status: number; code: string; message: string } | null {
  if (!err?.code) return null;
  switch (err.code) {
    case '23503':
      return { status: 400, code: 'FCZ_INVALID_REFERENCE', message: 'Invalid prediction or option' };
    case '23505':
      return { status: 409, code: 'FCZ_DUPLICATE_BET', message: 'Bet already exists' };
    case '23502':
      return { status: 400, code: 'FCZ_BAD_REQUEST', message: 'Missing required fields' };
    case '42501':
    case 'PGRST301':
      return { status: 403, code: 'FCZ_FORBIDDEN', message: 'Not allowed' };
    default:
      return null;
  }
}

/**
 * POST /api/predictions/:predictionId/place-bet
 * Atomic, idempotent bet placement. Requires Authorization: Bearer <Supabase access_token>.
 * userId is taken from the authenticated user (not from body).
 */
async function handlePlaceBet(req: any, res: any) {
  const reqId = requestId();
  try {
    const predictionId = req.params.predictionId;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({
        code: 'FCZ_AUTH_REQUIRED',
        message: 'Authorization required',
        requestId: reqId,
        version: VERSION,
      });
    }

    // Verify ENABLE_BETS flag
    const enableBets = process.env.ENABLE_BETS === '1' || 
                       process.env.VITE_FCZ_BASE_BETS === '1' ||
                       process.env.ENABLE_BASE_BETS === '1';
    
    if (!enableBets) {
      console.log('[FCZ-BET] Bet placement disabled - ENABLE_BETS flag not set');
      return res.status(403).json({
        code: 'FCZ_FORBIDDEN',
        error: 'BETTING_DISABLED',
        message: 'Betting is temporarily unavailable. Please try again later.',
        requestId: reqId,
        version: VERSION
      });
    }

    // Validate input (userId comes from auth; body.userId ignored for security)
    const BodySchema = z.object({
      optionId: z.string().uuid('Invalid optionId'),
      amountUSD: z.number().positive('amountUSD must be positive').optional(),
      userId: z.string().uuid().optional(),
      walletAddress: z.string().optional(),
      fundingMode: z.enum(['crypto', 'demo', 'fiat']).optional(),
      amountNgn: z.number().positive().optional(),
    }).superRefine((val, ctx) => {
      const mode = val.fundingMode ?? 'crypto';
      if (mode === 'fiat') {
        if (!Number.isFinite(Number(val.amountNgn)) || Number(val.amountNgn) <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountNgn'], message: 'amountNgn is required for fiat fundingMode' });
        }
      } else {
        if (!Number.isFinite(Number(val.amountUSD)) || Number(val.amountUSD) <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountUSD'], message: 'amountUSD is required for demo/crypto fundingMode' });
        }
      }
    });

    let body;
    try {
      body = BodySchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          code: 'FCZ_BAD_REQUEST',
          error: 'invalid_body',
          message: err.issues?.[0]?.message ?? 'Missing or invalid fields',
          details: err.issues,
          requestId: reqId,
          version: VERSION
        });
      }
      throw err;
    }

    // userId is derived from Authorization (req.user) – never trust body.userId
    const { optionId } = body;
    const amountUSD = Number((body as any).amountUSD || 0);
    const fundingMode = body.fundingMode ?? 'crypto';
    const bodyWallet = body.walletAddress ? getAddress(body.walletAddress) : undefined;

    console.log(`[FCZ-BET] Place bet request:`, { predictionId, optionId, amountUSD, userId });

    // Verify prediction exists and is open
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, title, status, entry_deadline, pool_total, participant_count')
      .eq('id', predictionId)
      .single();

    if (predError || !prediction) {
      return res.status(404).json({
        code: 'FCZ_NOT_FOUND',
        error: 'prediction_not_found',
        message: 'Prediction not found',
        requestId: reqId,
        version: VERSION
      });
    }

    if (prediction.status !== 'open') {
      return res.status(400).json({
        code: 'FCZ_BAD_REQUEST',
        error: 'prediction_not_open',
        message: `Prediction is ${prediction.status}`,
        requestId: reqId,
        version: VERSION
      });
    }

    // Verify option exists
    const { data: option, error: optError } = await supabase
      .from('prediction_options')
      .select('id, prediction_id, label')
      .eq('id', optionId)
      .eq('prediction_id', predictionId)
      .single();

    if (optError || !option) {
      return res.status(404).json({
        code: 'FCZ_INVALID_REFERENCE',
        error: 'option_not_found',
        message: 'Option not found',
        requestId: reqId,
        version: VERSION
      });
    }

    // DEMO wallet mode (DB-backed ledger). Crypto path remains unchanged below.
    if (fundingMode === 'demo') {
      const DEMO_CURRENCY = 'DEMO_USD';
      const PROVIDER = 'demo-wallet';
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Idempotency: reuse existing requestId if provided
      const nonce = req.body.requestId || Date.now().toString();
      const lockRefInput = `${userId}|${predictionId}|${optionId}|${amountUSD}|${nonce}|demo`;
      const lockRef = crypto.createHash('sha256').update(lockRefInput).digest('hex').substring(0, 32);
      const externalRef = `demo_bet_lock:${lockRef}`;

      // Ensure demo wallet row exists
      await supabase
        .from('wallets')
        .upsert(
          { user_id: userId, currency: DEMO_CURRENCY, available_balance: 0, reserved_balance: 0, updated_at: new Date().toISOString() } as any,
          { onConflict: 'user_id,currency', ignoreDuplicates: true }
        );

      // Idempotent retry: if tx exists, return existing entry
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('entry_id')
        .eq('provider', PROVIDER)
        .eq('external_ref', externalRef)
        .maybeSingle();
      if ((existingTx as any)?.entry_id) {
        const existingEntryId = (existingTx as any).entry_id as string;
        const recomputed = await recomputePredictionState(predictionId);
        const { data: entryRow } = await supabase
          .from('prediction_entries')
          .select('*')
          .eq('id', existingEntryId)
          .maybeSingle();
        return res.status(200).json({
          ok: true,
          entryId: existingEntryId,
          data: { prediction: enrichPredictionWithOddsV2(recomputed.prediction), entry: entryRow || null },
          message: 'Bet already placed (idempotent)',
          version: VERSION,
        });
      }

      // Create/reuse lock with lock_ref idempotency
      const { data: lockByRef } = await supabase
        .from('escrow_locks')
        .select('id, state, status, amount')
        .eq('lock_ref', lockRef)
        .maybeSingle();

      let lockId: string;
      const lockStatus = (lockByRef as any)?.status || (lockByRef as any)?.state;
      if (lockByRef?.id) {
        lockId = lockByRef.id as any;
        if (lockStatus === 'consumed') {
          const { data: existingEntry } = await supabase
            .from('prediction_entries')
            .select('id')
            .eq('escrow_lock_id', lockId)
            .order('created_at', { ascending: false })
            .maybeSingle();
          const entryId = (existingEntry as any)?.id as string | undefined;
          const recomputed = await recomputePredictionState(predictionId);
          const { data: entryRow } = entryId
            ? await supabase.from('prediction_entries').select('*').eq('id', entryId).maybeSingle()
            : { data: null };
          return res.status(200).json({
            ok: true,
            entryId: entryId || null,
            consumedLockId: lockId,
            data: { prediction: enrichPredictionWithOddsV2(recomputed.prediction), entry: entryRow || null },
            message: 'Bet already placed (idempotent)',
            version: VERSION,
          });
        }
        if (Number((lockByRef as any).amount || 0) < amountUSD) {
          return res.status(400).json({
            error: 'INSUFFICIENT_LOCK',
            message: `Existing lock amount (${(lockByRef as any).amount}) is less than required (${amountUSD})`,
            version: VERSION,
          });
        }
      } else {
        const { data: newLock, error: lockErr } = await supabase
          .from('escrow_locks')
          .insert({
            user_id: userId,
            prediction_id: predictionId,
            option_id: optionId,
            amount: amountUSD,
            state: 'locked',
            status: 'locked',
            lock_ref: lockRef,
            expires_at: expiresAt.toISOString(),
            currency: 'USD',
            meta: { provider: PROVIDER },
          } as any)
          .select('id')
          .single();
        if (lockErr || !newLock?.id) {
          console.error('[FCZ-BET] demo lock create failed', lockErr);
          return res.status(500).json({ code: 'FCZ_DATABASE_ERROR', error: 'database_error', message: 'Failed to create lock', requestId: reqId, version: VERSION });
        }
        lockId = newLock.id as any;
      }

      // Reserve demo balance (compare-and-swap to reduce race issues)
      const { data: w } = await supabase
        .from('wallets')
        .select('available_balance,reserved_balance')
        .eq('user_id', userId)
        .eq('currency', DEMO_CURRENCY)
        .maybeSingle();
      const prevAvail = Number((w as any)?.available_balance || 0);
      const prevRes = Number((w as any)?.reserved_balance || 0);
      if (prevAvail < amountUSD) {
        return res.status(400).json({ error: 'INSUFFICIENT_FUNDS', message: 'Insufficient demo credits', version: VERSION });
      }
      const nextAvail = prevAvail - amountUSD;
      const nextRes = prevRes + amountUSD;
      const { error: balErr } = await supabase
        .from('wallets')
        .update({ available_balance: nextAvail, reserved_balance: nextRes, updated_at: new Date().toISOString() } as any)
        .eq('user_id', userId)
        .eq('currency', DEMO_CURRENCY)
        .eq('available_balance', prevAvail)
        .eq('reserved_balance', prevRes);
      if (balErr) {
        return res.status(400).json({ error: 'INSUFFICIENT_FUNDS', message: 'Insufficient demo credits', version: VERSION });
      }

      // Create prediction entry
      const { data: entry, error: entryErr } = await supabase
        .from('prediction_entries')
        .insert({
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountUSD,
          status: 'active',
          potential_payout: amountUSD * 2.0,
          escrow_lock_id: lockId,
          provider: PROVIDER,
        } as any)
        .select('*')
        .single();
      if (entryErr || !entry?.id) {
        const errCode = (entryErr as any)?.code;
        const errMessage = (entryErr as any)?.message;
        console.error('[FCZ-BET] demo entry create failed', { requestId: reqId, code: errCode, message: errMessage, full: entryErr });
        const mapped = mapDbError(entryErr);
        if (mapped) {
          return res.status(mapped.status).json({
            code: mapped.code,
            message: mapped.message,
            requestId: reqId,
            version: VERSION,
          });
        }
        return res.status(500).json({
          code: 'FCZ_DATABASE_ERROR',
          error: 'database_error',
          message: 'Failed to create entry',
          requestId: reqId,
          version: VERSION,
        });
      }

      // Mark lock as consumed
      await supabase.from('escrow_locks').update({ state: 'consumed', status: 'consumed' } as any).eq('id', lockId);

      // Record wallet transaction (idempotent)
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        direction: 'debit',
        type: 'bet_lock',
        channel: 'fiat',
        provider: PROVIDER,
        amount: amountUSD,
        currency: DEMO_CURRENCY,
        status: 'completed',
        external_ref: externalRef,
        prediction_id: predictionId,
        entry_id: entry.id,
        description: `Demo stake on "${prediction.title}"`,
        meta: { kind: 'bet_lock', prediction_id: predictionId, entry_id: entry.id, escrow_lock_id: lockId, provider: PROVIDER },
      } as any).then(({ error }) => {
        if (error && (error as any).code !== '23505') {
          console.warn('[FCZ-BET] demo wallet tx insert error (non-fatal):', error);
        }
      });

      const recomputed = await recomputePredictionState(predictionId);
      emitPredictionUpdate({ predictionId });
      emitWalletUpdate({ userId, reason: 'bet_placed' });

      return res.status(200).json({
        ok: true,
        entryId: entry.id,
        consumedLockId: lockId,
        data: { prediction: enrichPredictionWithOddsV2(recomputed.prediction), entry },
        requestId: reqId,
        version: VERSION,
      });
    }

    // ============================================================
    // FIAT wallet mode (NGN via Paystack) - Phase 7B
    // ============================================================
    if (fundingMode === 'fiat') {
      const FIAT_CURRENCY = 'NGN';
      const FIAT_PROVIDER = 'fiat-paystack';

      // Check if fiat is enabled
      const fiatEnabled = process.env.FIAT_PAYSTACK_ENABLED === 'true' || process.env.FIAT_PAYSTACK_ENABLED === '1';
      if (!fiatEnabled) {
        return res.status(400).json({
          error: 'FIAT_DISABLED',
          message: 'Fiat betting is not enabled',
          version: VERSION,
        });
      }

      // For fiat mode we require explicit NGN input (no FX assumptions).
      const amountNgn = Number((body as any).amountNgn);
      if (!Number.isFinite(amountNgn) || amountNgn <= 0) {
        return res.status(400).json({
          error: 'invalid_body',
          message: 'amountNgn is required for fiat fundingMode',
          version: VERSION,
        });
      }
      const amountKobo = Math.round(amountNgn * 100);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const nonce = req.body.requestId || Date.now().toString();
      const lockRefInput = `${userId}|${predictionId}|${optionId}|${amountKobo}|${nonce}|fiat`;
      const lockRef = crypto.createHash('sha256').update(lockRefInput).digest('hex').substring(0, 32);
      // NOTE: external_ref must be based on the lock_ref we end up using (may reuse an existing lock)
      let externalRef = `fiat_bet_lock:${lockRef}`;

      // Check fiat balance
      const { data: fiatTxns } = await supabase
        .from('wallet_transactions')
        .select('direction, amount, type')
        .eq('user_id', userId)
        .eq('provider', FIAT_PROVIDER)
        .eq('currency', FIAT_CURRENCY)
        .in('status', ['confirmed', 'completed']);

      let fiatCredits = 0;
      let fiatDebits = 0;
      for (const tx of fiatTxns || []) {
        const amt = Number((tx as any).amount || 0);
        if ((tx as any).direction === 'credit') fiatCredits += amt;
        else if ((tx as any).direction === 'debit') fiatDebits += amt;
      }
      // IMPORTANT: pending fiat withdrawals reserve funds but are not debited until paid (Phase 7C).
      // Subtract them here to prevent double-spend between withdrawal requests and fiat staking.
      let pendingWithdrawalKobo = 0;
      try {
        const { data: pendingWithdrawals } = await supabase
          .from('fiat_withdrawals')
          .select('amount_kobo,status')
          .eq('user_id', userId)
          .in('status', ['requested', 'approved', 'processing']);
        pendingWithdrawalKobo = (pendingWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount_kobo || 0), 0);
      } catch {
        // ignore (degraded check falls back to ledger-only)
      }

      const fiatAvailable = Math.max(0, (fiatCredits - fiatDebits) - pendingWithdrawalKobo);

      if (fiatAvailable < amountKobo) {
        return res.status(400).json({
          error: 'INSUFFICIENT_FUNDS',
          message: `Insufficient fiat balance. Available: ${fiatAvailable / 100} NGN, Required: ${amountNgn} NGN`,
          available: fiatAvailable / 100,
          required: amountNgn,
          version: VERSION,
        });
      }

      // Idempotent retry check
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('entry_id')
        .eq('provider', FIAT_PROVIDER)
        .eq('external_ref', externalRef)
        .maybeSingle();
      if ((existingTx as any)?.entry_id) {
        const existingEntryId = (existingTx as any).entry_id as string;
        const recomputed = await recomputePredictionState(predictionId);
        const { data: entryRow } = await supabase
          .from('prediction_entries')
          .select('*')
          .eq('id', existingEntryId)
          .maybeSingle();
        return res.status(200).json({
          ok: true,
          entryId: existingEntryId,
          data: { prediction: enrichPredictionWithOddsV2(recomputed.prediction), entry: entryRow || null },
          message: 'Bet already placed (idempotent)',
          version: VERSION,
        });
      }

      // Create/reuse lock with lock_ref idempotency (mirror demo behavior).
      // This prevents 500s when a previous failed attempt left an active lock.
      const { data: lockByRef } = await supabase
        .from('escrow_locks')
        .select('id, lock_ref, state, status, amount, option_id, expires_at')
        .eq('lock_ref', lockRef)
        .maybeSingle();

      // Also check for any active lock for this user/prediction (unique index may block inserts).
      const { data: activeLock } = lockByRef?.id
        ? ({ data: null } as any)
        : await supabase
            .from('escrow_locks')
            .select('id, lock_ref, state, status, amount, option_id, expires_at')
            .eq('user_id', userId)
            .eq('prediction_id', predictionId)
            .or('status.eq.locked,state.eq.locked')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .maybeSingle();

      const lockCandidate = (lockByRef as any)?.id ? lockByRef : (activeLock as any);
      const lockStatus = (lockCandidate as any)?.status || (lockCandidate as any)?.state;

      let lockId: string;
      if ((lockCandidate as any)?.id) {
        lockId = String((lockCandidate as any).id);

        // If lock already consumed, return the existing entry (idempotent)
        if (lockStatus === 'consumed') {
          const { data: existingEntry } = await supabase
            .from('prediction_entries')
            .select('id')
            .eq('escrow_lock_id', lockId)
            .order('created_at', { ascending: false })
            .maybeSingle();
          const entryId = (existingEntry as any)?.id as string | undefined;
          const recomputed = await recomputePredictionState(predictionId);
          const { data: entryRow } = entryId
            ? await supabase.from('prediction_entries').select('*').eq('id', entryId).maybeSingle()
            : { data: null };
          return res.status(200).json({
            ok: true,
            entryId: entryId || null,
            consumedLockId: lockId,
            data: { prediction: enrichPredictionWithOddsV2(recomputed.prediction), entry: entryRow || null },
            message: 'Bet already placed (idempotent)',
            fundingMode: 'fiat',
            version: VERSION,
          });
        }

        // Use existing lock_ref for wallet tx idempotency if present
        const existingLockRef = String((lockCandidate as any).lock_ref || '').trim();
        if (existingLockRef) {
          externalRef = `fiat_bet_lock:${existingLockRef}`;
        }

        // Refresh lock details to match the current request (safe: lock is not consumed yet)
        const updatePatch: any = {
          option_id: optionId,
          amount: amountNgn,
          expires_at: expiresAt.toISOString(),
          currency: FIAT_CURRENCY,
          meta: { provider: FIAT_PROVIDER, amountKobo },
        };
        // If the existing lock doesn't have a lock_ref, set it for future idempotency
        if (!existingLockRef) {
          updatePatch.lock_ref = lockRef;
          externalRef = `fiat_bet_lock:${lockRef}`;
        }
        await supabase.from('escrow_locks').update(updatePatch).eq('id', lockId);
      } else {
        const { data: newLock, error: lockErr } = await supabase
          .from('escrow_locks')
          .insert({
            user_id: userId,
            prediction_id: predictionId,
            option_id: optionId,
            amount: amountNgn, // Store in NGN for display
            state: 'locked',
            status: 'locked',
            lock_ref: lockRef,
            expires_at: expiresAt.toISOString(),
            currency: FIAT_CURRENCY,
            meta: { provider: FIAT_PROVIDER, amountKobo },
          } as any)
          .select('id')
          .single();
        if (lockErr || !newLock?.id) {
          console.error('[FCZ-BET] fiat lock create failed', lockErr);
          return res.status(500).json({ code: 'FCZ_DATABASE_ERROR', error: 'database_error', message: 'Failed to create lock', requestId: reqId, version: VERSION });
        }
        lockId = newLock.id as any;
      }

      // Create prediction entry
      const { data: entry, error: entryErr } = await supabase
        .from('prediction_entries')
        .insert({
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountNgn, // Store in NGN
          status: 'active',
          potential_payout: amountNgn * 2.0,
          escrow_lock_id: lockId,
          provider: FIAT_PROVIDER,
        } as any)
        .select('*')
        .single();
      if (entryErr || !entry?.id) {
        const errCode = (entryErr as any)?.code;
        const errMessage = (entryErr as any)?.message;
        console.error('[FCZ-BET] fiat entry create failed', { requestId: reqId, code: errCode, message: errMessage, full: entryErr });
        const mapped = mapDbError(entryErr);
        if (mapped) {
          return res.status(mapped.status).json({
            code: mapped.code,
            message: mapped.message,
            requestId: reqId,
            version: VERSION,
          });
        }
        return res.status(500).json({
          code: 'FCZ_DATABASE_ERROR',
          error: 'database_error',
          message: 'Failed to create entry',
          requestId: reqId,
          version: VERSION,
        });
      }

      // Mark lock as consumed
      await supabase.from('escrow_locks').update({ state: 'consumed', status: 'consumed' } as any).eq('id', lockId);

      // Record wallet transaction (fiat bet lock debit)
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        direction: 'debit',
        // wallet_transactions.type has CHECK constraints; use allowed type
        type: 'bet_lock',
        channel: 'fiat',
        provider: FIAT_PROVIDER,
        amount: amountKobo,
        currency: FIAT_CURRENCY,
        status: 'completed',
        external_ref: externalRef,
        prediction_id: predictionId,
        entry_id: entry.id,
        description: `Fiat stake on "${prediction.title}"`,
        meta: { kind: 'bet_lock', currency: 'NGN', prediction_id: predictionId, entry_id: entry.id, escrow_lock_id: lockId, provider: FIAT_PROVIDER, amountNgn, amountKobo },
      } as any).then(({ error }) => {
        if (error && (error as any).code !== '23505') {
          console.warn('[FCZ-BET] fiat wallet tx insert error (non-fatal):', error);
        }
      });

      const recomputed = await recomputePredictionState(predictionId);
      emitPredictionUpdate({ predictionId });
      emitWalletUpdate({ userId, reason: 'bet_placed' });

      return res.status(200).json({
        ok: true,
        entryId: entry.id,
        consumedLockId: lockId,
        data: { prediction: enrichPredictionWithOddsV2(recomputed.prediction), entry },
        fundingMode: 'fiat',
        version: VERSION,
      });
    }

    const walletSnapshot = await reconcileWallet({ userId, walletAddress: bodyWallet });

    const { data: existingEntry, error: existingEntryError } = await supabase
      .from('prediction_entries')
      .select('id, amount, potential_payout')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .eq('option_id', optionId)
      .maybeSingle();

    if (existingEntryError) {
      console.error('[FCZ-BET] Failed to fetch existing entry:', existingEntryError);
      return res.status(500).json({
        code: 'FCZ_DATABASE_ERROR',
        error: 'entry_lookup_failed',
        message: 'Unable to verify existing bets for this prediction',
        requestId: reqId,
        version: VERSION
      });
    }

    const isTopUp = Boolean(existingEntry);

    // Persist wallet address association if provided and missing
    if (bodyWallet) {
      try {
        await supabase
          .from('crypto_addresses')
          .upsert({ user_id: userId, chain_id: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null, address: bodyWallet },
                  { onConflict: 'chain_id,address' });
      } catch (e) {
        console.warn('[FCZ-BET] upsert wallet address failed', e);
      }
    }

    if (!walletSnapshot.walletAddress) {
      return res.status(400).json({
        error: 'WALLET_NOT_LINKED',
        message: 'No wallet address is linked to this account. Please reconnect your wallet.',
        version: VERSION,
      });
    }

    let { availableToStakeUSDC, reservedUSDC, escrowUSDC } = walletSnapshot;
    
    // CRITICAL FIX:
    // After deploying a new escrow contract, old consumed locks from the previous contract
    // can cause availableToStakeUSDC to be incorrectly reduced.
    // 
    // The on-chain escrow contract is the source of truth:
    // - escrowUSDC = total on-chain balance (available + reserved on-chain)
    // - The contract's balances(address) returns what the user can actually use
    //
    // Since we fetch fresh on-chain data in reconcileWallet via fetchEscrowSnapshotFor,
    // we should trust the on-chain available balance directly.
    // 
    // To get the TRUE on-chain available, we need to re-fetch it directly:
    const { fetchEscrowSnapshotFor } = await import('../../services/escrowContract');
    let trueOnchainAvailable = 0;
    try {
      if (walletSnapshot.walletAddress) {
        const freshSnapshot = await fetchEscrowSnapshotFor(walletSnapshot.walletAddress);
        trueOnchainAvailable = freshSnapshot.availableUSDC;
        console.log(`[FCZ-BET] Fresh on-chain snapshot:`, {
          availableUSDC: freshSnapshot.availableUSDC,
          reservedUSDC: freshSnapshot.reservedUSDC,
          totalDepositedUSDC: freshSnapshot.totalDepositedUSDC
        });
      }
    } catch (e) {
      console.warn('[FCZ-BET] Failed to fetch fresh on-chain snapshot:', e);
    }
    
    // Use the maximum of:
    // - availableToStakeUSDC (DB-derived, may be stale due to old locks)
    // - trueOnchainAvailable (fresh on-chain balance)
    const snapshotAvailable = typeof availableToStakeUSDC === 'number' ? availableToStakeUSDC : 0;
    const effectiveAvailable = Math.max(trueOnchainAvailable, snapshotAvailable);
    
    console.log(`[FCZ-BET] Balance check:`, {
      trueOnchainAvailable,
      snapshotAvailable,
      effectiveAvailable,
      required: amountUSD,
      walletAddress: walletSnapshot.walletAddress
    });
    
    // Check if effective available >= amount
    if (effectiveAvailable < amountUSD) {
      console.log(`[FCZ-BET] Insufficient escrow - blocking stake`, {
        availableToStakeUSDC,
        escrowUSDC,
        trueOnchainAvailable,
        effectiveAvailable,
        required: amountUSD
      });
      return res.status(400).json({
        error: 'INSUFFICIENT_ESCROW',
        message: `Insufficient escrow available: ${effectiveAvailable.toFixed(2)} < ${amountUSD}`,
        available: effectiveAvailable,
        required: amountUSD,
        version: VERSION
      });
    }

    // Generate idempotent lock_ref: hash(userId|predictionId|optionId|amount|nonce)
    // Use timestamp as nonce for uniqueness per request, but same request = same hash
    // In practice, client should send a requestId for true idempotency
    const nonce = req.body.requestId || Date.now().toString();
    const lockRefInput = `${userId}|${predictionId}|${optionId}|${amountUSD}|${nonce}`;
    const lockRef = crypto.createHash('sha256').update(lockRefInput).digest('hex').substring(0, 32);

    console.log(`[FCZ-BET] Creating lock with ref: ${lockRef}`);

    // Check if lock with this ref already exists (idempotency)
    // First check by lock_ref for true idempotency
    let existingLock = null;
    let checkError = null;
    
    // Try to find by lock_ref first (idempotent retry)
    const { data: lockByRef, error: refError } = await supabase
      .from('escrow_locks')
      .select('id, state, amount, prediction_id, expires_at')
      .eq('lock_ref', lockRef)
      .maybeSingle();
      
    if (lockByRef) {
      existingLock = lockByRef;
      checkError = refError;
    } else {
      // Fallback: check for active lock on this prediction (prevent duplicate)
      const { data: lockByPrediction, error: predError } = await supabase
        .from('escrow_locks')
        .select('id, state, amount, prediction_id, expires_at')
        .eq('user_id', userId)
        .eq('prediction_id', predictionId)
        .eq('state', 'locked')
        .gt('expires_at', new Date().toISOString()) // Only active locks
        .maybeSingle();
        
      existingLock = lockByPrediction;
      checkError = predError;
    }

    if (existingLock && !checkError) {
      // Lock exists - check if it's already consumed
      const lockStatus = (existingLock as any).status || existingLock.state;
      if (lockStatus === 'consumed') {
        // Find the entry that consumed it
        const { data: existingEntry } = await supabase
          .from('prediction_entries')
          .select('id')
          .eq('escrow_lock_id', existingLock.id)
          .single();

        if (existingEntry) {
          const recomputed = await recomputePredictionState(predictionId);
          const { data: entryRow, error: entryFetchError } = await supabase
            .from('prediction_entries')
            .select('*')
            .eq('id', existingEntry.id)
            .single();
          if (entryFetchError) {
            console.warn('[FCZ-BET] Failed to fetch existing entry for idempotent response:', entryFetchError);
          }
          console.log(`[FCZ-BET] Lock already consumed, entry: ${existingEntry.id}`);
          return res.status(200).json({
            ok: true,
            entryId: existingEntry.id,
            consumedLockId: existingLock.id,
            data: {
              prediction: enrichPredictionWithOddsV2(recomputed.prediction),
              entry: entryFetchError ? null : entryRow,
            },
            newEscrowReserved: reservedUSDC,
            newEscrowAvailable: availableToStakeUSDC,
            message: 'Bet already placed (idempotent)'
          });
        }
      }

      // Lock exists but not consumed - reuse it
      console.log(`[FCZ-BET] Reusing existing lock: ${existingLock.id}`);
      
      // Check if lock amount matches
      if (Number(existingLock.amount) < amountUSD) {
        return res.status(400).json({
          error: 'INSUFFICIENT_LOCK',
          message: `Existing lock amount (${existingLock.amount}) is less than required (${amountUSD})`,
          version: VERSION
        });
      }
      
      // Use existing lock
      console.log(`[FCZ-BET] Reusing existing lock: ${existingLock.id}`);
    } else {
      // Create new lock with expiration and idempotency
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      const lockData: any = {
        user_id: userId,
        prediction_id: predictionId,
        amount: amountUSD,
        state: 'locked',
        status: 'locked',
        lock_ref: lockRef, // Idempotency key
        expires_at: expiresAt.toISOString(), // Auto-expire after 10 minutes
        currency: 'USD',
        meta: { provider: 'crypto-base-usdc' },
      };
      
      // Add optional columns if they exist in schema
      if (optionId) {
        lockData.option_id = optionId;
      }
      
      console.log(`[FCZ-BET] Creating new lock, expires at: ${expiresAt.toISOString()}`);
      
      const { data: newLock, error: createError } = await supabase
        .from('escrow_locks')
        .insert(lockData)
        .select()
        .single();

      if (createError) {
        // Check if it's a unique constraint violation (concurrent request)
        if (createError.code === '23505') {
          // Lock already created by another request - fetch it
          const { data: concurrentLock } = await supabase
            .from('escrow_locks')
            .select('id, state')
            .eq('user_id', userId)
            .eq('prediction_id', predictionId)
            .eq('state', 'locked')
            .maybeSingle();

          const concurrentStatus = (concurrentLock as any)?.status || concurrentLock?.state;
          if (concurrentLock && concurrentStatus === 'consumed') {
            const { data: entry } = await supabase
              .from('prediction_entries')
              .select('id')
              .eq('escrow_lock_id', concurrentLock.id)
              .single();

            if (entry) {
              const recomputed = await recomputePredictionState(predictionId);
              const { data: entryRow, error: entryFetchError } = await supabase
                .from('prediction_entries')
                .select('*')
                .eq('id', entry.id)
                .single();
              if (entryFetchError) {
                console.warn('[FCZ-BET] Failed to fetch existing entry for idempotent response:', entryFetchError);
              }
              return res.status(200).json({
                ok: true,
                entryId: entry.id,
                consumedLockId: concurrentLock.id,
                data: {
                  prediction: enrichPredictionWithOddsV2(recomputed.prediction),
                  entry: entryFetchError ? null : entryRow,
                },
                newEscrowReserved: reservedUSDC,
                newEscrowAvailable: availableToStakeUSDC
              });
            }
          }
        }

        console.error('[FCZ-BET] Error creating lock:', createError);
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to create escrow lock',
          version: VERSION
        });
      }

      existingLock = newLock;
    }

    const lockId = existingLock?.id;
    if (!lockId) {
      return res.status(500).json({
        code: 'FCZ_DATABASE_ERROR',
        error: 'lock_creation_failed',
        message: 'Failed to obtain lock ID',
        requestId: reqId,
        version: VERSION
      });
    }

    let entryId: string | null = null;
    let totalEntryAmount = amountUSD;

    if (isTopUp && existingEntry) {
      totalEntryAmount = Number(existingEntry.amount || 0) + amountUSD;
      const { data: updatedEntry, error: updateError } = await supabase
        .from('prediction_entries')
        .update({
          amount: totalEntryAmount,
          potential_payout: totalEntryAmount * 2.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[FCZ-BET] Error updating existing entry:', updateError);
        await supabase
          .from('escrow_locks')
          .update({ state: 'released', status: 'released', released_at: new Date().toISOString() })
          .eq('id', lockId);

        return res.status(500).json({
          error: 'entry_update_failed',
          message: 'Failed to increase your stake on this option',
          version: VERSION
        });
      }

      entryId = updatedEntry?.id || existingEntry.id;
    } else {
      const { data: entry, error: entryError } = await supabase
        .from('prediction_entries')
        .insert({
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountUSD,
          status: 'active',
          potential_payout: amountUSD * 2.0,
          escrow_lock_id: lockId,
          provider: 'crypto-base-usdc'
        })
        .select()
        .single();

      if (entryError) {
        await supabase
          .from('escrow_locks')
          .update({ state: 'released', status: 'released', released_at: new Date().toISOString() })
          .eq('id', lockId);

        console.error('[FCZ-BET] Error creating entry:', entryError, 'requestId:', reqId);
        const mapped = mapDbError(entryError);
        if (mapped) {
          return res.status(mapped.status).json({
            code: mapped.code,
            message: mapped.message,
            requestId: reqId,
            version: VERSION,
          });
        }
        return res.status(500).json({
          code: 'FCZ_DATABASE_ERROR',
          error: 'database_error',
          message: 'Failed to create prediction entry',
          requestId: reqId,
          version: VERSION,
        });
      }

      entryId = entry?.id || null;
      totalEntryAmount = amountUSD;
    }

    if (!entryId) {
      await supabase
        .from('escrow_locks')
        .update({ state: 'released', status: 'released', released_at: new Date().toISOString() })
        .eq('id', lockId);

      return res.status(500).json({
        error: 'entry_missing',
        message: 'Prediction entry was not recorded',
        version: VERSION
      });
    }

    // Mark lock as consumed (bet is now placed, funds are committed to active bet)
    // After migration 116, 'consumed' is a valid state value
    try {
      await supabase
        .from('escrow_locks')
        .update({ 
          state: 'consumed', // Funds locked in active bet
          status: 'consumed' // Keep both columns in sync
        })
        .eq('id', lockId);
    } catch (e) {
      console.warn('[FCZ-BET] Failed to mark lock as consumed:', e);
    }

    const walletTxPayload = {
      user_id: userId,
      type: 'bet_lock',
      direction: 'debit', // CRITICAL: Must be 'debit' for walletActivity to classify as bet_placed
      status: 'completed',
      channel: 'escrow_consumed',
      provider: 'crypto-base-usdc',
      amount: amountUSD,
      currency: 'USD',
      external_ref: `bet_${entryId}`,
      prediction_id: predictionId,
      entry_id: entryId,
      description: `Bet on "${prediction.title}"`,
      meta: {
        prediction_id: predictionId,
        option_id: optionId,
        option_label: option?.label ?? null,
        prediction_title: prediction.title,
        entry_id: entryId,
        lock_id: lockId
      }
    };

    console.log('[FCZ-BET] Inserting wallet_transaction:', JSON.stringify(walletTxPayload));

    const { data: walletTxData, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .insert(walletTxPayload)
      .select('id')
      .single();

    if (walletTxError) {
      console.error('[FCZ-BET] ❌ Failed to record wallet transaction:', walletTxError);
    } else {
      console.log('[FCZ-BET] ✅ Wallet transaction recorded:', walletTxData?.id);
    }

    // Emit event_log
    await supabase
      .from('event_log')
      .insert({
        source: 'place_bet',
        kind: 'prediction.entry.created',
        ref: entryId,
        payload: {
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountUSD,
          lock_id: lockId
        }
      });

    const recomputed = await recomputePredictionState(predictionId);
    const { data: latestEntry, error: latestEntryError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('id', entryId)
      .single();
    if (latestEntryError) {
      console.warn('[FCZ-BET] Failed to fetch latest entry record:', latestEntryError);
    }
    const finalSnapshot = await reconcileWallet({ userId });

    console.log(`[FCZ-BET] Bet placed successfully: entry ${entryId}, lock ${lockId}`);

    // Realtime notifications
    emitPredictionUpdate({ predictionId });
    emitWalletUpdate({ userId, reason: 'bet_placed' });

    return res.status(200).json({
      ok: true,
      entryId,
      consumedLockId: lockId,
      data: {
        prediction: enrichPredictionWithOddsV2(recomputed.prediction),
        entry: latestEntryError ? null : latestEntry,
      },
      newEscrowReserved: finalSnapshot.reservedUSDC,
      newEscrowAvailable: finalSnapshot.availableToStakeUSDC
    });
  } catch (error) {
    console.error('[FCZ-BET] Unhandled error:', error);
    return res.status(500).json({
      code: 'FCZ_DATABASE_ERROR',
      error: 'internal_error',
      message: 'Failed to place bet',
      requestId: reqId,
      version: VERSION
    });
  }
}

// Register both kebab-case and snake_case for backward compatibility
placeBetRouter.post('/:predictionId/place-bet', requireSupabaseAuth, handlePlaceBet);
placeBetRouter.post('/:predictionId/place_bet', requireSupabaseAuth, handlePlaceBet);

