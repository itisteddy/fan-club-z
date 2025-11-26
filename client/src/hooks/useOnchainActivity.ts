import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useAccount } from 'wagmi';

export interface ChainActivityItem {
  id: string;
  kind: string;
  amount: number;
  token: string;
  chainId: number;
  txHash?: string;
  createdAt: string;
  channel?: string | null;
  direction?: string | null;
  description?: string | null;
  feeUSD?: number | null;
  meta?: Record<string, any> | null;
  status?: 'pending' | 'completed' | 'failed' | string;
}

interface ActivityResponse {
  items: ChainActivityItem[];
}

async function fetchActivity(userId: string, limit: number): Promise<ActivityResponse> {
  const params = new URLSearchParams({
    userId,
    limit: String(limit),
  });

  const response = await fetch(`/api/chain/activity?${params}`);
  
  if (!response.ok) {
    console.error('[FCZ-PAY] ui: Failed to fetch activity:', response.statusText);
    return { items: [] };
  }

  const data = await response.json();
  // Removed excessive logging - only log errors
  return data;
}

export function useOnchainActivity(limit = 20) {
  const user = useAuthStore((state) => state.user);
  const { address, isConnected } = useAccount();

  return useQuery<ActivityResponse>({
    queryKey: ['onchain-activity', address, limit],
    queryFn: () => fetchActivity(user?.id || '', limit),
    enabled: !!address && isConnected && !!user?.id,
    refetchInterval: 60_000, // Reduced from 10s to 60s to prevent excessive refetching
    staleTime: 45_000, // Consider data fresh for 45 seconds
    refetchOnWindowFocus: true,
  });
}

// Helper to format activity kind for display
export function formatActivityKind(kind: string): string {
  const kindMap: Record<string, string> = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    lock: 'Locked for bet',
    unlock: 'Unlocked',
    win: 'Win payout',
    transaction: 'Transaction',
    transfer: 'Transfer',
    fee: 'Fee',
  };

  return kindMap[kind.toLowerCase()] || kind;
}

// Helper to get icon name for activity kind
export function getActivityIcon(kind: string): string {
  const iconMap: Record<string, string> = {
    deposit: 'arrow-down-circle',
    withdraw: 'arrow-up-circle',
    lock: 'lock',
    unlock: 'unlock',
    win: 'trophy',
    transaction: 'activity',
    transfer: 'arrow-right-left',
  };

  return iconMap[kind.toLowerCase()] || 'circle';
}
