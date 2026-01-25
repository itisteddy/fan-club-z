/**
 * Canonical web origin helper
 * Single source of truth for determining the web origin for OAuth redirects
 * 
 * Priority:
 * 1. window.location.origin (when running on web runtime)
 * 2. VITE_FRONTEND_URL (env fallback)
 * 3. VITE_APP_URL (env fallback)
 * 4. https://app.fanclubz.app (production default)
 */

export function getWebOrigin(): string {
  // Prefer window.location.origin when available (web runtime)
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (import.meta.env.DEV) {
      console.log('[origin] webOrigin=' + origin + ' (from window.location.origin)');
    }
    return origin;
  }
  
  // Fallback to env vars
  const envOrigin = import.meta.env.VITE_FRONTEND_URL || import.meta.env.VITE_APP_URL;
  if (envOrigin) {
    if (import.meta.env.DEV) {
      console.log('[origin] webOrigin=' + envOrigin + ' (from env fallback)');
    }
    return envOrigin;
  }
  
  // Production default
  const defaultOrigin = 'https://app.fanclubz.app';
  if (import.meta.env.DEV) {
    console.log('[origin] webOrigin=' + defaultOrigin + ' (default fallback)');
  }
  return defaultOrigin;
}
