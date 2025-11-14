export function requireEnv(keys: string[]) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`[FCZ-PAY] Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function validatePaymentsEnv() {
  if (process.env.PAYMENTS_ENABLE === '1') {
    requireEnv(['CHAIN_ID', 'RPC_URL']);
    console.log('[FCZ-PAY] ✅ Payment environment variables validated');
  }
}
