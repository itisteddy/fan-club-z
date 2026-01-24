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

  // Helper: small delay
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Helper: wait briefly for Supabase to materialize a session from the URL
  const waitForSession = async (maxWaitMs: number = 2000): Promise<ReturnType<typeof supabase.auth.getSession>> => {
    const started = Date.now();
    let lastResult = await supabase.auth.getSession();

    while (!lastResult.data.session && Date.now() - started < maxWaitMs) {
      await sleep(250);
      lastResult = await supabase.auth.getSession();
    }

    return lastResult;
  };

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
        let nextFromUrl = searchParams.get('next');
        
        // Decode and sanitize the next parameter
        if (nextFromUrl) {
          try {
            nextFromUrl = decodeURIComponent(nextFromUrl);
            // If it's a full production URL, strip it to just the path
            if (nextFromUrl.includes('app.fanclubz.app') && !import.meta.env.PROD) {
              console.warn('⚠️ Blocked production URL in next parameter, using path only');
              const url = new URL(nextFromUrl);
              nextFromUrl = url.pathname + url.search + url.hash;
            }
          } catch (e) {
            console.warn('Failed to decode next parameter:', e);
            nextFromUrl = null;
          }
        }
        
        console.log('Next from URL:', nextFromUrl);
        console.log('Decoded next:', nextFromUrl);
        
        // Get from sessionStorage as fallback
        const nextFromStorage = consumeReturnTo();
        console.log('Next from storage:', nextFromStorage);
        
        // Sanitize storage value too
        let sanitizedStorage = nextFromStorage;
        if (sanitizedStorage && sanitizedStorage.includes('app.fanclubz.app') && !import.meta.env.PROD) {
          console.warn('⚠️ Blocked production URL in returnTo storage, using path only');
          try {
            const url = new URL(sanitizedStorage);
            sanitizedStorage = url.pathname + url.search + url.hash;
          } catch {
            sanitizedStorage = null;
          }
        }
        
        // Detect what type of auth flow we're handling
        const hash = window.location.hash || '';
        const hasHashAccessToken = hash.includes('access_token=');
        const hasQueryAccessToken = Boolean(searchParams.get('access_token'));
        const code = searchParams.get('code');
        const isOAuthFlow = Boolean(code); // OAuth (Google, etc.) uses code parameter
        const isMagicLinkFlow = hasHashAccessToken || hasQueryAccessToken; // Magic link uses access_token
        
        console.log('Auth flow detection:', {
          isOAuthFlow,
          isMagicLinkFlow,
          hasCode: Boolean(code),
          hasAccessToken: hasHashAccessToken || hasQueryAccessToken
        });
        
        // For magic-link flows: explicitly parse URL tokens
        if (isMagicLinkFlow && !isOAuthFlow) {
          console.log('Detected magic-link parameters in URL, calling getSessionFromUrl...');
          try {
            const { data: urlData, error: urlError } = await (supabase.auth as any).getSessionFromUrl({
              storeSession: true,
            });
            if (urlError) {
              console.warn('getSessionFromUrl reported error:', urlError.message || urlError);
            } else {
              console.log('getSessionFromUrl session result:', !!urlData?.session);
            }
          } catch (urlException: any) {
            console.warn('getSessionFromUrl threw exception:', urlException?.message || urlException);
          }
        }
        
        // For OAuth flows (Google, etc.): Explicitly exchange code for session
        // This ensures web OAuth always completes even if detectSessionInUrl fails
        if (isOAuthFlow && code) {
          console.log('Detected OAuth flow (code parameter present)');
          console.log('Exchanging code for session...');
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              throw exchangeError;
            }
            if (exchangeData?.session) {
              console.log('✅ Code exchange successful, session established');
            }
          } catch (exchangeErr: any) {
            console.warn('Code exchange failed, falling back to Supabase auto-handling:', exchangeErr);
            // Fallback: give Supabase time to process automatically
            await sleep(500);
          }
        }

        // 🔐 Final session check (handles both PKCE and magic-link flows)
        // Give Supabase a short window to hydrate the session from the URL
        const { data: { session: finalSession }, error: finalSessionError } = await waitForSession(2500);
        if (finalSessionError) {
          console.error('Final session check error:', finalSessionError);
          throw finalSessionError;
        }

        if (!finalSession) {
          // Determine which error message to show based on flow type
          if (isOAuthFlow) {
            throw new Error('Google sign-in failed. Please try signing in again. If the problem persists, try clearing your browser cookies and cache.');
          } else if (isMagicLinkFlow) {
            throw new Error('This sign-in link is invalid or has already been used. Please request a new email link to sign in.');
          } else {
            throw new Error('Authentication failed. Please try signing in again.');
          }
        }

        console.log('Using authenticated session for redirect:', finalSession.user.email);

        // Determine where to redirect
        const target = sanitizeInternalPath(nextFromUrl ?? sanitizedStorage ?? '/');
        console.log('Final redirect target:', target);
        console.log('Current origin:', window.location.origin);
        console.log('Environment PROD:', import.meta.env.PROD);
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
