import { useEffect, useCallback, useRef } from 'react';
import { useAccount, useDisconnect, useConnectors, useReconnect } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

// Constants
const RECOVERY_COOLDOWN_MS = 3000;

// Known WalletConnect error patterns
const SESSION_ERROR_PATTERNS = [
  'no matching key',
  'session topic',
  'session not found',
  'pairing topic',
  'missing session',
  'inactive session',
  'session disconnected',
  'expired session',
  'getdefaultprovider',
  'provider.request',
  'wallet disconnected',
  'walletconnect',
  'topic not found',
  'missing or invalid',
  'proposal expired',
  'wc_session',
  'relay connection',
  'socket hang up',
  'fetch failed',
  'ns sepolia',
  'no provider',
  'provider is undefined',
  'disconnected from',
  'please call connect() before request',
  'client not initialized',
  'pairing not found',
  'session request timeout',
  'peer disconnected',
  'connection closed',
  'request timeout',
  'transport error',
  'signerclient is undefined',
  'provider not found',
  'connector not connected',
  'no signer available',
];

// Query keys to invalidate
const WALLET_QUERY_KEYS = [
  'wallet', 'allowance', 'balance', 'escrow', 'readContract',
  'usdcBalance', 'escrow-balance', 'unified-balance', 'escrow-snapshot',
  'onchain-usdc', 'claimable-claims', 'merkle-proof', 'wallet-summary', 'onchain-activity',
];

/**
 * Hook to manage WalletConnect session lifecycle and error recovery
 * 
 * v7: Simplified to prevent duplicate error handling
 * - NO global error listeners (Web3Provider handles that)
 * - NO toasts (UI components handle display)
 * - Just provides utilities for cleanup and recovery
 */
export function useWalletConnectSession() {
  const { isConnected, isConnecting, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { reconnect } = useReconnect();
  const connectors = useConnectors();
  const queryClient = useQueryClient();
  
  const isRecoveringRef = useRef(false);
  const lastRecoveryRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const initialCleanupDoneRef = useRef(false);
  
  // Track latest connection state for cleanup timeout (prevents stale closures)
  const connectionStateRef = useRef({ isConnected, isConnecting, status });
  
  // Keep connection state ref up to date
  useEffect(() => {
    connectionStateRef.current = { isConnected, isConnecting, status };
  }, [isConnected, isConnecting, status]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /**
   * Check if an error is a WalletConnect session error
   */
  const isSessionError = useCallback((error: unknown): boolean => {
    if (!error) return false;
    const errorMsg = typeof error === 'object' && 'message' in error 
      ? String((error as Error).message).toLowerCase()
      : String(error).toLowerCase();
    return SESSION_ERROR_PATTERNS.some(pattern => errorMsg.includes(pattern));
  }, []);

  /**
   * Clean up WalletConnect sessions from storage
   */
  const cleanupWalletConnectSessions = useCallback(async () => {
    try {
      // Try to disconnect WC provider properly
      const wcConnector = connectors.find(c => c.id === 'walletConnect');
      if (wcConnector) {
        try {
          const provider = await wcConnector.getProvider().catch(() => null);
          if (provider && typeof (provider as any).disconnect === 'function') {
            await (provider as any).disconnect().catch(() => {});
          }
        } catch {}
      }

      // Clear localStorage WC entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('wc@2:') || key.startsWith('wc@1:') || 
          key.startsWith('walletconnect') || key.startsWith('WALLETCONNECT') ||
          key.includes('wc_session') || key.includes('@walletconnect') ||
          key.startsWith('wc_') || key.includes('pairing') || key.includes('relay') ||
          (key.includes('topic') && key.includes('wc')) || key.includes('wallet-connect') ||
          (key.includes('wagmi') && key.includes('walletConnect'))
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => { try { localStorage.removeItem(key); } catch {} });

      // Clear sessionStorage WC entries
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.startsWith('wc@2:') || key.startsWith('walletconnect') || key.includes('@walletconnect')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => { try { sessionStorage.removeItem(key); } catch {} });

      const total = keysToRemove.length + sessionKeysToRemove.length;
      if (total > 0) {
        console.log(`[FCZ-WALLET] Cleaned ${total} stale WC entries`);
      }
    } catch (error) {
      console.warn('[FCZ-WALLET] Cleanup error:', error);
    }
  }, [connectors]);

  /**
   * Invalidate all wallet-related queries
   */
  const invalidateWalletQueries = useCallback(() => {
    WALLET_QUERY_KEYS.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key], exact: false });
      queryClient.removeQueries({ queryKey: [key], exact: false });
    });
  }, [queryClient]);

  /**
   * Disconnect wallet with cleanup
   */
  const disconnectWithCleanup = useCallback(async () => {
    console.log('[FCZ-WALLET] Disconnecting with cleanup...');
    try {
      disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      await cleanupWalletConnectSessions();
      invalidateWalletQueries();
      window.dispatchEvent(new CustomEvent('fcz:wallet:disconnected'));
    } catch (error) {
      console.error('[FCZ-WALLET] Disconnect error:', error);
      await cleanupWalletConnectSessions();
      throw error;
    }
  }, [disconnect, cleanupWalletConnectSessions, invalidateWalletQueries]);

  /**
   * Attempt to reconnect
   */
  const attemptReconnect = useCallback(async (): Promise<boolean> => {
    try {
      await reconnect();
      return true;
    } catch (err) {
      console.warn('[FCZ-WALLET] Reconnect failed:', err);
      return false;
    }
  }, [reconnect]);

  /**
   * Recover from WalletConnect errors
   * NOTE: Does NOT show toasts or broadcast events - caller handles UI
   */
  const recoverFromError = useCallback(async (options?: { 
    silent?: boolean;
    attemptReconnect?: boolean;
  }): Promise<boolean> => {
    const { attemptReconnect: shouldReconnect = false } = options || {};
    
    // Rate limit
    const now = Date.now();
    if (now - lastRecoveryRef.current < RECOVERY_COOLDOWN_MS || isRecoveringRef.current) {
      return false;
    }
    
    isRecoveringRef.current = true;
    lastRecoveryRef.current = now;
    
    console.log('[FCZ-WALLET] Starting recovery...');
    
    try {
      await cleanupWalletConnectSessions();
      
      if (isConnected) {
        try { disconnect(); } catch {}
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      invalidateWalletQueries();
      
      if (shouldReconnect) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const reconnected = await attemptReconnect();
        if (reconnected) {
          console.log('[FCZ-WALLET] Recovery successful');
          return true;
        }
      }
      
      // Let caller handle UI notification
      console.log('[FCZ-WALLET] Recovery complete - waiting for user to reconnect');
      return true;
    } catch (error) {
      console.error('[FCZ-WALLET] Recovery failed:', error);
      return false;
    } finally {
      isRecoveringRef.current = false;
    }
  }, [cleanupWalletConnectSessions, isConnected, disconnect, invalidateWalletQueries, attemptReconnect]);

  /**
   * Wrap an async operation with session recovery
   * NOTE: Does NOT show toasts - caller handles UI
   */
  const withSessionRecovery = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: { 
      maxRetries?: number; 
      retryDelay?: number;
      showToast?: boolean; // Ignored - for API compatibility
      operationTimeoutMs?: number;
    }
  ): Promise<T> => {
    const maxRetries = options?.maxRetries ?? 1;
    const retryDelay = options?.retryDelay ?? 1000;
    const operationTimeoutMs = options?.operationTimeoutMs ?? 60_000;
    
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Race operation vs timeout
        const opPromise = operation();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Wallet operation timed out')), operationTimeoutMs);
        });
        return await Promise.race([opPromise, timeoutPromise]);
      } catch (error) {
        lastError = error;
        const isTimeout = error instanceof Error && error.message.includes('timed out');
        
        if (isSessionError(error) || isTimeout) {
          console.warn(`[FCZ-WALLET] Session error attempt ${attempt + 1}:`, 
            error instanceof Error ? error.message : error);
          
          await recoverFromError({ attemptReconnect: attempt === 0 });
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  }, [isSessionError, recoverFromError]);

  /**
   * Initial cleanup of stale sessions on mount
   * 
   * DISABLED: Cleanup is now handled ONLY by Web3Provider to prevent race conditions.
   * Having multiple cleanup points (Web3Provider + useWalletConnectSession) was causing
   * wallet disconnections during page navigation because:
   * 1. This hook remounts when pages change (via useAutoNetworkSwitch in WalletPageV2)
   * 2. React Suspense/navigation can cause brief 'disconnected' states
   * 3. Multiple cleanup attempts at different times can race with wagmi reconnection
   * 
   * Web3Provider is the single source of truth for cleanup timing.
   */
  // DISABLED - Web3Provider handles all cleanup
  // useEffect(() => { ... }, []);

  /**
   * Cleanup when disconnected
   * IMPORTANT: Only cleanup if truly disconnected, not during reconnection or page navigation
   * 
   * v8: DISABLED automatic cleanup on disconnect status change
   * This was causing the wallet to disconnect during page navigation because:
   * 1. React Suspense causes component remounts during navigation
   * 2. During remount, wagmi's hydration can briefly show 'disconnected' status
   * 3. This effect would then run and clean up localStorage keys
   * 4. Which would break the actual connection
   * 
   * The cleanup should ONLY happen:
   * - On initial mount (handled by initialCleanupDoneRef effect above)
   * - When user explicitly disconnects (handled by disconnectWithCleanup)
   * - When recovering from errors (handled by recoverFromError)
   */
  // DISABLED - see comment above
  // useEffect(() => { ... }, [status, isConnecting, cleanupWalletConnectSessions]);

  return {
    disconnectWithCleanup,
    recoverFromError,
    cleanupWalletConnectSessions,
    isSessionError,
    withSessionRecovery,
    invalidateWalletQueries,
    attemptReconnect,
    isRecovering: isRecoveringRef.current,
  };
}
