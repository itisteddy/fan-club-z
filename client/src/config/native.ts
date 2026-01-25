import { Capacitor } from '@capacitor/core';

/**
 * Native runtime helpers.
 * IMPORTANT: For iOS auth routing, trust runtime detection over BUILD_TARGET/env.
 */

export function isNativeIOSRuntime(): boolean {
  return Capacitor.isNativePlatform() === true && Capacitor.getPlatform() === 'ios';
}

/**
 * IMPORTANT: Must match Supabase redirect allowlist entry exactly.
 * Do NOT append query params here; store returnTo separately.
 */
export const IOS_REDIRECT = 'fanclubz://auth/callback';

export function getNativeRedirectTo(): string {
  return IOS_REDIRECT;
}

