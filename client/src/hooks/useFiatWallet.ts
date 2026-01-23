/**
 * Fiat Wallet Hook - Phase 7A
 * Fetches fiat (NGN) balance and manages fiat wallet state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, API_BASE_URL } from '@/lib/api';

interface FiatSummary {
  currency: string;
  totalKobo: number;
  availableKobo: number;
  lockedKobo: number;
  totalNgn: number;
  availableNgn: number;
  lockedNgn: number;
  lastUpdated: string;
  /** Phase 7D: display-only USD equivalent when fx rate available */
  usdEstimate?: number | null;
}

export interface FxMeta {
  pair: string;
  rate: number | null;
  source: string;
  asOf: string | null;
  retrievedAt: string | null;
  isStale: boolean;
}

interface CombinedSummary {
  demo: {
    currency: string;
    available: number;
    reserved: number;
    total: number;
    lastUpdated: string;
  };
  fiat: FiatSummary | null;
  fiatEnabled: boolean;
}

interface PaystackStatus {
  enabled: boolean;
  currency: string;
  minDepositNgn: number;
}

interface InitializeResponse {
  success: boolean;
  authorizationUrl: string;
  reference: string;
  accessCode: string;
  amountNgn: number;
  amountKobo: number;
}

/**
 * Fetch Paystack status (enabled, min deposit)
 */
export function usePaystackStatus() {
  return useQuery({
    queryKey: ['paystack', 'status'],
    queryFn: async (): Promise<PaystackStatus> => {
      return await apiClient.get('/fiat/paystack/status');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch fiat wallet summary (Phase 7D: includes fx + usdEstimate)
 */
export function useFiatSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ['fiat', 'summary', userId],
    queryFn: async (): Promise<{
      enabled: boolean;
      summary: FiatSummary | null;
      fx?: FxMeta;
    }> => {
      if (!userId) return { enabled: false, summary: null };
      const response = await fetch(`${API_BASE_URL}/api/demo-wallet/fiat/summary?userId=${userId}`);
      return await response.json();
    },
    enabled: !!userId,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Fetch combined wallet summary (demo + fiat)
 */
export function useCombinedWalletSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ['wallet', 'combined-summary', userId],
    queryFn: async (): Promise<CombinedSummary> => {
      if (!userId) throw new Error('userId required');
      // demo-wallet endpoints are at /api/demo-wallet, not /api/v2
      const response = await fetch(`${API_BASE_URL}/api/demo-wallet/combined-summary?userId=${userId}`);
      return await response.json();
    },
    enabled: !!userId,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Initialize Paystack deposit
 */
export function useInitializeDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amountNgn, userId, email }: { amountNgn: number; userId: string; email?: string }): Promise<InitializeResponse> => {
      return await apiClient.post('/fiat/paystack/initialize', {
        amountNgn,
        userId,
        email,
      });
    },
    onSuccess: () => {
      // Invalidate wallet queries after deposit initiated
      queryClient.invalidateQueries({ queryKey: ['fiat'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Fetch Nigerian banks list (for withdrawals)
 */
export function useNigerianBanks() {
  return useQuery({
    queryKey: ['paystack', 'banks'],
    queryFn: async (): Promise<Array<{ name: string; code: string; slug: string }>> => {
      const data = await apiClient.get('/fiat/paystack/banks');
      return data?.banks || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export type { FiatSummary, CombinedSummary, PaystackStatus, InitializeResponse };
