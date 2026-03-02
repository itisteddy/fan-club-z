/**
 * Web3Provider - Unified provider for all Web3/Wagmi functionality
 * 
 * ENHANCED v9: 
 * - FIXED: Wallet disconnect on page reload issue
 * - Explicit wagmi reconnect call on mount when persisted connection exists
 * - DEBOUNCED error handling to prevent duplicate messages
 * - Single source of truth for wallet errors
 * - No toast spam - UI components handle display
 * - Cleaner recovery flow
 * - IMPORTANT: Cleanup only runs when explicitly disconnected, NOT on page reload
 */

import React, { useEffect, useRef, useCallback, createContext, useContext, useState } from 'react';
import { WagmiProvider, useAccount, useDisconnect, useConnectors, useReconnect } from 'wagmi';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { config } from '../lib/wagmi';
import { initializeOnchainService, retryFailedTransactionLogs, setupBalanceRefreshListener } from '@/services/onchainTransactionService';
import { forceRefreshAllWalletData } from '@/utils/queryInvalidation';

// Session error patterns that indicate stale/expired sessions
// IMPORTANT: These patterns should be SPECIFIC to actual session failures
// Avoid overly broad patterns that match normal WalletConnect operations
const SESSION_ERROR_PATTERNS = [
  'no matching key',
  'session topic doesn\'t exist',
  'session not found',
  'pairing topic doesn\'t exist',
  'missing session',
  'inactive session',
  'session disconnected',
  'expired session',
  'please call connect() before request',
  'client not initialized',
  'pairing not found',
  'session request timeout',
  'peer disconnected',
  'signerclient is undefined',
  'provider not found',
  'connector not connected',
  'no signer available',
];

// Query keys to invalidate on session recovery
const WALLET_QUERY_KEYS = [
  ['wallet'],
  ['readContract'],
  ['balance'],
  ['allowance'],
  ['escrow'],
  ['usdcBalance'],
  ['escrow-balance'],
  ['unified-balance'],
  ['escrow-snapshot'],
  ['onchain-usdc'],
  ['claimable-claims'],
  ['merkle-proof'],
  ['wallet-summary'],
  ['onchain-activity'],
];

/**
 * Check if wagmi has a valid persisted connection in localStorage
 * This is used to determine if we should allow wagmi to reconnect
 */
function hasPersistedWagmiConnection(): boolean {
  try {
    const wagmiStore = localStorage.getItem('wagmi.store');
    if (!wagmiStore) return false;
    
    const parsed = JSON.parse(wagmiStore);
    const connections = parsed?.state?.connections;
    const current = parsed?.state?.current;
    
    if (!current || !connections?.value?.length) return false;
    
    // Check if there's an actual connection with accounts
    for (const entry of connections.value) {
      if (Array.isArray(entry) && entry[1]?.accounts?.length > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Recovery state management
interface Web3ContextState {
  isRecovering: boolean;
  lastRecoveryTime: number;
  sessionHealthy: boolean;
  lastError: { code: string; message: string } | null;
  triggerRecovery: () => Promise<boolean>;
  cleanupSessions: () => Promise<void>;
  wrapWithRecovery: <T>(operation: () => Promise<T>, options?: { maxRetries?: number }) => Promise<T>;
  clearLastError: () => void;
}

const Web3Context = createContext<Web3ContextState | null>(null);

export function useWeb3Recovery() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3Recovery must be used within Web3Provider');
  }
  return context;
}

// Query client configuration optimized for Web3
// PERFORMANCE FIX: Added better default caching settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false, // Reduce unnecessary refetches
      retry: (failureCount, error) => {
        const errorStr = String(error).toLowerCase();
        if (SESSION_ERROR_PATTERNS.some(p => errorStr.includes(p))) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// Inner provider that has access to wagmi hooks
function Web3ProviderInner({ children }: { children: React.ReactNode }) {
  const { address, connector, isConnected, isConnecting, isReconnecting, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { reconnect, isPending: isReconnectPending } = useReconnect();
  const connectors = useConnectors();
  const queryClient = useQueryClient();
  
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastRecoveryTime, setLastRecoveryTime] = useState(0);
  const [sessionHealthy, setSessionHealthy] = useState(true);
  const [lastError, setLastError] = useState<{ code: string; message: string } | null>(null);
  
  const recoveryLockRef = useRef(false);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const reconnectAttemptedRef = useRef(false);
  
  // Track latest connection state for cleanup timeout (prevents stale closures)
  const connectionStateRef = useRef({ isConnected, isConnecting, isReconnecting, status, address });

  // Keep connection state ref up to date (for cleanup timeout)
  useEffect(() => {
    connectionStateRef.current = { isConnected, isConnecting, isReconnecting, status, address };
  }, [isConnected, isConnecting, isReconnecting, status, address]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearLastError = useCallback(() => {
    setLastError(null);
  }, []);

  /**
   * CRITICAL FIX v9: Trigger wagmi reconnect on mount if persisted connection exists
   * This ensures the wallet reconnects after page reload
   */
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      
      // Initialize on-chain service
      try {
        initializeOnchainService();
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Web3] Failed to initialize on-chain service:', err);
      }
      
      retryFailedTransactionLogs().catch(() => {});
      
      // CRITICAL FIX: Check for persisted connection and trigger reconnect if needed
      // IMPORTANT: Do NOT run cleanup when there's a persisted connection - let wagmi handle reconnection
      const hasPersisted = hasPersistedWagmiConnection();
      if (hasPersisted && !isConnected && !isConnecting && !isReconnecting && !reconnectAttemptedRef.current) {
        reconnectAttemptedRef.current = true;
        // Small delay to let wagmi initialize fully before attempting reconnect
        setTimeout(() => {
          try {
            reconnect();
          } catch (e) {
            // Silently fail - wagmi will handle reconnection on its own
          }
        }, 200);
      }
    }
  }, [isConnected, isConnecting, isReconnecting, reconnect]);

  /**
   * Setup balance refresh listener
   */
  useEffect(() => {
    const cleanup = setupBalanceRefreshListener(queryClient);
    return cleanup;
  }, [queryClient]);

  /**
   * Check if an error indicates a stale session
   */
  const isSessionError = useCallback((error: unknown): boolean => {
    if (!error) return false;
    const errorMsg = String(error).toLowerCase();
    return SESSION_ERROR_PATTERNS.some(pattern => errorMsg.includes(pattern));
  }, []);

  /**
   * Clean up all WalletConnect sessions - COMPREHENSIVE
   */
  const cleanupSessions = useCallback(async () => {
    
    try {
      const wcConnector = connectors.find(c => c.id === 'walletConnect');
      if (wcConnector) {
        try {
          const provider = await wcConnector.getProvider().catch(() => null);
          if (provider && typeof (provider as any).disconnect === 'function') {
            await (provider as any).disconnect().catch(() => {});
          }
        } catch (e) {
          // Ignore - just trying to clean up
        }
      }

      // Clear all WC-related localStorage entries
      // IMPORTANT: DO NOT remove 'wagmi.store' - it contains connection state!
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Skip the main wagmi store - this holds connection state
        if (key === 'wagmi.store') continue;
        
        // Only remove WalletConnect-specific session data
        if (
          key.startsWith('wc@2:') ||
          key.startsWith('wc@1:') ||
          key.startsWith('walletconnect') ||
          key.startsWith('WALLETCONNECT') ||
          key.includes('wc_session') ||
          key.includes('@walletconnect') ||
          key.startsWith('wc_') ||
          (key.includes('pairing') && key.includes('wc')) ||
          (key.includes('relay') && key.includes('wc')) ||
          (key.includes('topic') && key.includes('wc')) ||
          key.includes('wallet-connect')
        ) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        try { localStorage.removeItem(key); } catch {}
      });

      // Also clear sessionStorage
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.startsWith('wc@2:') ||
          key.startsWith('wc@1:') ||
          key.startsWith('walletconnect') ||
          key.includes('@walletconnect') ||
          key.includes('wc_session')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => {
        try { sessionStorage.removeItem(key); } catch {}
      });

    } catch (error) {
      // Cleanup errors are non-critical, ignore silently
    }
  }, [connectors]);

  /**
   * Trigger full session recovery - NO TOASTS (let UI handle display)
   * CRITICAL FIX: Do NOT run cleanup if there's a persisted connection - let wagmi reconnect naturally
   */
  const triggerRecovery = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastRecoveryTime < 3000 || recoveryLockRef.current) {
      return false;
    }

    // CRITICAL: Check if there's a persisted connection - if so, don't cleanup, let wagmi reconnect
    const hasPersisted = hasPersistedWagmiConnection();
    if (hasPersisted && (isConnecting || isReconnecting)) {
      // Wagmi is already reconnecting - don't interfere
      return false;
    }

    recoveryLockRef.current = true;
    setIsRecovering(true);
    setLastRecoveryTime(now);

    try {
      /**
       * IMPORTANT UX FIX:
       * Do NOT automatically disconnect users during "recovery".
       * Some WalletConnect/session errors are transient (relay hiccups, mobile backgrounding),
       * and auto-disconnecting causes the "wallet disconnects after some time" issue.
       *
       * Recovery should primarily:
       * - invalidate/remove queries that may be stuck
       * - mark the session unhealthy so UI can prompt a reconnect
       *
       * Cleanup/disconnect should happen only when:
       * - user explicitly disconnects, OR
       * - we can positively detect there is NO persisted session AND wallet is already disconnected.
       */
      if (!hasPersisted && !isConnected && !isConnecting && !isReconnecting) {
        await cleanupSessions();
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      WALLET_QUERY_KEYS.forEach(key => {
        queryClient.removeQueries({ queryKey: key, exact: false });
      });

      // Broadcast reconnect event (UI listens for this)
      window.dispatchEvent(new CustomEvent('fcz:wallet:reconnect-required', {
        detail: { reason: 'Wallet session expired' }
      }));

      setSessionHealthy(false); // Mark as unhealthy until reconnected

      return true;
    } catch (error) {
      setSessionHealthy(false);
      return false;
    } finally {
      recoveryLockRef.current = false;
      if (mountedRef.current) {
        setIsRecovering(false);
      }
    }
  }, [cleanupSessions, isConnected, isConnecting, isReconnecting, lastRecoveryTime, queryClient]);

  /**
   * Wrap an async operation with automatic recovery on session errors
   */
  const wrapWithRecovery = useCallback(<T,>(
    operation: () => Promise<T>,
    options?: { maxRetries?: number; retryDelay?: number; operationTimeoutMs?: number }
  ): Promise<T> => {
    const exec = async () => {
      const maxRetries = options?.maxRetries ?? 1;
      const retryDelay = options?.retryDelay ?? 1000;
      const operationTimeoutMs = options?.operationTimeoutMs ?? 60_000;
      let lastError: unknown = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const opPromise = operation();
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error('Wallet operation timed out. Please try again.'));
            }, operationTimeoutMs);
          });
          
          return await Promise.race([opPromise, timeoutPromise]);
        } catch (error) {
          lastError = error;

          const isTimeoutError = error instanceof Error && 
            error.message.toLowerCase().includes('timed out');

          if (isSessionError(error) || isTimeoutError) {
            const recovered = await triggerRecovery();

            if (recovered && attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
          }

          throw error;
        }
      }

      throw lastError;
    };

    return exec();
  }, [isSessionError, triggerRecovery]);

  /**
   * Listen for balance refresh events
   */
  useEffect(() => {
    const handleBalanceRefresh = () => {
      forceRefreshAllWalletData(queryClient);
    };

    window.addEventListener('fcz:balance:refresh', handleBalanceRefresh);
    
    return () => {
      window.removeEventListener('fcz:balance:refresh', handleBalanceRefresh);
    };
  }, [queryClient]);

  /**
   * When connection becomes healthy again, reset state
   */
  useEffect(() => {
    if (isConnected && address) {
      setSessionHealthy(true);
      setLastError(null);
      reconnectAttemptedRef.current = false; // Reset for next page load
    }
  }, [isConnected, address]);

  const contextValue: Web3ContextState = {
    isRecovering,
    lastRecoveryTime,
    sessionHealthy,
    lastError,
    triggerRecovery,
    cleanupSessions,
    wrapWithRecovery,
    clearLastError,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
}

// Main provider export
export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Web3ProviderInner>
          {children}
        </Web3ProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Provider;
