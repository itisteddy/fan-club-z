/**
 * Manual deposit credit script
 * Credits a deposit that went to the wrong escrow contract
 * 
 * Usage: npx tsx scripts/manual-deposit-credit.ts <txHash> <walletAddress> <amount>
 * Example: npx tsx scripts/manual-deposit-credit.ts 0xad42525380b2da92405026d450eeba62d2ed2064e77f62a594b31b6039793356 0x80f204ea1b41f08227b87334e1384e5687f332d2 13
 */

import { getAddress } from 'viem';
import { supabase } from '../src/config/database';

const WALLET_ADDRESS = process.argv[2] || '0x80f204ea1b41f08227b87334e1384e5687f332d2';
const TX_HASH = process.argv[3] || '0xad42525380b2da92405026d450eeba62d2ed2064e77f62a594b31b6039793356';
const AMOUNT = parseFloat(process.argv[4] || '13');

async function main() {

  try {
    const checksummedAddress = getAddress(WALLET_ADDRESS.toLowerCase());

    console.log(`[FCZ-PAY] Looking up user for wallet: ${checksummedAddress}`);

    // Find user ID
    const { data: addrData, error: addrError } = await supabase
      .from('crypto_addresses')
      .select('user_id, address')
      .ilike('address', checksummedAddress)
      .limit(1)
      .maybeSingle();

    if (addrError || !addrData) {
      console.error(`❌ No user found for wallet address: ${checksummedAddress}`, addrError);
      process.exit(1);
    }

    const userId = addrData.user_id;
    console.log(`[FCZ-PAY] Found user: ${userId}`);

    const externalRef = `${TX_HASH}:0`;
    const logIndex = 0;

    // Check if already processed
    const { data: existing } = await supabase
      .from('wallet_transactions')
      .select('id')
      .eq('provider', 'crypto-base-usdc')
      .eq('external_ref', externalRef)
      .maybeSingle();

    if (existing) {
      console.log(`⚠️  Transaction already processed: ${externalRef}`);
      process.exit(0);
    }

    // Insert wallet_transaction
    const { data: txData, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        direction: 'credit',
        type: 'deposit', // type should be 'deposit' not 'credit'
        channel: 'escrow_deposit',
        provider: 'crypto-base-usdc',
        amount: AMOUNT,
        status: 'success',
        external_ref: externalRef,
        description: 'Base USDC deposit detected (manual reconciliation - wrong escrow)',
        meta: {
          txHash: TX_HASH,
          logIndex,
          from: checksummedAddress,
          to: '0xfa3f61108f29275aba54b7f961e850c660585cf3', // Wrong escrow
          amount: AMOUNT,
          manual: true,
          reason: 'Deposit went to wrong escrow contract, manually credited'
        }
      })
      .select('id')
      .single();

    if (txError) {
      if (txError.code === '23505') {
        console.log(`⚠️  Transaction already processed (unique constraint): ${externalRef}`);
        process.exit(0);
      }
      throw txError;
    }

    console.log(`[FCZ-PAY] Created wallet_transaction: ${txData.id}`);

    // Update wallet balance
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('available_balance, total_deposited')
      .eq('user_id', userId)
      .eq('currency', 'USD')
      .maybeSingle();

    if (!walletData) {
      console.warn(`⚠️  No wallet found for user ${userId}, creating one...`);
      const { error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          currency: 'USD',
          available_balance: AMOUNT,
          total_deposited: AMOUNT,
          updated_at: new Date().toISOString()
        });
      if (insertError) throw insertError;
    } else {
      const newAvailable = (walletData.available_balance || 0) + AMOUNT;
      const newTotalDeposited = (walletData.total_deposited || 0) + AMOUNT;
      const { error: updateError } = await supabase
        .from('wallets')
        .update({
          available_balance: newAvailable,
          total_deposited: newTotalDeposited,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('currency', 'USD');
      if (updateError) throw updateError;
    }

    // Log event
    const { error: logError } = await supabase
      .from('event_log')
      .insert({
        source: 'manual-reconcile',
        kind: 'deposit',
        ref: externalRef,
        payload: {
          userId,
          walletAddress: checksummedAddress,
          amount: AMOUNT,
          txHash: TX_HASH,
          manual: true,
          reason: 'Deposit went to wrong escrow contract'
        }
      });

    if (logError) {
      console.warn('⚠️  Failed to log event (non-fatal):', logError);
    }

    console.log(`✅ Successfully credited ${AMOUNT} USDC to user ${userId}`);
    console.log(`   Transaction: ${TX_HASH}`);
    console.log(`   External ref: ${externalRef}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

