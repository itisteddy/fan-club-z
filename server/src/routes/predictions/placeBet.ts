import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { getAddress } from 'viem';
import crypto from 'crypto';
import { reconcileWallet } from '../../services/walletReconciliation';
import { emitPredictionUpdate, emitWalletUpdate } from '../../services/realtime';
import { recomputePredictionState } from '../../services/predictionMath';

export const placeBetRouter = Router();

/**
 * POST /api/predictions/:predictionId/place-bet
 * Atomic, idempotent bet placement
 * 
 * Input: { predictionId, optionId, amountUSD }
 * 
 * Steps (in transaction):
 * 1. Verify ENABLE_BETS=1
 * 2. Check escrow available >= amount
 * 3. Create lock with idempotent lock_ref
 * 4. Insert entry consuming lock
 * 5. Create wallet_transaction
 * 6. Emit event_log
 */
async function handlePlaceBet(req: any, res: any) {
  try {
    const predictionId = req.params.predictionId;

    // Verify ENABLE_BETS flag
    const enableBets = process.env.ENABLE_BETS === '1' || 
                       process.env.VITE_FCZ_BASE_BETS === '1' ||
                       process.env.ENABLE_BASE_BETS === '1';
    
    if (!enableBets) {
      console.log('[FCZ-BET] Bet placement disabled - ENABLE_BETS flag not set');
      return res.status(403).json({
        error: 'BETTING_DISABLED',
        message: 'Betting is temporarily unavailable. Please try again later.',
        hint: 'Server admin: Set ENABLE_BETS=1 in server/.env',
        version: VERSION
      });
    }

    // Validate input
    const BodySchema = z.object({
      optionId: z.string().uuid('Invalid optionId'),
      amountUSD: z.number().positive('amountUSD must be positive'),
      userId: z.string().uuid('Invalid userId'),
      walletAddress: z.string().optional()
    });

    let body;
    try {
      body = BodySchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'invalid_body',
          details: err.issues,
          version: VERSION
        });
      }
      throw err;
    }

    const { optionId, amountUSD, userId } = body;
    const bodyWallet = body.walletAddress ? getAddress(body.walletAddress) : undefined;

    console.log(`[FCZ-BET] Place bet request:`, { predictionId, optionId, amountUSD, userId });

    // Verify prediction exists and is open
    const { data: prediction, error: predError } = await supabase
      .from('predictions')
      .select('id, title, status, entry_deadline, pool_total, participant_count')
      .eq('id', predictionId)
      .single();

    if (predError || !prediction) {
      return res.status(404).json({
        error: 'prediction_not_found',
        message: 'Prediction not found',
        version: VERSION
      });
    }

    if (prediction.status !== 'open') {
      return res.status(400).json({
        error: 'prediction_not_open',
        message: `Prediction is ${prediction.status}`,
        version: VERSION
      });
    }

    // Verify option exists
    const { data: option, error: optError } = await supabase
      .from('prediction_options')
      .select('id, prediction_id, label')
      .eq('id', optionId)
      .eq('prediction_id', predictionId)
      .single();

    if (optError || !option) {
      return res.status(404).json({
        error: 'option_not_found',
        message: 'Option not found',
        version: VERSION
      });
    }

    const walletSnapshot = await reconcileWallet({ userId, walletAddress: bodyWallet });

    const { data: existingEntry, error: existingEntryError } = await supabase
      .from('prediction_entries')
      .select('id, amount, potential_payout')
      .eq('prediction_id', predictionId)
      .eq('user_id', userId)
      .eq('option_id', optionId)
      .maybeSingle();

    if (existingEntryError) {
      console.error('[FCZ-BET] Failed to fetch existing entry:', existingEntryError);
      return res.status(500).json({
        error: 'entry_lookup_failed',
        message: 'Unable to verify existing bets for this prediction',
        version: VERSION
      });
    }

    const isTopUp = Boolean(existingEntry);

    // Persist wallet address association if provided and missing
    if (bodyWallet) {
      try {
        await supabase
          .from('crypto_addresses')
          .upsert({ user_id: userId, chain_id: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null, address: bodyWallet },
                  { onConflict: 'chain_id,address' });
      } catch (e) {
        console.warn('[FCZ-BET] upsert wallet address failed', e);
      }
    }

    if (!walletSnapshot.walletAddress) {
      return res.status(400).json({
        error: 'WALLET_NOT_LINKED',
        message: 'No wallet address is linked to this account. Please reconnect your wallet.',
        version: VERSION,
      });
    }

    let { availableToStakeUSDC, reservedUSDC } = walletSnapshot;

    // Check if available >= amount
    if (availableToStakeUSDC < amountUSD) {
      console.log(`[FCZ-BET] Insufficient escrow check`, {
        availableToStakeUSDC,
        required: amountUSD,
        snapshot: walletSnapshot
      });
      return res.status(400).json({
        error: 'INSUFFICIENT_ESCROW',
        message: `Insufficient escrow available: ${availableToStakeUSDC} < ${amountUSD}`,
        available: availableToStakeUSDC,
        required: amountUSD,
        version: VERSION
      });
    }

    // Generate idempotent lock_ref: hash(userId|predictionId|optionId|amount|nonce)
    // Use timestamp as nonce for uniqueness per request, but same request = same hash
    // In practice, client should send a requestId for true idempotency
    const nonce = req.body.requestId || Date.now().toString();
    const lockRefInput = `${userId}|${predictionId}|${optionId}|${amountUSD}|${nonce}`;
    const lockRef = crypto.createHash('sha256').update(lockRefInput).digest('hex').substring(0, 32);

    console.log(`[FCZ-BET] Creating lock with ref: ${lockRef}`);

    // Check if lock with this ref already exists (idempotency)
    // First check by lock_ref for true idempotency
    let existingLock = null;
    let checkError = null;
    
    // Try to find by lock_ref first (idempotent retry)
    const { data: lockByRef, error: refError } = await supabase
      .from('escrow_locks')
      .select('id, state, amount, prediction_id, expires_at')
      .eq('lock_ref', lockRef)
      .maybeSingle();
      
    if (lockByRef) {
      existingLock = lockByRef;
      checkError = refError;
    } else {
      // Fallback: check for active lock on this prediction (prevent duplicate)
      const { data: lockByPrediction, error: predError } = await supabase
        .from('escrow_locks')
        .select('id, state, amount, prediction_id, expires_at')
        .eq('user_id', userId)
        .eq('prediction_id', predictionId)
        .eq('state', 'locked')
        .gt('expires_at', new Date().toISOString()) // Only active locks
        .maybeSingle();
        
      existingLock = lockByPrediction;
      checkError = predError;
    }

    if (existingLock && !checkError) {
      // Lock exists - check if it's already consumed
      const lockStatus = (existingLock as any).status || existingLock.state;
      if (lockStatus === 'consumed') {
        // Find the entry that consumed it
        const { data: existingEntry } = await supabase
          .from('prediction_entries')
          .select('id')
          .eq('escrow_lock_id', existingLock.id)
          .single();

        if (existingEntry) {
          const recomputed = await recomputePredictionState(predictionId);
          const { data: entryRow, error: entryFetchError } = await supabase
            .from('prediction_entries')
            .select('*')
            .eq('id', existingEntry.id)
            .single();
          if (entryFetchError) {
            console.warn('[FCZ-BET] Failed to fetch existing entry for idempotent response:', entryFetchError);
          }
          console.log(`[FCZ-BET] Lock already consumed, entry: ${existingEntry.id}`);
          return res.status(200).json({
            ok: true,
            entryId: existingEntry.id,
            consumedLockId: existingLock.id,
            data: {
              prediction: recomputed.prediction,
              entry: entryFetchError ? null : entryRow,
            },
            newEscrowReserved: reservedUSDC,
            newEscrowAvailable: availableToStakeUSDC,
            message: 'Bet already placed (idempotent)'
          });
        }
      }

      // Lock exists but not consumed - reuse it
      console.log(`[FCZ-BET] Reusing existing lock: ${existingLock.id}`);
      
      // Check if lock amount matches
      if (Number(existingLock.amount) < amountUSD) {
        return res.status(400).json({
          error: 'INSUFFICIENT_LOCK',
          message: `Existing lock amount (${existingLock.amount}) is less than required (${amountUSD})`,
          version: VERSION
        });
      }
      
      // Use existing lock
      console.log(`[FCZ-BET] Reusing existing lock: ${existingLock.id}`);
    } else {
      // Create new lock with expiration and idempotency
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      const lockData: any = {
        user_id: userId,
        prediction_id: predictionId,
        amount: amountUSD,
        state: 'locked',
        status: 'locked',
        lock_ref: lockRef, // Idempotency key
        expires_at: expiresAt.toISOString(), // Auto-expire after 10 minutes
        currency: 'USD',
      };
      
      // Add optional columns if they exist in schema
      if (optionId) {
        lockData.option_id = optionId;
      }
      
      console.log(`[FCZ-BET] Creating new lock, expires at: ${expiresAt.toISOString()}`);
      
      const { data: newLock, error: createError } = await supabase
        .from('escrow_locks')
        .insert(lockData)
        .select()
        .single();

      if (createError) {
        // Check if it's a unique constraint violation (concurrent request)
        if (createError.code === '23505') {
          // Lock already created by another request - fetch it
          const { data: concurrentLock } = await supabase
            .from('escrow_locks')
            .select('id, state')
            .eq('user_id', userId)
            .eq('prediction_id', predictionId)
            .eq('state', 'locked')
            .maybeSingle();

          const concurrentStatus = (concurrentLock as any)?.status || concurrentLock?.state;
          if (concurrentLock && concurrentStatus === 'consumed') {
            const { data: entry } = await supabase
              .from('prediction_entries')
              .select('id')
              .eq('escrow_lock_id', concurrentLock.id)
              .single();

            if (entry) {
              const recomputed = await recomputePredictionState(predictionId);
              const { data: entryRow, error: entryFetchError } = await supabase
                .from('prediction_entries')
                .select('*')
                .eq('id', entry.id)
                .single();
              if (entryFetchError) {
                console.warn('[FCZ-BET] Failed to fetch existing entry for idempotent response:', entryFetchError);
              }
              return res.status(200).json({
                ok: true,
                entryId: entry.id,
                consumedLockId: concurrentLock.id,
                data: {
                  prediction: recomputed.prediction,
                  entry: entryFetchError ? null : entryRow,
                },
                newEscrowReserved: reservedUSDC,
                newEscrowAvailable: availableToStakeUSDC
              });
            }
          }
        }

        console.error('[FCZ-BET] Error creating lock:', createError);
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to create escrow lock',
          version: VERSION
        });
      }

      existingLock = newLock;
    }

    const lockId = existingLock?.id;
    if (!lockId) {
      return res.status(500).json({
        error: 'lock_creation_failed',
        message: 'Failed to obtain lock ID',
        version: VERSION
      });
    }

    let entryId: string | null = null;
    let totalEntryAmount = amountUSD;

    if (isTopUp && existingEntry) {
      totalEntryAmount = Number(existingEntry.amount || 0) + amountUSD;
      const { data: updatedEntry, error: updateError } = await supabase
        .from('prediction_entries')
        .update({
          amount: totalEntryAmount,
          potential_payout: totalEntryAmount * 2.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id)
        .select('id')
        .single();

      if (updateError) {
        console.error('[FCZ-BET] Error updating existing entry:', updateError);
        await supabase
          .from('escrow_locks')
          .update({ state: 'released', status: 'released', released_at: new Date().toISOString() })
          .eq('id', lockId);

        return res.status(500).json({
          error: 'entry_update_failed',
          message: 'Failed to increase your stake on this option',
          version: VERSION
        });
      }

      entryId = updatedEntry?.id || existingEntry.id;
    } else {
      const { data: entry, error: entryError } = await supabase
        .from('prediction_entries')
        .insert({
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountUSD,
          status: 'active',
          potential_payout: amountUSD * 2.0,
          escrow_lock_id: lockId,
          provider: 'crypto-base-usdc'
        })
        .select()
        .single();

      if (entryError) {
        await supabase
          .from('escrow_locks')
          .update({ state: 'released', status: 'released', released_at: new Date().toISOString() })
          .eq('id', lockId);

        console.error('[FCZ-BET] Error creating entry:', entryError);
        return res.status(500).json({
          error: 'database_error',
          message: 'Failed to create prediction entry',
          version: VERSION
        });
      }

      entryId = entry?.id || null;
      totalEntryAmount = amountUSD;
    }

    if (!entryId) {
      await supabase
        .from('escrow_locks')
        .update({ state: 'released', status: 'released', released_at: new Date().toISOString() })
        .eq('id', lockId);

      return res.status(500).json({
        error: 'entry_missing',
        message: 'Prediction entry was not recorded',
        version: VERSION
      });
    }

    // Mark lock as consumed (bet is now placed, funds are committed to active bet)
    // After migration 116, 'consumed' is a valid state value
    try {
      await supabase
        .from('escrow_locks')
        .update({ 
          state: 'consumed', // Funds locked in active bet
          status: 'consumed' // Keep both columns in sync
        })
        .eq('id', lockId);
    } catch (e) {
      console.warn('[FCZ-BET] Failed to mark lock as consumed:', e);
    }

    const { error: walletTxError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'bet_lock',
        direction: 'debit', // CRITICAL: Must be 'debit' for walletActivity to classify as bet_placed
        status: 'completed',
        channel: 'escrow_consumed',
        provider: 'crypto-base-usdc',
        amount: amountUSD,
        currency: 'USD',
        external_ref: `bet_${entryId}`,
        prediction_id: predictionId,
        entry_id: entryId,
        description: `Bet on "${prediction.title}"`,
        meta: {
          prediction_id: predictionId,
          option_id: optionId,
          option_label: option?.label ?? null,
          prediction_title: prediction.title,
          entry_id: entryId,
          lock_id: lockId
        }
      });

    if (walletTxError) {
      console.error('[FCZ-BET] Failed to record wallet transaction:', walletTxError);
    }

    // Emit event_log
    await supabase
      .from('event_log')
      .insert({
        source: 'place_bet',
        kind: 'prediction.entry.created',
        ref: entryId,
        payload: {
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountUSD,
          lock_id: lockId
        }
      });

    const recomputed = await recomputePredictionState(predictionId);
    const { data: latestEntry, error: latestEntryError } = await supabase
      .from('prediction_entries')
      .select('*')
      .eq('id', entryId)
      .single();
    if (latestEntryError) {
      console.warn('[FCZ-BET] Failed to fetch latest entry record:', latestEntryError);
    }
    const finalSnapshot = await reconcileWallet({ userId });

    console.log(`[FCZ-BET] Bet placed successfully: entry ${entryId}, lock ${lockId}`);

    // Realtime notifications
    emitPredictionUpdate({ predictionId });
    emitWalletUpdate({ userId, reason: 'bet_placed' });

    return res.status(200).json({
      ok: true,
      entryId,
      consumedLockId: lockId,
      data: {
        prediction: recomputed.prediction,
        entry: latestEntryError ? null : latestEntry,
      },
      newEscrowReserved: finalSnapshot.reservedUSDC,
      newEscrowAvailable: finalSnapshot.availableToStakeUSDC
    });
  } catch (error) {
    console.error('[FCZ-BET] Unhandled error:', error);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Failed to place bet',
      version: VERSION
    });
  }
}

// Register both kebab-case and snake_case for backward compatibility
placeBetRouter.post('/:predictionId/place-bet', handlePlaceBet);
placeBetRouter.post('/:predictionId/place_bet', handlePlaceBet);

