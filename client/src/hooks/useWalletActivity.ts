import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QK } from '@/lib/queryKeys';
import type { ActivityItem } from '@fanclubz/shared';
import { normalizeWalletTransaction } from '@fanclubz/shared';

export type WalletActivityItem = ActivityItem;

export function useWalletActivity(userId?: string, limit = 20) {
  const query = useQuery({
    queryKey: QK.walletActivity(userId ?? 'anon', limit),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error('userId is required');
      
      const params = new URLSearchParams({ 
        userId, 
        limit: String(limit) 
      });
      
      const r = await fetch(`/api/wallet/activity?${params.toString()}`);
      if (!r.ok) {
        const error = await r.json().catch(() => ({ message: r.statusText }));
        throw new Error(error.message || 'Failed to load transactions');
      }
      const raw = await r.json() as { items: any[] };
      const normalisedItems: WalletActivityItem[] = (raw.items || []).map((item) => 
        normalizeWalletTransaction(item)
      );

      console.log('[FCZ-PAY] ui: fetched wallet activity', { count: normalisedItems.length });
      return { items: normalisedItems };
    },
    refetchInterval: 10_000, // Refetch every 10 seconds
    staleTime: 5_000, // Consider data stale after 5 seconds
    retry: 2,
  });

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (userId && document.hasFocus()) {
        query.refetch();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId, query]);

  return query;
}

// Infinite query version for pagination
export function useWalletActivityInfinite(userId?: string, limit = 20) {
  return useInfiniteQuery({
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
      
      const r = await fetch(`/api/wallet/activity?${params.toString()}`);
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
    refetchInterval: 10_000,
    staleTime: 5_000,
    retry: 2,
  });
}

