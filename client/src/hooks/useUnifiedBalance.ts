import { useEffect, useRef } from 'react';
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

  const computedAvailable = Number(summary?.availableToStakeUSDC ?? summary?.available ?? availableUSD ?? 0);
  const computedReserved = Number(summary?.reservedUSDC ?? summary?.reserved ?? reservedUSD ?? 0);
  const computedTotal = Number(
    summary ? (summary.availableToStakeUSDC ?? 0) + (summary.reservedUSDC ?? 0) : (totalUSD ?? computedAvailable + computedReserved)
  );

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

  // Listen for balance refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetchAll();
    };
    
    window.addEventListener('fcz:balance:refresh', handleRefresh);
    return () => window.removeEventListener('fcz:balance:refresh', handleRefresh);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
