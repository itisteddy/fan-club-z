/**
 * Component Lifecycle Hook
 * Provides utilities for cleanup, request cancellation, and memory leak prevention
 */

import { useEffect, useRef, useCallback } from 'react';
import { requestManager } from '../utils/requestManager';

interface LifecycleOptions {
  cleanupOnUnmount?: boolean;
  requestKeyPrefix?: string;
}

export const useComponentLifecycle = (options: LifecycleOptions = {}) => {
  const { 
    cleanupOnUnmount = true, 
    requestKeyPrefix = Math.random().toString(36).substring(7)
  } = options;
  
  const mountedRef = useRef(true);
  const controllersRef = useRef<AbortController[]>([]);
  const timerIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalIdsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  // Create a new abort controller
  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    controllersRef.current.push(controller);
    return controller;
  }, []);

  // Safe state setter that checks if component is mounted
  const safeSetState = useCallback((setter: () => void) => {
    if (mountedRef.current) {
      setter();
    }
  }, []);

  // Safe async operation wrapper
  const safeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void
  ) => {
    if (!mountedRef.current) return;
    
    try {
      const result = await operation();
      if (mountedRef.current && onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      if (mountedRef.current && onError) {
        onError(error);
      }
      throw error;
    }
  }, []);

  // Safe timeout that cleans up automatically
  const safeTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timerIdsRef.current.delete(id);
      if (mountedRef.current) {
        callback();
      }
    }, delay);
    
    timerIdsRef.current.add(id);
    return id;
  }, []);

  // Safe interval that cleans up automatically
  const safeInterval = useCallback((callback: () => void, delay: number) => {
    const id = setInterval(() => {
      if (mountedRef.current) {
        callback();
      } else {
        clearInterval(id);
        intervalIdsRef.current.delete(id);
      }
    }, delay);
    
    intervalIdsRef.current.add(id);
    return id;
  }, []);

  // Cancel a specific timeout/interval
  const cancelTimeout = useCallback((id: NodeJS.Timeout) => {
    clearTimeout(id);
    timerIdsRef.current.delete(id);
  }, []);

  const cancelInterval = useCallback((id: NodeJS.Timeout) => {
    clearInterval(id);
    intervalIdsRef.current.delete(id);
  }, []);

  // Make a request with automatic cancellation
  const makeRequest = useCallback(async <T>(
    url: string,
    options?: RequestInit,
    key?: string
  ): Promise<T> => {
    const controller = createAbortController();
    const requestKey = key || `${requestKeyPrefix}:${url}`;
    
    return requestManager.request<T>({
      url,
      options: {
        ...options,
        signal: controller.signal,
      },
      key: requestKey,
    });
  }, [createAbortController, requestKeyPrefix]);

  // Cleanup function
  const cleanup = useCallback(() => {
    mountedRef.current = false;
    
    // Cancel all abort controllers
    controllersRef.current.forEach(controller => {
      controller.abort();
    });
    controllersRef.current = [];
    
    // Clear all timers
    timerIdsRef.current.forEach(id => clearTimeout(id));
    timerIdsRef.current.clear();
    
    // Clear all intervals
    intervalIdsRef.current.forEach(id => clearInterval(id));
    intervalIdsRef.current.clear();
    
    // Cancel component-specific requests
    if (requestKeyPrefix) {
      requestManager.cancelRequestsMatching(new RegExp(`^${requestKeyPrefix}:`));
    }
  }, [requestKeyPrefix]);

  // Auto-cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      if (cleanupOnUnmount) {
        cleanup();
      }
    };
  }, [cleanup, cleanupOnUnmount]);

  // Check if component is still mounted
  const isMounted = useCallback(() => mountedRef.current, []);

  return {
    isMounted,
    createAbortController,
    safeSetState,
    safeAsync,
    safeTimeout,
    safeInterval,
    cancelTimeout,
    cancelInterval,
    makeRequest,
    cleanup,
  };
};

export default useComponentLifecycle;
