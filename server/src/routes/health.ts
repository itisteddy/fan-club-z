import { Router, Request, Response } from 'express';
import { config, getCorsOrigins } from '../config';
import { supabase, supabaseAnon } from '../config/database';
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
  'bet_settlements',
  'user_awards_current',
  'badge_definitions',
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

/** GET /health/auth - Diagnostic: validate Bearer token (Supabase). Returns ok + reason only. No secrets. */
healthRouter.get('/health/auth', async (req: Request, res: Response) => {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(200).json({
      ok: false,
      reason: 'no_token',
      env: config.server.appEnv || config.server.nodeEnv || 'production',
      time: new Date().toISOString(),
    });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(200).json({
      ok: false,
      reason: 'empty_token',
      env: config.server.appEnv || config.server.nodeEnv || 'production',
      time: new Date().toISOString(),
    });
  }
  try {
    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error) {
      const code = String((error as any)?.code || error?.message || 'invalid').slice(0, 64);
      return res.status(200).json({
        ok: false,
        reason: code,
        env: config.server.appEnv || config.server.nodeEnv || 'production',
        time: new Date().toISOString(),
      });
    }
    if (!data?.user) {
      return res.status(200).json({
        ok: false,
        reason: 'no_user',
        env: config.server.appEnv || config.server.nodeEnv || 'production',
        time: new Date().toISOString(),
      });
    }
    return res.status(200).json({
      ok: true,
      reason: 'valid',
      env: config.server.appEnv || config.server.nodeEnv || 'production',
      time: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(200).json({
      ok: false,
      reason: msg.slice(0, 64),
      env: config.server.appEnv || config.server.nodeEnv || 'production',
      time: new Date().toISOString(),
    });
  }
});

export default healthRouter;
