import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/utils/environment';

interface IdempotentRequestOptions extends RequestInit {
  idempotencyKey?: string;
  onSuccess?: (response: Response) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to make idempotent requests with automatic duplicate prevention
 */
export function useIdempotentRequest() {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const requestCache = useRef<Map<string, Promise<Response>>>(new Map());
  
  const execute = useCallback(async (
    url: string, 
    options: IdempotentRequestOptions = {}
  ): Promise<Response | null> => {
    // Generate or use provided idempotency key
    const idempotencyKey = options.idempotencyKey || uuidv4();
    
    // Check if this exact request is already in flight
    const cacheKey = `${options.method || 'GET'}-${url}-${idempotencyKey}`;
    const cachedRequest = requestCache.current.get(cacheKey);
    
    if (cachedRequest) {
      console.log('[IDEMPOTENT] Request already in progress:', cacheKey);
      toast('Request already in progress. Please wait...', { icon: 'ℹ️' });
      
      try {
        return await cachedRequest;
      } catch (error) {
        // Even if the cached request failed, return null
        // The original request will handle the error
        return null;
      }
    }
    
    // Prevent duplicate button clicks
    if (pending.has(idempotencyKey)) {
      console.warn('[IDEMPOTENT] Request blocked - already pending:', idempotencyKey);
      return null;
    }
    
    setPending(prev => new Set(prev).add(idempotencyKey));
    
    // Create the request promise
    const requestPromise = fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-idempotency-key': idempotencyKey,
        'Content-Type': 'application/json',
      }
    });
    
    // Cache the request promise
    requestCache.current.set(cacheKey, requestPromise);
    
    try {
      const response = await requestPromise;
      
      // Handle success callback
      if (response.ok && options.onSuccess) {
        options.onSuccess(response);
      }
      
      // Handle error callback for non-ok responses
      if (!response.ok && options.onError) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        options.onError(new Error(errorData.message || `HTTP ${response.status}`));
      }
      
      return response;
      
    } catch (error) {
      console.error('[IDEMPOTENT] Request failed:', error);
      
      // Handle network errors
      if (options.onError) {
        options.onError(error as Error);
      }
      
      throw error;
      
    } finally {
      // Clean up
      setPending(prev => {
        const next = new Set(prev);
        next.delete(idempotencyKey);
        return next;
      });
      
      // Remove from cache after a delay (keep for 5 seconds to prevent rapid retries)
      setTimeout(() => {
        requestCache.current.delete(cacheKey);
      }, 5000);
    }
  }, [pending]);
  
  const reset = useCallback(() => {
    setPending(new Set());
    requestCache.current.clear();
  }, []);
  
  return { 
    execute, 
    isPending: pending.size > 0,
    pendingCount: pending.size,
    reset
  };
}

/**
 * Hook for idempotent bet placement
 */
export function useIdempotentBet() {
  const { execute, isPending } = useIdempotentRequest();
  
  const placeBet = useCallback(async (
    predictionId: string,
    optionId: string,
    amount: number,
    userId: string
  ) => {
    // Generate a unique key for this bet
    const idempotencyKey = `bet-${predictionId}-${optionId}-${amount}-${Date.now()}`;
    
    const apiBase = getApiUrl();
    const response = await execute(`${apiBase}/api/predictions/place-bet`, {
      method: 'POST',
      body: JSON.stringify({
        predictionId,
        optionId,
        amount,
        userId
      }),
      idempotencyKey,
      onSuccess: () => {
        toast.success('Bet placed successfully!');
      },
      onError: (error) => {
        if (error.message.includes('409')) {
          // Request already being processed
          toast('Your bet is being processed...', { icon: 'ℹ️' });
        } else {
          toast.error(`Failed to place bet: ${error.message}`);
        }
      }
    });
    
    if (response && response.ok) {
      return await response.json();
    }
    
    return null;
  }, [execute]);
  
  return { placeBet, isPlacing: isPending };
}

/**
 * Hook for idempotent deposits
 */
export function useIdempotentDeposit() {
  const { execute, isPending } = useIdempotentRequest();
  
  const deposit = useCallback(async (
    amount: number,
    userId: string,
    txHash: string
  ) => {
    // Use transaction hash as part of idempotency key
    const idempotencyKey = `deposit-${txHash}`;
    
    const apiBase = getApiUrl();
    const response = await execute(`${apiBase}/api/wallet/deposit`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        userId,
        txHash
      }),
      idempotencyKey,
      onSuccess: () => {
        toast.success('Deposit recorded successfully!');
      },
      onError: (error) => {
        if (error.message.includes('409')) {
          toast('This deposit is already being processed', { icon: 'ℹ️' });
        } else {
          toast.error(`Failed to record deposit: ${error.message}`);
        }
      }
    });
    
    if (response && response.ok) {
      return await response.json();
    }
    
    return null;
  }, [execute]);
  
  return { deposit, isDepositing: isPending };
}

/**
 * Hook for idempotent withdrawals
 */
export function useIdempotentWithdraw() {
  const { execute, isPending } = useIdempotentRequest();
  
  const withdraw = useCallback(async (
    amount: number,
    userId: string,
    walletAddress: string
  ) => {
    // Generate unique key for withdrawal
    const idempotencyKey = `withdraw-${userId}-${amount}-${Date.now()}`;
    
    const response = await execute('/api/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        userId,
        walletAddress
      }),
      idempotencyKey,
      onSuccess: () => {
        toast.success('Withdrawal initiated!');
      },
      onError: (error) => {
        if (error.message.includes('409')) {
          toast('Withdrawal already in progress', { icon: 'ℹ️' });
        } else {
          toast.error(`Failed to withdraw: ${error.message}`);
        }
      }
    });
    
    if (response && response.ok) {
      return await response.json();
    }
    
    return null;
  }, [execute]);
  
  return { withdraw, isWithdrawing: isPending };
}
