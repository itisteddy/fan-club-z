/**
 * Robust Atomic Bet Placement Service
 * 
 * Ensures lock→entry atomicity using PostgreSQL transactions
 * Features:
 * - Single database transaction wraps entire operation
 * - Idempotent via unique constraints
 * - Proper rollback on any failure
 * - Structured logging with [FCZ-BET] tags
 * - Lock status validation and atomic state transitions
 */

import { Pool, PoolClient } from 'pg';
import { withTransaction, getDbPool } from '../utils/dbPool';
import { supabase } from '../config/database';

interface PlaceBetParams {
  userId: string;
  predictionId: string;
  optionId: string;
  amountUSD: number;
  lockId?: string; // Optional: if lock already exists
  walletAddress?: string;
}

interface PlaceBetResult {
  success: boolean;
  entryId: string;
  lockId: string;
  error?: string;
  errorCode?: string;
}

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
  const prefix = '[FCZ-BET]';
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  
  const logMessage = `${prefix} [${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }
}

/**
 * Atomic bet placement using PostgreSQL transaction
 * 
 * Steps (all in single transaction):
 * 1. Verify prediction exists and is open
 * 2. Verify option exists and belongs to prediction
 * 3. Check escrow available balance >= amount
 * 4. Create or reuse escrow lock (idempotent)
 * 5. Create prediction entry consuming lock (idempotent)
 * 6. Update lock status to 'consumed'
 * 7. Record wallet transaction
 * 8. Log event
 * 
 * All steps succeed or all rollback
 */
export async function placeBetAtomically(
  params: PlaceBetParams
): Promise<PlaceBetResult> {
  const { userId, predictionId, optionId, amountUSD, lockId: existingLockId, walletAddress } = params;

  log('info', 'Starting atomic bet placement', {
    userId,
    predictionId,
    optionId,
    amountUSD,
    existingLockId
  });

  return await withTransaction(async (client: PoolClient | any) => {

    // Transaction already started by withTransaction

    // Step 1: Verify prediction exists and is open
    const { rows: predRows } = await client.query(
      `SELECT id, status, entry_deadline, title
       FROM predictions
       WHERE id = $1`,
      [predictionId]
    );

    if (predRows.length === 0) {
      throw new Error('PREDICTION_NOT_FOUND');
    }

    const prediction = predRows[0];
    if (prediction.status !== 'open') {
      throw new Error(`PREDICTION_NOT_OPEN:${prediction.status}`);
    }

    // Check deadline
    const deadline = new Date(prediction.entry_deadline);
    if (deadline < new Date()) {
      throw new Error('DEADLINE_PASSED');
    }

    // Step 2: Verify option exists and belongs to prediction
    const { rows: optionRows } = await client.query(
      `SELECT id, label
       FROM prediction_options
       WHERE id = $1 AND prediction_id = $2`,
      [optionId, predictionId]
    );

    if (optionRows.length === 0) {
      throw new Error('OPTION_NOT_FOUND');
    }

    const option = optionRows[0];

    // Step 3: Check escrow available balance
    // Calculate from escrow_locks: available = total escrow - reserved
    const { rows: escrowRows } = await client.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN (status = 'locked' OR state = 'locked') THEN amount ELSE 0 END), 0) as reserved,
         COALESCE(SUM(CASE WHEN (status IN ('locked', 'consumed') OR state IN ('locked', 'consumed')) THEN amount ELSE 0 END), 0) as total_escrow
       FROM escrow_locks
       WHERE user_id = $1`,
      [userId]
    );

    const reserved = Number(escrowRows[0]?.reserved || 0);
    const totalEscrow = Number(escrowRows[0]?.total_escrow || 0);
    const available = totalEscrow - reserved;

    if (available < amountUSD) {
      throw new Error(`INSUFFICIENT_ESCROW:${available}:${amountUSD}`);
    }

    // Step 4: Create or reuse escrow lock (idempotent)
    let finalLockId: string;

    if (existingLockId) {
      // Verify existing lock is valid
      const { rows: lockRows } = await client.query(
        `SELECT id, user_id, prediction_id, amount, status, state
         FROM escrow_locks
         WHERE id = $1`,
        [existingLockId]
      );

      if (lockRows.length === 0) {
        throw new Error('LOCK_NOT_FOUND');
      }

      const lock = lockRows[0];
      if (lock.user_id !== userId || lock.prediction_id !== predictionId) {
        throw new Error('LOCK_MISMATCH');
      }

      const lockStatus = lock.status || lock.state;
      if (lockStatus !== 'locked') {
        throw new Error(`LOCK_NOT_LOCKED:${lockStatus}`);
      }

      finalLockId = existingLockId;
    } else {
      // Create new lock (idempotent via unique constraint)
      const lockRef = `bet_${userId}_${predictionId}_${Date.now()}`;
      
      const { rows: newLockRows } = await client.query(
        `INSERT INTO escrow_locks
         (user_id, prediction_id, amount, status, state, currency, meta)
         VALUES ($1, $2, $3, 'locked', 'locked', 'USD', $4)
         ON CONFLICT (user_id, prediction_id) 
         WHERE (status = 'locked' OR state = 'locked')
         DO UPDATE SET amount = escrow_locks.amount + $3
         RETURNING id`,
        [userId, predictionId, amountUSD, JSON.stringify({ lock_ref: lockRef, provider: 'crypto-base-usdc' })]
      );

      if (newLockRows.length === 0) {
        // Lock already exists (concurrent request) - fetch it
        const { rows: existingRows } = await client.query(
          `SELECT id FROM escrow_locks
           WHERE user_id = $1 AND prediction_id = $2 
             AND (status = 'locked' OR state = 'locked')`,
          [userId, predictionId]
        );

        if (existingRows.length === 0) {
          throw new Error('LOCK_CREATION_FAILED');
        }

        finalLockId = existingRows[0].id;
      } else {
        finalLockId = newLockRows[0].id;
      }
    }

    // Step 5: Create prediction entry consuming lock (idempotent)
    // Check if entry already exists for this lock
    const { rows: existingEntryRows } = await client.query(
      `SELECT id FROM prediction_entries
       WHERE escrow_lock_id = $1`,
      [finalLockId]
    );

    let entryId: string;

    if (existingEntryRows.length > 0) {
      // Entry already exists (idempotent retry)
      entryId = existingEntryRows[0].id;
      log('info', 'Entry already exists for lock (idempotent)', {
        entryId,
        lockId: finalLockId
      });
    } else {
      // Create new entry
      const { rows: entryRows } = await client.query(
        `INSERT INTO prediction_entries
         (prediction_id, option_id, user_id, amount, status, potential_payout, escrow_lock_id, provider)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, 'crypto-base-usdc')
         RETURNING id`,
        [predictionId, optionId, userId, amountUSD, amountUSD * 2.0, finalLockId]
      );

      if (entryRows.length === 0) {
        throw new Error('ENTRY_CREATION_FAILED');
      }

      entryId = entryRows[0].id;
    }

    // Step 6: Update lock status to 'consumed' (atomic)
    await client.query(
      `UPDATE escrow_locks
       SET status = 'consumed', state = 'consumed'
       WHERE id = $1 AND (status = 'locked' OR state = 'locked')`,
      [finalLockId]
    );

    // Step 7: Record wallet transaction (idempotent)
    await client.query(
      `INSERT INTO wallet_transactions
       (user_id, type, direction, channel, provider, amount, status, external_ref, description, prediction_id, entry_id, meta)
       VALUES ($1, 'bet_lock', 'debit', 'crypto', 'crypto-base-usdc', $2, 'completed', $3, $4, $5, $6, $7)
       ON CONFLICT (provider, external_ref) DO NOTHING`,
      [
        userId,
        amountUSD,
        `bet_${entryId}`,
        `Bet on "${prediction.title}"`,
        predictionId,
        entryId,
        JSON.stringify({
          prediction_id: predictionId,
          option_id: optionId,
          option_label: option.label,
          prediction_title: prediction.title,
          entry_id: entryId,
          lock_id: finalLockId
        })
      ]
    );

    // Step 8: Log event
    await client.query(
      `INSERT INTO event_log (source, kind, ref, payload)
       VALUES ('place_bet', 'prediction.entry.created', $1, $2)`,
      [
        entryId,
        JSON.stringify({
          prediction_id: predictionId,
          option_id: optionId,
          user_id: userId,
          amount: amountUSD,
          lock_id: finalLockId,
          timestamp: new Date().toISOString()
        })
      ]
    );

    // Transaction will be committed by withTransaction
    
    log('info', 'Bet placed atomically', {
      entryId,
      lockId: finalLockId,
      userId,
      predictionId,
      amountUSD
    });

    return {
      success: true,
      entryId,
      lockId: finalLockId
    };
  }).catch((error) => {
    // Transaction automatically rolled back by withTransaction
    
    log('error', 'Atomic bet placement failed', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      predictionId
    });

    // Parse error code from error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const [errorCode, ...rest] = errorMessage.split(':');

    return {
      success: false,
      entryId: '',
      lockId: '',
      error: errorMessage,
      errorCode: errorCode || 'TRANSACTION_FAILED'
    };
  });
}

