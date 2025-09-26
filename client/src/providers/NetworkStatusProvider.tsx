import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NetworkStatusContextType {
  isOnline: boolean;
  isSlowConnection: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};

interface NetworkStatusProviderProps {
  children: ReactNode;
}

export const NetworkStatusProvider: React.FC<NetworkStatusProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Network: Online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🌐 Network: Offline');
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection speed if available
    const checkConnectionSpeed = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const isSlow = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
          setIsSlowConnection(isSlow);
          
          if (isSlow) {
            console.log('🐌 Network: Slow connection detected');
          }
        }
      }
    };

    checkConnectionSpeed();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value: NetworkStatusContextType = {
    isOnline,
    isSlowConnection,
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
};
