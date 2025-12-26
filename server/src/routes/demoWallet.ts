import { Router } from 'express';
import { z } from 'zod';
import { VERSION } from '@fanclubz/shared';
import { supabase } from '../config/database';

export const demoWallet = Router();

const CURRENCY = 'DEMO_USD';
const PROVIDER = 'demo-wallet';

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
    }

    const summary = await fetchDemoSummary(userId);
    return res.json({ success: true, summary, version: VERSION });
  } catch (e) {
    console.error('[DEMO-WALLET] faucet outer error', e);
    return res.status(500).json({ error: 'Internal', message: 'Failed to faucet demo credits', version: VERSION });
  }
});


