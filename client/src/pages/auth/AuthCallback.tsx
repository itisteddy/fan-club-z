import React, { useEffect, useState, useRef } from 'react';
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
  const isProcessingRef = useRef(false); // Idempotency guard

  useEffect(() => {
    const handleCallback = async () => {
      // Idempotency guard: prevent double execution
      if (isProcessingRef.current) {
        console.log('[auth:cb] Already processing callback, skipping duplicate');
        return;
      }
      isProcessingRef.current = true;

      try {
        // Parse URL params
        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash || '';
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        const hasHashAccessToken = hash.includes('access_token=');
        const hasQueryAccessToken = Boolean(searchParams.get('access_token'));
        const isOAuthFlow = Boolean(code);
        const isMagicLinkFlow = hasHashAccessToken || hasQueryAccessToken;

        console.log('[auth:cb] mounted', { hasCode: Boolean(code), hasError: Boolean(errorParam) });

        // Handle error case
        if (errorParam) {
          const errorMsg = errorDescription || errorParam || 'Authentication failed';
          console.error('[auth:cb] OAuth error:', errorParam, errorDescription);
          setError(errorMsg);
          // Clear URL params to prevent re-processing
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        // If no code and no access_token, show error
        if (!isOAuthFlow && !isMagicLinkFlow) {
          console.error('[auth:cb] No auth code or token in URL');
          setError('No authentication code found. Please try signing in again.');
          return;
        }

        // Check if we already have a valid session (idempotency)
        const { data: { session: existingSession }, error: sessionCheckError } = await supabase.auth.getSession();
        if (existingSession && !sessionCheckError) {
          console.log('[auth:cb] Session already exists, redirecting');
          const nextFromUrl = searchParams.get('next');
          const nextFromStorage = consumeReturnTo();
          const target = sanitizeInternalPath(nextFromUrl ?? nextFromStorage ?? '/predictions');
          
          // Clear URL params
          window.history.replaceState({}, '', window.location.pathname);
          
          console.log('[auth:cb] redirecting to', { returnTo: target });
          navigate(target, { replace: true });
          return;
        }

        // For magic-link flows
        if (isMagicLinkFlow && !isOAuthFlow) {
          console.log('[auth:cb] Processing magic-link flow');
          try {
            const { data: urlData, error: urlError } = await (supabase.auth as any).getSessionFromUrl({
              storeSession: true,
            });
            if (urlError) {
              throw urlError;
            }
            if (!urlData?.session) {
              throw new Error('Magic link session not established');
            }
            console.log('[auth:cb] Magic-link session established');
          } catch (urlException: any) {
            console.error('[auth:cb] Magic-link error:', urlException);
            throw urlException;
          }
        }

        // For OAuth flows: exchange code for session using FULL URL
        if (isOAuthFlow && code) {
          console.log('[auth:cb] exchanging code...');
          try {
            // CRITICAL: Use full URL for exchangeCodeForSession (Supabase expects full callback URL)
            const fullCallbackUrl = window.location.href;
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(fullCallbackUrl);
            
            if (exchangeError) {
              console.error('[auth:cb] Code exchange error:', exchangeError);
              throw exchangeError;
            }
            
            if (!exchangeData?.session) {
              throw new Error('Code exchange succeeded but no session returned');
            }
            
            console.log('[auth:cb] exchange success');
            
            // Immediately verify session exists
            const { data: { session: verifiedSession }, error: verifyError } = await supabase.auth.getSession();
            if (verifyError || !verifiedSession) {
              throw new Error('Session verification failed after exchange');
            }
            
            console.log('[auth:cb] session present', { userId: verifiedSession.user.id });
            
            // Clear URL params to prevent re-processing
            window.history.replaceState({}, '', window.location.pathname);
          } catch (exchangeErr: any) {
            console.error('[auth:cb] Exchange failed:', exchangeErr);
            throw exchangeErr;
          }
        }

        // Final session check
        const { data: { session: finalSession }, error: finalSessionError } = await supabase.auth.getSession();
        if (finalSessionError) {
          console.error('[auth:cb] Final session check error:', finalSessionError);
          throw finalSessionError;
        }

        if (!finalSession) {
          throw new Error('Authentication failed: No session established');
        }

        // Get return URL
        const nextFromUrl = searchParams.get('next');
        const nextFromStorage = consumeReturnTo();
        const target = sanitizeInternalPath(nextFromUrl ?? nextFromStorage ?? '/predictions');
        
        console.log('[auth:cb] redirecting to', { returnTo: target });
        
        // Navigate to target
        navigate(target, { replace: true });
      } catch (err: any) {
        console.error('[auth:cb] Callback error:', err);
        setError(err.message || 'Authentication failed');
        isProcessingRef.current = false; // Allow retry on error
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
