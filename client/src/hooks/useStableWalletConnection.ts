import { useAccount, useReconnect } from 'wagmi';
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A stabilized version of useAccount that prevents UI flicker during 
 * page navigation and wagmi hydration.
 * 
 * Problem: During React route changes and page reloads, wagmi briefly shows 
 * isConnected: false before reconnecting from persisted state. This causes 
 * "Connect Wallet" buttons to flash momentarily.
 * 
 * Solution: This hook adds a grace period and considers 'reconnecting' status
 * as "connected enough" to prevent UI flicker.
 * 
 * v4 FIXES:
 * - Extended grace period to 12 seconds for slow WalletConnect reconnections
 * - Added explicit wagmi reconnect trigger when grace period expires
 * - Better handling of WalletConnect reconnection delays
 * - Reduced logging to improve performance
 * - Fixed issue where wallet disconnects on page reload
 */

interface StableConnectionState {
  /** True if wallet is connected or reconnecting (stable for UI) */
  isEffectivelyConnected: boolean;
  /** True if in transition state (connecting/reconnecting) */
  isTransitioning: boolean;
  /** The actual address (may be undefined during transitions) */
  address: `0x${string}` | undefined;
  /** The actual chainId */
  chainId: number | undefined;
  /** The raw wagmi status */
  status: ReturnType<typeof useAccount>['status'];
  /** The raw isConnected value (use isEffectivelyConnected for UI) */
  rawIsConnected: boolean;
  /** True if we had a previous connection (helps with persistence) */
  hadPreviousConnection: boolean;
}

// Extended grace period to allow wagmi to restore WalletConnect sessions
// WC sessions can take up to 10-15 seconds to fully restore on page reload
const DISCONNECTION_GRACE_PERIOD_MS = 12000;

/**
 * Synchronously check if wagmi has a persisted connection in localStorage
 * This is called on every render to avoid stale ref issues during page navigation
 */
function checkPersistedConnection(): { hasPersisted: boolean; lastAddress: `0x${string}` | undefined; connectorId: string | undefined } {
  try {
    const wagmiStore = localStorage.getItem('wagmi.store');
    if (wagmiStore) {
      const parsed = JSON.parse(wagmiStore);
      // Check for connection in wagmi's persisted state
      // Structure: { state: { connections: { __type: 'Map', value: [[key, {accounts: [...]}]] }, current: 'key' } }
      const connections = parsed?.state?.connections;
      const current = parsed?.state?.current;
      
      if (current && connections?.value?.length > 0) {
        // Find the current connection
        const currentConnection = connections.value.find(
          (entry: any) => Array.isArray(entry) && entry[0] === current
        );
        
        if (currentConnection && currentConnection[1]?.accounts?.length > 0) {
          const lastAddress = currentConnection[1].accounts[0] as `0x${string}`;
          const connectorId = currentConnection[1]?.connector?.id || current;
          return { hasPersisted: true, lastAddress, connectorId };
        }
        
        // Fallback: just check if there's any connection with accounts
        for (const entry of connections.value) {
          if (Array.isArray(entry) && entry[1]?.accounts?.length > 0) {
            return { 
              hasPersisted: true, 
              lastAddress: entry[1].accounts[0] as `0x${string}`,
              connectorId: entry[1]?.connector?.id || entry[0]
            };
          }
        }
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { hasPersisted: false, lastAddress: undefined, connectorId: undefined };
}

function safeCheckPersistedConnection() {
  if (typeof window === 'undefined') {
    return { hasPersisted: false, lastAddress: undefined as `0x${string}` | undefined, connectorId: undefined as string | undefined };
  }
  return checkPersistedConnection();
}

export function useStableWalletConnection(): StableConnectionState {
  const { address, isConnected, isConnecting, isReconnecting, status, chainId } = useAccount();
  const { reconnect, isPending: isReconnectPending } = useReconnect();
  const statusValue = status as string;

  // Read persisted connection info synchronously on every render
  const { hasPersisted, lastAddress: persistedAddress, connectorId } = safeCheckPersistedConnection();
  
  const [isInGracePeriod, setIsInGracePeriod] = useState(
    () => (!isConnected && hasPersisted) || false
  );
  const gracePeriodTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptedRef = useRef(false);
  
  // Track the last known good address during transitions
  const lastKnownAddressRef = useRef<`0x${string}` | undefined>(undefined);
  
  // Update last known address when we have one
  useEffect(() => {
    if (address) {
      lastKnownAddressRef.current = address;
    }
  }, [address]);
  
  // Determine if we're in a transition state
  const isTransitioning = isConnecting || isReconnecting || isReconnectPending || 
                          statusValue === 'reconnecting' || statusValue === 'connecting';
  
  // Trigger reconnect when we have persisted data but aren't connected
  const triggerReconnect = useCallback(() => {
    if (!isConnected && !isTransitioning && hasPersisted && !reconnectAttemptedRef.current) {
      reconnectAttemptedRef.current = true;
      if (import.meta.env.DEV) {
        console.log('[StableWallet] Triggering reconnect for persisted connection');
      }
      try {
        reconnect();
      } catch (e) {
        // Reconnect might fail if no connectors are available
        if (import.meta.env.DEV) {
          console.log('[StableWallet] Reconnect failed:', e);
        }
      }
    }
  }, [isConnected, isTransitioning, hasPersisted, reconnect]);
  
  // Handle grace period for disconnection
  useEffect(() => {
    // Reset reconnect attempt flag when connection state changes significantly
    if (isConnected) {
      reconnectAttemptedRef.current = false;
    }
    
    // If currently showing disconnected but we have a persisted connection,
    // start grace period to prevent flash and allow wagmi to restore
    if (!isConnected && !isTransitioning && hasPersisted) {
      // Start grace period - don't immediately show disconnected
      if (!isInGracePeriod) {
        setIsInGracePeriod(true);
      }
      
      if (gracePeriodTimeoutRef.current) {
        clearTimeout(gracePeriodTimeoutRef.current);
      }
      
      // Try to trigger reconnect after a short delay
      const reconnectDelay = setTimeout(() => {
        triggerReconnect();
      }, 500);
      
      gracePeriodTimeoutRef.current = setTimeout(() => {
        // Re-check persisted connection before expiring grace period
        // Connection might have been restored during the grace period
        const { hasPersisted: stillPersisted } = safeCheckPersistedConnection();
        
        if (stillPersisted && !isConnected) {
          // Still have persisted connection but wagmi hasn't restored yet
          // Try one more reconnect attempt
          if (!reconnectAttemptedRef.current) {
            triggerReconnect();
          }
          
          if (import.meta.env.DEV) {
            console.log('[StableWallet] Grace period expiring - persisted connection exists but not reconnected');
          }
        }
        
        // Grace period expired - now show actual disconnected state
        setIsInGracePeriod(false);
        gracePeriodTimeoutRef.current = null;
      }, DISCONNECTION_GRACE_PERIOD_MS);
      
      return () => {
        clearTimeout(reconnectDelay);
      };
    }
    
    // If we're now connected or reconnecting, cancel grace period immediately
    if (isConnected || isTransitioning) {
      if (isInGracePeriod) {
        setIsInGracePeriod(false);
      }
      if (gracePeriodTimeoutRef.current) {
        clearTimeout(gracePeriodTimeoutRef.current);
        gracePeriodTimeoutRef.current = null;
      }
    }
    
    return () => {
      if (gracePeriodTimeoutRef.current) {
        clearTimeout(gracePeriodTimeoutRef.current);
      }
    };
  }, [isConnected, isTransitioning, hasPersisted, isInGracePeriod, triggerReconnect]);
  
  // Calculate effective connection state
  // Consider connected if:
  // 1. Actually connected, OR
  // 2. In transition state (connecting/reconnecting), OR
  // 3. In grace period after disconnection (giving wagmi time to restore)
  const isEffectivelyConnected = isConnected || isTransitioning || isInGracePeriod;
  
  // Use last known address during transitions, falling back to persisted address
  const effectiveAddress = address || 
    (isTransitioning || isInGracePeriod ? (lastKnownAddressRef.current || persistedAddress) : undefined);
  
  return {
    isEffectivelyConnected,
    isTransitioning: isTransitioning || isInGracePeriod,
    address: effectiveAddress,
    chainId,
    status,
    rawIsConnected: isConnected,
    hadPreviousConnection: hasPersisted,
  };
}
