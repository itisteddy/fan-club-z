import { Router } from 'express';
import { z } from 'zod';
import { VERSION } from '@fanclubz/shared';
import { supabase } from '../config/database';
import { createNotification } from '../services/notifications';
import { getNgnUsdRate } from '../services/FxRateService';
import { reconcileWallet } from '../services/walletReconciliation';

export const demoWallet = Router();

const CURRENCY = 'DEMO_USD';
const PROVIDER = 'demo-wallet';

// Fiat constants
const FIAT_CURRENCY = 'NGN';
const FIAT_PROVIDER = 'fiat-paystack';

function todayKey(): string {
  // YYYY-MM-DD in server local time is fine for "1/day" idempotency in dev
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureDemoWalletRow(userId: string) {
  await supabase
    .from('wallets')
    .upsert(
      { user_id: userId, currency: CURRENCY, available_balance: 0, reserved_balance: 0, updated_at: new Date().toISOString() } as any,
      { onConflict: 'user_id,currency', ignoreDuplicates: true }
    );
}

async function fetchDemoSummary(userId: string) {
  await ensureDemoWalletRow(userId);
  const { data, error } = await supabase
    .from('wallets')
    .select('available_balance, reserved_balance, updated_at')
    .eq('user_id', userId)
    .eq('currency', CURRENCY)
    .maybeSingle();
  if (error) throw error;
  const available = Number((data as any)?.available_balance || 0);
  const reserved = Number((data as any)?.reserved_balance || 0);
  const updatedAt = (data as any)?.updated_at ? new Date((data as any).updated_at).toISOString() : new Date().toISOString();
  return { currency: CURRENCY, available, reserved, total: available + reserved, lastUpdated: updatedAt };
}

// GET /api/demo-wallet/summary?userId=<uuid>
demoWallet.get('/summary', async (req, res) => {
  try {
    const userId = String((req.query as any)?.userId || '');
    if (!userId) {
      return res.status(400).json({ error: 'Bad Request', message: 'userId is required', version: VERSION });
    }
    const summary = await fetchDemoSummary(userId);
    return res.json({ success: true, summary, version: VERSION });
  } catch (e) {
    console.error('[DEMO-WALLET] summary error', e);
    return res.status(500).json({ error: 'Internal', message: 'Failed to load demo wallet summary', version: VERSION });
  }
});

const FaucetSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive().optional(),
});

// POST /api/demo-wallet/faucet
demoWallet.post('/faucet', async (req, res) => {
  try {
    const parsed = FaucetSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid payload', details: parsed.error.issues, version: VERSION });
    }

    const { userId } = parsed.data;
    const amount = Number(parsed.data.amount ?? 50);
    const day = todayKey();
    const externalRef = `demo_faucet:${userId}:${day}`;
    await ensureDemoWalletRow(userId);

    // Idempotent: 1 faucet/day per user (provider, external_ref unique)
    const { error: txErr } = await supabase.from('wallet_transactions').insert({
      user_id: userId,
      direction: 'credit',
      // Use 'deposit' to satisfy older wallet_transactions_type_check variants in existing DBs
      type: 'deposit',
      channel: 'fiat',
      provider: PROVIDER,
      amount,
      currency: CURRENCY,
      status: 'completed',
      external_ref: externalRef,
      description: 'Demo credits faucet',
      meta: { kind: 'demo_faucet', day },
    } as any);

    if (txErr && (txErr as any).code !== '23505') {
      console.error('[DEMO-WALLET] faucet tx insert error', txErr);
      return res.status(500).json({ error: 'Internal', message: 'Failed to faucet demo credits', version: VERSION });
    }

    // Determine grantedAt for this faucet (new insert or existing)
    // If we hit the idempotency constraint, fetch the existing tx to compute cooldown precisely.
    let grantedAtIso: string | null = null;
    const alreadyGranted = Boolean(txErr && (txErr as any).code === '23505');
    if (txErr && (txErr as any).code === '23505') {
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('created_at')
        .eq('external_ref', externalRef)
        .eq('user_id', userId)
        .maybeSingle();
      grantedAtIso = (existingTx as any)?.created_at ? new Date((existingTx as any).created_at).toISOString() : null;
    } else {
      grantedAtIso = new Date().toISOString();
    }

    const grantedAt = grantedAtIso ? new Date(grantedAtIso) : new Date();
    const nextEligibleAt = new Date(grantedAt.getTime() + 24 * 60 * 60 * 1000);
    const nextEligibleAtIso = nextEligibleAt.toISOString();

    // Only credit if we inserted a new tx (no error)
    if (!txErr) {
      // Compare-and-swap update to reduce race issues
      const { data: w } = await supabase
        .from('wallets')
        .select('available_balance,reserved_balance')
        .eq('user_id', userId)
        .eq('currency', CURRENCY)
        .maybeSingle();
      const prevAvail = Number((w as any)?.available_balance || 0);
      const prevRes = Number((w as any)?.reserved_balance || 0);
      const nextAvail = prevAvail + amount;

      const { error: updErr } = await supabase
        .from('wallets')
        .update({ available_balance: nextAvail, reserved_balance: prevRes, updated_at: new Date().toISOString() } as any)
        .eq('user_id', userId)
        .eq('currency', CURRENCY)
        .eq('available_balance', prevAvail)
        .eq('reserved_balance', prevRes);

      if (updErr) {
        console.warn('[DEMO-WALLET] faucet balance update warning (non-fatal):', updErr);
      }

      // Phase 4C: Create notification for demo credits grant
      try {
        await createNotification({
          userId,
          type: 'demo_credit',
          title: 'Demo credits added',
          body: `You received $${amount.toFixed(2)} in demo credits. You can request again in 24 hours.`,
          href: `/wallet`,
          metadata: {
            amount,
            grantedAt: grantedAtIso,
            nextEligibleAt: nextEligibleAtIso,
          },
          externalRef: `notif:demo_credit:${userId}:${String(grantedAtIso || grantedAt.toISOString()).split('T')[0]}`,
        }).catch((err) => {
          console.warn(`[Notifications] Failed to create demo credit notification for ${userId}:`, err);
        });
      } catch (err) {
        console.warn(`[Notifications] Error creating demo credit notification:`, err);
      }
    }

    const summary = await fetchDemoSummary(userId);
    return res.json({
      success: true,
      summary,
      grantedAt: grantedAtIso,
      nextEligibleAt: nextEligibleAtIso,
      alreadyGranted,
      version: VERSION,
    });
  } catch (e) {
    console.error('[DEMO-WALLET] faucet outer error', e);
    return res.status(500).json({ error: 'Internal', message: 'Failed to faucet demo credits', version: VERSION });
  }
});

// ============================================================
// FIAT WALLET FUNCTIONS - Phase 7A/7B
// ============================================================

/**
 * Fetch fiat (NGN) balance from ledger
 * Balance = sum(credits) - sum(debits) where provider='fiat-paystack' and status='confirmed'
 * Also computes locked balance from active stakes
 */
async function fetchFiatSummary(userId: string): Promise<{
  currency: string;
  totalKobo: number;
  availableKobo: number;
  lockedKobo: number;
  totalNgn: number;
  availableNgn: number;
  lockedNgn: number;
  lastUpdated: string;
}> {
  // Get all completed fiat transactions (amounts stored in kobo)
  const { data: txns, error } = await supabase
    .from('wallet_transactions')
    .select('direction, amount, type, status')
    .eq('user_id', userId)
    .eq('provider', FIAT_PROVIDER)
    .eq('currency', FIAT_CURRENCY)
    .in('status', ['completed', 'success']);

  if (error) {
    console.error('[FIAT-WALLET] Failed to fetch transactions:', error);
    throw error;
  }

  let totalCredits = 0;
  let totalDebits = 0;
  // Locked = active fiat stakes + pending withdrawals
  let lockedKobo = 0;

  for (const tx of txns || []) {
    const amount = Number((tx as any).amount || 0);
    const direction = String((tx as any).direction || '');
    const type = String((tx as any).type || '');

    if (direction === 'credit') {
      totalCredits += amount;
    } else if (direction === 'debit') {
      totalDebits += amount;
    }

    // No per-tx lock tracking here; locked is computed from active entries + pending withdrawals below.
  }

  const totalKobo = Math.max(0, totalCredits - totalDebits);

  // Add active fiat stakes to locked
  try {
    const { data: activeFiatEntries } = await supabase
      .from('prediction_entries')
      .select('amount')
      .eq('user_id', userId)
      .eq('provider', FIAT_PROVIDER)
      .eq('status', 'active');
    const lockedFromBets = (activeFiatEntries || []).reduce((sum: number, e: any) => sum + Math.round(Number(e.amount || 0) * 100), 0);
    lockedKobo += lockedFromBets;
  } catch {
    // ignore
  }

  // Add pending withdrawals to locked
  try {
    const { data: pendingWithdrawals } = await supabase
      .from('fiat_withdrawals')
      .select('amount_kobo')
      .eq('user_id', userId)
      .in('status', ['requested', 'approved', 'processing']);
    const lockedFromWithdrawals = (pendingWithdrawals || []).reduce((sum: number, w: any) => sum + Number(w.amount_kobo || 0), 0);
    lockedKobo += lockedFromWithdrawals;
  } catch {
    // ignore
  }

  const availableKobo = Math.max(0, totalKobo - lockedKobo);

  return {
    currency: FIAT_CURRENCY,
    totalKobo,
    availableKobo,
    lockedKobo,
    totalNgn: totalKobo / 100,
    availableNgn: availableKobo / 100,
    lockedNgn: lockedKobo / 100,
    lastUpdated: new Date().toISOString(),
  };
}

// GET /api/demo-wallet/fiat/summary?userId=<uuid>
// Phase 7D: adds fx + usdEstimate (display-only)
demoWallet.get('/fiat/summary', async (req, res) => {
  try {
    const userId = String((req.query as any)?.userId || '');
    if (!userId) {
      return res.status(400).json({ error: 'Bad Request', message: 'userId is required', version: VERSION });
    }

    const fiatEnabled = process.env.FIAT_PAYSTACK_ENABLED === 'true' || process.env.FIAT_PAYSTACK_ENABLED === '1';
    if (!fiatEnabled) {
      return res.json({
        success: true,
        enabled: false,
        summary: null,
        fx: { pair: 'NGNUSD', rate: null, source: 'none', asOf: null, retrievedAt: null, isStale: true },
        version: VERSION,
      });
    }

    const summary = await fetchFiatSummary(userId);
    const fx = await getNgnUsdRate();
    const usdEstimate =
      fx.rate != null && !fx.isStale && Number.isFinite(summary.availableNgn)
        ? summary.availableNgn * fx.rate
        : null;

    const summaryWithEstimate = { ...summary, usdEstimate };

    return res.json({
      success: true,
      enabled: true,
      summary: summaryWithEstimate,
      fx: {
        pair: fx.pair,
        rate: fx.rate,
        source: fx.source,
        asOf: fx.asOf,
        retrievedAt: fx.retrievedAt,
        isStale: fx.isStale,
      },
      version: VERSION,
    });
  } catch (e) {
    console.error('[FIAT-WALLET] summary error', e);
    return res.status(500).json({ error: 'Internal', message: 'Failed to load fiat wallet summary', version: VERSION });
  }
});

// GET /api/demo-wallet/combined-summary?userId=<uuid>&walletAddress=<hex>
// Returns demo, fiat, optionally crypto (when walletAddress), fx, and totals (display-only).
demoWallet.get('/combined-summary', async (req, res) => {
  try {
    const userId = String((req.query as any)?.userId || '');
    const walletAddress = (req.query as any)?.walletAddress as string | undefined;
    if (!userId) {
      return res.status(400).json({ error: 'Bad Request', message: 'userId is required', version: VERSION });
    }

    const demo = await fetchDemoSummary(userId);
    const fiatEnabled = process.env.FIAT_PAYSTACK_ENABLED === 'true' || process.env.FIAT_PAYSTACK_ENABLED === '1';
    let fiat: Awaited<ReturnType<typeof fetchFiatSummary>> | null = null;
    if (fiatEnabled) {
      try {
        fiat = await fetchFiatSummary(userId);
      } catch (e) {
        console.warn('[FIAT-WALLET] Failed to fetch fiat summary:', e);
      }
    }

    const fx = await getNgnUsdRate();
    const fxOk = fx.rate != null && !fx.isStale;

    let fiatUsdEstimate: number | null = null;
    if (fiat && fxOk && Number.isFinite(fiat.availableNgn)) {
      fiatUsdEstimate = fiat.availableNgn * fx.rate!;
    }
    const fiatWithEstimate = fiat
      ? { ...fiat, usdEstimate: fiatUsdEstimate }
      : null;

    let cryptoUsd = 0;
    if (walletAddress?.trim()) {
      try {
        const snap = await reconcileWallet({ userId, walletAddress: walletAddress.trim() });
        cryptoUsd = Number(snap.availableToStakeUSDC) || 0;
      } catch {
        // skip crypto; totals will omit it
      }
    }

    const totalsUsdEstimate = fxOk
      ? (fiatUsdEstimate ?? 0) + cryptoUsd
      : null;

    return res.json({
      success: true,
      demo,
      fiat: fiatWithEstimate,
      fiatEnabled,
      crypto: walletAddress ? { usdcBalance: cryptoUsd, usdEstimate: cryptoUsd } : undefined,
      totals: { usdEstimate: totalsUsdEstimate },
      fx: {
        pair: fx.pair,
        rate: fx.rate,
        source: fx.source,
        asOf: fx.asOf,
        retrievedAt: fx.retrievedAt,
        isStale: fx.isStale,
      },
      version: VERSION,
    });
  } catch (e) {
    console.error('[WALLET] combined-summary error', e);
    return res.status(500).json({ error: 'Internal', message: 'Failed to load wallet summary', version: VERSION });
  }
});

