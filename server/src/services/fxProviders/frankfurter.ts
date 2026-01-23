/**
 * Phase 7D: Frankfurter (ECB) FX provider – fallback.
 * GET https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,NGN
 * NGNUSD = rates.USD / rates.NGN (USD per 1 NGN)
 */

export type FxQuote = {
  pair: 'NGNUSD';
  rate: number;
  asOf: Date | null;
  source: string;
};

const BASE = 'https://api.frankfurter.dev';

export async function fetchFrankfurter(): Promise<FxQuote | null> {
  const url = `${BASE}/v1/latest?base=EUR&symbols=USD,NGN`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const j = (await res.json()) as { base?: string; date?: string; rates?: { USD?: number; NGN?: number } };
  const u = Number(j?.rates?.USD);
  const n = Number(j?.rates?.NGN);
  if (!Number.isFinite(u) || !Number.isFinite(n) || n <= 0) return null;
  const rate = u / n;
  const date = j?.date ? new Date(j.date + 'T12:00:00Z') : null;
  return { pair: 'NGNUSD', rate, asOf: date, source: 'frankfurter_ecb' };
}
