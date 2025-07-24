import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';

interface WalletInitializationState {
  isWalletReady: boolean;
  walletBalance: number;
  isWalletInitialized: boolean;
  error: string | null;
}

const useWalletInitialization = (): WalletInitializationState => {
  const { user, isAuthenticated } = useAuthStore();
  const { balance, isInitialized, error, initializeWallet } = useWalletStore();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      // Only initialize if user is authenticated and we haven't already initialized
      if (isAuthenticated && user?.id && !hasInitialized && !isInitialized) {
        try {
          setLocalError(null);
          await initializeWallet(user.id);
          setHasInitialized(true);
        } catch (error) {
          // Silently handle wallet initialization errors to prevent console spam
          // These are often due to backend connectivity issues during development
          setLocalError(null); // Don't expose internal errors to user
          setHasInitialized(true); // Mark as attempted to prevent retry loops
        }
      }
    };

    // Add a small delay to prevent initialization spam
    const timeoutId = setTimeout(initialize, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user?.id, isInitialized, hasInitialized, initializeWallet]);

  // Reset initialization state when user changes
  useEffect(() => {
    setHasInitialized(false);
    setLocalError(null);
  }, [user?.id]);

  return {
    isWalletReady: isAuthenticated && isInitialized,
    walletBalance: typeof balance === 'number' ? balance : 0,
    isWalletInitialized: isInitialized,
    error: localError || error
  };
};

export default useWalletInitialization;