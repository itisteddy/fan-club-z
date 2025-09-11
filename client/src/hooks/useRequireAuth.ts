import { useAuthStore } from '../store/authStore';
import { useAuthSheet } from '../components/auth/AuthSheetProvider';

export const useRequireAuth = () => {
  const { isAuthenticated } = useAuthStore();
  const { openSheet } = useAuthSheet();

  const requireAuth = (callback: () => void, reason: string = 'This action requires authentication') => {
    if (!isAuthenticated) {
      openSheet({ reason });
      return;
    }
    callback();
  };

  return { requireAuth, isAuthenticated };
};