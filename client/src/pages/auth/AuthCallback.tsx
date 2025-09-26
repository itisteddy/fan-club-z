import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useSupabase } from '../../providers/SupabaseProvider';

const AuthCallback: React.FC = () => {
  const { supabase } = useSupabase();
  const [location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 Processing OAuth callback...');
        console.log('🔐 Current URL:', window.location.href);
        console.log('🔐 URL search params:', new URLSearchParams(window.location.search));
        console.log('🔐 URL hash params:', new URLSearchParams(window.location.hash.substring(1)));
        
        // First, try to get session from the current URL
        const { data: initialData, error: initialError } = await supabase.auth.getSession();
        console.log('🔐 Initial session check:', { initialData, initialError });
        
        // Check if we have URL parameters that indicate an OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = urlParams.get('code');
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const error = urlParams.get('error') || hashParams.get('error');
        
        console.log('🔐 OAuth callback parameters:', { code, accessToken, error });
        
        if (error) {
          console.error('🔐 OAuth error in URL:', error);
          setError(`OAuth error: ${error}`);
          setLoading(false);
          return;
        }
        
        // If we have a code or access token, let Supabase handle the exchange
        if (code || accessToken) {
          console.log('🔐 OAuth parameters detected, waiting for Supabase to process...');
          
          // Wait for Supabase to process the OAuth callback
          let attempts = 0;
          const maxAttempts = 10;
          const checkSession = async (): Promise<boolean> => {
            attempts++;
            console.log(`🔐 Session check attempt ${attempts}/${maxAttempts}`);
            
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error(`🔐 Session check error (attempt ${attempts}):`, error);
              if (attempts >= maxAttempts) {
                setError(`Session check failed: ${error.message}`);
                setLoading(false);
                return false;
              }
              return false;
            }
            
            if (data.session && data.session.user) {
              console.log(`✅ Session found on attempt ${attempts}:`, data.session.user.email);
              setLocation('/', { replace: true });
              return true;
            }
            
            console.log(`⚠️ No session on attempt ${attempts}`);
            return false;
          };
          
          // Initial check
          const initialSuccess = await checkSession();
          if (!initialSuccess) {
            // Retry with exponential backoff
            const retryIntervals = [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500];
            
            for (const interval of retryIntervals) {
              if (attempts >= maxAttempts) break;
              
              await new Promise(resolve => setTimeout(resolve, interval));
              const success = await checkSession();
              if (success) return;
            }
            
            // If all attempts failed
            setError('Failed to establish authentication session after OAuth callback');
            setLoading(false);
          }
        } else {
          // No OAuth parameters, check if we already have a session
          if (initialData.session) {
            console.log('✅ Existing session found:', initialData.session.user.email);
            setLocation('/', { replace: true });
          } else {
            console.log('⚠️ No OAuth parameters and no existing session');
            setError('No authentication data found in callback');
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error('🔐 OAuth callback exception:', err);
        setError(err.message || 'Authentication failed');
        setLoading(false);
      }
    };

    // Small delay to let Supabase initialize
    const timer = setTimeout(handleAuthCallback, 300);
    return () => clearTimeout(timer);
  }, [supabase, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Sign In...</h2>
          <p className="text-gray-600">Please wait while we finish setting up your account.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Authentication Error</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
          </div>
          <button
            onClick={() => {
              setLocation('/', { replace: true });
            }}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
