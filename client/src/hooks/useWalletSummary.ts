import { useQuery } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import { getApiUrl } from '@/utils/environment';

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
    creatorEarningsCumulative?: number;
  };
  creatorEarningsCumulative?: number;
  milestones?: {
    first10ZaurumEarned: boolean;
    first10Label: string;
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
    staleTime: 15_000, // Data fresh for 15 seconds (matches server Cache-Control max-age)
    gcTime: 60_000, // Keep in cache for 1 minute
    refetchOnWindowFocus: true,  // Refresh when user switches back to app (critical on mobile)
    refetchOnMount: 'always' as const, // Always fetch when component mounts (prevents stale mobile data)
    retry: 2,
    queryFn: async (): Promise<WalletSummary> => {
      if (!userId) {
        throw new Error('userId is required to load wallet summary');
      }

      const params = new URLSearchParams();
      if (walletAddr) {
        params.set('walletAddress', walletAddr);
      }

      const apiBase = getApiUrl();
      // CRITICAL: Add a timeout so a stalled network request can't leave the wallet in a
      // permanent "Loading..." state (some users reported infinite loading).
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const url = `${apiBase}/api/wallet/summary/${userId}${params.size ? `?${params.toString()}` : ''}`;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal: controller.signal,
          cache: 'no-store',
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          throw new Error('Wallet summary request timed out. Please try again.');
        }
        throw e;
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to load wallet summary');
      }

      const summary = await response.json();
      const visibleAvailable = Number(summary.available ?? 0);
      const visibleReserved = Number(summary.reserved ?? 0);
      const visibleStakeBalance = Number(summary.stakeBalance ?? summary.balances?.stakeBalance ?? visibleAvailable);
      const visibleDemoCredits = Number(summary.demoCredits ?? summary.balances?.demoCredits ?? visibleAvailable);

      return {
        currency: 'USD',
        available: visibleAvailable,
        reserved: visibleReserved,
        total: Number(summary.total ?? 0),
        // Chunk 2: keep demoCredits as a legacy alias for visible available balance.
        demoCredits: visibleDemoCredits,
        creatorEarnings: Number(summary.creatorEarnings ?? summary.balances?.creatorEarnings ?? 0),
        stakeBalance: visibleStakeBalance,
        balances: {
          demoCredits: visibleDemoCredits,
          creatorEarnings: Number(summary.creatorEarnings ?? summary.balances?.creatorEarnings ?? 0),
          stakeBalance: visibleStakeBalance,
          creatorEarningsCumulative: Number(summary.creatorEarningsCumulative ?? summary.balances?.creatorEarningsCumulative ?? 0),
        },
        availableToStakeUSDC: Number(summary.availableToStakeUSDC ?? visibleAvailable),
        reservedUSDC: Number(summary.reservedUSDC ?? visibleReserved),
        escrowUSDC: Number(summary.escrowUSDC ?? summary.total ?? 0),
        totalDeposited: Number(summary.totalDeposited ?? summary.totalDepositedUSDC ?? 0),
        totalWithdrawn: Number(summary.totalWithdrawn ?? summary.totalWithdrawnUSDC ?? 0),
        creatorEarningsCumulative: Number(summary.creatorEarningsCumulative ?? summary.balances?.creatorEarningsCumulative ?? 0),
        milestones: summary.milestones
          ? {
              first10ZaurumEarned: Boolean(summary.milestones.first10ZaurumEarned),
              first10Label: String(summary.milestones.first10Label || 'First 10 Zaurum earned'),
            }
          : undefined,
        updatedAt: summary.updatedAt ?? summary.updated_at ?? new Date().toISOString(),
        walletAddress: summary.walletAddress ?? summary.wallet_address ?? null,
      };
    }
  });
}
