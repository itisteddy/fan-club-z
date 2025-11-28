/**
 * Query Invalidation Utilities
 * 
 * Centralized query invalidation for preventing stale UI
 * Ensures all related queries are invalidated after mutations
 */

import { QueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import { broadcastBalanceRefresh } from '@/services/onchainTransactionService';

// All wallet-related query keys
const WALLET_QUERY_KEYS = [
  ['wallet'],
  ['escrow-balance'],
  ['unified-balance'],
  ['escrow-snapshot'],
  ['readContract'],
  ['onchain-usdc'],
  ['usdcBalance'],
  ['balance'],
  ['allowance'],
  ['escrow'],
];

// All activity-related query keys
const ACTIVITY_QUERY_KEYS = [
  ['onchain-activity'],
  ['wallet-activity'],
  ['blockchain-transactions'],
];

// All prediction-related query keys (prefix)
const PREDICTION_QUERY_KEYS = [
  ['prediction'],
  ['prediction-activity'],
  ['prediction-entries'],
];

// User-related query keys
const USER_QUERY_KEYS = [
  ['user-entries'],
  ['user-predictions'],
];

// Claim-related query keys
const CLAIM_QUERY_KEYS = [
  ['claimable-claims'],
  ['merkle-proof'],
];

/**
 * Invalidate all wallet-related queries after deposit/withdraw/bet
 */
export function invalidateWalletQueries(
  queryClient: QueryClient,
  options?: {
    userId?: string;
    predictionId?: string;
    includeEscrow?: boolean;
    includeActivity?: boolean;
  }
) {
  const { userId, predictionId, includeEscrow = true, includeActivity = true } = options || {};

  // Invalidate all wallet balance queries
  WALLET_QUERY_KEYS.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key, exact: false });
  });

  // Invalidate activity queries
  if (includeActivity && userId) {
    queryClient.invalidateQueries({ queryKey: QK.walletActivity(userId) });
    ACTIVITY_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key, exact: false });
    });
  }

  // Invalidate escrow-related queries
  if (includeEscrow && userId) {
    queryClient.invalidateQueries({ queryKey: QK.escrowBalance(userId) });
  }

  // Invalidate prediction-related queries if predictionId provided
  if (predictionId) {
    queryClient.invalidateQueries({ queryKey: QK.prediction(predictionId) });
    queryClient.invalidateQueries({ queryKey: QK.predictionEntries(predictionId) });
    PREDICTION_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [...key, predictionId], exact: false });
    });
  }

  // Invalidate user entries
  if (userId) {
    USER_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key, exact: false });
    });
  }
}

/**
 * Invalidate queries after deposit
 */
export function invalidateAfterDeposit(
  queryClient: QueryClient,
  options?: { userId?: string; txHash?: string }
) {
  invalidateWalletQueries(queryClient, {
    userId: options?.userId,
    includeEscrow: true,
    includeActivity: true,
  });

  // Force refetch all wallet balances
  queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
  queryClient.invalidateQueries({ queryKey: ['escrow-balance'] });
  queryClient.invalidateQueries({ queryKey: ['unified-balance'] });
  queryClient.invalidateQueries({ queryKey: ['readContract'] });
}

/**
 * Invalidate queries after withdrawal
 */
export function invalidateAfterWithdraw(
  queryClient: QueryClient,
  options?: { userId?: string; txHash?: string }
) {
  invalidateWalletQueries(queryClient, {
    userId: options?.userId,
    includeEscrow: true,
    includeActivity: true,
  });

  // Force refetch all wallet balances
  queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
  queryClient.invalidateQueries({ queryKey: ['escrow-balance'] });
  queryClient.invalidateQueries({ queryKey: ['unified-balance'] });
  queryClient.invalidateQueries({ queryKey: ['readContract'] });
}

/**
 * Invalidate queries after stake placement
 * CRITICAL: Must broadcast balance refresh to update UI immediately
 */
export function invalidateAfterBet(
  queryClient: QueryClient,
  options: { userId: string; predictionId: string }
) {
  invalidateWalletQueries(queryClient, {
    userId: options.userId,
    predictionId: options.predictionId,
    includeEscrow: true,
    includeActivity: true,
  });

  // Also invalidate prediction stats
  queryClient.invalidateQueries({ queryKey: ['prediction-stats', options.predictionId] });
  
  // CRITICAL: Broadcast balance refresh to force immediate UI update
  // The backend has updated escrow_locks, so we need to refetch wallet summary
  broadcastBalanceRefresh();
}

/**
 * Invalidate queries after claim
 * PERFORMANCE FIX: More targeted invalidation, debounced refetch
 */
let claimInvalidationTimeout: ReturnType<typeof setTimeout> | null = null;
export function invalidateAfterClaim(
  queryClient: QueryClient,
  options?: { userId?: string; predictionId?: string }
) {
  // Invalidate wallet queries (non-blocking)
  invalidateWalletQueries(queryClient, {
    userId: options?.userId,
    predictionId: options?.predictionId,
    includeEscrow: true,
    includeActivity: true,
  });

  // Invalidate claim-related queries (non-blocking)
  CLAIM_QUERY_KEYS.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key, exact: false });
  });

  // Invalidate specific balance queries (non-blocking)
  queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
  queryClient.invalidateQueries({ queryKey: ['escrow-balance'] });
  queryClient.invalidateQueries({ queryKey: ['unified-balance'] });
  
  // PERFORMANCE FIX: Debounce balance refresh to prevent UI blocking
  // Clear any pending refresh
  if (claimInvalidationTimeout) {
    clearTimeout(claimInvalidationTimeout);
  }
  
  // Schedule balance refresh after short delay (non-blocking)
  claimInvalidationTimeout = setTimeout(() => {
    // Only refetch critical balance queries
    Promise.all([
      queryClient.refetchQueries({ queryKey: ['usdcBalance'] }).catch(() => {}),
      queryClient.refetchQueries({ queryKey: ['escrow-balance'] }).catch(() => {}),
      queryClient.refetchQueries({ queryKey: ['unified-balance'] }).catch(() => {}),
    ]).catch(() => {});
    claimInvalidationTimeout = null;
  }, 200); // 200ms debounce - fast enough for UX, slow enough to batch
}

/**
 * Invalidate queries after settlement
 */
export function invalidateAfterSettlement(
  queryClient: QueryClient,
  options?: { userId?: string; predictionId?: string }
) {
  invalidateWalletQueries(queryClient, {
    userId: options?.userId,
    predictionId: options?.predictionId,
    includeEscrow: true,
    includeActivity: true,
  });

  // Invalidate settlement-specific queries
  if (options?.predictionId) {
    queryClient.invalidateQueries({ queryKey: ['settlement', options.predictionId] });
    queryClient.invalidateQueries({ queryKey: ['prediction', options.predictionId] });
  }

  // Invalidate all claim-related queries (users may now be able to claim)
  CLAIM_QUERY_KEYS.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key, exact: false });
  });
}

/**
 * Force refresh all wallet data (call after balance refresh event)
 * PERFORMANCE FIX: Non-blocking, debounced refetch
 */
let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
export function forceRefreshAllWalletData(queryClient: QueryClient) {
  // Invalidate all wallet-related queries (non-blocking)
  WALLET_QUERY_KEYS.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key, exact: false });
  });

  // PERFORMANCE FIX: Debounce refetch to prevent UI blocking
  // Clear any pending refetch
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  // Schedule refetch after a short delay (non-blocking)
  refreshTimeout = setTimeout(() => {
    // Only refetch wallet-related queries, not ALL active queries
    WALLET_QUERY_KEYS.forEach(key => {
      queryClient.refetchQueries({ queryKey: key, exact: false }).catch(() => {});
    });
    refreshTimeout = null;
  }, 300); // 300ms debounce
}

/**
 * Refetch queries on window focus (for stale UI prevention)
 * PERFORMANCE FIX: Debounced, non-blocking refetch
 */
let focusRefetchTimeout: ReturnType<typeof setTimeout> | null = null;
export function setupRefetchOnFocus(queryClient: QueryClient) {
  if (typeof window === 'undefined') return;

  const handleFocus = () => {
    if (document.hasFocus()) {
      // PERFORMANCE FIX: Debounce refetch to prevent UI blocking
      if (focusRefetchTimeout) {
        clearTimeout(focusRefetchTimeout);
      }
      
      focusRefetchTimeout = setTimeout(() => {
        // Only refetch stale queries, not all active queries
        queryClient.refetchQueries({ 
          type: 'active',
          stale: true // Only refetch stale queries
        }).catch(() => {});
        focusRefetchTimeout = null;
      }, 500); // 500ms debounce
    }
  };

  window.addEventListener('focus', handleFocus);
  
  return () => {
    window.removeEventListener('focus', handleFocus);
    if (focusRefetchTimeout) {
      clearTimeout(focusRefetchTimeout);
    }
  };
}

/**
 * Setup listener for balance refresh events
 * PERFORMANCE FIX: Debounced to prevent spam
 */
let balanceRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
export function setupBalanceRefreshListener(queryClient: QueryClient) {
  if (typeof window === 'undefined') return;

  const handleBalanceRefresh = () => {
    // PERFORMANCE FIX: Debounce balance refresh to prevent UI blocking
    if (balanceRefreshTimeout) {
      clearTimeout(balanceRefreshTimeout);
    }
    
    balanceRefreshTimeout = setTimeout(() => {
      forceRefreshAllWalletData(queryClient);
      balanceRefreshTimeout = null;
    }, 100); // 100ms debounce - batch multiple events
  };

  window.addEventListener('fcz:balance:refresh', handleBalanceRefresh);
  
  return () => {
    window.removeEventListener('fcz:balance:refresh', handleBalanceRefresh);
    if (balanceRefreshTimeout) {
      clearTimeout(balanceRefreshTimeout);
    }
  };
}
