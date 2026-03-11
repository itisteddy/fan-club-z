import { Router, Request, Response } from 'express';
import { config, getCorsOrigins } from '../config';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const GIT_SHA =
  process.env.RENDER_GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_SHA ||
  'unknown';

const REQUIRED_TABLES = [
  'users',
  'wallets',
  'wallet_transactions',
  'predictions',
  'prediction_options',
  'prediction_entries',
  'comments',
  'categories',
] as const;

const healthRouter = Router();

/** GET /health - Basic health check */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    env: config.server.appEnv || config.server.nodeEnv || 'production',
    gitSha: GIT_SHA,
    service: 'backend',
    time: new Date().toISOString(),
    version: VERSION,
  });
});

/** GET /health/deep - DB connectivity + required tables + safe queries */
healthRouter.get('/health/deep', async (req: Request, res: Response) => {
  const checks: { name: string; ok: boolean; error: string | null }[] = [];
  let dbOk = false;
  let dbError: string | null = null;

  try {
    const { error } = await supabase.from('users').select('id').limit(1).maybeSingle();
    if (error) throw error;
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  for (const table of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1).maybeSingle();
      checks.push({
        name: `table:${table}`,
        ok: !error,
        error: error ? (error as Error).message : null,
      });
    } catch (e) {
      checks.push({
        name: `table:${table}`,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const allOk = dbOk && checks.every((c) => c.ok);
  res.status(allOk ? 200 : 503).json({
    ok: allOk,
    env: config.server.appEnv || config.server.nodeEnv || 'production',
    gitSha: GIT_SHA,
    db: { ok: dbOk, error: dbError },
    checks,
    time: new Date().toISOString(),
  });
});

export default healthRouter;
