import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QK } from '@/lib/queryKeys';
import { getApiUrl } from '@/utils/environment';
import { getAuthHeaders } from '@/lib/apiClient';

export type EscrowSnapshot = {
  currency: 'USD';
  escrowUSDC: number;           // On-chain escrow total (available + reserved)
  reservedUSDC: number;         // Reserved via DB locks (locked + consumed)
  availableToStakeUSDC: number; // Effective available to stake (escrow - active locks)
  totalDepositedUSDC?: number;
  totalWithdrawnUSDC?: number;
  walletAddress?: string | null;
  lastUpdated: string;
  source?: 'onchain' | 'cached';
};

type Options = {
  walletAddress?: string | null;
  enabled?: boolean;
  refetchIntervalMs?: number;
  forceRefresh?: boolean;
};

export function useEscrowSnapshot(userId?: string, options: Options = {}) {
  const walletAddress = options.walletAddress?.toLowerCase() ?? undefined;

  const query = useQuery({
    queryKey: QK.walletSummary(userId ?? 'anon', walletAddress ?? null),
    enabled: !!userId && (options.enabled ?? true),
    queryFn: async () => {
      if (!userId) throw new Error('userId is required');

      const params = new URLSearchParams({ userId });
      if (walletAddress) params.set('walletAddress', walletAddress);
      if (options.forceRefresh) params.set('refresh', '1');

      const apiBase = getApiUrl();
      // Prevent infinite loading if the network request stalls
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      let r: Response;
      try {
        const authHeaders = await getAuthHeaders();
        r = await fetch(`${apiBase}/api/wallet/summary?${params.toString()}`, {
          headers: { Accept: 'application/json', ...authHeaders },
          signal: controller.signal,
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          throw new Error('Wallet summary request timed out. Please try again.');
        }
        throw e;
      } finally {
        clearTimeout(timeout);
      }
      if (!r.ok) {
        const error = await r.json().catch(() => ({ message: r.statusText }));
        throw new Error(error.message || 'Failed to load escrow snapshot');
      }
      const data = (await r.json()) as EscrowSnapshot;
      return data;
    },
    refetchInterval: options.refetchIntervalMs ?? 5000,
    staleTime: 2000,
    retry: 2,
  });

  // Light refetch on focus for mobile UX
  useEffect(() => {
    const onFocus = () => {
      if (userId && document.hasFocus()) query.refetch();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId, query]);

  return query;
}

