import { supabase } from '../config/database';

async function main() {
  console.log('[normalize] Starting wallet_transactions normalization...');

  // Normalize legacy provider values
  const { error: pErr } = await supabase
    .from('wallet_transactions')
    .update({ provider: 'crypto-base-usdc' })
    .eq('provider', 'base-usdc');
  if (pErr) console.error('[normalize] provider update error', pErr);

  // Set direction/type for deposits without direction
  // Fallback to batched updates via API
  const { error: dErr1 } = await supabase
    .from('wallet_transactions')
    .update({ direction: 'credit', type: 'credit', channel: 'escrow_deposit' })
    .eq('provider', 'crypto-base-usdc')
    .is('direction', null);
  if (dErr1) console.error('[normalize] direction null update error', dErr1);

  const { error: dErr2 } = await supabase
    .from('wallet_transactions')
    .update({ direction: 'credit', type: 'credit', channel: 'escrow_deposit' })
    .eq('provider', 'crypto-base-usdc')
    .eq('direction', '');
  if (dErr2) console.error('[normalize] direction empty update error', dErr2);

  console.log('[normalize] Completed.');
}

main().catch((e) => {
  console.error('[normalize] fatal', e);
  process.exit(1);
});


