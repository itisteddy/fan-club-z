/**
 * Canonical prediction URL helpers.
 * Share links and browser URL bar should use /p/:id/:slug? and web origin (not capacitor://).
 */

import { getFrontendUrl } from '@/config';

const SLUG_MAX_LENGTH = 60;

/**
 * Slugify a title: lowercase, trim, remove punctuation, collapse spaces/hyphens, limit length.
 */
export function slugify(title: string): string {
  if (!title || typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, SLUG_MAX_LENGTH);
}

/**
 * Canonical path for a prediction: /p/:id or /p/:id/:slug when title is provided.
 */
export function buildPredictionCanonicalPath(id: string, title?: string): string {
  if (!id) return '/';
  const slug = title ? slugify(title) : '';
  if (!slug) return `/p/${id}`;
  return `/p/${id}/${slug}`;
}

/**
 * Whether the current origin looks like Capacitor (e.g. capacitor://localhost).
 * In that case we prefer env origin so copied links are web URLs.
 */
function isCapacitorLikeOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  const o = window.location.origin;
  return o.startsWith('capacitor://') || o === 'capacitor://localhost';
}

/**
 * Full canonical URL for sharing: uses web origin (getFrontendUrl in Capacitor), else window.location.origin.
 */
export function buildPredictionCanonicalUrl(id: string, title?: string): string {
  const path = buildPredictionCanonicalPath(id, title);
  if (typeof window === 'undefined') {
    const base = getFrontendUrl() || 'https://app.fanclubz.app';
    return base.replace(/\/$/, '') + path;
  }
  const base = isCapacitorLikeOrigin()
    ? (getFrontendUrl() || 'https://app.fanclubz.app')
    : window.location.origin;
  return base.replace(/\/$/, '') + path;
}
