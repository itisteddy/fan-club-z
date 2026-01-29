import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open a URL in a way that works reliably on iPad/iOS webviews and Safari.
 * Avoids window.open (can be blocked in WKWebView). Uses Capacitor Browser when in native shell.
 */
function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') return;

  const trimmed = url.trim();
  if (!trimmed) return;

  // Native shell: use in-app browser (reliable on iOS/Android)
  if (Capacitor.isNativePlatform()) {
    Browser.open({ url: trimmed }).catch(() => fallbackOpen(trimmed));
    return;
  }

  fallbackOpen(trimmed);
}

/**
 * Fallback: programmatic click on a temporary anchor. More reliable than window.open in webviews.
 */
function fallbackOpen(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Build full URL for a path on the current origin (e.g. /terms -> https://fanclubz.app/terms).
 * Use for Terms/Privacy so one tap always opens the document.
 */
export function getLegalUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  const base = window.location.origin;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Open Terms of Service. Call from onClick of any Terms link for reliable iPad behavior.
 */
export function openTerms(): void {
  openExternalUrl(getLegalUrl('/terms'));
}

/**
 * Open Privacy Policy. Call from onClick of any Privacy link for reliable iPad behavior.
 */
export function openPrivacy(): void {
  openExternalUrl(getLegalUrl('/privacy'));
}

export default openExternalUrl;
