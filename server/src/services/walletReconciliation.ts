import { getAddress } from 'viem';
import { z } from 'zod';

import { supabase } from '../config/database';
import { fetchEscrowSnapshotFor } from './escrowContract';

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
 */
async function fetchEscrowFromLocks(userId: string): Promise<number> {
  const { data: locks, error } = await supabase
    .from('escrow_locks')
    .select('status, state, amount, expires_at, created_at')
    .eq('user_id', userId);

  if (error) {
    console.error('[FCZ-PAY] Failed to read escrow locks:', error);
    return 0;
  }

  const now = new Date();
  let escrowTotal = 0;

  if (locks) {
    for (const lock of locks) {
      const amount = Number(lock.amount || 0);
      const lockStatus = lock.status ?? lock.state;
      const expiresAt = lock.expires_at ? new Date(lock.expires_at) : null;
      const fallbackExpiry = lock.created_at ? new Date(new Date(lock.created_at).getTime() + DEFAULT_LOCK_TTL_MS) : null;
      const effectiveExpiry = expiresAt || fallbackExpiry;
      const isConsumed = lockStatus === 'consumed';
      const isExpired = isConsumed ? false : effectiveExpiry ? effectiveExpiry < now : true;

      // Count locked (pending) and consumed (placed bets, not yet settled)
      // Released = bet settled and funds unlocked, voided = cancelled, expired = timed out
      if (!isExpired && (lockStatus === 'locked' || lockStatus === 'consumed')) {
        escrowTotal += amount;
      }
    }
  }

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
}) {
  if (!args.txHash) {
    return;
  }

  const entries: Array<{ direction: 'credit' | 'debit'; channel: string; amount: number }> = [];

  if (args.depositDelta > 0) {
    entries.push({ direction: 'credit', channel: 'escrow_deposit', amount: args.depositDelta });
  }

  if (args.withdrawDelta > 0) {
    entries.push({ direction: 'debit', channel: 'escrow_withdraw', amount: args.withdrawDelta });
  }

  for (const entry of entries) {
    const { error } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: args.userId,
        type: entry.direction === 'credit' ? 'credit' : 'debit',
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
  const snapshot = await fetchEscrowSnapshotFor(normalizedAddress);
  const reservedFromLocks = await fetchReservedFromLocks(userId);
  const escrowFromLocks = await fetchEscrowFromLocks(userId);

  // Architecture:
  // - On-chain escrow: total funds deposited minus withdrawn (source of truth)
  // - Database locks: track which bets are pending (locked) vs placed (consumed) vs settled (released)
  // - Reserved = only 'locked' status (pending bets, not yet placed)
  // - Consumed = bets placed, but prediction not yet settled (still tied up in active bets)
  // - Released = bets settled, funds unlocked (should not count toward escrow)
  // - Expired = locks that timed out (should not count)
  
  // Available to stake:
  // Contracts typically do not reduce "balances" for active bets (consumed locks),
  // so we must subtract both locked and consumed amounts tracked in DB.
  // fetchEscrowFromLocks returns locked + consumed (excluding released/expired).
  const effectiveAvailable = Math.max(snapshot.availableUSDC - escrowFromLocks, 0);
  
  // Escrow total = on-chain total (all funds in escrow contract)
  // This includes both available and any on-chain reserved balance
  const escrowTotal = snapshot.availableUSDC + snapshot.reservedUSDC;

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
      });
    }
  } else if (options.recordTransactions && snapshot.totalDepositedUSDC > 0) {
    await recordDeltaTransactions({
      userId,
      depositDelta: snapshot.totalDepositedUSDC,
      withdrawDelta: 0,
      txHash: options.txHash,
    });
  }

  await upsertWalletSnapshot({
    userId,
    available: effectiveAvailable,
    reserved: reservedFromLocks,
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

