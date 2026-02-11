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

const ua = () => (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');

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
 * Call `resetBrowserContextCache()` in tests.
 */
export function getBrowserContext(): BrowserContextInfo {
  if (_cached) return _cached;

  const wallet = detectWalletInApp();
  const social = detectSocialInApp();
  const genericWebView = isGenericWebView();
  const os = detectOS();
  const isMobile = detectMobile();
  const injectedEthereumAvailable = hasInjectedEthereum();

  let context: BrowserContext;
  let inAppName: InAppBrowserName | null = null;

  if (wallet) {
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

  // Google OAuth: only works in system browsers.
  // In-app browsers get 403 disallowed_useragent from Google's servers.
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
export const isGoogleOAuthSupported = () => getBrowserContext().googleOAuthSupported;
export const getInAppBrowserName = () => getBrowserContext().inAppName;

/** Reset cache (for tests) */
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
