import { useQuery } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';

export type WalletSummary = {
  currency: 'USD';
  available: number;
  reserved: number;
  total: number;
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

export function useWalletSummary(userId?: string, options: WalletSummaryOptions = {}) {
  const { walletAddress, enabled = true, refetchIntervalMs = 10_000 } = options;
  const walletAddr = walletAddress?.toLowerCase() ?? null;

  return useQuery({
    queryKey: QK.walletSummary(userId ?? 'anon', walletAddr),
    enabled: Boolean(userId) && enabled,
    refetchInterval: refetchIntervalMs,
    queryFn: async (): Promise<WalletSummary> => {
      if (!userId) {
        throw new Error('userId is required to load wallet summary');
      }

      const params = new URLSearchParams();
      if (walletAddr) {
        params.set('walletAddress', walletAddr);
      }

      const response = await fetch(`/api/wallet/summary/${userId}${params.size ? `?${params.toString()}` : ''}`, {
        headers: {
          'Accept': 'application/json'
        }
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
