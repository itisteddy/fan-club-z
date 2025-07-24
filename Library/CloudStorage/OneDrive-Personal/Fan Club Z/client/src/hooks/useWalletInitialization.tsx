import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';

/**
 * Hook to ensure wallet is properly initialized for the current user
 * FIXED: No longer re-initializes on navigation, preserves balance
 */
export const useWalletInitialization = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { isInitialized, balance, initializeWallet } = useWalletStore();
  const initializationAttempted = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (isAuthenticated && user && !isInitialized) {
      // Check if we've already attempted initialization for this user
      if (!initializationAttempted.current.has(user.id)) {
        console.log('[WALLET] Initializing wallet for user:', user.id);
        initializationAttempted.current.add(user.id);
        
        initializeWallet(user.id).catch(error => {
          console.error('[WALLET] Initialization failed:', error);
          // Remove from set on failure so we can retry
          initializationAttempted.current.delete(user.id);
        });
      }
    }
  }, [isAuthenticated, user?.id, isInitialized]); // FIXED: Removed initializeWallet from deps

  // Clear initialization cache when user changes
  useEffect(() => {
    if (user?.id) {
      // Keep current user in cache, but clear others
      const currentUserId = user.id;
      initializationAttempted.current = new Set([currentUserId]);
    }
  }, [user?.id]);

  return {
    isWalletReady: isAuthenticated && isInitialized,
    walletBalance: balance,
    isWalletInitialized: isInitialized
  };
};

/**
 * Higher-order component to ensure wallet is initialized before rendering children
 */
export const withWalletInitialization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { isWalletReady } = useWalletInitialization();
    
    // Always render - wallet will initialize in background
    return <Component {...props} />;
  };
};

export default useWalletInitialization;
