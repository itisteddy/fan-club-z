import { useQuery } from '@tanstack/react-query';

export type OnchainActivityItem = {
  id: string;
  kind: string;
  amount: number;
  token: string;
  txHash?: string;
  createdAt: string;
};

export function useOnchainActivity(userId?: string, limit = 20) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['activity', userId, limit],
    queryFn: async () => {
      const res = await fetch(`/api/chain/activity?userId=${userId}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch on-chain activity');
      const data = await res.json();
      return (data.items || []) as OnchainActivityItem[];
    },
    refetchInterval: 10_000, // light auto-refresh every 10 seconds
  });
}

