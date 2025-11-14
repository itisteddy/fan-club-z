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

async function executeSQL(sql: string, description: string) {
  try {
    console.log(`🔄 Executing: ${description}`);
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        // Use raw SQL execution through Supabase
        const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() });
        
        if (error) {
          console.error(`❌ Error in statement: ${statement.trim()}`);
          console.error(`   Error:`, error);
          return false;
        }
      }
    }
    
    console.log(`✅ Success: ${description}`);
    return true;
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
    
    // Since direct SQL execution through Supabase client is limited,
    // let's verify what we can do and provide manual instructions
    
    console.log('\n📋 Manual Migration Instructions:');
    console.log('Since Supabase doesn\'t allow direct SQL execution through the client,');
    console.log('please run these SQL commands in your Supabase SQL Editor:');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('\n📝 SQL Commands to Execute:');
    
    console.log('\n-- 1. Add escrow_reserved to wallets');
    console.log('ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS escrow_reserved numeric DEFAULT 0;');
    
    console.log('\n-- 2. Extend wallet_transactions');
    console.log(`ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS channel text CHECK (channel IN ('crypto','fiat')),
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;`);
    
    console.log('\n-- 3. Create indexes for wallet_transactions');
    console.log(`CREATE INDEX IF NOT EXISTS idx_wtx_user_created_at
  ON public.wallet_transactions (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wtx_provider_ref
  ON public.wallet_transactions (provider, external_ref);`);
    
    console.log('\n-- 4. Create payment_providers table');
    console.log(`CREATE TABLE IF NOT EXISTS public.payment_providers (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);`);
    
    console.log('\n-- 5. Create crypto_addresses table');
    console.log(`CREATE TABLE IF NOT EXISTS public.crypto_addresses (
  user_id uuid REFERENCES public.users(id),
  chain_id integer NOT NULL,
  address text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crypto_addr_user ON public.crypto_addresses(user_id);`);
    
    console.log('\n-- 6. Create escrow_locks table');
    console.log(`CREATE TABLE IF NOT EXISTS public.escrow_locks (
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
WHERE state = 'locked';`);
    
    console.log('\n-- 7. Create event_log table');
    console.log(`CREATE TABLE IF NOT EXISTS public.event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  kind text NOT NULL,
  ref text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_log_ts ON public.event_log (ts DESC);`);
    
    console.log('\n🔍 Verifying current schema...');
    
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
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Copy the SQL commands above');
    console.log('2. Go to your Supabase SQL Editor');
    console.log('3. Paste and execute each command');
    console.log('4. Run this script again to verify');
    
  } catch (e) {
    console.error('💥 Migration failed:', e);
    process.exit(1);
  }
}

main().catch(e => { 
  console.error('💥 Fatal error:', e); 
  process.exit(1); 
});
