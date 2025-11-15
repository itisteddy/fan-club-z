import { Router } from 'express';
import { supabase } from '../config/supabase';

export const healthApp = Router();

healthApp.get('/api/health/app', async (_req, res) => {
  const checks: Record<string, { status: 'ok' | 'degraded' | 'error'; message?: string }> = {};

  // Supabase connectivity
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    checks.supabase = error ? { status: 'error', message: error.message } : { status: 'ok' };
  } catch (err) {
    checks.supabase = { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
  }

  // Environment variables
  const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PORT'];
  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  checks.environment = missingEnv.length === 0
    ? { status: 'ok' }
    : { status: 'degraded', message: `Missing: ${missingEnv.join(', ')}` };

  // Overall status
  const hasErrors = Object.values(checks).some(c => c.status === 'error');
  const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');
  const overallStatus = hasErrors ? 'error' : hasDegraded ? 'degraded' : 'ok';
  const statusCode = overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 503 : 500;

  res.status(statusCode).json({
    status: overallStatus,
    checks,
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

