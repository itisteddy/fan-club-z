/**
 * Query Invalidation Utilities
 * 
 * Centralized query invalidation for preventing stale UI
 * Ensures all related queries are invalidated after mutations
 */

import { QueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';

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

  // Invalidate wallet balance queries (using partial matching)
  queryClient.invalidateQueries({ queryKey: ['wallet'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['escrow-balance'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['unified-balance'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['escrow-snapshot'], exact: false });

  // Invalidate activity queries
  if (includeActivity && userId) {
    queryClient.invalidateQueries({ queryKey: QK.walletActivity(userId) });
    queryClient.invalidateQueries({ queryKey: ['onchain-activity'], exact: false });
  }

  // Invalidate escrow-related queries
  if (includeEscrow && userId) {
    queryClient.invalidateQueries({ queryKey: QK.escrowBalance(userId) });
  }

  // Invalidate prediction-related queries if predictionId provided
  if (predictionId) {
    queryClient.invalidateQueries({ queryKey: QK.prediction(predictionId) });
    queryClient.invalidateQueries({ queryKey: QK.predictionEntries(predictionId) });
    queryClient.invalidateQueries({ queryKey: ['prediction-activity', predictionId] });
  }

  // Invalidate user entries (using partial matching)
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ['user-entries'], exact: false });
    queryClient.invalidateQueries({ queryKey: ['user-predictions'], exact: false });
  }

  // Invalidate contract reads (for on-chain balances)
  queryClient.invalidateQueries({ queryKey: ['readContract'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['onchain-usdc'], exact: false });
  queryClient.invalidateQueries({ queryKey: ['usdcBalance'], exact: false });
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

  // Also invalidate USDC balance
  queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
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

  // Also invalidate USDC balance
  queryClient.invalidateQueries({ queryKey: ['usdcBalance'] });
}

/**
 * Invalidate queries after bet placement
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
}

/**
 * Invalidate queries after claim
 */
export function invalidateAfterClaim(
  queryClient: QueryClient,
  options?: { userId?: string; predictionId?: string }
) {
  invalidateWalletQueries(queryClient, {
    userId: options?.userId,
    predictionId: options?.predictionId,
    includeEscrow: true,
    includeActivity: true,
  });

  // Invalidate claimables
  queryClient.invalidateQueries({ queryKey: ['claimable-claims'], exact: false });
}

/**
 * Refetch queries on window focus (for stale UI prevention)
 */
export function setupRefetchOnFocus(queryClient: QueryClient) {
  if (typeof window === 'undefined') return;

  const handleFocus = () => {
    if (document.hasFocus()) {
      // Refetch all active queries
      queryClient.refetchQueries({ type: 'active' });
    }
  };

  window.addEventListener('focus', handleFocus);
  
  return () => {
    window.removeEventListener('focus', handleFocus);
  };
}

