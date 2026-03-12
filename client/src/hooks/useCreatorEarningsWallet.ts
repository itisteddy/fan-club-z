import { useMutation, useQuery } from '@tanstack/react-query';
import { getApiUrl } from '@/utils/environment';
import { supabase } from '@/lib/supabase';

export type CreatorEarningsHistoryItem = {
  id: string;
  eventType: 'CREATOR_EARNING_CREDIT' | 'CREATOR_EARNING_TRANSFER' | string;
  amount: number;
  currency: string;
  createdAt: string;
  description: string;
  fromAccount?: string | null;
  toAccount?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export function useCreatorEarningsHistory(enabled: boolean, limit = 20) {
  return useQuery({
    queryKey: ['wallet', 'creator-earnings-history', limit],
    enabled,
    staleTime: 15_000,
    gcTime: 60_000,
    queryFn: async (): Promise<{ items: CreatorEarningsHistoryItem[] }> => {
      const headers = await getAuthHeaders();
      const response = await fetch(`${getApiUrl()}/api/wallet/creator-earnings/history?limit=${limit}`, {
        headers: {
          Accept: 'application/json',
          ...headers,
        },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Failed to load creator earnings history');
      }
      const data = await response.json();
      return {
        items: (data.items || []).map((item: any) => ({
          id: item.id,
          eventType: item.eventType || item.type,
          amount: Number(item.amount || 0),
          currency: item.currency || 'USD',
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          description: item.description || '',
          fromAccount: item.fromAccount ?? item.from_account ?? null,
          toAccount: item.toAccount ?? item.to_account ?? null,
          referenceType: item.referenceType ?? item.reference_type ?? null,
          referenceId: item.referenceId ?? item.reference_id ?? null,
          metadata: item.metadata ?? item.meta ?? {},
        })),
      };
    },
  });
}

export function useTransferCreatorEarnings() {
  return useMutation({
    mutationFn: async (amount: number): Promise<{
      balances: { demoCredits: number; creatorEarnings: number; stakeBalance: number };
      transactionId?: string | null;
      applied?: boolean;
      milestones?: {
        first10ZaurumEarned: boolean;
        first10Label: string;
      };
    }> => {
      const headers = await getAuthHeaders();
      const requestId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const response = await fetch(`${getApiUrl()}/api/wallet/transfer-creator-earnings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        },
        body: JSON.stringify({ amount, requestId }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.message || 'Failed to move creator earnings');
      }

      return {
        balances: {
          demoCredits: Number(body.balances?.demoCredits ?? 0),
          creatorEarnings: Number(body.balances?.creatorEarnings ?? 0),
          stakeBalance: Number(body.balances?.stakeBalance ?? 0),
        },
        transactionId: body.transactionId ?? null,
        applied: Boolean(body.applied ?? true),
        milestones: body.milestones
          ? {
              first10ZaurumEarned: Boolean(body.milestones.first10ZaurumEarned),
              first10Label: String(body.milestones.first10Label || 'First 10 Zaurum earned'),
            }
          : undefined,
      };
    },
  });
}
