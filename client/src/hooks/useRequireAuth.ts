import { useAuthSheet } from '../components/auth/AuthSheetProvider';
import { useAuthStore } from '../store/authStore';

export function useRequireAuth() {
  const { openSheet } = useAuthSheet();
  const user = useAuthStore(s => s.user);
  
  return async () => {
    if (user) return true;
    
    await openSheet('auth-required');
    
    // Check if user authenticated after sheet interaction
    return !!useAuthStore.getState().user;
  };
}
