/**
 * Enhanced WalletConnect Session Manager
 * Handles session/topic cleanup, recovery, and reconnection for WalletConnect providers
 * 
 * FIXES:
 * - Unhandled promise rejections for stale sessions
 * - Automatic session cleanup on errors
 * - Graceful reconnection attempts
 * - User-friendly error feedback
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAccount, useDisconnect, useReconnect } from 'wagmi';
import toast from 'react-hot-toast';

interface WalletConnectError {
  message?: string;
  code?: number;
  name?: string;
}

/**
 * Enhanced hook to handle WalletConnect session errors and cleanup
 * Provides automatic recovery and user feedback
 */
export function useWalletConnectRecovery() {
  const { connector, isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { reconnectAsync } = useReconnect();
  const lastErrorRef = useRef<string>('');
  const reconnectAttemptRef = useRef<number>(0);
  const maxReconnectAttempts = 3;

  /**
   * Clear all WalletConnect-related data from localStorage
   */
  const clearWalletConnectStorage = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;
      
      keys.forEach(key => {
        if (
          key.startsWith('wc@2:') ||
          key.startsWith('wagmi.') ||
          key.includes('walletconnect') ||
          key.includes('WALLETCONNECT')
        ) {
          console.log('[FCZ-WALLET] Clearing stale key:', key);
          localStorage.removeItem(key);
          cleared++;
        }
      });
      
      if (cleared > 0) {
        console.log(`[FCZ-WALLET] Cleared ${cleared} stale session key(s)`);
      }
      
      return cleared;
    } catch (error) {
      console.warn('[FCZ-WALLET] Failed to clear localStorage:', error);
      return 0;
    }
  }, []);

  /**
   * Check if error is a WalletConnect session error
   */
  const isWalletConnectSessionError = useCallback((error: any): boolean => {
    const errorMessage = (error?.message || error?.reason?.message || String(error)).toLowerCase();
    
    return (
      errorMessage.includes('no matching key') ||
      errorMessage.includes('session topic') ||
      errorMessage.includes('session not found') ||
      errorMessage.includes('invalid session') ||
      errorMessage.includes('pairing expired') ||
      errorMessage.includes('no pair found')
    );
  }, []);

  /**
   * Attempt to reconnect to wallet
   */
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      console.log('[FCZ-WALLET] Max reconnect attempts reached, giving up');
      toast.error('Unable to reconnect wallet. Please connect manually.', {
        duration: 5000,
      });
      return false;
    }

    reconnectAttemptRef.current++;
    console.log(`[FCZ-WALLET] Reconnect attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts}`);

    try {
      await reconnectAsync();
      console.log('[FCZ-WALLET] Reconnection successful');
      toast.success('Wallet reconnected successfully');
      reconnectAttemptRef.current = 0; // Reset counter on success
      return true;
    } catch (error) {
      console.warn('[FCZ-WALLET] Reconnection failed:', error);
      return false;
    }
  }, [reconnectAsync]);

  /**
   * Handle WalletConnect session errors with recovery
   */
  const handleSessionError = useCallback(async (error: WalletConnectError) => {
    const errorMessage = error?.message || String(error);
    
    // Prevent duplicate error handling
    if (lastErrorRef.current === errorMessage) {
      return;
    }
    lastErrorRef.current = errorMessage;

    console.warn('[FCZ-WALLET] WalletConnect session error detected:', errorMessage);

    // Disconnect current session
    if (isConnected) {
      console.log('[FCZ-WALLET] Disconnecting stale session...');
      try {
        disconnect();
      } catch (disconnectError) {
        console.warn('[FCZ-WALLET] Disconnect failed:', disconnectError);
      }
    }

    // Clear stale session data
    const cleared = clearWalletConnectStorage();
    
    // Wait a bit for cleanup to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Show user-friendly message
    toast.loading('Recovering wallet connection...', { id: 'wallet-recovery' });

    // Try to reconnect
    const reconnected = await attemptReconnect();
    
    if (reconnected) {
      toast.success('Wallet connection recovered', { id: 'wallet-recovery' });
    } else {
      toast.error('Please reconnect your wallet', { 
        id: 'wallet-recovery',
        duration: 5000 
      });
    }

    // Reset error tracking after some time
    setTimeout(() => {
      lastErrorRef.current = '';
    }, 5000);
  }, [isConnected, disconnect, clearWalletConnectStorage, attemptReconnect]);

  /**
   * Listen for unhandled promise rejections from WalletConnect
   */
  useEffect(() => {
    if (!connector) return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason as WalletConnectError;

      if (isWalletConnectSessionError(error)) {
        // Prevent default error logging in console
        event.preventDefault();
        
        // Handle the error gracefully
        handleSessionError(error);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [connector, isWalletConnectSessionError, handleSessionError]);

  /**
   * Monitor connection changes and reset reconnect counter on successful connection
   */
  useEffect(() => {
    if (isConnected && address) {
      console.log('[FCZ-WALLET] Wallet connected successfully:', address);
      reconnectAttemptRef.current = 0;
      lastErrorRef.current = '';
    }
  }, [isConnected, address]);

  /**
   * Manually clear WalletConnect session
   */
  const clearSession = useCallback(() => {
    console.log('[FCZ-WALLET] Manually clearing WalletConnect session...');
    
    if (isConnected) {
      disconnect();
    }

    const cleared = clearWalletConnectStorage();
    
    toast.success(`Cleared ${cleared} session(s). Please reconnect your wallet.`);
  }, [isConnected, disconnect, clearWalletConnectStorage]);

  /**
   * Force reconnection attempt
   */
  const forceReconnect = useCallback(async () => {
    console.log('[FCZ-WALLET] Force reconnect requested');
    reconnectAttemptRef.current = 0; // Reset counter
    return await attemptReconnect();
  }, [attemptReconnect]);

  return {
    clearSession,
    forceReconnect,
    isWalletConnectError: isWalletConnectSessionError,
  };
}

/**
 * Cleanup stale WalletConnect sessions on app initialization
 * Call this once during app startup
 */
export function cleanupStaleWalletConnectSessions() {
  console.log('[FCZ-WALLET] Running startup session cleanup...');
  
  try {
    const keys = Object.keys(localStorage);
    let cleaned = 0;

    keys.forEach(key => {
      if (
        key.startsWith('wc@2:') ||
        key.includes('walletconnect') ||
        key.includes('WALLETCONNECT')
      ) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            
            // Check if session is expired
            if (data.expiry && data.expiry < Date.now()) {
              console.log('[FCZ-WALLET] Removing expired session:', key);
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (parseError) {
          // If we can't parse it, it's probably corrupted - remove it
          console.log('[FCZ-WALLET] Removing corrupted session data:', key);
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`[FCZ-WALLET] Cleaned ${cleaned} stale/expired session(s) on startup`);
    } else {
      console.log('[FCZ-WALLET] No stale sessions found');
    }
    
    return cleaned;
  } catch (error) {
    console.warn('[FCZ-WALLET] Failed to cleanup stale sessions:', error);
    return 0;
  }
}

/**
 * Initialize wallet recovery system
 * Call this in App.tsx or main entry point
 */
export function initializeWalletRecovery() {
  // Clean up stale sessions on app load
  cleanupStaleWalletConnectSessions();

  // Set up periodic cleanup (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    cleanupStaleWalletConnectSessions();
  }, 5 * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(cleanupInterval);
  };
}
