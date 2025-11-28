import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEscrowBalance } from './useEscrowBalance';
import { useUSDCBalance } from './useUSDCBalance';
import { useAccount } from 'wagmi';
import { useAuthStore } from '@/store/authStore';
import { useWalletSummary } from './useWalletSummary';

/**
 * Unified balance hook that combines wallet and escrow balances
 * This is the SINGLE SOURCE OF TRUTH for all balance displays
 */
export function useUnifiedBalance() {
  const { user } = useAuthStore();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { balance: walletUSDC, isLoading: walletLoading, error: walletError, refetch: refetchWallet } = useUSDCBalance();
  const {
    availableUSD,
    reservedUSD,
    totalUSD,
    isLoading: escrowLoading,
    error: escrowError,
    refetch: refetchEscrow
  } = useEscrowBalance();

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary
  } = useWalletSummary(user?.id, {
    walletAddress: address,
    refetchIntervalMs: 30_000, // Reduced from 10s to 30s to prevent excessive refetching
    enabled: Boolean(user?.id)
  });

  const onchainBalance = typeof availableUSD === 'number' ? availableUSD : 0;
  const onchainReserved = typeof reservedUSD === 'number' ? reservedUSD : 0;
  const onchainTotal =
    typeof totalUSD === 'number' && !Number.isNaN(totalUSD)
      ? totalUSD
      : onchainBalance + onchainReserved;

  const summaryAvailable = Number(summary?.availableToStakeUSDC ?? summary?.available ?? 0);
  const summaryReserved = Number(summary?.reservedUSDC ?? summary?.reserved ?? 0);
  const summaryEscrow = Number(summary?.escrowUSDC ?? 0);
  const summaryTotal =
    typeof summaryAvailable === 'number' && typeof summaryReserved === 'number'
      ? summaryAvailable + summaryReserved
      : 0;
  const hasLoadedSummary = !!summary && !summaryLoading && !summaryError;

  // CRITICAL ARCHITECTURE DECISION:
  // - Available balance for staking MUST come from walletSummary (reconcileWallet),
  //   because it subtracts consumed locks for active bets.
  // - On-chain escrow contract does NOT know about off-chain locks, so its balance
  //   will not decrease when you stake on a prediction.
  //
  // Therefore:
  // - When summary is available → trust summary.availableToStakeUSDC completely.
  // - When summary is NOT available (e.g. initial load, error) → fall back to on-chain.
  //
  // This guarantees:
  // - After stake: available decreases correctly (because locks are counted in summary).
  // - After settlement/unlock: available increases correctly when locks are released.

  const computedAvailable = hasLoadedSummary
    ? Math.max(0, summaryAvailable)
    : Math.max(0, onchainBalance);

  // Reserved balance: prefer summary (locks), fall back to on-chain reserved snapshot
  const computedReserved = hasLoadedSummary
    ? Math.max(0, summaryReserved)
    : Math.max(0, onchainReserved);

  // Total escrow: prefer summaryEscrow (which reflects reconciled view), fall back to on-chain
  const computedTotal = hasLoadedSummary
    ? Math.max(0, summaryEscrow || summaryTotal || onchainTotal)
    : Math.max(0, onchainTotal);

  const normalizedAvailable = Math.max(computedAvailable, 0);
  const normalizedReserved = Math.max(computedReserved, 0);
  const normalizedTotal = Math.max(computedTotal, 0);

  const lastValuesRef = useRef({ available: normalizedAvailable, reserved: normalizedReserved, total: normalizedTotal });

  useEffect(() => {
    lastValuesRef.current = {
      available: normalizedAvailable,
      reserved: normalizedReserved,
      total: normalizedTotal
    };
  }, [normalizedAvailable, normalizedReserved, normalizedTotal]);

  const isLoading = walletLoading || escrowLoading || summaryLoading;

  const available = isLoading ? lastValuesRef.current.available : normalizedAvailable;
  const reserved = isLoading ? lastValuesRef.current.reserved : normalizedReserved;
  const total = isLoading ? lastValuesRef.current.total : normalizedTotal;

  const refetchAll = () => {
    refetchWallet();
    refetchEscrow();
    if (user?.id) {
      void refetchSummary();
    }
  };

  // Listen for balance refresh events - CRITICAL: Force immediate refetch
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[FCZ-PAY] Balance refresh event received, forcing immediate refetch');
      // Invalidate React Query cache first to force fresh data (bypasses staleTime)
      queryClient.invalidateQueries({ queryKey: ['readContract'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['wallet'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['escrow-balance'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['usdcBalance'], exact: false });
      // Then immediately refetch all balances (forces network request)
      refetchAll();
    };
    
    window.addEventListener('fcz:balance:refresh', handleRefresh);
    return () => window.removeEventListener('fcz:balance:refresh', handleRefresh);
  }, [queryClient, refetchWallet, refetchEscrow, refetchSummary, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    wallet: walletUSDC || 0,
    available,
    locked: reserved,
    total,
    summary,
    isLoading,
    isWalletLoading: walletLoading,
    isEscrowLoading: escrowLoading,
    error: walletError || escrowError || summaryError,
    walletError,
    escrowError,
    summaryError,
    refetch: refetchAll,
    refetchWallet,
    refetchEscrow,
    refetchSummary
  };
}
