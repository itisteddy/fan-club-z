import { Router, Request, Response } from 'express';
import { config, getCorsOrigins } from '../config';

const GIT_SHA =
  process.env.RENDER_GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_SHA ||
  'unknown';

/** Extract hostname from URL, never return full URL with tokens */
function hostOnly(url: string | undefined): string {
  if (!url) return '(not set)';
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return '(invalid)';
  }
}

/** GET /debug/config - Read-only, sanitized config. No secrets. */
const debugRouter = Router();

debugRouter.get('/debug/config', (req: Request, res: Response) => {
  const origins = getCorsOrigins();
  // Prefer Host header so staging reports its own URL even when API_URL env is unset or points to prod
  const apiHost = (req.get('host') || '').split(':')[0] || hostOnly(config.api?.url) || '(unknown)';
  res.json({
    env: config.server.appEnv || config.server.nodeEnv || 'production',
    gitSha: GIT_SHA,
    apiHost,
    dbHost: hostOnly(process.env.DATABASE_URL) || hostOnly(config.supabase?.url),
    dbName: (() => {
      const u = process.env.DATABASE_URL;
      if (!u) return '(supabase)';
      try {
        const m = u.match(/\/([^/?]+)(?:\?|$)/);
        return m ? m[1] : '(unknown)';
      } catch {
        return '(unknown)';
      }
    })(),
    corsAllowlistCount: origins.length,
    corsAllowlistSample: origins.slice(0, 2),
    supabaseUrlHost: hostOnly(config.supabase?.url),
  });
});

export default debugRouter;
