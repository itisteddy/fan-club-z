import { Router } from 'express';

export const healthBase = Router();

healthBase.get('/api/health/base', async (_req, res) => {
  const baseDepositsEnabled = process.env.ENABLE_BASE_DEPOSITS === '1';
  
  // Fail-closed: if feature enabled but required env missing, mark unhealthy
  const requiredVars = [
    'CHAIN_ID',
    'RPC_URL',
    'USDC_ADDRESS',
    'BASE_ESCROW_ADDRESS'
  ];

  const missing = requiredVars.filter(key => !process.env[key]);
  const healthy = !baseDepositsEnabled || missing.length === 0;
  const statusCode = healthy ? 200 : 503;

  res.status(statusCode).json({
    status: healthy ? 'healthy' : 'degraded',
    payments_enabled: process.env.PAYMENTS_ENABLE === '1',
    base_deposits_enabled: baseDepositsEnabled,
    chain_id: process.env.CHAIN_ID || null,
    have_rpc: !!process.env.RPC_URL,
    have_ws: !!process.env.RPC_WS_URL,
    have_usdc: !!process.env.USDC_ADDRESS,
    have_escrow: !!process.env.BASE_ESCROW_ADDRESS,
    missing,
    timestamp: new Date().toISOString()
  });
});
