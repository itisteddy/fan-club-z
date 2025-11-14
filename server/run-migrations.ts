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

async function runMigration(sql: string, description: string) {
  try {
    console.log(`🔄 Running: ${description}`);
    
    // Use the Supabase client to execute SQL directly
    const { error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Error in ${description}:`, error);
      return false;
    } else {
      console.log(`✅ Success: ${description}`);
      return true;
    }
  } catch (e) {
    console.error(`❌ Exception in ${description}:`, e);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Supabase migrations execution...');
    console.log(`📡 Connecting to: ${process.env.VITE_SUPABASE_URL}`);
    
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
    // Migration 1: Add escrow_reserved to wallets
    await runMigration(
      `ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS escrow_reserved numeric DEFAULT 0;`,
      'Add escrow_reserved column to wallets'
    );
    
    // Migration 2: Extend wallet_transactions
    await runMigration(
      `ALTER TABLE public.wallet_transactions
        ADD COLUMN IF NOT EXISTS channel text CHECK (channel IN ('crypto','fiat')),
        ADD COLUMN IF NOT EXISTS provider text,
        ADD COLUMN IF NOT EXISTS external_ref text,
        ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;`,
      'Extend wallet_transactions with payment channel columns'
    );
    
    // Migration 2b: Create indexes for wallet_transactions
    await runMigration(
      `CREATE INDEX IF NOT EXISTS idx_wtx_user_created_at
        ON public.wallet_transactions (user_id, created_at DESC);
       CREATE UNIQUE INDEX IF NOT EXISTS uq_wtx_provider_ref
        ON public.wallet_transactions (provider, external_ref);`,
      'Create indexes for wallet_transactions'
    );
    
    // Migration 3: Create payment_providers table
    await runMigration(
      `CREATE TABLE IF NOT EXISTS public.payment_providers (
        key text PRIMARY KEY,
        enabled boolean NOT NULL DEFAULT false,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      );`,
      'Create payment_providers table'
    );
    
    // Migration 4: Create crypto_addresses table
    await runMigration(
      `CREATE TABLE IF NOT EXISTS public.crypto_addresses (
        user_id uuid REFERENCES public.users(id),
        chain_id integer NOT NULL,
        address text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_crypto_addr_user ON public.crypto_addresses(user_id);`,
      'Create crypto_addresses table with index'
    );
    
    // Migration 5: Create escrow_locks table
    await runMigration(
      `CREATE TABLE IF NOT EXISTS public.escrow_locks (
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
      WHERE state = 'locked';`,
      'Create escrow_locks table with constraints'
    );
    
    // Migration 6: Create event_log table
    await runMigration(
      `CREATE TABLE IF NOT EXISTS public.event_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source text NOT NULL,
        kind text NOT NULL,
        ref text,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        ts timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_event_log_ts ON public.event_log (ts DESC);`,
      'Create event_log table with index'
    );
    
    console.log('\n🎉 All migrations completed!');
    console.log('📊 Verifying schema...');
    
    // Verify all tables exist
    const tables = ['wallets', 'wallet_transactions', 'payment_providers', 'crypto_addresses', 'escrow_locks', 'event_log'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        console.log(`❌ Table ${table} not found`);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }
    
    console.log('\n🚀 Migration process complete!');
    
  } catch (e) {
    console.error('💥 Migration failed:', e);
    process.exit(1);
  }
}

main().catch(e => { 
  console.error('💥 Fatal error:', e); 
  process.exit(1); 
});
