import { getAddress } from 'viem';
import { z } from 'zod';

import { supabase } from '../config/database';
import { fetchEscrowSnapshotFor } from './escrowContract';
import { makePublicClient } from '../chain/base/client';
import { resolveAndValidateAddresses } from '../chain/base/addressRegistry';
import { getEscrowAddress } from './escrowContract';

const CHAIN_ID = Number(process.env.CHAIN_ID || '0');

const addressSchema = z
  .string()
  .min(1)
  .transform((addr) => getAddress(addr));

export type WalletSummarySnapshot = {
  userId: string;
  walletAddress: string | null;
  escrowUSDC: number;
  reservedUSDC: number;
  availableToStakeUSDC: number;
  totalDepositedUSDC: number;
  totalWithdrawnUSDC: number;
  updatedAt: string;
  source: 'onchain' | 'cached';
};

type ReconcileOptions = {
  userId: string;
  walletAddress?: string | null;
  recordTransactions?: boolean;
  txHash?: string | null;
};

async function findUserAddress(userId: string): Promise<string | null> {
  const filters = [`user_id.eq.${userId}`];
  if (CHAIN_ID) {
    filters.push(`chain_id.eq.${CHAIN_ID}`);
  }

  const { data, error } = await supabase
    .from('crypto_addresses')
    .select('address')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[FCZ-PAY] Failed to load crypto address:', error);
    return null;
  }

  return data?.address ?? null;
}

const DEFAULT_LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

const TRANSFER_TOPIC0 = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
let cachedUsdcAddress: string | null = null;

async function getUsdcAddress(): Promise<string> {
  if (cachedUsdcAddress) return cachedUsdcAddress;
  const resolved = await resolveAndValidateAddresses();
  if (!resolved.usdc) {
    throw new Error('[FCZ-PAY] USDC address missing');
  }
  cachedUsdcAddress = getAddress(resolved.usdc).toLowerCase();
  return cachedUsdcAddress;
}

function topicToAddress(topic?: string | null): string | null {
  if (!topic) return null;
  // topic is 32-byte hex; address is last 20 bytes
  const hex = topic.toLowerCase();
  if (!hex.startsWith('0x') || hex.length !== 66) return null;
  return `0x${hex.slice(26)}`;
}

function hexToBigInt(hex?: string | null): bigint {
  if (!hex) return 0n;
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

/**
 * If we have a txHash, infer deposit/withdraw amounts by inspecting USDC Transfer logs.
 * This is robust even if periodic reconciliation already updated total_deposited/withdrawn.
 */
async function inferTransferAmountsFromTx(args: {
  txHash: string;
  walletAddress: string;
}): Promise<{ depositUSD: number; withdrawUSD: number }> {
  const txHash = String(args.txHash);
  const wallet = getAddress(args.walletAddress).toLowerCase();
  const usdc = await getUsdcAddress();
  const client = makePublicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  const logs = (receipt as any)?.logs as Array<{ address?: string; topics?: string[]; data?: string }> | undefined;
  if (!Array.isArray(logs) || logs.length === 0) return { depositUSD: 0, withdrawUSD: 0 };

  const escrow = (await getEscrowAddress()).toLowerCase();

  let depositUnits = 0n;
  let withdrawUnits = 0n;

  for (const l of logs) {
    const addr = String(l.address || '').toLowerCase();
    if (addr !== usdc) continue;
    const topics = l.topics || [];
    if (!topics[0] || String(topics[0]).toLowerCase() !== TRANSFER_TOPIC0) continue;
    const from = topicToAddress(topics[1])?.toLowerCase() ?? null;
    const to = topicToAddress(topics[2])?.toLowerCase() ?? null;
    const value = hexToBigInt(l.data || '0x0');

    if (escrow && from === wallet && to === escrow) {
      depositUnits += value;
    } else if (escrow && from === escrow && to === wallet) {
      withdrawUnits += value;
    }
  }

  const toUSD = (u: bigint) => Number(u) / 1_000_000;
  return { depositUSD: toUSD(depositUnits), withdrawUSD: toUSD(withdrawUnits) };
}

async function fetchReservedFromLocks(userId: string): Promise<number> {
  const { data: locks, error } = await supabase
    .from('escrow_locks')
    .select('status, state, amount, expires_at, created_at')
    .eq('user_id', userId);

  if (error) {
    console.error('[FCZ-PAY] Failed to read escrow locks:', error);
    return 0;
  }

  const now = new Date();
  let reserved = 0;

  if (locks) {
    for (const lock of locks) {
      const amount = Number(lock.amount || 0);
      const lockStatus = lock.status ?? lock.state;
      const expiresAt = lock.expires_at ? new Date(lock.expires_at) : null;
      // If expires_at is missing, use created_at + DEFAULT_LOCK_TTL_MS
      const fallbackExpiry = lock.created_at ? new Date(new Date(lock.created_at).getTime() + DEFAULT_LOCK_TTL_MS) : null;
      const effectiveExpiry = expiresAt || fallbackExpiry;
      const isExpired = effectiveExpiry ? effectiveExpiry < now : true;

      // Only count 'locked' status (pending bets) - exclude consumed, released, expired
      // 'consumed' means bet was placed but prediction may not be settled yet
      // 'released' means settlement completed, funds should be unlocked
      if (!isExpired && lockStatus === 'locked') {
        reserved += amount;
      }
    }
  }

  return reserved;
}

/**
 * Calculate total escrow from locks (locked + consumed, excluding released/expired)
 * This represents funds that are still tied up in predictions
 * 
 * CRITICAL FIX: Exclude consumed locks for settled predictions, even if lock wasn't released
 */
async function fetchEscrowFromLocks(userId: string): Promise<number> {
  const { data: locks, error } = await supabase
    .from('escrow_locks')
    .select('id, status, state, amount, expires_at, created_at, prediction_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[FCZ-PAY] Failed to read escrow locks:', error);
    return 0;
  }

  if (!locks || locks.length === 0) {
    console.log(`[FCZ-LOCKS] No locks found for user ${userId}`);
    return 0;
  }

  // DEBUG: Log all locks
  console.log(`[FCZ-LOCKS] Found ${locks.length} locks for user ${userId}:`, 
    locks.map(l => ({ 
      id: l.id?.slice(0, 8), 
      status: l.status, 
      state: l.state,
      amount: l.amount, 
      prediction_id: l.prediction_id?.slice(0, 8) || 'NONE',
      expires_at: l.expires_at
    }))
  );

  // Fetch prediction statuses for all locks to check if they're settled
  const predictionIds = [...new Set(locks.map(l => l.prediction_id).filter(Boolean))];
  let settledPredictionIds = new Set<string>();
  
  console.log(`[FCZ-LOCKS] Unique prediction IDs from locks: ${predictionIds.length}`);
  
  if (predictionIds.length > 0) {
    const { data: predictions, error: predErr } = await supabase
      .from('predictions')
      .select('id, status')
      .in('id', predictionIds);
    
    if (predErr) {
      console.error('[FCZ-LOCKS] Failed to fetch prediction statuses:', predErr);
    }
    
    if (predictions) {
      console.log(`[FCZ-LOCKS] Prediction statuses:`, 
        predictions.map(p => ({ id: p.id.slice(0, 8), status: p.status }))
      );
      // CRITICAL FIX: Exclude locks for both 'settled' AND 'closed' predictions
      // 'closed' predictions should have been settled - locks are stale
      // Only 'open' (active) predictions should keep their locks
      settledPredictionIds = new Set(
        predictions.filter(p => p.status === 'settled' || p.status === 'closed').map(p => p.id)
      );
      console.log(`[FCZ-LOCKS] Settled/closed prediction count: ${settledPredictionIds.size}`);
    }
  }

  const now = new Date();
  let escrowTotal = 0;
  let skippedSettled = 0;
  let skippedExpired = 0;
  let skippedReleased = 0;
  let countedLocks = 0;

  for (const lock of locks) {
    const amount = Number(lock.amount || 0);
    const lockStatus = lock.status ?? lock.state;
    const expiresAt = lock.expires_at ? new Date(lock.expires_at) : null;
    const fallbackExpiry = lock.created_at ? new Date(new Date(lock.created_at).getTime() + DEFAULT_LOCK_TTL_MS) : null;
    const effectiveExpiry = expiresAt || fallbackExpiry;
    const isConsumed = lockStatus === 'consumed';
    const isExpired = isConsumed ? false : effectiveExpiry ? effectiveExpiry < now : true;
    
    // Skip released/voided locks
    if (lockStatus === 'released' || lockStatus === 'voided') {
      skippedReleased++;
      continue;
    }
    
    // CRITICAL: Exclude ALL locks (both locked AND consumed) for settled predictions
    if (lock.prediction_id && settledPredictionIds.has(lock.prediction_id)) {
      skippedSettled++;
      continue;
    }

    // Skip expired locks (only for non-consumed)
    if (isExpired) {
      skippedExpired++;
      continue;
    }

    // Count locked (pending) and consumed (placed bets, not yet settled)
    if (lockStatus === 'locked' || lockStatus === 'consumed') {
      console.log(`[FCZ-LOCKS] COUNTING lock: $${amount}, status=${lockStatus}, prediction=${lock.prediction_id || 'NONE'}`);
      escrowTotal += amount;
      countedLocks++;
    }
  }

  console.log(`[FCZ-LOCKS] Summary: counted=${countedLocks} ($${escrowTotal}), skippedSettled=${skippedSettled}, skippedExpired=${skippedExpired}, skippedReleased=${skippedReleased}`);

  return escrowTotal;
}

async function getExistingWalletRow(userId: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('id, available_balance, reserved_balance, total_deposited, total_withdrawn')
    .eq('user_id', userId)
    .eq('currency', 'USD')
    .maybeSingle();

  if (error) {
    console.error('[FCZ-PAY] Failed to load wallet row:', error);
    return null;
  }

  return data;
}

async function upsertWalletSnapshot(args: {
  userId: string;
  available: number;
  reserved: number;
  totalDeposited: number;
  totalWithdrawn: number;
}) {
  // IMPORTANT: Do NOT overwrite available_balance and reserved_balance
  // These are updated by settlement logic and should not be reset by reconciliation
  // Only update deposit/withdrawal totals which come from on-chain data
  const { data: existing } = await supabase
    .from('wallets')
    .select('id, available_balance, reserved_balance')
    .eq('user_id', args.userId)
    .eq('currency', 'USD')
    .maybeSingle();

  if (existing) {
    // Update only totals, preserve balance
    const { error } = await supabase
      .from('wallets')
      .update({
        total_deposited: args.totalDeposited,
        total_withdrawn: args.totalWithdrawn,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', args.userId)
      .eq('currency', 'USD');

    if (error) {
      console.error('[FCZ-PAY] Failed to update wallet snapshot:', error);
    } else {
      console.log('[FCZ-PAY] Wallet totals updated (balance preserved)');
    }
  } else {
    // Create new wallet with initial balances from on-chain
    const payload = {
      user_id: args.userId,
      currency: 'USD',
      available_balance: args.available,
      reserved_balance: args.reserved,
      total_deposited: args.totalDeposited,
      total_withdrawn: args.totalWithdrawn,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('wallets')
      .insert(payload);

    if (error) {
      console.error('[FCZ-PAY] Failed to insert wallet snapshot:', error);
    } else {
      console.log('[FCZ-PAY] Wallet snapshot created:', payload);
    }
  }
}

async function recordDeltaTransactions(args: {
  userId: string;
  depositDelta: number;
  withdrawDelta: number;
  txHash?: string | null;
  walletAddress?: string | null;
}) {
  if (!args.txHash) {
    return;
  }

  // If deltas are zero but we have a txHash, infer from receipt so we can still record activity.
  let depositDelta = args.depositDelta;
  let withdrawDelta = args.withdrawDelta;
  if (depositDelta <= 0 && withdrawDelta <= 0 && args.walletAddress) {
    try {
      const inferred = await inferTransferAmountsFromTx({ txHash: args.txHash, walletAddress: args.walletAddress });
      depositDelta = inferred.depositUSD;
      withdrawDelta = inferred.withdrawUSD;
    } catch (e) {
      console.warn('[FCZ-PAY] Unable to infer transfer amounts from txHash (non-fatal):', e);
    }
  }

  const entries: Array<{ direction: 'credit' | 'debit'; channel: string; amount: number }> = [];

  if (depositDelta > 0) {
    entries.push({ direction: 'credit', channel: 'escrow_deposit', amount: depositDelta });
  }

  if (withdrawDelta > 0) {
    entries.push({ direction: 'debit', channel: 'escrow_withdraw', amount: withdrawDelta });
  }

  for (const entry of entries) {
    const { error } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: args.userId,
        // wallet_transactions.type is constrained (deposit/withdraw/...), not credit/debit
        type: entry.channel === 'escrow_deposit' ? 'deposit' : 'withdraw',
        direction: entry.direction,
        channel: entry.channel,
        provider: 'crypto-base-usdc',
        amount: entry.amount,
        currency: 'USD',
        status: 'success',
        external_ref: args.txHash,
        description: entry.channel === 'escrow_deposit' ? 'Base USDC deposit detected' : 'Base USDC withdrawal detected',
      });

    if (error && error.code !== '23505') {
      console.error('[FCZ-PAY] Failed to record wallet transaction:', error);
    }
  }
}

export async function reconcileWallet(options: ReconcileOptions): Promise<WalletSummarySnapshot> {
  const { userId } = options;
  if (!userId) {
    throw new Error('userId is required for wallet reconciliation');
  }

  let walletAddress: string | null = options.walletAddress ?? null;
  if (!walletAddress) {
    walletAddress = await findUserAddress(userId);
  }

  if (!walletAddress) {
    return {
      userId,
      walletAddress: null,
      escrowUSDC: 0,
      reservedUSDC: 0,
      availableToStakeUSDC: 0,
      totalDepositedUSDC: 0,
      totalWithdrawnUSDC: 0,
      updatedAt: new Date().toISOString(),
      source: 'cached',
    };
  }

  const normalizedAddress = addressSchema.parse(walletAddress);
  let snapshot = await fetchEscrowSnapshotFor(normalizedAddress);
  
  // CRITICAL FIX: If we have a txHash and on-chain balance is 0, verify from tx receipt
  // This handles RPC timing issues where the balance hasn't propagated yet
  if (options.txHash && snapshot.availableUSDC === 0 && snapshot.totalDepositedUSDC === 0) {
    try {
      const inferred = await inferTransferAmountsFromTx({
        txHash: options.txHash,
        walletAddress: normalizedAddress,
      });
      
      if (inferred.depositUSD > 0) {
        console.log(`[FCZ-PAY] On-chain balance is 0 but tx ${options.txHash} shows deposit of ${inferred.depositUSD}. Retrying...`);
        // Wait a moment and retry the on-chain read
        await new Promise(resolve => setTimeout(resolve, 2000));
        snapshot = await fetchEscrowSnapshotFor(normalizedAddress);
        
        // If still 0, use the tx receipt as source of truth for this response
        if (snapshot.availableUSDC === 0 && snapshot.totalDepositedUSDC === 0) {
          console.log(`[FCZ-PAY] Retry still shows 0. Using tx receipt values for deposit: ${inferred.depositUSD}`);
          snapshot = {
            ...snapshot,
            availableUSDC: inferred.depositUSD,
            totalDepositedUSDC: inferred.depositUSD,
          };
        }
      }
    } catch (e) {
      console.warn('[FCZ-PAY] Failed to verify deposit from tx receipt:', e);
    }
  }
  
  const reservedFromLocks = await fetchReservedFromLocks(userId);
  const escrowFromLocks = await fetchEscrowFromLocks(userId);

  // Architecture:
  // - On-chain escrow: total funds deposited minus withdrawn (source of truth)
  // - Database locks: track which bets are pending (locked) vs placed (consumed) vs settled (released)
  // - Reserved = only 'locked' status (pending bets, not yet placed)
  // - Consumed = bets placed, but prediction not yet settled (still tied up in active bets)
  // - Released = bets settled, funds unlocked (should not count toward escrow)
  // - Expired = locks that timed out (should not count)
  
  // Escrow total = on-chain total (all funds in escrow contract)
  // This includes both available and any on-chain reserved balance
  const escrowTotal = snapshot.availableUSDC + snapshot.reservedUSDC;

  // Available to stake:
  // Contracts typically do not reduce "balances" for active bets (consumed locks),
  // so we subtract both locked and consumed amounts tracked in DB.
  //
  // IMPORTANT: lock tracking can drift (stale rows, missed releases). Never allow DB locks
  // to subtract more than the on-chain escrow total.
  const escrowLocksCapped = Math.min(Math.max(escrowFromLocks, 0), escrowTotal);
  const reservedCapped = Math.min(Math.max(reservedFromLocks, 0), escrowTotal);
  const effectiveAvailable = Math.max(escrowTotal - escrowLocksCapped, 0);
  
  // CRITICAL DEBUG LOGGING: Log balance calculation details
  console.log(`[FCZ-RECONCILE] Balance calculation for user ${userId}:`, {
    onchainAvailable: snapshot.availableUSDC,
    escrowFromLocks,
    escrowLocksCapped,
    effectiveAvailable,
    reservedFromLocks,
    reservedCapped,
    escrowTotal,
    walletAddress: normalizedAddress
  });

  const existing = await getExistingWalletRow(userId);

  if (existing) {
    const depositDelta = snapshot.totalDepositedUSDC - Number(existing.total_deposited || 0);
    const withdrawDelta = snapshot.totalWithdrawnUSDC - Number(existing.total_withdrawn || 0);

    if (options.recordTransactions) {
      await recordDeltaTransactions({
        userId,
        depositDelta: depositDelta > 0 ? depositDelta : 0,
        withdrawDelta: withdrawDelta > 0 ? withdrawDelta : 0,
        txHash: options.txHash,
        walletAddress: normalizedAddress,
      });
    }
  } else if (options.recordTransactions && snapshot.totalDepositedUSDC > 0) {
    await recordDeltaTransactions({
      userId,
      depositDelta: snapshot.totalDepositedUSDC,
      withdrawDelta: 0,
      txHash: options.txHash,
      walletAddress: normalizedAddress,
    });
  }

  await upsertWalletSnapshot({
    userId,
    available: effectiveAvailable,
    reserved: reservedCapped,
    totalDeposited: snapshot.totalDepositedUSDC,
    totalWithdrawn: snapshot.totalWithdrawnUSDC,
  });

  return {
    userId,
    walletAddress: normalizedAddress,
    escrowUSDC: Number(escrowTotal.toFixed(2)),
    reservedUSDC: Number(reservedFromLocks.toFixed(2)),
    availableToStakeUSDC: Number(effectiveAvailable.toFixed(2)),
    totalDepositedUSDC: Number(snapshot.totalDepositedUSDC.toFixed(2)),
    totalWithdrawnUSDC: Number(snapshot.totalWithdrawnUSDC.toFixed(2)),
    updatedAt: new Date().toISOString(),
    source: 'onchain',
  };
}

