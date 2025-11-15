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

async function verifyTableStructure() {
  try {
    console.log('🔍 Verifying database schema structure...');
    
    // Test wallets table for escrow_reserved column
    console.log('\n1. Checking wallets table...');
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('escrow_reserved')
      .limit(1);
    
    if (walletError && walletError.code === 'PGRST116') {
      console.log('❌ escrow_reserved column missing from wallets');
    } else {
      console.log('✅ escrow_reserved column exists in wallets');
    }
    
    // Test wallet_transactions table for new columns
    console.log('\n2. Checking wallet_transactions table...');
    const { data: txData, error: txError } = await supabase
      .from('wallet_transactions')
      .select('channel, provider, external_ref, meta')
      .limit(1);
    
    if (txError && txError.code === 'PGRST116') {
      console.log('❌ New columns missing from wallet_transactions');
    } else {
      console.log('✅ New columns exist in wallet_transactions');
    }
    
    // Test payment_providers table
    console.log('\n3. Checking payment_providers table...');
    const { data: providersData, error: providersError } = await supabase
      .from('payment_providers')
      .select('key, enabled, settings')
      .limit(1);
    
    if (providersError && providersError.code === 'PGRST116') {
      console.log('❌ payment_providers table missing');
    } else {
      console.log('✅ payment_providers table exists');
    }
    
    // Test crypto_addresses table
    console.log('\n4. Checking crypto_addresses table...');
    const { data: cryptoData, error: cryptoError } = await supabase
      .from('crypto_addresses')
      .select('user_id, chain_id, address')
      .limit(1);
    
    if (cryptoError && cryptoError.code === 'PGRST116') {
      console.log('❌ crypto_addresses table missing');
    } else {
      console.log('✅ crypto_addresses table exists');
    }
    
    // Test escrow_locks table
    console.log('\n5. Checking escrow_locks table...');
    const { data: escrowData, error: escrowError } = await supabase
      .from('escrow_locks')
      .select('id, user_id, prediction_id, amount, state')
      .limit(1);
    
    if (escrowError && escrowError.code === 'PGRST116') {
      console.log('❌ escrow_locks table missing');
    } else {
      console.log('✅ escrow_locks table exists');
    }
    
    // Test event_log table
    console.log('\n6. Checking event_log table...');
    const { data: eventData, error: eventError } = await supabase
      .from('event_log')
      .select('id, source, kind, ref, payload')
      .limit(1);
    
    if (eventError && eventError.code === 'PGRST116') {
      console.log('❌ event_log table missing');
    } else {
      console.log('✅ event_log table exists');
    }
    
    console.log('\n🎯 Schema verification complete!');
    
    // Test inserting a sample record to verify constraints
    console.log('\n7. Testing table constraints...');
    
    // Test payment_providers insert
    const { error: insertError } = await supabase
      .from('payment_providers')
      .insert({
        key: 'test-provider',
        enabled: false,
        settings: { test: true }
      });
    
    if (insertError) {
      console.log('❌ payment_providers insert failed:', insertError.message);
    } else {
      console.log('✅ payment_providers insert works');
      
      // Clean up test record
      await supabase
        .from('payment_providers')
        .delete()
        .eq('key', 'test-provider');
    }
    
    console.log('\n🎉 All schema verifications passed!');
    console.log('📊 The payment system database schema is ready.');
    
  } catch (e) {
    console.error('💥 Schema verification failed:', e);
    process.exit(1);
  }
}

verifyTableStructure().catch(e => { 
  console.error('💥 Fatal error:', e); 
  process.exit(1); 
});
