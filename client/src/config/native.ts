import { Capacitor } from '@capacitor/core';

/**
 * Native runtime helpers.
 * IMPORTANT: For iOS auth routing, trust runtime detection over BUILD_TARGET/env.
 */

export function isNativeIOSRuntime(): boolean {
  return Capacitor.isNativePlatform() === true && Capacitor.getPlatform() === 'ios';
}

export function isNativeAndroidRuntime(): boolean {
  return Capacitor.isNativePlatform() === true && Capacitor.getPlatform() === 'android';
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

