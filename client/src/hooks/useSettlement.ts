import { useState, useCallback } from 'react';
import { getApiUrl } from '../config';
import { getFczClientHeader } from '@/lib/apiClient';

interface SettlementRequest {
  predictionId: string;
  winningOptionId: string;
  proofUrl?: string;
  reason?: string;
  userId: string; // In production, this would come from auth context
}

interface SettlementResponse {
  success: boolean;
  data: {
    settlement: any;
    totalPayout: number;
    platformFee: number;
    creatorFee: number;
    winnersCount: number;
    participantsCount: number;
    results: Array<{
      userId: string;
      entryId: string;
      stake: number;
      payout: number;
    }>;
  };
  message: string;
}

interface SettlementError {
  error: string;
  message: string;
  version?: string;
}

export const useSettlement = () => {
  const [isSettling, setIsSettling] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);

  const settleManually = useCallback(async (request: SettlementRequest): Promise<SettlementResponse | null> => {
    setIsSettling(true);
    setSettlementError(null);

    try {
      console.log('🔨 Starting manual settlement:', request);

      const response = await fetch(`${getApiUrl()}/api/v2/settlement/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-FCZ-Client': getFczClientHeader(),
        },
        credentials: 'include',
        body: JSON.stringify(request)
      });

      console.log('📡 Settlement response status:', response.status);

      if (!response.ok) {
        const errorData: SettlementError = await response.json();
        console.error('❌ Settlement failed:', errorData);
        setSettlementError(errorData.message || 'Settlement failed');
        return null;
      }

      const settlementData: SettlementResponse = await response.json();
      console.log('✅ Settlement successful:', settlementData);

      return settlementData;

    } catch (error) {
      console.error('❌ Settlement network error:', error);
      setSettlementError('Network error during settlement');
      return null;
    } finally {
      setIsSettling(false);
    }
  }, []);

  const getSettlementInfo = useCallback(async (predictionId: string) => {
    try {
      console.log('📊 Fetching settlement info for:', predictionId);

      const response = await fetch(`${getApiUrl()}/api/v2/settlement/prediction/${predictionId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-FCZ-Client': getFczClientHeader(),
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No settlement found (not settled yet)
        }
        throw new Error(`Failed to fetch settlement: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Settlement info fetched:', data);
      return data.data;

    } catch (error) {
      console.error('❌ Error fetching settlement info:', error);
      return null;
    }
  }, []);

  return {
    settleManually,
    getSettlementInfo,
    isSettling,
    settlementError,
    clearError: () => setSettlementError(null)
  };
};

export default useSettlement;