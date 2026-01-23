/**
 * Phase 7D: FX rate service – NGNUSD for display-only USD estimates.
 * Primary: OANDA. Fallback: Frankfurter (ECB). DB last-known. Stale breaker.
 */

import { supabase } from '../config/database';
import { fetchOanda } from './fxProviders/oanda';
import { fetchFrankfurter } from './fxProviders/frankfurter';

export type FxResult = {
  pair: 'NGNUSD';
  rate: number | null;
  source: 'oanda' | 'frankfurter_ecb' | 'none';
  asOf: string | null;
  retrievedAt: string | null;
  isStale: boolean;
};

const PAIR = 'NGNUSD';
const REFRESH_SECONDS = Math.max(60, parseInt(process.env.FX_REFRESH_SECONDS || '300', 10));
const STALE_OANDA = Math.max(300, parseInt(process.env.FX_STALE_SECONDS_OANDA || '900', 10));
const STALE_FALLBACK = Math.max(3600, parseInt(process.env.FX_STALE_SECONDS_FALLBACK || '129600', 10));

let cache: { result: FxResult; fetchedAt: number } | null = null;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function staleThreshold(source: string): number {
  return source === 'oanda' ? STALE_OANDA : STALE_FALLBACK;
}

function buildResult(
  rate: number | null,
  source: FxResult['source'],
  asOf: string | null,
  retrievedAt: string | null
): FxResult {
  const ret: FxResult = {
    pair: PAIR,
    rate,
    source,
    asOf,
    retrievedAt,
    isStale: true,
  };
  if (rate == null || !retrievedAt) {
    ret.rate = null;
    ret.isStale = true;
    return ret;
  }
  const retrievedSec = new Date(retrievedAt).getTime() / 1000;
  const age = nowSec() - retrievedSec;
  ret.isStale = age > staleThreshold(source);
  if (ret.isStale) ret.rate = null;
  return ret;
}

async function loadFromDb(): Promise<{ rate: number; source: string; asOf: string | null; retrievedAt: string } | null> {
  try {
    const { data, error } = await supabase
      .from('fx_rates')
      .select('rate, source, as_of, retrieved_at')
      .eq('pair', PAIR)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as { rate: number; source: string; as_of: string | null; retrieved_at: string };
    return {
      rate: Number(r.rate),
      source: String(r.source || 'none'),
      asOf: r.as_of ? new Date(r.as_of).toISOString() : null,
      retrievedAt: new Date(r.retrieved_at).toISOString(),
    };
  } catch {
    return null;
  }
}

async function persistToDb(rate: number, source: string, asOf: Date | null): Promise<void> {
  try {
    await supabase.from('fx_rates').upsert(
      {
        pair: PAIR,
        rate,
        source,
        as_of: asOf ? asOf.toISOString() : null,
        retrieved_at: new Date().toISOString(),
      },
      { onConflict: 'pair' }
    );
  } catch (e) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[FX] Failed to persist rate:', (e as Error)?.message);
    }
  }
}

export async function getNgnUsdRate(): Promise<FxResult> {
  const enabled = process.env.FX_ENABLED === 'true' || process.env.FX_ENABLED === '1';
  if (!enabled) {
    return buildResult(null, 'none', null, null);
  }

  if (cache && nowSec() - cache.fetchedAt < REFRESH_SECONDS) {
    return cache.result;
  }

  const oandaOn = process.env.FX_OANDA_ENABLED === 'true' || process.env.FX_OANDA_ENABLED === '1';
  const frankOn = process.env.FX_FRANKFURTER_ENABLED !== 'false';

  let quote: { pair: 'NGNUSD'; rate: number; asOf: Date | null; source: string } | null = null;

  if (oandaOn) {
    try {
      quote = await fetchOanda();
      if (quote) {
        await persistToDb(quote.rate, quote.source, quote.asOf);
        const result = buildResult(
          quote.rate,
          'oanda',
          quote.asOf ? quote.asOf.toISOString() : null,
          new Date().toISOString()
        );
        cache = { result, fetchedAt: nowSec() };
        if (process.env.NODE_ENV !== 'test') {
          console.log('[FX] OANDA rate', quote.rate, 'NGNUSD');
        }
        return result;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[FX] OANDA fetch failed:', (e as Error)?.message);
      }
    }
  }

  if (frankOn) {
    try {
      quote = await fetchFrankfurter();
      if (quote) {
        await persistToDb(quote.rate, quote.source, quote.asOf);
        const result = buildResult(
          quote.rate,
          'frankfurter_ecb',
          quote.asOf ? quote.asOf.toISOString() : null,
          new Date().toISOString()
        );
        cache = { result, fetchedAt: nowSec() };
        if (process.env.NODE_ENV !== 'test') {
          console.log('[FX] Frankfurter rate', quote.rate, 'NGNUSD');
        }
        return result;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[FX] Frankfurter fetch failed:', (e as Error)?.message);
      }
    }
  }

  const dbRow = await loadFromDb();
  if (dbRow) {
    const result = buildResult(dbRow.rate, dbRow.source as FxResult['source'], dbRow.asOf, dbRow.retrievedAt);
    cache = { result, fetchedAt: nowSec() };
    return result;
  }

  const result = buildResult(null, 'none', null, null);
  cache = { result, fetchedAt: nowSec() };
  return result;
}
