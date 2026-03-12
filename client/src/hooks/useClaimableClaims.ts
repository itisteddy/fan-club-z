import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/environment';
import { getFczClientHeader } from '@/lib/apiClient';
// no need for QK here; define a stable key inline

export type ClaimableItem = {
  predictionId: string;
  title: string;
  amountUnits: string;
  amountUSD: number;
  amountZaurum?: number;
  proof: `0x${string}`[];
  merkleRoot: `0x${string}`;
};

export function useClaimableClaims(address?: string, limit = 20) {
  const addressLower = (address || '').toLowerCase();
  return useQuery({
    queryKey: ['claimable-claims', addressLower, limit],
    enabled: Boolean(address),
    queryFn: async (): Promise<ClaimableItem[]> => {
      const params = new URLSearchParams({ address: String(address), limit: String(limit) });
      const r = await fetch(`${getApiUrl()}/api/v2/settlement/claimable?${params.toString()}`, {
        headers: { 
          Accept: 'application/json',
          'X-FCZ-Client': getFczClientHeader(),
        },
        credentials: 'include',
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || 'Failed to load claimable items');
      }
      const json = await r.json();
      const rawItems = (json?.data?.claims ?? []) as any[];
      const items: ClaimableItem[] = rawItems.map((item) => {
        const normalizedAmount = Number(item.amountZaurum ?? item.amountUSD ?? 0);
        return {
          predictionId: String(item.predictionId || item.prediction_id || ''),
          title: String(item.title || ''),
          amountUnits: String(item.amountUnits || item.amount_units || '0'),
          amountUSD: normalizedAmount,
          amountZaurum: normalizedAmount,
          proof: (item.proof || []) as `0x${string}`[],
          merkleRoot: String(item.merkleRoot || item.merkle_root || '0x') as `0x${string}`,
        };
      });
      
      // CRITICAL: Deduplicate by predictionId (safety net if backend returns duplicates)
      const seen = new Map<string, ClaimableItem>();
      for (const item of items) {
        if (!seen.has(item.predictionId)) {
          seen.set(item.predictionId, item);
        }
      }
      const deduplicated = Array.from(seen.values());
      
      // Also apply a local "claimed" mask to avoid flicker if backend lags
      try {
        return deduplicated.filter((it) => !localStorage.getItem(`fcz:claimed:${it.predictionId}:${addressLower}`));
      } catch {
        return deduplicated;
      }
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

