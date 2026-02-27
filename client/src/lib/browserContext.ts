/**
 * Browser Context Detection Utility
 *
 * Detects whether the user is in a system browser (Chrome, Safari, Firefox),
 * a wallet in-app browser (MetaMask, Trust, Coinbase), or a social in-app
 * browser (Instagram, Facebook, TikTok, etc.).
 *
 * Used by:
 * - OAuth gate (block Google sign-in in in-app browsers)
 * - Wallet connect orchestrator (prefer injected provider in wallet browsers)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type BrowserContext = 'system_browser' | 'wallet_inapp' | 'social_inapp';

export type InAppBrowserName =
  | 'metamask'
  | 'trust'
  | 'coinbase'
  | 'rainbow'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'twitter'
  | 'snapchat'
  | 'linkedin'
  | 'line'
  | 'wechat'
  | 'unknown';

export interface BrowserContextInfo {
  /** High-level context category */
  context: BrowserContext;
  /** Specific in-app browser name (only meaningful when context !== 'system_browser') */
  inAppName: InAppBrowserName | null;
  /** Can Google OAuth complete without 403 disallowed_useragent? */
  googleOAuthSupported: boolean;
  /** Is window.ethereum (or equivalent) injected and likely functional? */
  injectedEthereumAvailable: boolean;
  /** Is the device a mobile/tablet (touch + narrow viewport or UA heuristic)? */
  isMobile: boolean;
  /** Android vs iOS vs desktop */
  os: 'android' | 'ios' | 'desktop';
}

// ─── Detection Helpers ───────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
const NATIVE_RUNTIME_CACHE_KEY = 'fcz.native.runtime';

/**
 * Is this running inside the Capacitor native shell (our own app)?
 * The native WebView has `; wv)` in the UA on Android, which would
 * otherwise be misclassified as a social/generic in-app browser.
 * Our own app's WebView is NOT an "in-app browser" — Google OAuth
 * works fine via Capacitor's in-app browser plugin, and we want
 * the full feature set.
 *
 * CRITICAL: On Android native, after logout + page transitions, the
 * Capacitor JS bridge may not have fully initialized yet when this is
 * called early in the render cycle. We use MULTIPLE detection signals:
 * 1. Capacitor.isNativePlatform() — authoritative but may lag on cold start
 * 2. Build target env var — static, always available (STRONGEST signal)
 * 3. UA heuristic — Android WebView has `; wv)` in UA
 * If ANY signal indicates native, we treat it as native.
 *
 * FIX (2026-02-11): After logout on Android native, the Capacitor bridge
 * can lag, causing the app to be misclassified as an in-app browser.
 * The build target env var is now treated as AUTHORITATIVE for Android
 * since it's set at compile time and never changes — if the bundle was
 * compiled for Android, it IS running in the Android native shell.
 */
function isNativeCapacitorApp(): boolean {
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem(NATIVE_RUNTIME_CACHE_KEY) === '1') {
      return true;
    }
  } catch {}

  try {
    // Primary: Capacitor runtime detection
    if (Capacitor.isNativePlatform() === true) {
      try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
      return true;
    }
    // Secondary: platform detection can be ready before isNativePlatform during bridge init.
    const platform = Capacitor.getPlatform?.();
    if (platform === 'android' || platform === 'ios') {
      try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
      return true;
    }
  } catch {}
  
  // Fallback: Build target env var (set at compile time, always available).
  // CRITICAL FIX: For Android builds, the build target alone is AUTHORITATIVE.
  // Unlike iOS (where an iOS build could theoretically be served on web),
  // Android builds are ALWAYS loaded inside the Android WebView — they cannot
  // be accessed from a regular browser. So if VITE_BUILD_TARGET === 'android',
  // we ARE in the native app, period. No additional UA checks needed.
  // This fixes the post-logout race condition where Capacitor.isNativePlatform()
  // returns false briefly during re-initialization.
  const buildTarget = import.meta.env.VITE_BUILD_TARGET;
  if (buildTarget === 'android') {
    try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
    return true;
  }
  
  if (buildTarget === 'ios') {
    // For iOS, do a lightweight UA check as additional confirmation
    const agent = ua();
    if (/AppleWebKit/i.test(agent) && !/Safari\//i.test(agent)) {
      try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
      return true;
    }
    // Also accept if wv marker or FanClubZ marker is present
    if (/; wv\)/.test(agent) || /FanClubZ/i.test(agent)) {
      try { sessionStorage.setItem(NATIVE_RUNTIME_CACHE_KEY, '1'); } catch {}
      return true;
    }
  }
  
  return false;
}

/** Check for injected Ethereum provider */
export function hasInjectedEthereum(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(
    w.ethereum ||
    w.web3?.currentProvider ||
    w.coinbaseWalletExtension
  );
}

/** Detect wallet in-app browsers by UA string + provider markers */
function detectWalletInApp(): InAppBrowserName | null {
  const agent = ua().toLowerCase();
  const w = typeof window !== 'undefined' ? (window as any) : {};

  // MetaMask mobile browser
  // DEFINITIVE: MetaMask mobile browser sets "MetaMaskMobile" in UA.
  if (agent.includes('metamaskmobile')) return 'metamask';
  // HEURISTIC: On mobile, if window.ethereum.isMetaMask is true AND this is NOT
  // a standard Chrome/Safari (which would have their own browser markers but also
  // have MetaMask extension installed), it's likely the in-app browser.
  // Key insight: MetaMask in-app browser on Android does NOT have "Chrome/" in UA,
  // while regular Chrome with MetaMask extension DOES have "Chrome/".
  if (/android|iphone|ipad|ipod/i.test(agent) && w.ethereum?.isMetaMask && !agent.includes('chrome/')) {
    return 'metamask';
  }

  // Trust Wallet
  if (agent.includes('trust') && (w.ethereum?.isTrust || w.trustwallet)) return 'trust';

  // Coinbase Wallet (DApp browser)
  if (agent.includes('coinbasebrowser') || w.ethereum?.isCoinbaseWallet || w.coinbaseWalletExtension) {
    // Distinguish extension (desktop) from in-app (mobile)
    if (/android|iphone|ipad|ipod/i.test(agent)) return 'coinbase';
  }

  // Rainbow
  if (w.ethereum?.isRainbow) return 'rainbow';

  return null;
}

/** Detect social-media in-app browsers */
function detectSocialInApp(): InAppBrowserName | null {
  const agent = ua();

  // Facebook (FBAN = Facebook App Native, FBAV = Facebook App Version)
  if (/FBAN|FBAV/i.test(agent)) return 'facebook';

  // Instagram
  if (/Instagram/i.test(agent)) return 'instagram';

  // TikTok
  if (/musical_ly|BytedanceWebview|TikTok/i.test(agent)) return 'tiktok';

  // Twitter / X
  if (/Twitter/i.test(agent)) return 'twitter';

  // Snapchat
  if (/Snapchat/i.test(agent)) return 'snapchat';

  // LinkedIn
  if (/LinkedInApp/i.test(agent)) return 'linkedin';

  // LINE
  if (/\bLine\//i.test(agent)) return 'line';

  // WeChat
  if (/MicroMessenger/i.test(agent)) return 'wechat';

  return null;
}

/** Detect generic WebView (Android WebView, iOS WKWebView without a known app) */
function isGenericWebView(): boolean {
  const agent = ua();
  // Android WebView marker
  if (/; wv\)/.test(agent)) return true;
  // iOS: no Safari/ token but has AppleWebKit (in-app WKWebView)
  if (/iPhone|iPad|iPod/i.test(agent) && /AppleWebKit/i.test(agent) && !/Safari\//i.test(agent)) return true;
  return false;
}

function detectOS(): 'android' | 'ios' | 'desktop' {
  const agent = ua();
  if (/android/i.test(agent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios';
  return 'desktop';
}

function detectMobile(): boolean {
  const agent = ua();
  if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(agent)) return true;
  if (typeof window !== 'undefined' && window.innerWidth <= 768 && 'ontouchstart' in window) return true;
  return false;
}

// ─── Main API ────────────────────────────────────────────────────────────────

let _cached: BrowserContextInfo | null = null;

/**
 * Detect the full browser context. Result is cached for the page lifetime
 * since UA and injected providers don't change mid-session.
 *
 * IMPORTANT: On Capacitor native apps, the cache may be populated before
 * Capacitor is fully ready. We re-check once if the initial detection
 * classified our own native app as an in-app browser.
 *
 * Call `resetBrowserContextCache()` in tests.
 */
export function getBrowserContext(): BrowserContextInfo {
  if (_cached) {
    // Safety: If we cached as social_inapp but Capacitor is now reporting native,
    // our initial detection ran before Capacitor was ready. Re-detect.
    if (_cached.context !== 'system_browser' && isNativeCapacitorApp()) {
      console.log('[BrowserContext] Re-detecting: was classified as', _cached.context, 'but Capacitor now reports native');
      _cached = null; // fall through to re-detect
    } else {
      return _cached;
    }
  }

  const isNativeApp = isNativeCapacitorApp();
  const wallet = detectWalletInApp();
  const social = detectSocialInApp();
  const genericWebView = isGenericWebView();
  const os = detectOS();
  const isMobile = detectMobile();
  const injectedEthereumAvailable = hasInjectedEthereum();

  let context: BrowserContext;
  let inAppName: InAppBrowserName | null = null;

  // CRITICAL: If this is our own native Capacitor app, treat it as system browser.
  // The native WebView has `; wv)` in UA on Android which would otherwise be
  // misclassified as an in-app browser, blocking Google OAuth and other features.
  // Our app handles OAuth via Capacitor's in-app browser plugin, which works correctly.
  //
  // ALSO: On Android native, even after page reload / state change, Capacitor.isNativePlatform()
  // remains true for the lifetime of the WebView. This is safe.
  if (isNativeApp) {
    context = 'system_browser';
    inAppName = null;
  } else if (wallet) {
    context = 'wallet_inapp';
    inAppName = wallet;
  } else if (social) {
    context = 'social_inapp';
    inAppName = social;
  } else if (genericWebView) {
    context = 'social_inapp'; // treat unknown webviews like social in-app (no OAuth)
    inAppName = 'unknown';
  } else {
    context = 'system_browser';
  }

  // Google OAuth: works in system browsers AND our native app (via Capacitor in-app browser).
  // Only blocked in third-party in-app browsers (Instagram, MetaMask, etc.).
  const googleOAuthSupported = context === 'system_browser';

  _cached = {
    context,
    inAppName,
    googleOAuthSupported,
    injectedEthereumAvailable,
    isMobile,
    os,
  };

  // Log once for diagnostics
  if (typeof console !== 'undefined') {
    console.log('[BrowserContext]', {
      context,
      inAppName,
      googleOAuthSupported,
      injectedEthereumAvailable,
      os,
      isMobile,
    });
  }

  return _cached;
}

/** Shorthand helpers */
export const isInAppBrowser = () => getBrowserContext().context !== 'system_browser';
export const isWalletBrowser = () => getBrowserContext().context === 'wallet_inapp';
/**
 * Check if Google OAuth can succeed in this context.
 *
 * CRITICAL FIX: On Capacitor native (iOS/Android), Google OAuth ALWAYS works
 * because we open the OAuth page in Capacitor's in-app browser plugin
 * (Browser.open), NOT the WebView itself. The browser plugin uses the system
 * browser (Chrome Custom Tabs on Android, SFSafariViewController on iOS),
 * which Google allows.
 *
 * This short-circuit prevents false negatives from the browser context cache
 * being populated before Capacitor is fully ready — which would misclassify
 * our own WebView (which has `; wv)` in the UA) as a third-party in-app browser.
 */
export const isGoogleOAuthSupported = (): boolean => {
  // Native Capacitor apps ALWAYS support Google OAuth via Browser plugin.
  // Use BOTH Capacitor runtime AND build target env as fallback.
  // This prevents false negatives when Capacitor bridge hasn't initialized
  // yet (e.g., after logout + page reload on Android native).
  if (isNativeCapacitorApp()) return true;
  // Additional fallback: if build target is native, always support OAuth
  const buildTarget = import.meta.env.VITE_BUILD_TARGET;
  if (buildTarget === 'android' || buildTarget === 'ios') return true;
  return getBrowserContext().googleOAuthSupported;
};
export const getInAppBrowserName = () => getBrowserContext().inAppName;

/** Reset cache (for tests or after sign-out to prevent stale context) */
export function resetBrowserContextCache() {
  _cached = null;
}

// ─── Deep Link Helpers ───────────────────────────────────────────────────────

/**
 * Build a URL that opens the current page in the system browser.
 * Used by the OAuth gate to let users escape in-app browsers.
 */
export function getOpenInSystemBrowserUrl(path?: string): string {
  const targetPath = path || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://app.fanclubz.app';
  const fullUrl = `${baseUrl}${targetPath}`;
  const ctx = getBrowserContext();

  if (ctx.os === 'android') {
    // Android intent: tries Chrome first, with fallback to the plain HTTPS URL
    // if Chrome isn't installed (system browser will handle it).
    // S.browser_fallback_url ensures the user isn't silently dropped.
    const parsed = new URL(fullUrl);
    return `intent://${parsed.host}${targetPath}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fullUrl)};end`;
  }

  // iOS / desktop: plain HTTPS URL; iOS will open in Safari if tapped from in-app
  return fullUrl;
}

/**
 * Copy a URL to clipboard. Returns true on success.
 */
export async function copyLinkToClipboard(path?: string): Promise<boolean> {
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://app.fanclubz.app';
  const targetPath = path || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
  const fullUrl = `${baseUrl}${targetPath}`;
  try {
    await navigator.clipboard.writeText(fullUrl);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
