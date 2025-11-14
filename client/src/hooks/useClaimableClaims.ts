import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/environment';
// no need for QK here; define a stable key inline

export type ClaimableItem = {
  predictionId: string;
  title: string;
  amountUnits: string;
  amountUSD: number;
  proof: `0x${string}`[];
  merkleRoot: `0x${string}`;
};

export function useClaimableClaims(address?: string, limit = 20) {
  return useQuery({
    queryKey: ['wallet', 'claimable', (address || '').toLowerCase(), limit],
    enabled: Boolean(address),
    queryFn: async (): Promise<ClaimableItem[]> => {
      const params = new URLSearchParams({ address: String(address), limit: String(limit) });
      const r = await fetch(`${getApiUrl()}/api/v2/settlement/claimable?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || 'Failed to load claimable items');
      }
      const json = await r.json();
      const items = ((json?.data?.claims ?? []) as ClaimableItem[]);
      // Also apply a local "claimed" mask to avoid flicker if backend lags
      try {
        const addrLower = (address || '').toLowerCase();
        return items.filter((it) => !localStorage.getItem(`fcz:claimed:${it.predictionId}:${addrLower}`));
      } catch {
        return items;
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}


