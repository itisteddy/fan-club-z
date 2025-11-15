#!/usr/bin/env tsx
/**
 * Fix Existing Transactions
 * Backfill provider and channel for existing wallet_transactions
 */

import { supabase } from '../src/config/database';

async function fixTransactions() {
  console.log('🔧 Fixing existing transactions...\n');

  // 1. Count transactions without provider/channel
  const { data: missingProvider, error: countError } = await supabase
    .from('wallet_transactions')
    .select('id', { count: 'exact', head: true })
    .is('provider', null)
    .is('channel', null);

  console.log(`Found transactions without provider/channel`);

  // 2. Update deposit transactions
  console.log('\n1️⃣  Updating deposit transactions...');
  const { data: deposits, error: depositError } = await supabase
    .from('wallet_transactions')
    .update({ 
      provider: 'crypto-base-usdc',
      channel: 'crypto'
    })
    .is('provider', null)
    .is('channel', null)
    .in('type', ['deposit', 'credit'])
    .gt('amount', 0)
    .select();

  if (depositError) {
    console.error('   ❌ Error updating deposits:', depositError);
  } else {
    console.log(`   ✅ Updated ${deposits?.length || 0} deposit transactions`);
  }

  // 3. Update bet_lock transactions
  console.log('\n2️⃣  Updating bet_lock transactions...');
  const { data: locks, error: lockError } = await supabase
    .from('wallet_transactions')
    .update({ 
      provider: 'crypto-base-usdc',
      channel: 'escrow_locked'
    })
    .is('provider', null)
    .is('channel', null)
    .in('type', ['bet_lock', 'prediction_lock'])
    .select();

  if (lockError) {
    console.error('   ❌ Error updating locks:', lockError);
  } else {
    console.log(`   ✅ Updated ${locks?.length || 0} lock transactions`);
  }

  // 4. Update withdrawal transactions
  console.log('\n3️⃣  Updating withdrawal transactions...');
  const { data: withdrawals, error: withdrawError } = await supabase
    .from('wallet_transactions')
    .update({ 
      provider: 'crypto-base-usdc',
      channel: 'crypto'
    })
    .is('provider', null)
    .is('channel', null)
    .in('type', ['withdraw', 'debit'])
    .gt('amount', 0)
    .select();

  if (withdrawError) {
    console.error('   ❌ Error updating withdrawals:', withdrawError);
  } else {
    console.log(`   ✅ Updated ${withdrawals?.length || 0} withdrawal transactions`);
  }

  // 5. Verify
  console.log('\n4️⃣  Verifying updates...');
  const { data: cryptoTransactions, error: verifyError } = await supabase
    .from('wallet_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('provider', 'crypto-base-usdc');

  if (verifyError) {
    console.error('   ❌ Error verifying:', verifyError);
  } else {
    console.log(`   ✅ Found ${cryptoTransactions?.length || 0} transactions with crypto provider`);
  }

  console.log('\n✅ Transaction fix complete!');
  console.log('   Run: npm run db:inspect to verify');
}

fixTransactions().catch(console.error);

