import { supabase } from '../config/database';

/**
 * Reconciliation job for escrow balances
 * Every 60s: recompute expected availableToStakeUSDC from v_wallet_summary
 * and compare with cached values. Log diffs; do not mutate, just warn.
 * 
 * Tag: [FCZ-PAY] reconcile:
 */
export async function reconcileEscrow() {
  try {
    console.log('[FCZ-PAY] reconcile: Starting escrow reconciliation...');

    // Get all users with escrow locks
    const { data: usersWithLocks, error: usersError } = await supabase
      .from('escrow_locks')
      .select('user_id')
      .limit(100);

    if (usersError) {
      console.error('[FCZ-PAY] reconcile: Error fetching users:', usersError);
      return;
    }

    if (!usersWithLocks || usersWithLocks.length === 0) {
      console.log('[FCZ-PAY] reconcile: No users with escrow locks');
      return;
    }

    const uniqueUserIds = [...new Set(usersWithLocks.map(u => u.user_id))];

    // Query wallet summary view for each user
    for (const userId of uniqueUserIds) {
      try {
        // Calculate expected values from source tables
        const { data: transactions, error: txError } = await supabase
          .from('wallet_transactions')
          .select('type, direction, amount')
          .eq('user_id', userId)
          .eq('channel', 'crypto')
          .in('provider', ['base/usdc', 'crypto-base-usdc']);

        if (txError) {
          console.error(`[FCZ-PAY] reconcile: Error fetching transactions for ${userId}:`, txError);
          continue;
        }

        let walletUSDC = 0;
        if (transactions) {
          for (const tx of transactions) {
            if (tx.type === 'credit' || tx.direction === 'credit') {
              walletUSDC += Number(tx.amount || 0);
            } else if (tx.type === 'debit' || tx.direction === 'debit') {
              walletUSDC -= Number(tx.amount || 0);
            }
          }
        }
        walletUSDC = Math.max(0, walletUSDC);

        // Get escrow locks
        const { data: locks, error: locksError } = await supabase
          .from('escrow_locks')
          .select('status, state, amount')
          .eq('user_id', userId);

        if (locksError) {
          console.error(`[FCZ-PAY] reconcile: Error fetching locks for ${userId}:`, locksError);
          continue;
        }

        let escrowUSDC = 0;
        let reservedUSDC = 0;

        if (locks) {
          for (const lock of locks) {
            const amount = Number(lock.amount || 0);
            const lockStatus = lock.status || lock.state;
            if (lockStatus === 'locked' || lockStatus === 'consumed') {
              escrowUSDC += amount;
            }
            if (lockStatus === 'locked') {
              reservedUSDC += amount;
            }
          }
        }

        const availableToStakeUSDC = Math.max(0, escrowUSDC - reservedUSDC);

        // Get cached wallet balance if exists
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('available, reserved, available_balance, reserved_balance')
          .eq('user_id', userId)
          .eq('currency', 'USD')
          .maybeSingle();

        if (!walletError && wallet) {
          const cachedAvailable = Number(wallet.available || wallet.available_balance || 0);
          const cachedReserved = Number(wallet.reserved || wallet.reserved_balance || 0);
          const cachedTotal = cachedAvailable + cachedReserved;

          // Compare
          const diffAvailable = Math.abs(cachedAvailable - availableToStakeUSDC);
          const diffEscrow = Math.abs(cachedTotal - escrowUSDC);

          if (diffAvailable > 0.01 || diffEscrow > 0.01) {
            console.warn(`[FCZ-PAY] reconcile: Balance mismatch for user ${userId}:`, {
              computed: {
                walletUSDC,
                escrowUSDC,
                reservedUSDC,
                availableToStakeUSDC
              },
              cached: {
                available: cachedAvailable,
                reserved: cachedReserved,
                total: cachedTotal
              },
              diffs: {
                available: diffAvailable,
                escrow: diffEscrow
              }
            });
          } else {
            console.log(`[FCZ-PAY] reconcile: Balance OK for user ${userId}`);
          }
        } else {
          // No cached wallet, just log computed values
          console.log(`[FCZ-PAY] reconcile: No cached wallet for ${userId}, computed:`, {
            walletUSDC,
            escrowUSDC,
            reservedUSDC,
            availableToStakeUSDC
          });
        }
      } catch (error) {
        console.error(`[FCZ-PAY] reconcile: Error processing user ${userId}:`, error);
      }
    }

    console.log('[FCZ-PAY] reconcile: Reconciliation complete');
  } catch (error) {
    console.error('[FCZ-PAY] reconcile: Unhandled error:', error);
  }
}

// Run reconciliation every 60 seconds if PAYMENTS_ENABLE=1
let reconciliationInterval: NodeJS.Timeout | null = null;

export function startReconciliationJob() {
  const paymentsEnabled = process.env.PAYMENTS_ENABLE === '1';
  
  if (!paymentsEnabled) {
    console.log('[FCZ-PAY] reconcile: Payments disabled, skipping reconciliation job');
    return;
  }

  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
  }

  console.log('[FCZ-PAY] reconcile: Starting reconciliation job (every 60s)');
  
  // Run immediately, then every 60s
  reconcileEscrow();
  reconciliationInterval = setInterval(reconcileEscrow, 60_000);
}

export function stopReconciliationJob() {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
    console.log('[FCZ-PAY] reconcile: Stopped reconciliation job');
  }
}

