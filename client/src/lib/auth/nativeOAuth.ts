/**
 * Phase 3: Deterministic iOS OAuth callback handler
 * 
 * This module provides a single, centralized handler for native OAuth deep link callbacks.
 * It ensures:
 * - One place that handles fanclubz://auth/callback
 * - Automatic Browser.close() after successful exchange
 * - Proper session persistence
 * - No duplicate handling
 */

import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase';
import { shouldUseIOSDeepLinks } from '@/config/platform';

let isProcessingCallback = false;

/**
 * Handle native OAuth callback from deep link
 * 
 * @param url - The deep link URL (e.g., fanclubz://auth/callback?code=xxx&state=yyy)
 * @returns true if this was an auth callback and was handled, false otherwise
 */
export async function handleNativeAuthCallback(url: string): Promise<boolean> {
  // Only process if we should use iOS deep links (fail-safe guard)
  if (!shouldUseIOSDeepLinks()) {
    return false;
  }

  // Prevent duplicate processing
  if (isProcessingCallback) {
    if (import.meta.env.DEV) {
      console.log('[NativeOAuth] Already processing callback, ignoring duplicate');
    }
    return false;
  }

  // Check if this is an auth callback URL
  const isDeepLinkCallback = url && url.startsWith('fanclubz://auth/callback');
  const isHttpsCallback = url && (
    url.includes('app.fanclubz.app/auth/callback') ||
    url.includes('localhost/auth/callback') ||
    url.includes('127.0.0.1/auth/callback')
  );

  if (!isDeepLinkCallback && !isHttpsCallback) {
    return false;
  }

  isProcessingCallback = true;

  try {
    if (import.meta.env.DEV) {
      console.log('═══════════════════════════════════════');
      console.log('[NativeOAuth] 🔐 Auth callback detected');
      console.log('[NativeOAuth] URL:', url);
      console.log('[NativeOAuth] Type:', isDeepLinkCallback ? 'deep-link' : 'https');
      console.log('═══════════════════════════════════════');
    }

    // Close the browser immediately (critical for UX)
    try {
      await Browser.close();
      if (import.meta.env.DEV) {
        console.log('[NativeOAuth] ✅ Browser closed');
      }
    } catch (err) {
      // Browser may already be closed, ignore
      if (import.meta.env.DEV) {
        console.log('[NativeOAuth] ⚠️ Browser.close() failed (may already be closed)');
      }
    }

    // For deep link (fanclubz://auth/callback?code=...), extract code and exchange
    if (isDeepLinkCallback) {
      if (import.meta.env.DEV) {
        console.log('[NativeOAuth] Processing deep link callback...');
      }

      // Parse the deep link URL to extract query params
      let code: string | null = null;
      let state: string | null = null;

      try {
        // Deep link format: fanclubz://auth/callback?code=xxx&state=yyy
        const urlObj = new URL(url.replace('fanclubz://', 'https://'));
        code = urlObj.searchParams.get('code');
        state = urlObj.searchParams.get('state');

        // Some providers return values in the hash fragment
        if (!code && urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''));
          code = hashParams.get('code');
          if (!state) {
            state = hashParams.get('state');
          }
        }

        if (import.meta.env.DEV) {
          console.log('[NativeOAuth] Extracted:', {
            code: code ? 'present' : 'missing',
            state: state ? 'present' : 'missing'
          });
        }
      } catch (err) {
        console.error('[NativeOAuth] ❌ Failed to parse deep link URL:', err);
        isProcessingCallback = false;
        return false;
      }

      // Exchange the code for a session using Supabase PKCE flow
      // CRITICAL: Supabase PKCE requires FULL callback URL, not just code
      if (code) {
        try {
          // Construct the full callback URL that Supabase expects
          const fullCallbackUrl = url; // Use the original deep link URL
          
          if (import.meta.env.DEV) {
            console.log('[NativeOAuth] Exchanging code with full URL:', fullCallbackUrl);
          }

          const { data, error } = await supabase.auth.exchangeCodeForSession(fullCallbackUrl);

          if (error) {
            console.error('[NativeOAuth] ❌ Code exchange failed:', error);
            // Emit error event for UI feedback
            window.dispatchEvent(new CustomEvent('auth-in-progress', {
              detail: { started: false, error: true, message: error.message }
            }));
            isProcessingCallback = false;
            return true; // We handled it, even if it failed
          }

          if (data?.session) {
            if (import.meta.env.DEV) {
              console.log('[NativeOAuth] ✅ Exchange success, session present', { userId: data.session.user.id });
            }

            // Emit success event (overlay will hide)
            window.dispatchEvent(new CustomEvent('auth-in-progress', {
              detail: { started: false, completed: true }
            }));

            // Trigger session refresh in auth store
            // The AuthCallback component will handle final verification
            const callbackPath = '/auth/callback' + (url.includes('?') ? url.substring(url.indexOf('?')) : '');
            
            if (import.meta.env.DEV) {
              console.log('[NativeOAuth] Navigating to callback route:', callbackPath);
            }

            // Use window.location to trigger full navigation (ensures AuthCallback runs)
            window.location.href = callbackPath;
            isProcessingCallback = false;
            return true;
          }
        } catch (err) {
          console.error('[NativeOAuth] ❌ Code exchange exception:', err);
          window.dispatchEvent(new CustomEvent('auth-in-progress', {
            detail: { started: false, error: true }
          }));
          isProcessingCallback = false;
          return true; // We handled it, even if it failed
        }
      } else {
        console.error('[NativeOAuth] ❌ No code found in callback URL');
        isProcessingCallback = false;
        return false;
      }
    } else if (isHttpsCallback) {
      // HTTPS callback (shouldn't happen in native, but handle gracefully)
      if (import.meta.env.DEV) {
        console.log('[NativeOAuth] HTTPS callback detected (unexpected in native)');
      }
      
      // Emit completed event
      window.dispatchEvent(new CustomEvent('auth-in-progress', {
        detail: { started: false, completed: true }
      }));

      // Navigate to callback route
      const callbackPath = '/auth/callback' + (url.includes('?') ? url.substring(url.indexOf('?')) : '');
      window.location.href = callbackPath;
      isProcessingCallback = false;
      return true;
    }

    isProcessingCallback = false;
    return false;
  } catch (err) {
    console.error('[NativeOAuth] ❌ Handler exception:', err);
    window.dispatchEvent(new CustomEvent('auth-in-progress', {
      detail: { started: false, error: true }
    }));
    isProcessingCallback = false;
    return true; // We attempted to handle it
  }
}
