import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Create Supabase client with service role for migrations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

async function main() {
  try {
    console.log('🔄 Starting Supabase migrations...');
    
    // Migration 1: Add escrow_reserved to wallets
    console.log('[migrate] applying wallets escrow_reserved...');
    const { error: error1 } = await supabase
      .from('wallets')
      .select('escrow_reserved')
      .limit(1);
    
    if (error1 && error1.code === 'PGRST116') {
      // Column doesn't exist, add it
      console.log('Adding escrow_reserved column to wallets...');
      // Note: This would need to be done via Supabase dashboard or SQL editor
      console.log('⚠️  Please run this SQL in Supabase SQL editor:');
      console.log('ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS escrow_reserved numeric DEFAULT 0;');
    } else {
      console.log('✅ escrow_reserved column already exists');
    }
    
    // Migration 2: Extend wallet_transactions
    console.log('[migrate] checking wallet_transactions extensions...');
    const { error: error2 } = await supabase
      .from('wallet_transactions')
      .select('channel, provider, external_ref, meta')
      .limit(1);
    
    if (error2 && error2.code === 'PGRST116') {
      console.log('⚠️  Please run these SQL commands in Supabase SQL editor:');
      console.log(`
-- Extend wallet_transactions table
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS channel text CHECK (channel IN ('crypto','fiat')),
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wtx_user_created_at
  ON public.wallet_transactions (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wtx_provider_ref
  ON public.wallet_transactions (provider, external_ref);
      `);
    } else {
      console.log('✅ wallet_transactions extensions already exist');
    }
    
    // Migration 3: Create payment_providers table
    console.log('[migrate] checking payment_providers table...');
    const { error: error3 } = await supabase
      .from('payment_providers')
      .select('*')
      .limit(1);
    
    if (error3 && error3.code === 'PGRST116') {
      console.log('⚠️  Please run this SQL in Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS public.payment_providers (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
      `);
    } else {
      console.log('✅ payment_providers table already exists');
    }
    
    // Migration 4: Create crypto_addresses table
    console.log('[migrate] checking crypto_addresses table...');
    const { error: error4 } = await supabase
      .from('crypto_addresses')
      .select('*')
      .limit(1);
    
    if (error4 && error4.code === 'PGRST116') {
      console.log('⚠️  Please run this SQL in Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS public.crypto_addresses (
  user_id uuid REFERENCES public.users(id),
  chain_id integer NOT NULL,
  address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_addr_user ON public.crypto_addresses(user_id);
      `);
    } else {
      console.log('✅ crypto_addresses table already exists');
    }
    
    // Migration 5: Create escrow_locks table
    console.log('[migrate] checking escrow_locks table...');
    const { error: error5 } = await supabase
      .from('escrow_locks')
      .select('*')
      .limit(1);
    
    if (error5 && error5.code === 'PGRST116') {
      console.log('⚠️  Please run this SQL in Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS public.escrow_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  prediction_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  state text NOT NULL CHECK (state IN ('locked','released','voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lock_user_pred_active
ON public.escrow_locks (user_id, prediction_id)
WHERE state = 'locked';
      `);
    } else {
      console.log('✅ escrow_locks table already exists');
    }
    
    // Migration 6: Create event_log table
    console.log('[migrate] checking event_log table...');
    const { error: error6 } = await supabase
      .from('event_log')
      .select('*')
      .limit(1);
    
    if (error6 && error6.code === 'PGRST116') {
      console.log('⚠️  Please run this SQL in Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  kind text NOT NULL,
  ref text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_log_ts ON public.event_log (ts DESC);
      `);
    } else {
      console.log('✅ event_log table already exists');
    }
    
    console.log('\n🎉 Migration check complete!');
    console.log('📝 If any SQL commands were shown above, please run them in your Supabase SQL editor.');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    
  } catch (e) {
    console.error('[migrate] error:', e);
    process.exit(1);
  }
}

main().catch(e => { 
  console.error(e); 
  process.exit(1); 
});
