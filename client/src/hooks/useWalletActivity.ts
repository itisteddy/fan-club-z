import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import type { ActivityItem } from '@fanclubz/shared';
import { normalizeWalletTransaction } from '@fanclubz/shared';
import { getApiUrl } from '@/utils/environment';

export type WalletActivityItem = ActivityItem;
export type WalletActivityResponse = { items: WalletActivityItem[] };

function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(input, { ...(init || {}), signal: controller.signal }).finally(() => clearTimeout(timeout));
}

/**
 * Hook to fetch wallet activity/transaction history
 * 
 * PERFORMANCE FIX v2: 
 * - Increased refetch interval from 30s to 60s
 * - Added gcTime to keep data in cache longer
 * - Disabled refetchOnWindowFocus to reduce API calls
 */
export function useWalletActivity(userId?: string, limit = 20) {
  const query = useQuery<WalletActivityResponse>({
    queryKey: QK.walletActivity(userId ?? 'anon', limit),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('userId is required');
      
      const params = new URLSearchParams({ 
        userId, 
        limit: String(limit) 
      });
      
      const apiBase = getApiUrl();
      let r: Response;
      try {
        r = await fetchWithTimeout(`${apiBase}/api/wallet/activity?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          throw new Error('Wallet activity request timed out. Please try again.');
        }
        throw e;
      }
      if (!r.ok) {
        const error = await r.json().catch(() => ({ message: r.statusText }));
        throw new Error(error.message || 'Failed to load transactions');
      }
      const raw = await r.json() as { items: any[] };
      
      const normalisedItems: WalletActivityItem[] = (raw.items || []).map((item) => {
        try {
          return normalizeWalletTransaction(item);
        } catch (error) {
          console.error('[FCZ-PAY] ui: failed to normalize item', { item, error });
          return null;
        }
      }).filter((item): item is WalletActivityItem => item !== null);

      return { items: normalisedItems };
    },
    // PERFORMANCE FIX: Increased intervals to reduce API calls
    refetchInterval: 60_000, // Refetch every 60 seconds (was 30s)
    staleTime: 45_000, // Consider data stale after 45 seconds (was 20s)
    gcTime: 120_000, // Keep in cache for 2 minutes
    retry: 2,
    // Don't refetch on window focus - reduces unnecessary API calls
    refetchOnWindowFocus: false,
    // Don't refetch on mount if data is fresh
    refetchOnMount: false,
  });

  return query;
}

// Infinite query version for pagination
export function useWalletActivityInfinite(userId?: string, limit = 20) {
  return useInfiniteQuery<WalletActivityResponse, Error, WalletActivityResponse, any, string | undefined>({
    queryKey: [...QK.walletActivity(userId ?? 'anon', limit), 'infinite'],
    enabled: !!userId,
    queryFn: async ({ pageParam }) => {
      if (!userId) throw new Error('userId is required');
      
      const params = new URLSearchParams({ 
        userId, 
        limit: String(limit)
      });
      
      if (pageParam) {
        params.set('cursor', pageParam);
      }
      
      const apiBase = getApiUrl();
      let r: Response;
      try {
        r = await fetchWithTimeout(`${apiBase}/api/wallet/activity?${params.toString()}`, {
          headers: { Accept: 'application/json' },
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') {
          throw new Error('Wallet activity request timed out. Please try again.');
        }
        throw e;
      }
      if (!r.ok) {
        const error = await r.json().catch(() => ({ message: r.statusText }));
        throw new Error(error.message || 'Failed to load transactions');
      }
      const raw = await r.json() as { items: any[] };
      const normalisedItems: WalletActivityItem[] = (raw.items || []).map((item) => 
        normalizeWalletTransaction(item)
      );
      return { items: normalisedItems };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.items || lastPage.items.length === 0) return undefined;
      const lastItem = lastPage.items[lastPage.items.length - 1];
      return lastItem?.id || lastItem?.createdAt;
    },
    initialPageParam: undefined as string | undefined,
    // PERFORMANCE FIX: Increased intervals
    refetchInterval: 60_000,
    staleTime: 45_000,
    gcTime: 120_000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
