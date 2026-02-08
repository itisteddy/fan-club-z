/**
 * Public share URL builder – single source of truth for referral, prediction, and profile share links.
 * Ensures production never shows localhost; uses canonical base (https://app.fanclubz.app) when env is missing or wrong.
 */

import { Capacitor } from '@capacitor/core';

const CANONICAL_PROD_BASE = 'https://app.fanclubz.app';

function isNativeApp(): boolean {
  return Boolean(Capacitor?.isNativePlatform?.());
}

/**
 * Returns true if the given origin or URL is localhost/loopback.
 */
function isLocalhostOrigin(originOrUrl: string): boolean {
  if (!originOrUrl || typeof originOrUrl !== 'string') return true;
  const s = originOrUrl.trim().toLowerCase();
  if (s.startsWith('http://localhost') || s.startsWith('https://localhost')) return true;
  if (s.startsWith('http://127.') || s.startsWith('https://127.')) return true;
  try {
    const u = new URL(s);
    return u.hostname === 'localhost' || u.hostname.startsWith('127.');
  } catch {
    return s.includes('localhost') || s.includes('127.0.0.1');
  }
}

/**
 * Canonical public app base URL for share links (referral, prediction, profile).
 * - Prefers VITE_PUBLIC_APP_URL, then VITE_FRONTEND_URL.
 * - In production, never returns localhost; if env is localhost or missing, uses https://app.fanclubz.app.
 * - In development, localhost is allowed.
 */
export function getPublicAppBaseUrl(): string {
  const envBase = (
    (import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_FRONTEND_URL) as string | undefined
  )?.trim() ?? '';
  const isProd = import.meta.env.PROD;

  // Share links should always use the canonical web origin in native shells,
  // even during local dev, so users don't copy `http://localhost/...`.
  if (typeof window !== 'undefined' && isNativeApp()) {
    return CANONICAL_PROD_BASE;
  }

  if (envBase && !(isProd && isLocalhostOrigin(envBase))) {
    return envBase.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (!isProd || !isLocalhostOrigin(origin)) return origin;
  }

  if (isProd && (!envBase || isLocalhostOrigin(envBase)) && typeof console !== 'undefined' && console.warn) {
    console.warn('[urls] Public app URL misconfigured (localhost or missing in production). Using canonical fallback.');
  }
  return CANONICAL_PROD_BASE;
}

/**
 * Full referral link for sharing: /r/{code}
 */
export function buildReferralUrl(referralCode: string): string {
  const base = getPublicAppBaseUrl().replace(/\/+$/, '');
  return `${base}/r/${encodeURIComponent(referralCode)}`;
}

/**
 * Full prediction share link: /p/{id} or /p/{id}/{slug}
 */
export function buildPredictionShareUrl(id: string, slug?: string): string {
  const base = getPublicAppBaseUrl().replace(/\/+$/, '');
  if (!slug) return `${base}/p/${encodeURIComponent(id)}`;
  return `${base}/p/${encodeURIComponent(id)}/${encodeURIComponent(slug)}`;
}
