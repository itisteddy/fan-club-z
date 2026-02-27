import { Capacitor } from '@capacitor/core';
const NATIVE_RUNTIME_CACHE_KEY = 'fcz.native.runtime';

/**
 * Native runtime helpers.
 * IMPORTANT: For iOS auth routing, trust runtime detection over BUILD_TARGET/env.
 */

export function isNativeIOSRuntime(): boolean {
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(NATIVE_RUNTIME_CACHE_KEY) === '1') {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      if (/iPhone|iPad|iPod/i.test(ua)) return true;
    }
  } catch {}
  // Primary: Capacitor runtime detection
  if (Capacitor.isNativePlatform() === true && Capacitor.getPlatform() === 'ios') {
    try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
    return true;
  }
  // Fallback: build target (handles Capacitor bridge lag after logout on iOS)
  if (import.meta.env.VITE_BUILD_TARGET === 'ios') {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    if (/AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) return true;
  }
  return false;
}

export function isNativeAndroidRuntime(): boolean {
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(NATIVE_RUNTIME_CACHE_KEY) === '1') {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      if (/android/i.test(ua) || /; wv\)/i.test(ua)) return true;
    }
  } catch {}
  // Primary: Capacitor runtime detection
  if (Capacitor.isNativePlatform() === true && Capacitor.getPlatform() === 'android') {
    try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
    return true;
  }
  // Fallback: build target is AUTHORITATIVE for Android (see browserContext.ts comments).
  // Android builds are ALWAYS loaded inside the Android WebView.
  // This fixes the post-logout race where Capacitor.isNativePlatform() lags.
  if (import.meta.env.VITE_BUILD_TARGET === 'android') return true;
  return false;
}

/**
 * IMPORTANT: Must match Supabase redirect allowlist entry exactly.
 * Do NOT append query params here; store returnTo separately.
 */
export const IOS_REDIRECT = 'fanclubz://auth/callback';
export const ANDROID_REDIRECT = 'fanclubz://auth/callback';

export function getNativeRedirectTo(): string {
  // Custom-scheme redirect is shared across iOS + Android.
  // Keep this deterministic and identical to your OAuth provider allowlist entry.
  return IOS_REDIRECT;
}
