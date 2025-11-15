/**
 * Robust Base USDC Deposit Watcher
 * 
 * Features:
 * - Persistent checkpoint storage (survives restarts)
 * - Exponential backoff retry logic
 * - Dead-letter queue for permanent failures
 * - Structured logging with [FCZ-PAY] tags
 * - Idempotent processing via (provider, external_ref) unique constraint
 * - Backfill safety window to prevent gaps
 */

import type { Address, Log } from 'viem';
import { makePublicClient } from './client';
import { ERC20_ABI } from './abi/erc20';
import { Pool } from 'pg';
import { emitWalletUpdate } from '../../services/realtime';
import { payLogger } from '../../utils/logger';

type Ctx = {
  pool: Pool;
  usdc: Address;
};

interface Checkpoint {
  block_number: bigint;
  updated_at: string;
}

interface ProcessResult {
  processed: number;
  skipped: number;
  errors: number;
  lastBlock: bigint;
}

const CHECKPOINT_KEY = 'base-deposit-watcher';
const BACKFILL_WINDOW_BLOCKS = 1000n; // Safety window for backfill
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;
const POLL_INTERVAL_MS = 10000;

function envOn(): boolean {
  return process.env.PAYMENTS_ENABLE === '1' && process.env.ENABLE_BASE_DEPOSITS === '1';
}

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
  if (level === 'error') {
    // Extract error from meta if present as Error instance
    const error = meta?.error instanceof Error ? meta.error : undefined;
    const cleanMeta = meta ? { ...meta } : {};
    // Remove error from meta if it's an Error instance (logger will handle it separately)
    if (error) {
      delete cleanMeta.error;
    }
    // Only pass error parameter if we have an Error instance, otherwise omit it
    payLogger.error(message, error, cleanMeta);
  } else if (level === 'warn') {
    payLogger.warn(message, meta);
  } else {
    payLogger.info(message, meta);
  }
}

/**
 * Load checkpoint from database
 */
async function loadCheckpoint(ctx: Ctx): Promise<bigint | null> {
  const client = await ctx.pool.connect();
  try {
    const { rows } = await client.query<Checkpoint>(
      `SELECT block_number, updated_at 
       FROM event_log 
       WHERE source = 'base-watcher-checkpoint' 
         AND kind = $1 
       ORDER BY ts DESC 
       LIMIT 1`,
      [CHECKPOINT_KEY]
    );

    if (rows.length > 0) {
      const row = rows[0];
      if (!row) {
        return null;
      }
      const checkpoint = BigInt(row.block_number);
      log('info', `Loaded checkpoint`, { block: checkpoint.toString(), updated: row.updated_at });
      return checkpoint;
    }

    log('info', 'No checkpoint found, starting from latest block');
    return null;
  } catch (err) {
    // Better error serialization
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message || err.toString();
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err !== null && err !== undefined) {
      errorMessage = String(err);
    }
    
    const errorDetails: Record<string, any> = { error: errorMessage };
    if (err instanceof Error) {
      errorDetails.stack = err.stack;
      errorDetails.name = err.name;
    }
    
    log('error', 'Failed to load checkpoint', errorDetails);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Save checkpoint to database
 */
async function saveCheckpoint(ctx: Ctx, blockNumber: bigint): Promise<void> {
  const client = await ctx.pool.connect();
  try {
    // Use UPSERT pattern: delete old checkpoint, insert new one
    // This avoids ON CONFLICT issues if unique constraint doesn't exist
    await client.query('BEGIN');
    
    // Delete any existing checkpoint
    await client.query(
      `DELETE FROM event_log 
       WHERE source = 'base-watcher-checkpoint' AND kind = $1`,
      [CHECKPOINT_KEY]
    );
    
    // Insert new checkpoint
    await client.query(
      `INSERT INTO event_log (source, kind, ref, payload)
       VALUES ('base-watcher-checkpoint', $1, $2, $3)`,
      [
        CHECKPOINT_KEY,
        blockNumber.toString(),
        JSON.stringify({ block_number: blockNumber.toString(), updated_at: new Date().toISOString() })
      ]
    );
    
    await client.query('COMMIT');
    log('info', 'Checkpoint saved', { block: blockNumber.toString() });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback errors
    }
    
    // Direct console.error to see actual error before serialization
    console.error('[FCZ-PAY] Checkpoint save error (raw):', err);
    console.error('[FCZ-PAY] Error type:', typeof err);
    console.error('[FCZ-PAY] Error instanceof Error:', err instanceof Error);
    if (err && typeof err === 'object') {
      console.error('[FCZ-PAY] Error keys:', Object.keys(err));
      console.error('[FCZ-PAY] Error message:', (err as any).message);
      console.error('[FCZ-PAY] Error code:', (err as any).code);
      console.error('[FCZ-PAY] Error detail:', (err as any).detail);
    }
    
    // Better error serialization - handle PostgREST/Supabase error objects
    let errorMessage = 'Unknown error';
    if (err instanceof Error) {
      errorMessage = err.message || err.toString();
    } else if (typeof err === 'string') {
      errorMessage = err;
    } else if (err && typeof err === 'object') {
      // PostgREST/Supabase errors have message property
      errorMessage = (err as any).message || String(err);
    } else if (err !== null && err !== undefined) {
      errorMessage = String(err);
    }
    
    // Log full error details for debugging
    const errorDetails: Record<string, any> = { 
      error: errorMessage,
      block: blockNumber.toString()
    };
    
    if (err instanceof Error) {
      errorDetails.stack = err.stack;
      errorDetails.name = err.name;
    } else if (err && typeof err === 'object') {
      // Extract PostgREST/Supabase error properties
      errorDetails.code = (err as any).code;
      errorDetails.details = (err as any).details;
      errorDetails.hint = (err as any).hint;
    }
    
    log('error', 'Failed to save checkpoint', errorDetails);
  } finally {
    client.release();
  }
}

/**
 * Exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt), MAX_RETRY_DELAY_MS);
  return delay;
}

/**
 * Record permanent failure to dead-letter queue
 */
async function recordDeadLetter(ctx: Ctx, logEntry: Log, error: Error, attempt: number): Promise<void> {
  const client = await ctx.pool.connect();
  try {
    const txHash = String((logEntry as any).transactionHash || 'unknown');
    const logIndex = Number((logEntry as any).logIndex ?? 0);
    
    await client.query(
      `INSERT INTO event_log (source, kind, ref, payload)
       VALUES ('base-watcher-dlq', 'deposit_failed', $1, $2)`,
      [
        `${txHash}:${logIndex}`,
        JSON.stringify({
          txHash,
          logIndex,
          error: error.message,
          attempt,
          timestamp: new Date().toISOString(),
          log: JSON.stringify(logEntry)
        })
      ]
    );
    
    log('error', 'Recorded to dead-letter queue', { txHash, logIndex, attempt });
  } catch (err) {
    log('error', 'Failed to record dead-letter', { error: err instanceof Error ? err.message : 'Unknown' });
  } finally {
    client.release();
  }
}

/**
 * Process transfer logs with idempotency and error handling
 */
async function processTransferLogs(ctx: Ctx, logs: Log[]): Promise<ProcessResult> {
  if (!logs.length) {
    return { processed: 0, skipped: 0, errors: 0, lastBlock: 0n };
  }

  log('info', `Processing transfer logs`, { count: logs.length });

  // Extract unique recipient addresses
  const tos = new Set<string>();
  const blockNumbers = new Set<bigint>();
  
  for (const l of logs) {
    const args: any = (l as any).args;
    const to = String(args?.to ?? '').toLowerCase();
    if (to) tos.add(to);
    
    const blockNumber = BigInt((l as any).blockNumber || 0);
    if (blockNumber > 0n) blockNumbers.add(blockNumber);
  }

  log('info', `Found unique addresses and blocks`, { 
    addresses: tos.size, 
    blocks: blockNumbers.size 
  });

  if (tos.size === 0) {
    return { processed: 0, skipped: 0, errors: 0, lastBlock: 0n };
  }

  const client = await ctx.pool.connect();
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let lastBlock = 0n;

  try {
    // Resolve addresses to user IDs
    const { rows: addrRows } = await client.query<{ address: string; user_id: string }>(
      `SELECT lower(address) AS address, user_id
       FROM crypto_addresses
       WHERE lower(address) = ANY($1)`,
      [Array.from(tos)]
    );

    log('info', `Resolved addresses to users`, { matched: addrRows.length, total: tos.size });

    if (addrRows.length === 0) {
      log('info', 'No matching deposit addresses found');
      return { processed: 0, skipped: 0, errors: 0, lastBlock: 0n };
    }

    const toUser = new Map<string, string>();
    for (const r of addrRows) {
      toUser.set(r.address, r.user_id);
    }

    // Process each log with retry logic
    for (const l of logs) {
      const txHash = String((l as any).transactionHash);
      const logIndex = Number((l as any).logIndex ?? 0);
      const blockNumber = BigInt((l as any).blockNumber || 0);
      const args: any = (l as any).args;
      const to = String(args?.to ?? '').toLowerCase();
      const value = BigInt(args?.value ?? 0n);

      if (blockNumber > lastBlock) {
        lastBlock = blockNumber;
      }

      const userId = toUser.get(to);
      if (!userId || value <= 0n) {
        skipped++;
        continue;
      }

      const amount = Number(value) / 1_000_000; // USDC has 6 decimals
      const externalRef = `${txHash}:${logIndex}`;

      // Retry logic with exponential backoff
      let success = false;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await client.query('BEGIN');

          // Idempotent insert - ON CONFLICT ensures we never credit twice
          const insertResult = await client.query(
            `INSERT INTO wallet_transactions
               (user_id, direction, type, channel, provider, amount, status, external_ref, description, meta)
             VALUES ($1, 'credit', 'credit', 'crypto', 'crypto-base-usdc', $2, 'success', $3, $4, $5)
             ON CONFLICT (provider, external_ref) DO NOTHING
             RETURNING id`,
            [
              userId,
              amount,
              externalRef,
              'Base USDC deposit detected',
              JSON.stringify({ txHash, logIndex, blockNumber: blockNumber.toString() })
            ]
          );

          // Only update balance if this is a new transaction
          const insertedCount = insertResult.rowCount ?? 0;
          if (insertedCount > 0) {
            await client.query(
              `UPDATE wallets
               SET available_balance = available_balance + $1,
                   updated_at = now()
               WHERE user_id = $2`,
              [amount, userId]
            );

            // Log event for audit trail
            await client.query(
              `INSERT INTO event_log (source, kind, ref, payload)
               VALUES ('base-watcher', 'deposit', $1, $2)`,
              [
                externalRef,
                JSON.stringify({ userId, to, amount, txHash, logIndex, blockNumber: blockNumber.toString() })
              ]
            );

            log('info', 'Deposit credited', {
              userId,
              amount,
              txHash,
              logIndex,
              blockNumber: blockNumber.toString()
            });

            // Emit realtime update
            try {
              emitWalletUpdate({ userId, reason: 'deposit_detected', amountDelta: amount });
            } catch (emitErr) {
              log('warn', 'Failed to emit wallet update', { error: emitErr instanceof Error ? emitErr.message : 'Unknown' });
            }

            processed++;
            success = true;
          } else {
            // Transaction already processed (idempotent)
            skipped++;
            success = true;
          }

          await client.query('COMMIT');
          break; // Success, exit retry loop

        } catch (err) {
          await client.query('ROLLBACK');
          lastError = err instanceof Error ? err : new Error('Unknown error');

          if (attempt < MAX_RETRIES - 1) {
            const delay = getRetryDelay(attempt);
            log('warn', `Retrying deposit processing`, {
              attempt: attempt + 1,
              maxRetries: MAX_RETRIES,
              delayMs: delay,
              txHash,
              logIndex,
              error: lastError.message
            });
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Max retries exceeded - record to dead-letter queue
            await recordDeadLetter(ctx, l, lastError, attempt + 1);
            errors++;
            log('error', 'Max retries exceeded for deposit', {
              txHash,
              logIndex,
              error: lastError.message
            });
          }
        }
      }
    }

    return { processed, skipped, errors, lastBlock };

  } catch (err) {
    log('error', 'Fatal error processing transfer logs', {
      error: err instanceof Error ? err.message : 'Unknown'
    });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Main watcher function with checkpoint persistence
 */
export async function startBaseDepositWatcher(ctx: Ctx) {
  if (!envOn()) {
    log('warn', 'Base deposits disabled by flags');
    return;
  }

  if (!process.env.RPC_URL || !process.env.CHAIN_ID || !process.env.USDC_ADDRESS) {
    log('warn', 'Base deposits misconfigured', {
      missing: [
        !process.env.RPC_URL && 'RPC_URL',
        !process.env.CHAIN_ID && 'CHAIN_ID',
        !process.env.USDC_ADDRESS && 'USDC_ADDRESS'
      ].filter(Boolean)
    });
    return;
  }

  const client = makePublicClient();
  const usdc = ctx.usdc;

  log('info', 'Starting Base USDC deposit watcher', {
    mode: 'HTTP polling',
    usdc,
    pollIntervalMs: POLL_INTERVAL_MS,
    backfillWindow: BACKFILL_WINDOW_BLOCKS.toString()
  });

  // Load checkpoint or start from safe backfill window
  let fromBlock: bigint | null = await loadCheckpoint(ctx);

  const poll = async () => {
    try {
      const latest = await client.getBlockNumber();
      
      // Determine start block with safety window
      let start: bigint;
      if (fromBlock) {
        // Resume from checkpoint
        start = fromBlock;
      } else {
        // First run: use backfill window for safety
        start = latest > BACKFILL_WINDOW_BLOCKS ? latest - BACKFILL_WINDOW_BLOCKS : 0n;
        log('info', 'Starting initial backfill', {
          start: start.toString(),
          latest: latest.toString(),
          window: BACKFILL_WINDOW_BLOCKS.toString()
        });
      }

      // Don't process if we're already at latest
      if (start > latest) {
        log('info', 'Already at latest block', {
          start: start.toString(),
          latest: latest.toString()
        });
        setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      log('info', 'Polling blocks', {
        from: start.toString(),
        to: latest.toString(),
        range: (latest - start).toString()
      });

      const logs = await client.getLogs({
        address: usdc,
        event: { type: 'event', name: 'Transfer', inputs: ERC20_ABI[0].inputs as any },
        fromBlock: start,
        toBlock: latest
      });

      if (logs.length > 0) {
        log('info', 'Found transfer events', { count: logs.length });
      }

      const result = await processTransferLogs(ctx, logs as any);
      
      log('info', 'Processing complete', {
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
        lastBlock: result.lastBlock.toString()
      });

      // Save checkpoint at latest block (or last processed block if errors occurred)
      const checkpointBlock = result.errors > 0 && result.lastBlock > 0n 
        ? result.lastBlock 
        : latest;
      
      await saveCheckpoint(ctx, checkpointBlock);
      fromBlock = checkpointBlock + 1n;

    } catch (e) {
      log('error', 'Polling error', {
        error: e instanceof Error ? e.message : 'Unknown',
        stack: e instanceof Error ? e.stack : undefined
      });
    } finally {
      setTimeout(poll, POLL_INTERVAL_MS);
    }
  };

  // Start polling
  poll();
  log('info', 'Base USDC deposit watcher started');
}

