/**
 * GET /health/deep — diagnostic health: DB connectivity and required tables.
 * Used by staging smoke test and support to see exactly why staging returns 500.
 */

import type { Request, Response } from 'express';
import { Router } from 'express';
import { config } from '../config';
import { supabase } from '../config/database';
import { REQUIRED_TABLES, OPTIONAL_TABLES } from '../config/requiredSchema';
import { VERSION } from '@fanclubz/shared';

const healthDeepRouter: ReturnType<typeof Router> = Router();

type CheckResult = { name: string; ok: boolean; error: string | null };

/** Tables that use a different first column for minimal select (no id). */
const TABLE_FIRST_COLUMN: Record<string, string> = {
  user_awards_current: 'user_id',
  user_stats_daily: 'user_id',
};
async function checkTable(table: string): Promise<CheckResult> {
  try {
    const col = TABLE_FIRST_COLUMN[table] || 'id';
    const { error } = await supabase.from(table).select(col).limit(1);
    if (error) {
      const msg = String(error.message || error.code || 'unknown');
      return { name: `table:${table}`, ok: false, error: msg };
    }
    return { name: `table:${table}`, ok: true, error: null };
  } catch (e: any) {
    return { name: `table:${table}`, ok: false, error: e?.message || String(e) };
  }
}

/** Basic "can we reach Supabase" check via a minimal query. */
async function checkDbConnection(): Promise<{ ok: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return { ok: false, error: error.message || String(error.code) };
    }
    return { ok: true, error: null };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** Run a minimal query that touches wallet summary path (wallets table). */
async function checkWalletSummaryQuery(): Promise<CheckResult> {
  try {
    const { error } = await supabase.from('wallets').select('id, user_id, available_balance').limit(1);
    if (error) return { name: 'wallet:summaryQuery', ok: false, error: error.message || String(error.code) };
    return { name: 'wallet:summaryQuery', ok: true, error: null };
  } catch (e: any) {
    return { name: 'wallet:summaryQuery', ok: false, error: e?.message || String(e) };
  }
}

healthDeepRouter.get('/health/deep', async (req: Request, res: Response) => {
  const env = config.server.appEnv || config.server.nodeEnv || 'production';
  const gitSha = process.env.RENDER_GIT_COMMIT || process.env.SOURCE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || null;

  const db = await checkDbConnection();
  const checks: CheckResult[] = [];

  for (const table of REQUIRED_TABLES) {
    checks.push(await checkTable(table));
  }
  checks.push(await checkWalletSummaryQuery());
  for (const table of OPTIONAL_TABLES) {
    checks.push(await checkTable(table));
  }

  const requiredFailed = checks.filter((c) => c.name.startsWith('table:') && REQUIRED_TABLES.some((t) => c.name === `table:${t}`) && !c.ok);
  const ok = db.ok && requiredFailed.length === 0;

  res.status(ok ? 200 : 503).json({
    ok,
    env,
    gitSha,
    service: 'backend',
    time: new Date().toISOString(),
    version: VERSION,
    db: { ok: db.ok, error: db.error },
    checks,
  });
});

export { healthDeepRouter };
