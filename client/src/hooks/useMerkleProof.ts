import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/environment';
import { QK } from '@/lib/queryKeys';

export type MerkleProofResponse = {
  success: boolean;
  data: {
    predictionId: string;
    merkleRoot: `0x${string}`;
    amountUnits: string;
    amountUSD: number;
    proof: `0x${string}`[];
  };
  version: string;
};

export function useMerkleProof(predictionId?: string, address?: string) {
  return useQuery({
    queryKey: [...QK.prediction(predictionId || 'unknown'), 'merkle-proof', (address || '').toLowerCase()],
    enabled: Boolean(predictionId && address),
    queryFn: async (): Promise<MerkleProofResponse['data']> => {
      const params = new URLSearchParams({ address: String(address) });
      const r = await fetch(`${getApiUrl()}/api/v2/settlement/${predictionId}/merkle-proof?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.message || 'Failed to fetch merkle proof');
      }
      const json: MerkleProofResponse = await r.json();
      return json.data;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}


