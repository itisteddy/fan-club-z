import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuthSheet } from '../../components/auth/AuthSheetProvider';

export default function AuthSheetRoute() {
  const [, navigate] = useLocation();
  const { openSheet } = useAuthSheet();
  
  useEffect(() => {
    const handleAuthRoute = async () => {
      openSheet('deep-link');
      
      // Navigate back to previous page or home if no history
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    };
    
    handleAuthRoute();
  }, [navigate, openSheet]);

  return null;
}