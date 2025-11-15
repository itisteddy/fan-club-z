import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../providers/SupabaseProvider';
import { consumeReturnTo, sanitizeInternalPath } from '../../lib/returnTo';

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Completing Sign In...</h2>
        <p className="text-gray-600">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
}

const AuthCallback: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('================================================================================');
        console.log('AUTH CALLBACK STARTED');
        console.log('================================================================================');
        console.log('Current URL:', window.location.href);
        
        // First, check if we already have a valid session
        const { data: { session: existingSession }, error: sessionCheckError } = await supabase.auth.getSession();
        if (existingSession && !sessionCheckError) {
          console.log('✅ Already have a valid session, skipping PKCE flow');
          console.log('User:', existingSession.user.email);
          
          // Get the next parameter and redirect
          const searchParams = new URLSearchParams(window.location.search);
          const nextFromUrl = searchParams.get('next');
          const nextFromStorage = consumeReturnTo();
          const target = sanitizeInternalPath(nextFromUrl ?? nextFromStorage ?? '/');
          
          console.log('Redirecting to:', target);
          await new Promise(resolve => setTimeout(resolve, 500));
          navigate(target, { replace: true });
          return;
        }
        
        // Get the next parameter from URL
        const searchParams = new URLSearchParams(window.location.search);
        const nextFromUrl = searchParams.get('next');
        console.log('Next from URL:', nextFromUrl);
        console.log('Decoded next:', nextFromUrl ? decodeURIComponent(nextFromUrl) : null);
        
        // Get from sessionStorage as fallback
        const nextFromStorage = consumeReturnTo();
        console.log('Next from storage:', nextFromStorage);
        
        // For PKCE/callback flows: exchange code for session
        const code = searchParams.get('code');
        const codeVerifier = searchParams.get('code_verifier');
        
        console.log('Auth callback parameters:', {
          code: code ? 'present' : 'missing',
          codeVerifier: codeVerifier ? 'present' : 'missing',
          allParams: Object.fromEntries(searchParams.entries())
        });
        
        // Log sessionStorage contents for debugging
        console.log('SessionStorage contents:', {
          supabaseCodeVerifier: sessionStorage.getItem('supabase.auth.code_verifier'),
          allKeys: Object.keys(sessionStorage).filter(key => key.includes('supabase') || key.includes('auth'))
        });
        
        if (code) {
          console.log('Exchanging code for session...');
          
          // Try multiple approaches to get the code verifier
          let finalCodeVerifier = codeVerifier;
          
          // Check various possible storage locations
          const possibleKeys = [
            'supabase.auth.code_verifier',
            'sb-ihtnsyhknvltgrksffun-auth-token.code_verifier',
            'supabase.code_verifier',
            'auth.code_verifier'
          ];
          
          for (const key of possibleKeys) {
            const stored = sessionStorage.getItem(key);
            if (stored) {
              finalCodeVerifier = stored;
              console.log(`Found code verifier in sessionStorage key: ${key}`);
              break;
            }
          }
          
          // Also check localStorage as fallback
          if (!finalCodeVerifier) {
            for (const key of possibleKeys) {
              const stored = localStorage.getItem(key);
              if (stored) {
                finalCodeVerifier = stored;
                console.log(`Found code verifier in localStorage key: ${key}`);
                break;
              }
            }
          }
          
          console.log('Final code verifier status:', finalCodeVerifier ? 'found' : 'not found');
          
          // Try the code exchange with different approaches
          let data, exchangeError;
          
          try {
            if (finalCodeVerifier) {
              console.log('Attempting code exchange with explicit code verifier...');
              const result = await (supabase.auth as any).exchangeCodeForSession({
                authCode: code,
                codeVerifier: finalCodeVerifier
              });
              data = result.data;
              exchangeError = result.error;
            } else {
              console.log('Attempting code exchange without explicit code verifier...');
              const result = await (supabase.auth as any).exchangeCodeForSession(code);
              data = result.data;
              exchangeError = result.error;
            }
          } catch (exchangeException: any) {
            console.error('Code exchange exception:', exchangeException);
            exchangeError = exchangeException;
          }
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            console.error('Error details:', {
              message: exchangeError.message,
              code: exchangeError.code,
              status: exchangeError.status
            });
            
            // If PKCE fails, try to check if we already have a valid session
            console.log('PKCE failed, checking for existing session...');
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (session && !sessionError) {
              console.log('Found existing valid session, proceeding with redirect...');
              // Continue with the redirect logic below
            } else {
              // Last resort: try to redirect anyway and let the app handle the auth state
              console.log('No valid session found, but attempting redirect anyway...');
              console.log('This might be a PKCE configuration issue. User may need to sign in again.');
              // Don't throw error, just continue with redirect
            }
          } else {
            console.log('Code exchange successful!', data);
          }
        } else {
          console.log('No code parameter found, checking for existing session...');
          // Check if we already have a valid session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('Session check error:', sessionError);
            throw sessionError;
          }
          if (!session) {
            throw new Error('No authentication code or valid session found');
          }
          console.log('Using existing session:', session.user.email);
        }
        
        // Determine where to redirect
        const target = sanitizeInternalPath(nextFromUrl ?? nextFromStorage ?? '/');
        console.log('Final redirect target:', target);
        console.log('================================================================================');
        
        // Small delay to ensure session is fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate to target using react-router-dom
        console.log('Navigating to:', target);
        navigate(target, { replace: true });
      } catch (err: any) {
        console.error('Auth callback error:', err);
        console.error('Error details:', {
          message: err.message,
          code: err.code,
          status: err.status,
          name: err.name
        });
        setError(err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [supabase, navigate]);

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
            onClick={() => navigate('/', { replace: true })}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return <Spinner />;
};

export default AuthCallback;
