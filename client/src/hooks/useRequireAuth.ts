import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAuthSheet } from '../components/auth/AuthSheetProvider';

export const useRequireAuth = () => {
  const { isAuthenticated } = useAuthStore();
  const { openSheet } = useAuthSheet();

  const requireAuth = useCallback((action: () => void, reason?: string) => {
    if (!isAuthenticated) {
      console.log('🔐 Auth required for action, reason:', reason);
      openSheet(reason);
      return;
    }
    
    action();
  }, [isAuthenticated, openSheet]);

  return { requireAuth, isAuthenticated };
};
