#!/usr/bin/env tsx

/**
 * Fix Stale Escrow Locks and Clean Demo Data
 * 
 * This script resolves the 409 Conflict error by:
 * 1. Releasing all stale escrow locks (locks never consumed)
 * 2. Removing demo wallet transactions ($200+ demo balance)
 * 3. Resetting wallet balances to reflect only crypto transactions
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('🔧 Starting cleanup...\n');

  // 1. Release stale locks
  console.log('1️⃣ Releasing stale escrow locks...');
  const { data: staleLocks, error: staleLockError } = await supabase
    .from('escrow_locks')
    .select('id, user_id, prediction_id, amount, state, status')
    .or('status.eq.locked,state.eq.locked');

  if (staleLockError) {
    console.error('❌ Error fetching stale locks:', staleLockError);
  } else if (staleLocks && staleLocks.length > 0) {
    console.log(`   Found ${staleLocks.length} potentially stale locks`);
    
    // Check which locks have no corresponding entry
    for (const lock of staleLocks) {
      const { data: entry } = await supabase
        .from('prediction_entries')
        .select('id')
        .eq('escrow_lock_id', lock.id)
        .single();
      
      if (!entry) {
        // This lock was never consumed, release it
        const updateData: any = {
          released_at: new Date().toISOString()
        };
        
        if (lock.status !== undefined) {
          updateData.status = 'released';
        }
        if (lock.state !== undefined) {
          updateData.state = 'released';
        }
        
        const { error: releaseError } = await supabase
          .from('escrow_locks')
          .update(updateData)
          .eq('id', lock.id);
        
        if (releaseError) {
          console.error(`   ❌ Failed to release lock ${lock.id}:`, releaseError);
        } else {
          console.log(`   ✅ Released lock ${lock.id} (${lock.amount} USD)`);
        }
      }
    }
  } else {
    console.log('   ✅ No stale locks found');
  }

  // 2. Clean up demo transactions
  console.log('\n2️⃣ Cleaning up demo wallet transactions...');
  const { data: demoTxns, error: demoError } = await supabase
    .from('wallet_transactions')
    .delete()
    .or('provider.eq.demo,channel.eq.demo')
    .select();
  
  if (demoError) {
    console.error('❌ Error deleting demo transactions:', demoError);
  } else {
    console.log(`   ✅ Deleted ${demoTxns?.length || 0} demo transactions`);
  }

  // 3. Recalculate wallet balances
  console.log('\n3️⃣ Recalculating wallet balances from crypto transactions...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id');
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
  } else if (users) {
    for (const user of users) {
      // Calculate balance from crypto transactions only
      const { data: txns, error: txnsError } = await supabase
        .from('wallet_transactions')
        .select('amount, direction')
        .eq('user_id', user.id)
        .eq('currency', 'USD')
        .in('provider', ['crypto-base-usdc', 'crypto']);
      
      if (txnsError) {
        console.error(`   ❌ Error fetching transactions for user ${user.id}:`, txnsError);
        continue;
      }
      
      let balance = 0;
      if (txns) {
        for (const txn of txns) {
          if (txn.direction === 'credit') {
            balance += txn.amount;
          } else if (txn.direction === 'debit') {
            balance -= Math.abs(txn.amount);
          }
        }
      }
      
      // Update wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .upsert({
          user_id: user.id,
          currency: 'USD',
          available_balance: balance,
          reserved_balance: 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,currency'
        });
      
      if (updateError) {
        console.error(`   ❌ Error updating wallet for user ${user.id}:`, updateError);
      } else if (balance > 0) {
        console.log(`   ✅ Updated wallet for user ${user.id}: $${balance.toFixed(2)}`);
      }
    }
  }

  // 4. Verify results
  console.log('\n4️⃣ Verification:');
  
  const { count: activeLocks } = await supabase
    .from('escrow_locks')
    .select('id', { count: 'exact', head: true })
    .or('status.eq.locked,state.eq.locked');
  
  console.log(`   Active locks: ${activeLocks || 0}`);
  
  const { data: wallets } = await supabase
    .from('wallets')
    .select('user_id, available_balance, reserved_balance')
    .eq('currency', 'USD');
  
  if (wallets && wallets.length > 0) {
    console.log(`   Wallet balances:`);
    for (const wallet of wallets) {
      if (wallet.available_balance > 0 || wallet.reserved_balance > 0) {
        console.log(`     User ${wallet.user_id}: $${wallet.available_balance} available, $${wallet.reserved_balance} reserved`);
      }
    }
  }

  console.log('\n✅ Cleanup complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your backend server');
  console.log('   2. Refresh your frontend application');
  console.log('   3. Try placing a bet again');
}

main().catch(console.error);
