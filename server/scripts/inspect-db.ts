#!/usr/bin/env tsx
/**
 * Inspect Database
 * Check wallet data, schema, and diagnose issues
 */

import { supabase } from '../src/config/database';

const userId = process.argv[2] || 'bc1866ca-71c5-4029-886d-4eace081f5c4';

async function inspectDatabase() {
  console.log('🔍 Inspecting database...\n');
  console.log(`User ID: ${userId}\n`);

  // 1. Check wallet table
  console.log('1️⃣  Checking wallets table...');
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .eq('currency', 'USD')
    .single();
  
  if (walletError) {
    console.log(`   ❌ Error: ${walletError.message}`);
    if (walletError.code === 'PGRST116') {
      console.log('   ℹ️  No wallet found for this user');
    }
  } else {
    console.log('   ✅ Wallet found:');
    console.log(`      Available: ${wallet.available_balance || wallet.available || 0}`);
    console.log(`      Reserved: ${wallet.reserved_balance || wallet.reserved || 0}`);
    console.log(`      Currency: ${wallet.currency}`);
    console.log(`      Columns: ${Object.keys(wallet).join(', ')}`);
  }

  // 2. Check wallet transactions
  console.log('\n2️⃣  Checking wallet_transactions...');
  const { data: transactions, error: txError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .limit(10);
  
  if (txError) {
    console.log(`   ❌ Error: ${txError.message}`);
  } else {
    console.log(`   ✅ Found ${transactions?.length || 0} transactions`);
    if (transactions && transactions.length > 0) {
      console.log('   Sample transactions:');
      transactions.slice(0, 3).forEach((tx: any, i: number) => {
        console.log(`      ${i + 1}. ${tx.provider || 'no provider'} | ${tx.channel || 'no channel'} | ${tx.direction || tx.type || 'no direction'} | $${tx.amount || 0}`);
      });
      
      // Group by provider
      const providers = new Set(transactions.map((t: any) => t.provider).filter(Boolean));
      console.log(`   Providers found: ${Array.from(providers).join(', ') || 'none'}`);
      
      // Group by channel
      const channels = new Set(transactions.map((t: any) => t.channel).filter(Boolean));
      console.log(`   Channels found: ${Array.from(channels).join(', ') || 'none'}`);
    }
  }

  // 3. Check escrow locks
  console.log('\n3️⃣  Checking escrow_locks...');
  const { data: locks, error: locksError } = await supabase
    .from('escrow_locks')
    .select('*')
    .eq('user_id', userId)
    .limit(10);
  
  if (locksError) {
    console.log(`   ❌ Error: ${locksError.message}`);
  } else {
    console.log(`   ✅ Found ${locks?.length || 0} locks`);
    if (locks && locks.length > 0) {
      locks.slice(0, 3).forEach((lock: any, i: number) => {
        const status = lock.status || lock.state || 'unknown';
        console.log(`      ${i + 1}. Status: ${status} | Amount: $${lock.amount || 0}`);
      });
    }
  }

  // 4. Check table schema
  console.log('\n4️⃣  Checking table schemas...');
  
  // Check wallets columns
  if (wallet) {
    const hasAvailable = 'available' in wallet;
    const hasAvailableBalance = 'available_balance' in wallet;
    console.log(`   wallets table:`);
    console.log(`      Has 'available': ${hasAvailable}`);
    console.log(`      Has 'available_balance': ${hasAvailableBalance}`);
  }
  
  // Check transaction columns
  if (transactions && transactions.length > 0) {
    const tx = transactions[0];
    console.log(`   wallet_transactions table:`);
    console.log(`      Has 'type': ${'type' in tx}`);
    console.log(`      Has 'direction': ${'direction' in tx}`);
    console.log(`      Has 'channel': ${'channel' in tx}`);
    console.log(`      Has 'provider': ${'provider' in tx}`);
  }

  // 5. Test wallet summary endpoint query
  console.log('\n5️⃣  Testing wallet summary calculation...');
  
  // Try to calculate from transactions
  const cryptoTxs = transactions?.filter((t: any) => 
    ['crypto-base-usdc', 'base/usdc', 'base-usdc'].includes(t.provider)
  ) || [];
  
  console.log(`   Crypto transactions: ${cryptoTxs.length}`);
  
  let calculatedBalance = 0;
  cryptoTxs.forEach((tx: any) => {
    const amount = Number(tx.amount || 0);
    if (tx.direction === 'credit' || tx.type === 'credit') {
      calculatedBalance += amount;
    } else if (tx.direction === 'debit' || tx.type === 'debit') {
      calculatedBalance -= amount;
    }
  });
  
  console.log(`   Calculated balance from transactions: $${calculatedBalance.toFixed(2)}`);
  
  // 6. Summary
  console.log('\n📊 Summary:');
  console.log(`   Wallet balance (DB): $${wallet?.available_balance || wallet?.available || 0}`);
  console.log(`   Calculated balance: $${calculatedBalance.toFixed(2)}`);
  console.log(`   Difference: $${Math.abs((wallet?.available_balance || wallet?.available || 0) - calculatedBalance).toFixed(2)}`);
}

inspectDatabase().catch(console.error);

