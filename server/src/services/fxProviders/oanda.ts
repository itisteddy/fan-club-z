/**
 * Phase 7D: OANDA Exchange Rates API – primary FX provider.
 * Expects 1 USD = X NGN; we store rate = 1/X (USD per 1 NGN).
 * FX_OANDA_API_KEY required. Base URL configurable via FX_OANDA_BASE_URL.
 */

import type { FxQuote } from './frankfurter';

const DEFAULT_BASE = 'https://api.exchange-rates-api.oanda.com';

export async function fetchOanda(): Promise<FxQuote | null> {
  const key = process.env.FX_OANDA_API_KEY;
  const base = process.env.FX_OANDA_BASE_URL || DEFAULT_BASE;
  if (!key?.trim()) return null;
  const url = `${base}/v1/rates?base=USD&quote=NGN`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { rate?: number; rates?: { NGN?: number }; quote?: string };
  let ngnPerUsd = Number(j?.rate ?? j?.rates?.NGN);
  if (!Number.isFinite(ngnPerUsd) || ngnPerUsd <= 0) return null;
  const rate = 1 / ngnPerUsd;
  return { pair: 'NGNUSD', rate, asOf: new Date(), source: 'oanda' };
}
