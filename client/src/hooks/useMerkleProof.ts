import { useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/environment';

export type MerkleProofResponse = {
  success: boolean;
  data: {
    predictionId: string;
    merkleRoot: `0x${string}`;
    amountUnits: string;
    amountUSD: number;
    amountZaurum?: number;
    proof: `0x${string}`[];
  };
  version: string;
};

export function useMerkleProof(predictionId?: string, address?: string) {
  const addressLower = (address || '').toLowerCase();
  return useQuery({
    queryKey: ['merkle-proof', predictionId || 'unknown', addressLower],
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
      return {
        ...json.data,
        amountZaurum: Number(json.data?.amountZaurum ?? json.data?.amountUSD ?? 0),
        amountUSD: Number(json.data?.amountUSD ?? 0),
      };
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

