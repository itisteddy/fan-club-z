import { Router } from 'express';

export const healthPayments = Router();

healthPayments.get('/api/health/payments', (_req, res) => {
  const paymentsEnabled = process.env.PAYMENTS_ENABLE === '1';
  const baseDepositsEnabled = process.env.ENABLE_BASE_DEPOSITS === '1';
  const baseWithdrawalsEnabled = process.env.ENABLE_BASE_WITHDRAWALS === '1';
  const paystackDepositsEnabled = process.env.ENABLE_PAYSTACK_DEPOSITS === '1';
  const paystackWithdrawalsEnabled = process.env.ENABLE_PAYSTACK_WITHDRAWALS === '1';

  // Fail-closed: if feature is enabled but required env is missing, mark as unhealthy
  const cryptoHealthy = !baseDepositsEnabled && !baseWithdrawalsEnabled ? true : (
    !!process.env.CHAIN_ID &&
    !!process.env.RPC_URL &&
    !!process.env.USDC_ADDRESS &&
    !!process.env.BASE_ESCROW_ADDRESS
  );

  const fiatHealthy = !paystackDepositsEnabled && !paystackWithdrawalsEnabled ? true : (
    !!process.env.PAYSTACK_SECRET_KEY
  );

  const status = paymentsEnabled && (cryptoHealthy || fiatHealthy) ? 'healthy' : 'degraded';
  const statusCode = status === 'healthy' ? 200 : 503;

  res.status(statusCode).json({
    status,
    payments_enabled: paymentsEnabled,
    crypto: {
      enabled: baseDepositsEnabled || baseWithdrawalsEnabled,
      healthy: cryptoHealthy,
      chain_id: process.env.CHAIN_ID || null,
      have_rpc: !!process.env.RPC_URL,
      have_usdc: !!process.env.USDC_ADDRESS,
      have_escrow: !!process.env.BASE_ESCROW_ADDRESS,
      missing: [
        !process.env.CHAIN_ID && 'CHAIN_ID',
        !process.env.RPC_URL && 'RPC_URL',
        !process.env.USDC_ADDRESS && 'USDC_ADDRESS',
        !process.env.BASE_ESCROW_ADDRESS && 'BASE_ESCROW_ADDRESS'
      ].filter(Boolean) as string[]
    },
    fiat: {
      enabled: paystackDepositsEnabled || paystackWithdrawalsEnabled,
      healthy: fiatHealthy,
      have_key: !!process.env.PAYSTACK_SECRET_KEY,
      missing: [
        !process.env.PAYSTACK_SECRET_KEY && 'PAYSTACK_SECRET_KEY'
      ].filter(Boolean) as string[]
    },
    timestamp: new Date().toISOString()
  });
});
