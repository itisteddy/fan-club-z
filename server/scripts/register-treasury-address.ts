import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const treasuryIdentifier = process.env.PLATFORM_TREASURY_USER_ID;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration. Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }

  if (!treasuryIdentifier) {
    throw new Error('PLATFORM_TREASURY_USER_ID is not set. Update server/.env before running this script.');
  }

  const address = treasuryIdentifier.trim().toLowerCase();
  if (!address.startsWith('0x')) {
    throw new Error('PLATFORM_TREASURY_USER_ID must be an EVM address when provided in this mode.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = process.env.PLATFORM_TREASURY_EMAIL?.trim() || 'treasury@fanclubz.com';
  const username = process.env.PLATFORM_TREASURY_USERNAME?.trim() || 'platform_treasury';
  const defaultChainId = parseInt(process.env.PLATFORM_TREASURY_CHAIN_ID || process.env.CHAIN_ID || '84532', 10);

  console.log('[TREASURY] Registering platform treasury wallet...');

  const { data: existingUser, error: fetchUserError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (fetchUserError) {
    throw new Error(`Failed to check existing treasury user: ${fetchUserError.message}`);
  }

  let userId = existingUser?.id;

  if (!userId) {
    userId = randomUUID();
    console.log(`[TREASURY] Creating new treasury user with id ${userId}`);
    const { error: createUserError } = await supabase.from('users').insert({
      id: userId,
      email,
      username,
      full_name: 'Platform Treasury',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (createUserError && !createUserError.message.includes('duplicate')) {
      throw new Error(`Failed to create treasury user: ${createUserError.message}`);
    }
  } else {
    console.log(`[TREASURY] Found existing treasury user ${userId}`);
  }

  const { data: existingAddress, error: fetchAddressError } = await supabase
    .from('crypto_addresses')
    .select('id')
    .eq('address', address)
    .maybeSingle();

  if (fetchAddressError) {
    throw new Error(`Failed to check existing treasury address: ${fetchAddressError.message}`);
  }

  const cryptoAddressPayload: Record<string, any> = {
    id: existingAddress?.id || randomUUID(),
    user_id: userId,
    chain_id: defaultChainId,
    address,
    created_at: new Date().toISOString(),
  };

  console.log(`[TREASURY] Upserting crypto address ${address} (chain ${defaultChainId})`);
  const { error: upsertError } = await supabase.from('crypto_addresses').upsert(cryptoAddressPayload, { onConflict: 'id' });

  if (upsertError) {
    throw new Error(`Failed to upsert treasury crypto address: ${upsertError.message}`);
  }

  console.log('[TREASURY] Treasury wallet registration complete.');
  console.log(`[TREASURY] user_id=${userId}`);
}

main().catch((error) => {
  console.error('[TREASURY] Registration failed:', error);
  process.exit(1);
});


