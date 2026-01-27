/**
 * Phase 3: Deterministic iOS OAuth callback handler
 *
 * CRITICAL:
 * - Do NOT close the auth browser sheet until AFTER a successful code exchange.
 *   (Email/password flow runs inside the sheet and must not be interrupted.)
 */

import { supabase } from '@/lib/supabase';
import { isNativeIOSRuntime, isNativeAndroidRuntime } from '@/config/native';
import { consumeReturnTo, sanitizeInternalPath } from '@/lib/returnTo';
import { setNativeAuthInFlight } from '@/lib/auth/nativeAuthState';

let isProcessingCallback = false;
let lastHandledUrl: string | null = null;

export async function exchangeFromDeepLink(callbackUrl: string) {
  let u: URL;
  try {
    u = new URL(callbackUrl);
  } catch {
    // Fallback for some URL parsers with custom schemes
    u = new URL(callbackUrl.replace('fanclubz://', 'https://'));
  }

  const code = u.searchParams.get('code');
  if (!code) {
    throw new Error(`[NativeOAuth] Missing ?code= in callbackUrl: ${callbackUrl}`);
  }

  // CRITICAL: pass ONLY the code (NOT the full URL)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  if (!data?.session) throw new Error('[NativeOAuth] No session after exchange');
  return data.session;
}

/**
 * Handle native OAuth callback from deep link
 * 
 * @param url - The deep link URL (e.g., fanclubz://auth/callback?code=xxx&state=yyy)
 * @returns true if this was an auth callback and was handled, false otherwise
 */
export async function handleNativeAuthCallback(url: string): Promise<boolean> {
  // Only process in real native runtime (runtime is authoritative)
  if (!isNativeIOSRuntime() && !isNativeAndroidRuntime()) {
    return false;
  }

  // Prevent duplicate processing
  if (isProcessingCallback) {
    if (import.meta.env.DEV) {
      console.log('[NativeOAuth] Already processing callback, ignoring duplicate');
    }
    return false;
  }

  // Ignore duplicate appUrlOpen events for the same URL
  if (lastHandledUrl && url === lastHandledUrl) {
    if (import.meta.env.DEV) {
      console.log('[NativeOAuth] Duplicate callback URL received, ignoring');
    }
    return true;
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

    // For deep link (fanclubz://auth/callback?code=...), extract code and exchange
    if (isDeepLinkCallback) {
      if (import.meta.env.DEV) {
        console.log('[NativeOAuth] Processing deep link callback...');
      }

      // Parse the deep link URL to extract query params
      let code: string | null = null;
      let state: string | null = null;
      let next: string | null = null;

      try {
        // Deep link format: fanclubz://auth/callback?code=xxx&state=yyy
        const urlObj = new URL(url.replace('fanclubz://', 'https://'));
        code = urlObj.searchParams.get('code');
        state = urlObj.searchParams.get('state');
        next = urlObj.searchParams.get('next');

        // Some providers return values in the hash fragment
        if (!code && urlObj.hash) {
          const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''));
          code = hashParams.get('code');
          if (!state) {
            state = hashParams.get('state');
          }
          if (!next) {
            next = hashParams.get('next');
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
      if (code) {
        try {
          if (import.meta.env.DEV) {
            console.log('[NativeOAuth] Exchanging code (code-only) from callback URL');
          }

          const session = await exchangeFromDeepLink(url);

          console.log('[NativeOAuth] ✅ Session established');
          if (import.meta.env.DEV) {
            console.log('[NativeOAuth] session userId', session.user.id);
          }
          setNativeAuthInFlight(false);
          lastHandledUrl = url;

          // Emit success event (overlay will hide)
          window.dispatchEvent(new CustomEvent('auth-in-progress', {
            detail: { started: false, completed: true }
          }));

          // Redirect to stored return URL (or next param), default /predictions
          let returnTo: string | null = null;
          try {
            // authGateAdapter uses this key
            const gateReturn = sessionStorage.getItem('fcz.returnUrl');
            if (gateReturn) {
              sessionStorage.removeItem('fcz.returnUrl');
              returnTo = gateReturn;
            }
          } catch {
            // ignore
          }

          const fromReturnTo = consumeReturnTo();
          const decodedNext = next ? decodeURIComponent(next) : null;
          const target = sanitizeInternalPath(decodedNext ?? returnTo ?? fromReturnTo ?? '/predictions');

          if (import.meta.env.DEV) {
            console.log('[NativeOAuth] Redirecting to:', target);
          }

          // Store in sessionStorage so router listener can pick it up even if it isn't mounted yet
          try {
            sessionStorage.setItem('native_oauth_return_to', target);
          } catch {
            // ignore
          }

          // Emit event for router-based navigation (no full reload)
          window.dispatchEvent(new CustomEvent('native-oauth-success', { detail: { returnTo: target } }));
          isProcessingCallback = false;
          return true;
        } catch (err) {
          console.error('[NativeOAuth] ❌ Code exchange exception:', err);
          window.dispatchEvent(new CustomEvent('auth-in-progress', {
            detail: { started: false, error: true }
          }));
          isProcessingCallback = false;
          setNativeAuthInFlight(false);
          lastHandledUrl = null;
          return false;
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

      // Redirect to stored return URL (fallback)
      const fromReturnTo = consumeReturnTo();
      const target = sanitizeInternalPath(fromReturnTo ?? '/predictions');
      try {
        sessionStorage.setItem('native_oauth_return_to', target);
      } catch {
        // ignore
      }
      window.dispatchEvent(new CustomEvent('native-oauth-success', { detail: { returnTo: target } }));
      setNativeAuthInFlight(false);
      isProcessingCallback = false;
      // We did not establish session here; don't close the sheet.
      lastHandledUrl = null;
      return false;
    }

    isProcessingCallback = false;
    return false;
  } catch (err) {
    console.error('[NativeOAuth] ❌ Handler exception:', err);
    window.dispatchEvent(new CustomEvent('auth-in-progress', {
      detail: { started: false, error: true }
    }));
    isProcessingCallback = false;
    lastHandledUrl = null;
    return false;
  }
}
