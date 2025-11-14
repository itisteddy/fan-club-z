import { makePublicClient } from './client';
import { supabase } from '../../config/database';

export async function resolveAndValidateAddresses() {
  const env = process.env.RUNTIME_ENV ?? 'local';
  const chainId = Number(process.env.CHAIN_ID);

  console.log(`[FCZ-PAY] Resolving addresses for env=${env}, chain=${chainId}`);

  const { data: rows, error } = await supabase
    .from('chain_addresses')
    .select('kind, address')
    .eq('env', env)
    .eq('chain_id', chainId);

  if (error) {
    throw new Error(`[FCZ-PAY] Failed to query address registry: ${error.message}`);
  }

  const map = new Map(rows?.map(r => [r.kind, r.address as string]) || []);
  const usdc = map.get('usdc');
  const escrow = map.get('escrow');

  if (!usdc) {
    throw new Error('[FCZ-PAY] USDC address missing in registry');
  }

  console.log(`[FCZ-PAY] Validating USDC address: ${usdc}`);
  
  const client = makePublicClient();
  const usdcCode = await client.getBytecode({ address: usdc as `0x${string}` });
  
  if (!usdcCode) {
    throw new Error('[FCZ-PAY] USDC address has no bytecode on-chain');
  }

  console.log(`[FCZ-PAY] ✅ USDC address validated`);

  if (escrow) {
    console.log(`[FCZ-PAY] Validating Escrow address: ${escrow}`);
    const escCode = await client.getBytecode({ address: escrow as `0x${string}` });
    
    if (!escCode) {
      throw new Error('[FCZ-PAY] Escrow address has no bytecode on-chain');
    }
    
    console.log(`[FCZ-PAY] ✅ Escrow address validated`);
  }

  return { usdc, escrow };
}
