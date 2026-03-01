import { useQuery } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import { getApiUrl } from '@/utils/environment';
import { getAuthHeaders, getFczClientHeader } from '@/lib/apiClient';

export type WalletSummary = {
  currency: 'USD';
  available: number;
  reserved: number;
  total: number;
  demoCredits: number;
  creatorEarnings: number;
  stakeBalance: number;
  balances?: {
    demoCredits: number;
    creatorEarnings: number;
    stakeBalance: number;
  };
  availableToStakeUSDC: number;
  reservedUSDC: number;
  escrowUSDC: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  updatedAt: string;
  walletAddress?: string | null;
};

type WalletSummaryOptions = {
  walletAddress?: string | null;
  enabled?: boolean;
  refetchIntervalMs?: number;
};

/**
 * Hook to fetch wallet summary from the server
 * 
 * PERFORMANCE FIX v2:
 * - Default refetch interval increased to 30s (was 10s)
 * - Added staleTime and gcTime for better caching
 * - Disabled refetchOnWindowFocus
 */
export function useWalletSummary(userId?: string, options: WalletSummaryOptions = {}) {
  // PERFORMANCE FIX: Default interval increased from 10s to 30s
  const { walletAddress, enabled = true, refetchIntervalMs = 30_000 } = options;
  const walletAddr = walletAddress?.toLowerCase() ?? null;

  return useQuery({
    queryKey: QK.walletSummary(userId ?? 'anon', walletAddr),
    enabled: Boolean(userId) && enabled,
    refetchInterval: refetchIntervalMs,
    // PERFORMANCE FIX: Better caching settings
    staleTime: 5_000, // Keep wallet balances fresh
    gcTime: 60_000, // Keep in cache for 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    retry: 2,
    queryFn: async (): Promise<WalletSummary> => {
      if (!userId) {
        throw new Error('userId is required to load wallet summary');
      }

      const params = new URLSearchParams();
      if (walletAddr) {
        params.set('walletAddress', walletAddr);
      }

      const authHeaders = await getAuthHeaders();
      const apiBase = getApiUrl();
      const response = await fetch(`${apiBase}/api/wallet/summary/${userId}${params.size ? `?${params.toString()}` : ''}`, {
        headers: {
          'Accept': 'application/json',
          ...authHeaders,
          'X-FCZ-Client': getFczClientHeader(),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to load wallet summary');
      }

      const summary = await response.json();

      return {
        currency: 'USD',
        available: Number(summary.available ?? 0),
        reserved: Number(summary.reserved ?? 0),
        total: Number(summary.total ?? 0),
        demoCredits: Number(summary.demoCredits ?? summary.balances?.demoCredits ?? 0),
        creatorEarnings: Number(summary.creatorEarnings ?? summary.balances?.creatorEarnings ?? 0),
        stakeBalance: Number(summary.stakeBalance ?? summary.balances?.stakeBalance ?? summary.available ?? 0),
        balances: {
          demoCredits: Number(summary.demoCredits ?? summary.balances?.demoCredits ?? 0),
          creatorEarnings: Number(summary.creatorEarnings ?? summary.balances?.creatorEarnings ?? 0),
          stakeBalance: Number(summary.stakeBalance ?? summary.balances?.stakeBalance ?? summary.available ?? 0),
        },
        availableToStakeUSDC: Number(summary.availableToStakeUSDC ?? summary.available ?? 0),
        reservedUSDC: Number(summary.reservedUSDC ?? summary.reserved ?? 0),
        escrowUSDC: Number(summary.escrowUSDC ?? summary.total ?? 0),
        totalDeposited: Number(summary.totalDeposited ?? summary.totalDepositedUSDC ?? 0),
        totalWithdrawn: Number(summary.totalWithdrawn ?? summary.totalWithdrawnUSDC ?? 0),
        updatedAt: summary.updatedAt ?? summary.updated_at ?? new Date().toISOString(),
        walletAddress: summary.walletAddress ?? summary.wallet_address ?? null,
      };
    }
  });
}
