import express from 'express';
import { config } from '../config';
import { supabase, db } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { emitSettlementComplete, emitWalletUpdate, emitPredictionUpdate } from '../services/realtime';
import { recomputePredictionState } from '../services/predictionMath';
import { computeMerkleSettlement } from '../services/settlementMerkle';
import { makePublicClient } from '../chain/base/client';
import { getEscrowAddress } from '../services/escrowContract';
import { getAddress } from 'viem';

const router = express.Router();

// Minimal ABI for settlement root read
const ESCROW_MERKLE_READ_ABI = [
  {
    type: 'function',
    name: 'settlementRoot',
    stateMutability: 'view',
    inputs: [{ name: 'predictionId', type: 'bytes32' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'claimed',
    stateMutability: 'view',
    inputs: [
      { name: 'predictionId', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

function toBytes32FromUuid(uuid: string): `0x${string}` {
  const hex = uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0');
  return `0x${hex}` as const;
}

async function ensureOnchainPosted(predictionId: string): Promise<`0x${string}` | null> {
  try {
    const client = makePublicClient();
    const escrow = await getEscrowAddress();
    const idBytes = toBytes32FromUuid(predictionId);
    const root = (await client.readContract({
      address: escrow,
      abi: ESCROW_MERKLE_READ_ABI,
      functionName: 'settlementRoot',
      args: [idBytes],
    })) as `0x${string}`;
    if (root && /^0x0{64}$/i.test(root) === false) {
      // Mark DB as posted if not already
      await supabase.from('bet_settlements').update({ status: 'onchain_posted', meta: { merkle_root: root } } as any).eq('bet_id', predictionId);
      return root;
    }
    return null;
  } catch (e) {
    console.warn('[SETTLEMENT] ensureOnchainPosted check failed', e);
    return null;
  }
}

async function isClaimedOnchain(predictionId: string, account: string): Promise<boolean> {
  try {
    const client = makePublicClient();
    const escrow = await getEscrowAddress();
    const idBytes = toBytes32FromUuid(predictionId);
    const claimed = (await client.readContract({
      address: escrow,
      abi: ESCROW_MERKLE_READ_ABI,
      functionName: 'claimed',
      args: [idBytes, getAddress(account)],
    })) as boolean;
    return Boolean(claimed);
  } catch (e) {
    console.warn('[SETTLEMENT] claimed() read failed', e);
    // Fail-open (treat as not claimed) to avoid blocking legitimate claims if RPC is flaky
    return false;
  }
}

async function resolveTreasuryUserId(): Promise<string | null> {
  const raw = config.platform?.treasuryUserId;
  if (!raw) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If caller provided a wallet address, resolve to the owning user
  if (trimmed.startsWith('0x')) {
    const { data, error } = await supabase
      .from('crypto_addresses')
      .select('user_id')
      .eq('address', trimmed.toLowerCase())
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.warn('[SETTLEMENT] Unable to resolve treasury wallet address:', error);
      return null;
    }

    if (!data?.user_id) {
      console.warn('[SETTLEMENT] No user found for treasury wallet address:', trimmed);
      return null;
    }

    return data.user_id;
  }

  const { data: userRow, error: userLookupError } = await supabase
    .from('users')
    .select('id')
    .eq('id', trimmed)
    .maybeSingle();

  if (userLookupError) {
    console.warn('[SETTLEMENT] Failed to verify treasury user id:', userLookupError);
  }

  if (!userRow?.id) {
    console.warn('[SETTLEMENT] Treasury user id not found in users table:', trimmed);
    return null;
  }

  return trimmed;
}

// POST /api/v2/settlement/manual - Manual settlement by creator
router.post('/manual', async (req, res) => {
  try {
    const { predictionId, winningOptionId, proofUrl, reason } = req.body;
    const userId = req.body.userId; // In production, this would come from JWT auth
    
    console.log('');
    console.log('🔨🔨🔨 [SETTLEMENT] ========================================');
    console.log('🔨 [SETTLEMENT] Manual settlement endpoint called');
    console.log('🔨 [SETTLEMENT] Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔨 [SETTLEMENT] Prediction ID:', predictionId);
    console.log('🔨 [SETTLEMENT] Winning Option ID:', winningOptionId);
    console.log('🔨 [SETTLEMENT] User ID:', userId);
    console.log('🔨🔨🔨 [SETTLEMENT] ========================================');
    console.log('');
    
    // Validate required fields
    if (!predictionId || !winningOptionId || !userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId, winningOptionId, and userId are required',
        version: VERSION
      });
    }

    // Get prediction details and verify creator
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('*')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      console.error('Prediction not found:', predictionError);
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Verify user is creator (in production, add proper auth check)
    if (prediction.creator_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can settle manually',
        version: VERSION
      });
    }

    // Verify winning option belongs to this prediction
    const { data: winningOption, error: optionError } = await supabase
      .from('prediction_options')
      .select('*')
      .eq('id', winningOptionId)
      .eq('prediction_id', predictionId)
      .single();

    if (optionError || !winningOption) {
      return res.status(400).json({
        error: 'Invalid option',
        message: 'Winning option not found for this prediction',
        version: VERSION
      });
    }

    // Get all prediction entries for this prediction
    const { data: allEntries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId);

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction entries',
        version: VERSION
      });
    }

    // Calculate settlement amounts
    const totalPool = Number(prediction.pool_total || 0);
    const platformFeePercent = Number.isFinite(prediction.platform_fee_percentage) ? Number(prediction.platform_fee_percentage) : 2.5;
    const creatorFeePercent = Number.isFinite(prediction.creator_fee_percentage) ? Number(prediction.creator_fee_percentage) : 1.0;
    
    // Calculate total stakes for winners and losers
    const winners = allEntries.filter(entry => entry.option_id === winningOptionId);
    const losers = allEntries.filter(entry => entry.option_id !== winningOptionId);
    const totalWinningStake = winners.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalLosingStake = losers.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Fees are charged on the LOSING stakes only (the house take)
    // This ensures winners always get back at least their original stake
    const rawPlatformFee = (totalLosingStake * platformFeePercent) / 100;
    const rawCreatorFee = (totalLosingStake * creatorFeePercent) / 100;

    const platformFee = Math.max(Math.round(rawPlatformFee * 100) / 100, 0);
    const creatorFee = Math.max(Math.round(rawCreatorFee * 100) / 100, 0);
    
    // Payout pool = winners get their stakes back + share of (losing stakes - fees)
    const prizePool = Math.max(totalLosingStake - platformFee - creatorFee, 0);
    const payoutPool = totalWinningStake + prizePool;

    console.log('💰 Settlement calculation:', {
      totalPool,
      totalWinningStake,
      totalLosingStake,
      platformFee,
      creatorFee,
      prizePool,
      payoutPool,
      totalEntries: allEntries?.length || 0
    });

    // If no participants, return fees to creator (no payouts)
    if (!allEntries || allEntries.length === 0) {
      console.log('📭 No participants - settling with creator fee only');
      
      // Update prediction status to settled
      const { error: updatePredictionError } = await supabase
        .from('predictions')
        .update({ 
          status: 'settled', 
          settled_at: new Date().toISOString(),
          winning_option_id: winningOptionId
        })
        .eq('id', predictionId);

      if (updatePredictionError) {
        console.error('Error updating prediction status:', updatePredictionError);
      }

      // Create settlement record
      const { data: settlement, error: settlementError } = await supabase
        .from('bet_settlements')
        .insert({
          bet_id: predictionId,
          winning_option_id: winningOptionId,
          total_payout: 0,
          platform_fee_collected: 0,
          creator_payout_amount: 0,
          settlement_time: new Date().toISOString()
        })
        .select()
        .single();

      return res.json({
        success: true,
        data: {
          settlement,
          totalPayout: 0,
          platformFee: 0,
          creatorFee: 0,
          winnersCount: 0,
          participantsCount: 0
        },
        message: 'Prediction settled successfully (no participants)',
        version: VERSION
      });
    }

    // Winners and losers already calculated above
    const winnersCount = winners.length;

    // Map escrow locks to the outcome of the associated entry so we can avoid refunding losers
    const lockOutcomeById = new Map<
      string,
      { result: 'won' | 'lost'; entryId: string; userId: string }
    >();

    if (allEntries) {
      for (const entry of allEntries) {
        if (entry.escrow_lock_id) {
          lockOutcomeById.set(entry.escrow_lock_id, {
            result: entry.option_id === winningOptionId ? 'won' : 'lost',
            entryId: entry.id,
            userId: entry.user_id,
          });
        }
      }
    }

    console.log('🏆 Winners calculation:', {
      winnersCount,
      totalWinningStake,
      payoutPool
    });

    // Begin transaction for settlement
    const settlementResults = [];

    // Process each winner's payout
    console.log('');
    console.log(`🏆🏆🏆 [SETTLEMENT] ========================================`);
    console.log(`🏆 [SETTLEMENT] Starting winner processing loop`);
    console.log(`🏆 [SETTLEMENT] Total winners: ${winners.length}`);
    console.log(`🏆 [SETTLEMENT] Winners array:`, JSON.stringify(winners, null, 2));
    console.log(`🏆🏆🏆 [SETTLEMENT] ========================================`);
    console.log('');
    
    for (const winner of winners) {
      console.log('');
      console.log(`🔄 [SETTLEMENT] Processing winner ${winner.id}...`);
      console.log('');
      
      const winnerStake = winner.amount || 0;
      const winnerShare = totalWinningStake > 0 ? winnerStake / totalWinningStake : 0;
      const payout = Math.floor(payoutPool * winnerShare * 100) / 100; // Round to 2 decimals
      
      console.log(`📊 [SETTLEMENT] Winner calculation: stake=$${winnerStake}, share=${winnerShare}, payout=$${payout}`);
      
      // Update the entry with actual payout
      console.log(`📝 [SETTLEMENT] Updating entry ${winner.id} to 'won' status...`);
      const { error: updateEntryError } = await supabase
        .from('prediction_entries')
        .update({
          status: 'won',
          actual_payout: payout,
          updated_at: new Date().toISOString()
        })
        .eq('id', winner.id);

      if (updateEntryError) {
        console.error('❌ [SETTLEMENT] Error updating winner entry:', updateEntryError);
        console.error('❌ [SETTLEMENT] Skipping wallet update for this winner');
        continue; // Skip wallet update if entry update failed
      }
      
      console.log(`✅ [SETTLEMENT] Entry updated successfully`);

      // Credit winner's wallet with payout
      try {
        console.log('');
        console.log(`💰💰💰 [SETTLEMENT] ========================================`);
        console.log(`💰 [SETTLEMENT] Processing winner payout`);
        console.log(`💰 [SETTLEMENT] Winner user ID: ${winner.user_id}`);
        console.log(`💰 [SETTLEMENT] Winner entry ID: ${winner.id}`);
        console.log(`💰 [SETTLEMENT] Payout amount: $${payout}`);
        console.log(`💰 [SETTLEMENT] Prediction ID: ${predictionId}`);
        console.log(`💰💰💰 [SETTLEMENT] ========================================`);
        console.log('');
        
        // Update wallet balance
        console.log(`💰 [SETTLEMENT] Step 1: Calling db.wallets.directUpdateBalance...`);
        const balanceResult = await db.wallets.directUpdateBalance(winner.user_id, 'USD', payout, 0);
        console.log(`💰 [SETTLEMENT] Step 1 COMPLETE - Balance update result:`, JSON.stringify(balanceResult, null, 2));
        
        // Create wallet transaction record
        console.log(`💰 [SETTLEMENT] Step 2: Creating wallet transaction record...`);
        const txData = {
          user_id: winner.user_id,
          direction: 'credit' as const,
          type: 'deposit' as const,
          channel: 'payout' as const,
          provider: 'crypto-base-usdc',
          amount: payout,
          currency: 'USD' as const,
          status: 'completed' as const,
          prediction_id: predictionId,
          entry_id: winner.id,
          description: `Prediction win payout for "${prediction.title}"`,
          meta: {
            prediction_id: predictionId,
            prediction_entry_id: winner.id,
            original_stake: winnerStake,
            winning_option_id: winningOptionId,
            prediction_title: prediction.title
          }
        };
        console.log(`💰 [SETTLEMENT] Step 2a: Transaction data prepared:`, JSON.stringify(txData, null, 2));
        
        console.log(`💰 [SETTLEMENT] Step 2b: Calling db.transactions.create()...`);
        const txResult = await db.transactions.create(txData);
        console.log(`💰 [SETTLEMENT] Step 2 COMPLETE - Transaction created:`, JSON.stringify(txResult, null, 2));
        
        console.log('');
        console.log(`✅✅✅ [SETTLEMENT] Successfully credited ${payout} USD to winner ${winner.user_id}`);
        console.log('');
        
        settlementResults.push({
          userId: winner.user_id,
          entryId: winner.id,
          stake: winnerStake,
          payout: payout
        });
      } catch (walletError) {
        console.error('');
        console.error(`❌❌❌ [SETTLEMENT] ========================================`);
        console.error(`❌ [SETTLEMENT] FATAL ERROR updating wallet for winner ${winner.user_id}`);
        console.error(`❌ [SETTLEMENT] Error:`, walletError);
        console.error(`❌ [SETTLEMENT] Error message:`, (walletError as Error).message);
        console.error(`❌ [SETTLEMENT] Error stack:`, (walletError as Error).stack);
        console.error(`❌❌❌ [SETTLEMENT] ========================================`);
        console.error('');
        // Continue with other winners even if one fails
      }
    }

    // Update losing entries (losers already calculated above)
    for (const loser of losers) {
      const { error: updateLoserError } = await supabase
        .from('prediction_entries')
        .update({
          status: 'lost',
          actual_payout: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', loser.id);

      if (updateLoserError) {
        console.error('Error updating loser entry:', updateLoserError);
      }

      // Record a loss activity transaction for the loser (for UI transparency)
      try {
        const lossAmount = Number(loser.amount || 0);
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: loser.user_id,
            direction: 'debit',
            type: 'withdraw',
            channel: 'settlement_loss',
            provider: 'crypto-base-usdc',
            amount: lossAmount,
            currency: 'USD',
            status: 'completed',
            prediction_id: predictionId,
            entry_id: loser.id,
            description: `Loss recorded for "${prediction.title}"`,
            meta: {
              reason: 'loss',
              prediction_id: predictionId,
              prediction_entry_id: loser.id,
              prediction_title: prediction.title,
              winning_option_id: winningOptionId
            }
          });
      } catch (lossTxErr) {
        console.warn('[SETTLEMENT] Failed to record loss transaction:', lossTxErr);
      }
    }

    // Credit creator and platform fees
    const feeCurrency = config.platform?.feeCurrency || 'USD';
    let treasuryUserId: string | null = null;
    if (platformFee > 0) {
      treasuryUserId = await resolveTreasuryUserId();
    }
    if (creatorFee > 0) {
      try {
        console.log('');
        console.log(`🎨🎨🎨 [SETTLEMENT] ========================================`);
        console.log(`🎨 [SETTLEMENT] Processing creator fee`);
        console.log(`🎨 [SETTLEMENT] Creator ID: ${prediction.creator_id}`);
        console.log(`🎨 [SETTLEMENT] Fee amount: $${creatorFee}`);
        console.log(`🎨🎨🎨 [SETTLEMENT] ========================================`);
        console.log('');
        
        console.log(`🎨 [SETTLEMENT] Step 1: Updating creator wallet balance...`);
        await db.wallets.directUpdateBalance(prediction.creator_id, feeCurrency, creatorFee, 0);
        console.log(`🎨 [SETTLEMENT] Step 1 COMPLETE`);
        
        console.log(`🎨 [SETTLEMENT] Step 2: Creating creator fee transaction...`);
        const creatorTxResult = await db.transactions.create({
          user_id: prediction.creator_id,
          direction: 'credit',
          type: 'deposit',
          channel: 'creator_fee',
          provider: 'crypto-base-usdc',
          amount: creatorFee,
          currency: feeCurrency,
          status: 'completed',
          external_ref: `settlement:${predictionId}:creator_fee`,
          description: `Creator fee for "${prediction.title}"`,
          meta: {
            prediction_id: predictionId,
            winning_option_id: winningOptionId,
            reason: 'creator_fee',
            settlement_type: 'manual',
            prediction_title: prediction.title
          }
        });
        console.log(`🎨 [SETTLEMENT] Step 2 COMPLETE - Transaction:`, JSON.stringify(creatorTxResult, null, 2));
        console.log('');
        console.log(`✅ [SETTLEMENT] Creator fee credited successfully`);
        console.log('');
        
        try {
          emitWalletUpdate({ userId: prediction.creator_id, reason: 'creator_fee_paid', amountDelta: creatorFee });
        } catch (emitErr) {
          console.warn('⚠️ Failed to emit creator wallet update:', emitErr);
        }
      } catch (creatorWalletError) {
        console.error('');
        console.error(`❌❌❌ [SETTLEMENT] FATAL ERROR crediting creator fee`);
        console.error(`❌ [SETTLEMENT] Error:`, creatorWalletError);
        console.error(`❌ [SETTLEMENT] Error message:`, (creatorWalletError as Error).message);
        console.error('');
      }
    }

    if (platformFee > 0) {
      if (treasuryUserId) {
        try {
          console.log('');
          console.log(`🏦🏦🏦 [SETTLEMENT] ========================================`);
          console.log(`🏦 [SETTLEMENT] Processing platform fee`);
          console.log(`🏦 [SETTLEMENT] Treasury user ID: ${treasuryUserId}`);
          console.log(`🏦 [SETTLEMENT] Fee amount: $${platformFee}`);
          console.log(`🏦🏦🏦 [SETTLEMENT] ========================================`);
          console.log('');
          
          console.log(`🏦 [SETTLEMENT] Step 1: Updating treasury wallet balance...`);
          await db.wallets.directUpdateBalance(treasuryUserId, feeCurrency, platformFee, 0);
          console.log(`🏦 [SETTLEMENT] Step 1 COMPLETE`);
          
          console.log(`🏦 [SETTLEMENT] Step 2: Creating platform fee transaction...`);
          const platformTxResult = await db.transactions.create({
            user_id: treasuryUserId,
            direction: 'credit',
            type: 'deposit',
            channel: 'platform_fee',
            provider: 'crypto-base-usdc',
            amount: platformFee,
            currency: feeCurrency,
            status: 'completed',
            external_ref: `settlement:${predictionId}:platform_fee`,
            description: `Platform fee collected for "${prediction.title}"`,
            meta: {
              prediction_id: predictionId,
              winning_option_id: winningOptionId,
              reason: 'platform_fee',
              settlement_type: 'manual',
              prediction_title: prediction.title
            }
          });
          console.log(`🏦 [SETTLEMENT] Step 2 COMPLETE - Transaction:`, JSON.stringify(platformTxResult, null, 2));
          console.log('');
          console.log(`✅ [SETTLEMENT] Platform fee credited successfully`);
          console.log('');
          
          try {
            emitWalletUpdate({ userId: treasuryUserId, reason: 'platform_fee_collected', amountDelta: platformFee });
          } catch (emitErr) {
            console.warn('⚠️ Failed to emit platform wallet update:', emitErr);
          }
        } catch (platformWalletError) {
          console.error('');
          console.error(`❌❌❌ [SETTLEMENT] FATAL ERROR crediting platform fee`);
          console.error(`❌ [SETTLEMENT] Error:`, platformWalletError);
          console.error(`❌ [SETTLEMENT] Error message:`, (platformWalletError as Error).message);
          console.error('');
        }
      } else {
        console.warn('');
        console.warn('⚠️⚠️⚠️ [SETTLEMENT] ========================================');
        console.warn('⚠️ [SETTLEMENT] PLATFORM_TREASURY_USER_ID is not configured or could not be resolved');
        console.warn('⚠️ [SETTLEMENT] Platform fee of $' + platformFee + ' was NOT credited to any wallet');
        console.warn('⚠️⚠️⚠️ [SETTLEMENT] ========================================');
        console.warn('');
      }
    }

    // Create settlement record
    const { data: settlement, error: settlementError } = await supabase
      .from('bet_settlements')
      .insert({
        bet_id: predictionId,
        winning_option_id: winningOptionId,
        total_payout: payoutPool,
        platform_fee_collected: platformFee,
        creator_payout_amount: creatorFee,
        settlement_time: new Date().toISOString()
      })
      .select()
      .single();

    if (settlementError) {
      console.error('Error creating settlement record:', settlementError);
    }

    // Release all escrow locks for this prediction
    // This unlocks funds that were locked for bets on this prediction
    const { data: releasedLocks, error: releaseLocksError } = await supabase
      .from('escrow_locks')
      .update({
        status: 'released',
        state: 'released',
        released_at: new Date().toISOString()
      })
      .eq('prediction_id', predictionId)
      .in('status', ['locked', 'consumed'])
      .select('id, user_id, amount');

    if (releaseLocksError) {
      console.error('Error releasing escrow locks:', releaseLocksError);
    } else if (releasedLocks && releasedLocks.length > 0) {
      const totalReleased = releasedLocks.reduce((sum, lock) => sum + Number(lock.amount || 0), 0);
      console.log(`🔓 Released ${releasedLocks.length} escrow locks (total: $${totalReleased.toFixed(2)}) for prediction ${predictionId}`);
      
      const refundableLocks = releasedLocks.filter((lock) => {
        const outcome = lockOutcomeById.get(lock.id);
        if (!outcome) {
          // Lock never produced an entry (e.g. abandoned) – refund user
          return true;
        }
        if (outcome.result === 'won') {
          // Winners already received full payout (stake + profit)
          console.log(`[Settlement] Skipping unlock credit for winning lock ${lock.id}`);
          return false;
        }
        if (outcome.result === 'lost') {
          // Losing stakes remain in the pool and have already been distributed
          console.log(`[Settlement] Skipping unlock credit for losing lock ${lock.id}`);
          return false;
        }
        return false;
      });

      for (const lock of refundableLocks) {
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: lock.user_id,
            direction: 'credit',
            type: 'credit',
            channel: 'escrow_unlock',
            provider: 'base/usdc',
            amount: Number(lock.amount || 0),
            currency: 'USD',
            status: 'success',
            external_ref: `settlement_${predictionId}_${lock.id}`,
            description: `Funds unlocked after prediction settlement`,
            meta: {
              prediction_id: predictionId,
              lock_id: lock.id,
              settlement_type: 'manual'
            }
          });
      }
    }

    // Update prediction status to settled
    const { error: updatePredictionError } = await supabase
      .from('predictions')
      .update({ 
        status: 'settled', 
        settled_at: new Date().toISOString(),
        winning_option_id: winningOptionId
      })
      .eq('id', predictionId);

    if (updatePredictionError) {
      console.error('Error updating prediction status:', updatePredictionError);
    }

    // Record creator payout if there's a fee
    if (creatorFee > 0) {
      const { error: payoutError } = await supabase
        .from('creator_payouts')
        .insert({
          creator_id: prediction.creator_id,
          bet_id: predictionId,
          amount: creatorFee,
          currency: feeCurrency,
          status: 'processed',
          processed_at: new Date().toISOString()
        });

      if (payoutError) {
        console.error('Error recording creator payout:', payoutError);
      }
    }

    const recomputed = await recomputePredictionState(predictionId);

    console.log('✅ Settlement completed successfully');
    emitSettlementComplete({ predictionId, winnersCount });
    emitPredictionUpdate({ predictionId });
    try {
      for (const r of settlementResults) {
        if (r.userId) emitWalletUpdate({ userId: r.userId, reason: 'settlement_payout', amountDelta: r.payout });
      }
    } catch (emitError) {
      console.warn('⚠️ Failed to emit settlement payout updates:', emitError);
    }

    // Notify each participant individually (no bulk responses)
    console.log('🔔 Sending individual notifications to participants...');
    for (const entry of allEntries) {
      try {
        const outcome = entry.option_id === winningOptionId ? 'won' : 'lost';
        const payout = entry.option_id === winningOptionId ? entry.actual_payout : 0;
        
        console.log(`📧 Notifying participant ${entry.user_id}: ${outcome} (payout: $${payout})`);
        
        // In a real app, you would send individual push notifications, emails, or in-app notifications here
        // For now, we'll log each individual notification
        // TODO: Implement actual individual notification system (push notifications, email, etc.)
        
      } catch (notificationError) {
        console.error(`❌ Failed to notify participant ${entry.user_id}:`, notificationError);
        // Continue with other notifications even if one fails
      }
    }
    console.log('✅ Individual participant notifications sent');

    return res.json({
      success: true,
      data: {
        settlement,
        totalPayout: payoutPool,
        platformFee,
        creatorFee,
        winnersCount,
        participantsCount: allEntries.length,
        results: settlementResults,
        prediction: recomputed.prediction,
        updatedOptions: recomputed.options
      },
      message: 'Prediction settled successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error in manual settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to settle prediction',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DEBUG/OPS: Inspect computed leaves for a prediction (only after on-chain post)
router.get('/:predictionId/leaves', async (req, res) => {
  try {
    const { predictionId } = req.params as { predictionId: string };
    const { address } = req.query as { address?: string };
    if (!predictionId) {
      return res.status(400).json({ error: 'bad_request', message: 'predictionId required', version: VERSION });
    }
    // Ensure settlement was posted on-chain
    const { data: s } = await supabase
      .from('bet_settlements')
      .select('winning_option_id,status,meta')
      .eq('bet_id', predictionId)
      .maybeSingle();
    if (!s || s.status !== 'onchain_posted' || !s.winning_option_id) {
      return res.status(409).json({ error: 'not_ready', message: 'Not onchain_posted', version: VERSION });
    }
    const settlement = await computeMerkleSettlement({ predictionId, winningOptionId: s.winning_option_id });
    const leaves = settlement.leaves.map((l) => ({
      address: l.address,
      amountUnits: l.amountUnits.toString(),
      amountUSD: Number(l.amountUnits) / 1_000_000,
      proofLen: (l.proof || []).length,
    }));
    const filtered = address ? leaves.filter((l) => l.address.toLowerCase() === String(address).toLowerCase()) : leaves;
    return res.json({ success: true, data: { root: settlement.root, leaves: filtered }, version: VERSION });
  } catch (e: any) {
    console.error('[SETTLEMENT] leaves debug error', e);
    return res.status(500).json({ error: 'internal', message: e?.message || 'failed', version: VERSION });
  }
});

// GET /api/v2/settlement/:predictionId/merkle-proof?address=0x...
// Returns the leaf/proof and claim amount for a given wallet address
router.get('/:predictionId/merkle-proof', async (req, res) => {
  try {
    const { predictionId } = req.params as { predictionId: string };
    const { address } = req.query as { address?: string };

    if (!predictionId || !address) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId and address are required',
        version: VERSION
      });
    }

    // Determine winning option used for this prediction (from bet_settlements or predictions)
    let winningOptionId: string | null = null;
    const { data: settlementRow } = await supabase
      .from('bet_settlements')
      .select('winning_option_id,status,meta')
      .eq('bet_id', predictionId)
      .maybeSingle();
    if (settlementRow?.winning_option_id) {
      winningOptionId = settlementRow.winning_option_id;
    } else {
      const { data: pred } = await supabase
        .from('predictions')
        .select('winning_option_id')
        .eq('id', predictionId)
        .maybeSingle();
      winningOptionId = pred?.winning_option_id ?? null;
    }

    // Gate by on-chain posted status to avoid user-facing reverted claims
    if (settlementRow && settlementRow.status !== 'onchain_posted') {
      const onchain = await ensureOnchainPosted(predictionId);
      if (!onchain) {
        return res.status(409).json({
          error: 'not_ready',
          message: 'Settlement root not posted on-chain yet',
          version: VERSION
        });
      }
    }

    if (!winningOptionId) {
      return res.status(409).json({
        error: 'not_ready',
        message: 'Settlement not prepared for this prediction yet',
        version: VERSION
      });
    }

  const settlement = await computeMerkleSettlement({ predictionId, winningOptionId });
  const normalized = String(address).toLowerCase();
  const leaf = settlement.leaves.find((l) => l.address.toLowerCase() === normalized);

  if (!leaf) {
    return res.status(404).json({
      error: 'not_found',
      message: 'Address is not eligible or no claimable amount',
      version: VERSION
    });
  }

  const amountUnits = leaf.amountUnits ?? 0n;
  const amountUSD = Number(amountUnits) / 1_000_000;

  // Exclude already-claimed on-chain
  const alreadyClaimed = await isClaimedOnchain(predictionId, normalized);
  if (alreadyClaimed) {
    return res.status(409).json({
      error: 'already_claimed',
      message: 'This address has already claimed',
      version: VERSION
    });
  }

  return res.json({
    success: true,
    data: {
      predictionId,
      merkleRoot: settlement.root,
      amountUnits: amountUnits.toString(),
      amountUSD,
      proof: leaf.proof ?? [],
    },
    version: VERSION
  });
  } catch (error: any) {
    console.error('Error generating merkle proof:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to generate proof',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/claimable?address=0x...&limit=20
// Returns claimable settlements for a given wallet address
// Optimized to avoid slow on-chain calls where possible
router.get('/claimable', async (req, res) => {
  const startTime = Date.now();
  try {
    const { address, limit: limitStr } = req.query as { address?: string; limit?: string };
    if (!address) {
      return res.status(400).json({ error: 'bad_request', message: 'address is required', version: VERSION });
    }
    const normalized = String(address).toLowerCase();
    const limit = Math.min(parseInt(limitStr || '20', 10) || 20, 100);

    console.log(`[SETTLEMENT] Fetching claimable for ${normalized.slice(0, 10)}...`);

    // First, only fetch predictions that have bet_settlements with onchain_posted status
    // This avoids expensive on-chain calls for predictions that haven't been posted yet
    const { data: settledPreds, error: settledError } = await supabase
      .from('bet_settlements')
      .select('bet_id, winning_option_id, status, meta')
      .eq('status', 'onchain_posted')
      .order('created_at', { ascending: false })
      .limit(limit * 2);

    if (settledError) {
      console.error('[SETTLEMENT] claimable query failed:', settledError);
      // Check if table doesn't exist
      if (settledError.message?.includes('does not exist') || settledError.code === '42P01') {
        console.warn('[SETTLEMENT] bet_settlements table does not exist - returning empty claims');
        return res.json({ success: true, data: { claims: [] }, message: 'No settlements available', version: VERSION });
      }
      return res.status(500).json({ error: 'internal', message: 'Failed to query settlements', details: settledError.message, version: VERSION });
    }

    if (!settledPreds || settledPreds.length === 0) {
      console.log(`[SETTLEMENT] No onchain_posted settlements found (${Date.now() - startTime}ms)`);
      return res.json({ success: true, data: { claims: [] }, version: VERSION });
    }

    // Fetch prediction details for the settled predictions
    const predictionIds = settledPreds.map(s => s.bet_id);
    const { data: preds, error: predsError } = await supabase
      .from('predictions')
      .select('id, title, settled_at, winning_option_id')
      .in('id', predictionIds);

    if (predsError) {
      console.error('[SETTLEMENT] claimable predictions query failed:', predsError);
      return res.status(500).json({ error: 'internal', message: 'Failed to query predictions', version: VERSION });
    }

    const predMap = new Map((preds || []).map(p => [p.id, p]));
    const results: Array<{
      predictionId: string;
      title: string;
      amountUnits: string;
      amountUSD: number;
      proof: `0x${string}`[];
      merkleRoot: `0x${string}`;
    }> = [];

    // Process each settled prediction
    for (const s of settledPreds) {
      if (results.length >= limit) break;
      
      const p = predMap.get(s.bet_id);
      if (!p) continue;

      try {
        const winningOptionId = (s.winning_option_id ?? p.winning_option_id) as string | null;
        if (!winningOptionId) continue;

        // Compute merkle settlement (uses cached data, no on-chain calls)
        const settlement = await computeMerkleSettlement({ predictionId: p.id, winningOptionId });
        const leaf = settlement.leaves.find((l) => l.address.toLowerCase() === normalized);
        if (!leaf || (leaf.amountUnits ?? 0n) === 0n) continue;

        // Check if already claimed on-chain (with timeout protection)
        let alreadyClaimed = false;
        try {
          const claimCheckPromise = isClaimedOnchain(p.id, normalized);
          const timeoutPromise = new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Claim check timeout')), 5000)
          );
          alreadyClaimed = await Promise.race([claimCheckPromise, timeoutPromise]);
        } catch (claimErr) {
          // If claim check fails/times out, assume not claimed (fail-open)
          console.warn(`[SETTLEMENT] Claim check failed for ${p.id}, assuming not claimed:`, claimErr);
          alreadyClaimed = false;
        }

        if (alreadyClaimed) continue;

        results.push({
          predictionId: p.id,
          title: p.title,
          amountUnits: (leaf.amountUnits ?? 0n).toString(),
          amountUSD: Number(leaf.amountUnits ?? 0n) / 1_000_000,
          proof: (leaf.proof ?? []) as `0x${string}`[],
          merkleRoot: settlement.root,
        });
      } catch (err) {
        // Skip errors per prediction but log them
        console.warn(`[SETTLEMENT] Error processing claimable for ${p.id}:`, err);
        continue;
      }
    }

    console.log(`[SETTLEMENT] Found ${results.length} claimable for ${normalized.slice(0, 10)}... (${Date.now() - startTime}ms)`);
    return res.json({ success: true, data: { claims: results }, version: VERSION });
  } catch (e) {
    console.error('[SETTLEMENT] claimable error', e);
    return res.status(500).json({ error: 'internal', message: 'Failed to compute claimable', version: VERSION });
  }
});
// POST /api/v2/settlement/manual/merkle - Creator-led Merkle settlement (on-chain flow)
router.post('/manual/merkle', async (req, res) => {
  try {
    const { predictionId, winningOptionId, userId, reason } = req.body as {
      predictionId: string;
      winningOptionId: string;
      userId: string;
      reason?: string;
    };

    if (!predictionId || !winningOptionId || !userId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'predictionId, winningOptionId, and userId are required',
        version: VERSION
      });
    }

    // Verify user is creator
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('id, creator_id, title, status, platform_fee_percentage, creator_fee_percentage')
      .eq('id', predictionId)
      .single();
    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }
    if (prediction.creator_id !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can initiate on-chain settlement',
        version: VERSION
      });
    }

    // Compute distribution and Merkle structure (fees charged on losing stake only)
    const settlement = await computeMerkleSettlement({ predictionId, winningOptionId });

    // Record a pending settlement record (for audit; on-chain confirmation happens via watcher)
    await supabase
      .from('bet_settlements')
      .upsert(
        {
          bet_id: predictionId,
          winning_option_id: winningOptionId,
          total_payout: settlement.payoutPoolUSD,
          platform_fee_collected: settlement.platformFeeUSD,
          creator_payout_amount: settlement.creatorFeeUSD,
          settlement_time: new Date().toISOString(),
          status: 'pending_onchain',
          meta: {
            reason: reason || null,
            merkle_root: settlement.root,
            winners: settlement.winners.length
          }
        },
        { onConflict: 'bet_id' }
      );

    // 1) Update prediction as settled immediately (so UI shows results prior to claim)
    try {
      await supabase
        .from('predictions')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          winning_option_id: winningOptionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);
    } catch (e) {
      console.warn('[SETTLEMENT] Failed to mark prediction settled (will still proceed):', e);
    }

    // 2) Update entries to won/lost and set computed payouts
    try {
      const { data: allEntries, error: entriesErr } = await supabase
        .from('prediction_entries')
        .select('id,user_id,amount,option_id')
        .eq('prediction_id', predictionId);
      if (entriesErr) {
        console.error('[SETTLEMENT] Failed to load entries for distribution:', entriesErr);
      } else if (Array.isArray(allEntries) && allEntries.length > 0) {
        // Index winner payout by user
        const payoutByUser = new Map<string, number>();
        for (const w of settlement.winners) {
          payoutByUser.set(w.user_id, Number(w.payoutUSD || 0));
        }

        // Group winning entries by user to pro-rate user payout across their winning entries
        const winningEntriesByUser = new Map<string, Array<{ id: string; amount: number }>>();
        const losers: Array<{ id: string; user_id: string; amount: number }> = [];
        for (const e of allEntries) {
          const isWinnerEntry = e.option_id === winningOptionId;
          if (isWinnerEntry) {
            const arr = winningEntriesByUser.get(e.user_id) || [];
            arr.push({ id: e.id, amount: Number(e.amount || 0) });
            winningEntriesByUser.set(e.user_id, arr);
          } else {
            losers.push({ id: e.id, user_id: e.user_id, amount: Number(e.amount || 0) });
          }
        }

        // Apply payouts to winners
        for (const [user, entries] of winningEntriesByUser.entries()) {
          const userPayout = payoutByUser.get(user) || 0;
          const totalStake = entries.reduce((s, r) => s + r.amount, 0);
          let remaining = Math.round(userPayout * 100); // cents

          for (let i = 0; i < entries.length; i++) {
            const ent = entries[i] as any;
            // Pro-rata by stake
            const share = totalStake > 0 ? ent.amount / totalStake : 0;
            // Round to cents; allocate remainder to last entry
            const cents = i === entries.length - 1 ? remaining : Math.round(userPayout * 100 * share);
            remaining -= i === entries.length - 1 ? remaining : cents;
            const payoutUSD = Math.max(cents / 100, 0);

            await supabase
              .from('prediction_entries')
              .update({
                status: 'won',
                actual_payout: payoutUSD,
                updated_at: new Date().toISOString()
              })
              .eq('id', (ent as any).id);
          }

          // Record a single pending payout activity for the user (informational; on-chain claim will credit)
          try {
            await supabase
              .from('wallet_transactions')
              .insert({
                user_id: user,
                direction: 'credit',
                type: 'deposit',
                channel: 'payout',
                provider: 'crypto-base-usdc',
                amount: userPayout,
                currency: 'USD',
                status: 'pending',
                prediction_id: predictionId,
                description: 'Win recorded - claim on-chain to receive funds',
                meta: {
                  reason: 'win_pending_claim',
                  merkle_root: settlement.root,
                }
              });
          } catch (payoutActivityErr) {
            console.warn('[SETTLEMENT] Failed to create pending payout activity:', payoutActivityErr);
          }
        }

        // Mark losers and record loss activity
        for (const l of losers) {
          await supabase
            .from('prediction_entries')
            .update({
              status: 'lost',
              actual_payout: 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', l.id);

          try {
            await supabase
              .from('wallet_transactions')
              .insert({
                user_id: l.user_id,
                direction: 'debit',
                type: 'withdraw',
                channel: 'settlement_loss',
                provider: 'crypto-base-usdc',
                amount: l.amount,
                currency: 'USD',
                status: 'completed',
                prediction_id: predictionId,
                entry_id: l.id,
                description: 'Loss recorded at settlement',
                meta: { reason: 'settled_loss' }
              });
          } catch (lossTxErr) {
            console.warn('[SETTLEMENT] Failed to record loss activity:', lossTxErr);
          }
        }
      }
    } catch (distErr) {
      console.warn('[SETTLEMENT] Failed to apply entry outcomes:', distErr);
    }

    // 3) Mark all escrow locks for this prediction as consumed (DB-side) to avoid lingering locks
    try {
      const { error: lockErr } = await supabase
        .from('escrow_locks')
        .update({
          status: 'consumed',
          state: 'consumed',
          consumed_at: new Date().toISOString(),
        } as any)
        .eq('prediction_id', predictionId)
        .eq('status', 'locked');
      if (lockErr) {
        console.warn('[SETTLEMENT] Failed to mark locks consumed:', lockErr);
      }
    } catch (lockCatch) {
      console.warn('[SETTLEMENT] Exception consuming locks:', lockCatch);
    }

    // Response payload for the creator’s wallet to submit on-chain
    return res.json({
      success: true,
      data: {
        predictionId,
        title: prediction.title,
        winningOptionId,
        merkleRoot: settlement.root,
        platformFeeUnits: settlement.platformFeeUnits.toString(),
        creatorFeeUnits: settlement.creatorFeeUnits.toString(),
        leaves: settlement.leaves.map((l) => ({
          user_id: l.user_id,
          address: l.address,
          amountUnits: l.amountUnits.toString(),
          leaf: l.leaf,
          proof: l.proof
        })),
        summary: {
          platformFeeUSD: settlement.platformFeeUSD,
          creatorFeeUSD: settlement.creatorFeeUSD,
          payoutPoolUSD: settlement.payoutPoolUSD,
          prizePoolUSD: settlement.prizePoolUSD,
          winnersCount: settlement.winners.length
        }
      },
      message: 'Merkle settlement prepared. Submit root on-chain from creator wallet.',
      version: VERSION
    });
  } catch (error: any) {
    console.error('Error in manual/merkle settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to prepare Merkle settlement',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/manual/merkle/posted - record on-chain posting (tx + root)
router.post('/manual/merkle/posted', async (req, res) => {
  try {
    const { predictionId, txHash, root } = req.body as { predictionId?: string; txHash?: string; root?: string };
    if (!predictionId || !txHash) {
      return res.status(400).json({ error: 'bad_request', message: 'predictionId and txHash are required', version: VERSION });
    }

    await supabase
      .from('bet_settlements')
      .update({
        status: 'onchain_posted',
        meta: {
          tx_hash: txHash,
          merkle_root: root || null,
          updated_at: new Date().toISOString(),
        }
      } as any)
      .eq('bet_id', predictionId);

    // Create on-chain fee activity rows for creator and platform (if available)
    try {
      const { data: pred } = await supabase
        .from('predictions')
        .select('id,title,creator_id,winning_option_id,platform_fee_percentage,creator_fee_percentage')
        .eq('id', predictionId)
        .maybeSingle();
      if (pred?.winning_option_id) {
        const settlement = await computeMerkleSettlement({ predictionId, winningOptionId: pred.winning_option_id });
        const currency = 'USD';
        // Creator fee
        if (settlement.creatorFeeUSD > 0 && pred.creator_id) {
          await supabase.from('wallet_transactions').insert({
            user_id: pred.creator_id,
            direction: 'credit',
            type: 'deposit',
            channel: 'creator_fee',
            provider: 'onchain-escrow',
            amount: settlement.creatorFeeUSD,
            currency,
            status: 'completed',
            prediction_id: predictionId,
            description: `Creator fee (on-chain) for "${pred.title}"`,
            tx_hash: txHash,
            meta: { merkle_root: settlement.root }
          });
        }
        // Platform fee
        if (settlement.platformFeeUSD > 0) {
          const treasuryUserId = await resolveTreasuryUserId();
          if (treasuryUserId) {
            await supabase.from('wallet_transactions').insert({
              user_id: treasuryUserId,
              direction: 'credit',
              type: 'deposit',
              channel: 'platform_fee',
              provider: 'onchain-escrow',
              amount: settlement.platformFeeUSD,
              currency,
              status: 'completed',
              prediction_id: predictionId,
              description: `Platform fee (on-chain) for "${pred.title}"`,
              tx_hash: txHash,
              meta: { merkle_root: settlement.root }
            });
          }
        }
      }
    } catch (postErr) {
      console.warn('[SETTLEMENT] Failed to record on-chain fee activity:', postErr);
    }

    return res.json({ success: true, version: VERSION });
  } catch (err: any) {
    console.error('[SETTLEMENT] mark posted failed:', err);
    return res.status(500).json({ error: 'internal', message: err?.message || 'Failed to mark posted', version: VERSION });
  }
});

// POST /api/v2/settlement/auto-close - Auto-close expired predictions
router.post('/auto-close', async (req, res) => {
  try {
    console.log('🕐 Auto-closing expired predictions...');
    
    // Find all open predictions past their entry deadline
    const { data: expiredPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('status', 'open')
      .lt('entry_deadline', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired predictions:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch expired predictions',
        version: VERSION
      });
    }

    if (!expiredPredictions || expiredPredictions.length === 0) {
      return res.json({
        success: true,
        data: { closedCount: 0 },
        message: 'No expired predictions to close',
        version: VERSION
      });
    }

    console.log(`📋 Found ${expiredPredictions.length} expired predictions to close`);

    // Close all expired predictions
    const { error: updateError } = await supabase
      .from('predictions')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .in('id', expiredPredictions.map(p => p.id));

    if (updateError) {
      console.error('Error closing expired predictions:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to close expired predictions',
        version: VERSION
      });
    }

    console.log(`✅ Closed ${expiredPredictions.length} expired predictions`);

    return res.json({
      success: true,
      data: { 
        closedCount: expiredPredictions.length,
        closedPredictions: expiredPredictions.map(p => ({ id: p.id, title: p.title }))
      },
      message: `Closed ${expiredPredictions.length} expired predictions`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error in auto-close:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-close expired predictions',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/auto-settle - Auto-settle closed predictions (simplified)
router.post('/auto-settle', async (req, res) => {
  try {
    console.log('⚖️ Auto-settling closed predictions...');
    
    // Find all closed predictions that haven't been settled yet
    const { data: closedPredictions, error: fetchError } = await supabase
      .from('predictions')
      .select(`
        *,
        options:prediction_options!prediction_options_prediction_id_fkey(*),
        entries:prediction_entries(*)
      `)
      .eq('status', 'closed')
      .is('settled_at', null);

    if (fetchError) {
      console.error('Error fetching closed predictions:', fetchError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch closed predictions',
        version: VERSION
      });
    }

    if (!closedPredictions || closedPredictions.length === 0) {
      return res.json({
        success: true,
        data: { settledCount: 0 },
        message: 'No closed predictions to settle',
        version: VERSION
      });
    }

    console.log(`🎯 Found ${closedPredictions.length} closed predictions to settle`);

    const settlementResults = [];

    for (const prediction of closedPredictions) {
      try {
        console.log(`🔄 Processing prediction: ${prediction.title} (${prediction.id})`);
        
        const entries = prediction.entries || [];
        
        if (entries.length === 0) {
          // No participants - just mark as settled
          await supabase
            .from('predictions')
            .update({ 
              status: 'settled',
              settled_at: new Date().toISOString()
            })
            .eq('id', prediction.id);
          
          settlementResults.push({
            predictionId: prediction.id,
            title: prediction.title,
            result: 'no_participants',
            winnersCount: 0,
            totalPayout: 0
          });
          continue;
        }

        // For closed predictions without manual settlement, we should NOT auto-determine winners
        // Instead, we should either:
        // 1. Refund all participants if no settlement is provided
        // 2. Wait for manual settlement by creator
        // 3. Mark as requiring settlement
        
        console.log(`⚠️ Prediction ${prediction.id} is closed but needs manual settlement`);
        
        // For now, let's refund all participants since no winner was determined
        const totalPool = prediction.pool_total || 0;
        let totalRefunded = 0;

        // Refund all participants their original stake
        for (const entry of entries) {
          const refundAmount = entry.amount || 0;
          
          await supabase
            .from('prediction_entries')
            .update({
              status: 'refunded',
              actual_payout: refundAmount, // Return original stake
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          totalRefunded += refundAmount;
        }

        // Mark prediction as requiring settlement
        await supabase
          .from('predictions')
          .update({ 
            status: 'awaiting_settlement',
            updated_at: new Date().toISOString()
          })
          .eq('id', prediction.id);

        settlementResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          result: 'refunded_awaiting_settlement',
          winnersCount: 0,
          losersCount: 0,
          totalRefunded: totalRefunded,
          message: 'All participants refunded - awaiting manual settlement'
        });

        console.log(`💰 Refunded prediction ${prediction.id}: $${totalRefunded.toFixed(2)} returned to ${entries.length} participants`);

      } catch (error) {
        console.error(`❌ Error settling prediction ${prediction.id}:`, error);
        settlementResults.push({
          predictionId: prediction.id,
          title: prediction.title,
          result: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      data: { 
        settledCount: settlementResults.filter(r => r.result === 'settled' || r.result === 'no_participants').length,
        results: settlementResults
      },
      message: `Processed ${settlementResults.length} predictions for settlement`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error in auto-settle:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto-settle predictions',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/:predictionId/status - Get settlement status for participants
router.get('/:predictionId/status', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const userId = req.query.userId as string;
    
    console.log(`📋 Getting settlement status for prediction ${predictionId}, user ${userId}`);
    
    // Get prediction details
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select(`
        *,
        options:prediction_options!prediction_options_prediction_id_fkey(*),
        entries:prediction_entries(*)
      `)
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    // Check if user has an entry in this prediction
    const userEntry = prediction.entries?.find((entry: any) => entry.user_id === userId);
    if (!userEntry) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this prediction',
        version: VERSION
      });
    }

    // Get settlement proposal if exists
    const { data: settlement, error: settlementError } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', predictionId)
      .single();

    const response = {
      prediction: {
        id: prediction.id,
        title: prediction.title,
        status: prediction.status,
        pool_total: prediction.pool_total
      },
      userEntry: {
        id: userEntry.id,
        option_id: userEntry.option_id,
        amount: userEntry.amount,
        status: userEntry.status,
        actual_payout: userEntry.actual_payout
      },
      settlement: settlement || null,
      canValidate: prediction.status === 'closed' || prediction.status === 'awaiting_settlement',
      needsSettlement: !settlement && (prediction.status === 'closed' || prediction.status === 'awaiting_settlement')
    };

    return res.json({
      success: true,
      data: response,
      message: 'Settlement status retrieved',
      version: VERSION
    });

  } catch (error) {
    console.error('Error getting settlement status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get settlement status',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/validate - Participant validates settlement
router.post('/:predictionId/validate', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { userId, action, reason } = req.body; // action: 'accept' | 'dispute'
    
    console.log(`✅ Settlement validation for prediction ${predictionId}: ${action} by user ${userId}`);
    
    // Validate required fields
    if (!userId || !action || !['accept', 'dispute'].includes(action)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'userId and valid action (accept/dispute) are required',
        version: VERSION
      });
    }

    // Check if user is a participant
    const { data: userEntry, error: entryError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .single();

    if (entryError || !userEntry) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You are not a participant in this prediction',
        version: VERSION
      });
    }

    // Record the validation
    const { data: validation, error: validationError } = await supabase
      .from('settlement_validations')
      .upsert({
        prediction_id: predictionId,
        user_id: userId,
        action: action,
        reason: reason || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'prediction_id,user_id'
      })
      .select()
      .single();

    if (validationError) {
      console.error('Error recording validation:', validationError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to record validation',
        version: VERSION
      });
    }

    // If this is a dispute, we might want to halt settlement
    if (action === 'dispute') {
      // Mark prediction as disputed
      await supabase
        .from('predictions')
        .update({ 
          status: 'disputed',
          updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);
    }

    return res.json({
      success: true,
      data: validation,
      message: `Settlement ${action} recorded successfully`,
      version: VERSION
    });

  } catch (error) {
    console.error('Error validating settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate settlement',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/auto - Auto settlement (for future use with oracles)
router.post('/auto', async (req, res) => {
  try {
    const { predictionId, winningOptionId, oracleSource } = req.body;
    
    // This would be similar to manual settlement but triggered by external data
    // For now, return not implemented
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Auto settlement not yet implemented',
      version: VERSION
    });
  } catch (error) {
    console.error('Error in auto settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to auto settle prediction',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/prediction/:id - Get settlement info for a prediction
router.get('/prediction/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: settlement, error } = await supabase
      .from('bet_settlements')
      .select('*')
      .eq('bet_id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Settlement not found for this prediction',
        version: VERSION
      });
    }

    return res.json({
      data: settlement,
      message: 'Settlement fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch settlement',
      version: VERSION
    });
  }
});

// GET /api/v2/settlement/missing-onchain?creatorId=...
// Lists settled predictions (by this creator) that do not have onchain_posted status yet
router.get('/missing-onchain', async (req, res) => {
  try {
    const { creatorId } = req.query as { creatorId?: string };
    if (!creatorId) {
      return res.status(400).json({ error: 'bad_request', message: 'creatorId is required', version: VERSION });
    }

    // 1) Fetch creator's settled predictions
    const { data: preds, error: predsErr } = await supabase
      .from('predictions')
      .select('id,title,winning_option_id,settled_at,status')
      .eq('creator_id', creatorId)
      .eq('status', 'settled')
      .order('settled_at', { ascending: false })
      .limit(50);
    if (predsErr) {
      console.error('[missing-onchain] load predictions error', predsErr);
      return res.status(500).json({ error: 'db_error', version: VERSION });
    }

    const results: Array<{ id: string; title: string; winningOptionId: string | null; settledAt: string | null }> = [];
    // 2) For each, check settlement status
    for (const p of preds || []) {
      const { data: s } = await supabase
        .from('bet_settlements')
        .select('status')
        .eq('bet_id', p.id)
        .maybeSingle();
      if (!s || s.status !== 'onchain_posted') {
        results.push({
          id: p.id,
          title: p.title,
          winningOptionId: (p as any).winning_option_id || null,
          settledAt: (p as any).settled_at || null
        });
      }
    }

    return res.json({ success: true, data: { items: results }, version: VERSION });
  } catch (e) {
    console.error('[missing-onchain] unhandled', e);
    return res.status(500).json({ error: 'internal', message: 'Failed to load missing on-chain settlements', version: VERSION });
  }
});

// GET /api/v2/settlement/:predictionId/disputes - Get all disputes for a prediction
router.get('/:predictionId/disputes', async (req, res) => {
  try {
    const { predictionId } = req.params;
    
    console.log('📋 Fetching disputes for prediction:', predictionId);
    
    // Get all disputes for this prediction
    const { data: disputes, error: disputesError } = await supabase
      .from('settlement_validations')
      .select(`
        id,
        user_id,
        action,
        reason,
        created_at,
        status,
        user:users(username, full_name)
      `)
      .eq('prediction_id', predictionId)
      .eq('action', 'dispute')
      .order('created_at', { ascending: false });

    if (disputesError) {
      console.error('Error fetching disputes:', disputesError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch disputes',
        version: VERSION
      });
    }

    const totalDisputes = disputes?.length || 0;
    const pendingDisputes = disputes?.filter(d => d.status === 'pending').length || 0;

    console.log(`✅ Found ${totalDisputes} disputes (${pendingDisputes} pending)`);

    return res.json({
      success: true,
      data: {
        disputes: disputes || [],
        totalDisputes,
        pendingDisputes
      },
      version: VERSION
    });

  } catch (error) {
    console.error('Error fetching disputes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch disputes',
      version: VERSION
    });
  }
});

// POST /api/v2/settlement/:predictionId/resolve-disputes - Resolve disputes for a prediction
router.post('/:predictionId/resolve-disputes', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { action, reason, newWinningOption, creatorId } = req.body;
    
    console.log('🔨 Resolving disputes for prediction:', predictionId, 'Action:', action);
    
    // Validate required fields
    if (!action || !reason || !creatorId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'action, reason, and creatorId are required',
        version: VERSION
      });
    }

    // Verify creator ownership
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('creator_id')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    if (prediction.creator_id !== creatorId) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only the prediction creator can resolve disputes',
        version: VERSION
      });
    }

    // Update all pending disputes to resolved
    const { error: updateError } = await supabase
      .from('settlement_validations')
      .update({ 
        status: 'resolved',
        resolution_reason: reason,
        resolved_at: new Date().toISOString()
      })
      .eq('prediction_id', predictionId)
      .eq('action', 'dispute')
      .eq('status', 'pending');

    if (updateError) {
      console.error('Error updating disputes:', updateError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update disputes',
        version: VERSION
      });
    }

    // Handle different resolution actions
    let newPredictionStatus = 'settled';
    
    if (action === 'accept') {
      // Refund all participants
      console.log('💰 Refunding all participants due to accepted disputes');
      
      // Update all prediction entries to refunded
      const { error: refundError } = await supabase
        .from('prediction_entries')
        .update({ 
          status: 'refunded',
          actual_payout: 0 // Will be updated with actual refund amount below
        })
        .eq('prediction_id', predictionId);

      if (refundError) {
        console.error('Error processing refunds:', refundError);
      }
      
      newPredictionStatus = 'refunded';
      
    } else if (action === 'revise' && newWinningOption) {
      // Re-settle with new winning option
      console.log('🔄 Re-settling with new winning option:', newWinningOption);
      
      // This would trigger a new settlement process
      // For now, we'll just update the status
      newPredictionStatus = 'awaiting_settlement';
      
    } else if (action === 'reject') {
      // Maintain original settlement
      console.log('✋ Maintaining original settlement');
      newPredictionStatus = 'settled';
    }

    // Update prediction status
    const { error: statusError } = await supabase
      .from('predictions')
      .update({ 
        status: newPredictionStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', predictionId);

    if (statusError) {
      console.error('Error updating prediction status:', statusError);
    }

    console.log('✅ Disputes resolved successfully');

    return res.json({
      success: true,
      data: {
        action,
        newStatus: newPredictionStatus,
        message: `Disputes ${action}ed successfully`
      },
      message: 'Disputes resolved successfully',
      version: VERSION
    });

  } catch (error) {
    console.error('Error resolving disputes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to resolve disputes',
      version: VERSION
    });
  }
});

export default router;