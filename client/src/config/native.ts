import { Capacitor } from '@capacitor/core';

/**
 * Native runtime helpers.
 * IMPORTANT: For iOS auth routing, trust runtime detection over BUILD_TARGET/env.
 */

export function isNativeIOSRuntime(): boolean {
  return Capacitor.isNativePlatform() === true && Capacitor.getPlatform() === 'ios';
}

export function getNativeRedirectTo(next?: string): string {
  const base = 'fanclubz://auth/callback';
  if (!next) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}next=${encodeURIComponent(next)}`;
}

