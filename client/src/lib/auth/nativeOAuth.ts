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

/**
 * Reset native OAuth state. MUST be called on sign out to prevent
 * stale `isProcessingCallback` / `lastHandledUrl` blocking re-login.
 */
export function resetNativeOAuthState() {
  isProcessingCallback = false;
  lastHandledUrl = null;
  setNativeAuthInFlight(false);
}

export async function exchangeFromDeepLink(callbackUrl: string) {
  // Parse the callback URL. Custom schemes need normalization.
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(callbackUrl);
  } catch {
    // Fallback for custom schemes (fanclubz://...) that some URL parsers reject.
    // If this also throws, the error propagates to the caller.
    parsedUrl = new URL(callbackUrl.replace('fanclubz://', 'https://'));
  }

  const code = parsedUrl.searchParams.get('code');
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
  // Check if this is an auth callback URL first.
  const isDeepLinkCallback = url && url.startsWith('fanclubz://auth/callback');
  const isHttpsCallback = url && (
    url.includes('app.fanclubz.app/auth/callback') ||
    url.includes('localhost/auth/callback') ||
    url.includes('127.0.0.1/auth/callback')
  );
  if (!isDeepLinkCallback && !isHttpsCallback) {
    return false;
  }

  // Only process in real native runtime.
  // CRITICAL FIX (2026-02-11): Also accept VITE_BUILD_TARGET as a signal.
  // After logout on Android, Capacitor.isNativePlatform() can lag, causing
  // isNativeAndroidRuntime() to return false briefly. But if the deep link
  // `fanclubz://auth/callback` was received by CapacitorApp.addListener, we
  // are DEFINITELY in a native context — the listener only fires in native.
  // So we also accept build target as a fallback signal.
  const buildTarget = import.meta.env.VITE_BUILD_TARGET;
  const isNative = isNativeIOSRuntime() || isNativeAndroidRuntime() || buildTarget === 'android' || buildTarget === 'ios';
  // If we got a deep-link callback from Capacitor listener, process it even when
  // native runtime detection is lagging (observed right after logout on Android).
  if (!isNative && !isDeepLinkCallback) {
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
      // Declare parsedUrl at this scope so it's accessible for both code and token_hash extraction
      let deepLinkParsed: URL;
      try {
        deepLinkParsed = new URL(url.replace('fanclubz://', 'https://'));
      } catch (err) {
        console.error('[NativeOAuth] ❌ Failed to parse deep link URL:', err);
        isProcessingCallback = false;
        return false;
      }

      let code: string | null = deepLinkParsed.searchParams.get('code');
      const state: string | null = deepLinkParsed.searchParams.get('state');
      let next: string | null = deepLinkParsed.searchParams.get('next');

      // Some providers return values in the hash fragment
      if (!code && deepLinkParsed.hash) {
        const hashParams = new URLSearchParams(deepLinkParsed.hash.replace(/^#/, ''));
        code = code || hashParams.get('code');
        if (!next) next = hashParams.get('next');
      }

      if (import.meta.env.DEV) {
        console.log('[NativeOAuth] Extracted:', {
          code: code ? 'present' : 'missing',
          state: state ? 'present' : 'missing'
        });
      }

      // Handle email confirmation token_hash (Supabase sends this for email signup confirmation)
      const tokenHash = deepLinkParsed.searchParams.get('token_hash');
      const type = deepLinkParsed.searchParams.get('type');
      if (tokenHash && type) {
        try {
          if (import.meta.env.DEV) {
            console.log('[NativeOAuth] Email confirmation detected:', { type, tokenHash: 'present' });
          }
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (verifyError) throw verifyError;
          if (!verifyData?.session) throw new Error('[NativeOAuth] No session after email verification');
          
          console.log('[NativeOAuth] \u2705 Email verification session established');
          setNativeAuthInFlight(false);
          lastHandledUrl = url;
          window.dispatchEvent(new CustomEvent('auth-in-progress', {
            detail: { started: false, completed: true }
          }));
          const fromReturnTo = consumeReturnTo();
          const target = sanitizeInternalPath(fromReturnTo ?? '/predictions');
          try { sessionStorage.setItem('native_oauth_return_to', target); } catch {}
          window.dispatchEvent(new CustomEvent('native-oauth-success', { detail: { returnTo: target } }));
          isProcessingCallback = false;
          return true;
        } catch (err) {
          console.error('[NativeOAuth] \u274c Email verification failed:', err);
          window.dispatchEvent(new CustomEvent('auth-in-progress', {
            detail: { started: false, error: true }
          }));
          isProcessingCallback = false;
          setNativeAuthInFlight(false);
          lastHandledUrl = null;
          return false;
        }
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
