/**
 * Canonical prediction URL helpers.
 * Share links and browser URL bar should use /p/:id/:slug? and web origin (not capacitor://).
 */

import { getPublicAppBaseUrl } from '@/lib/urls';

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
 * Full canonical URL for sharing. Uses shared public app base (never localhost in production).
 */
export function buildPredictionCanonicalUrl(id: string, title?: string): string {
  const path = buildPredictionCanonicalPath(id, title);
  const base = getPublicAppBaseUrl().replace(/\/+$/, '');
  return base + path;
}

/**
 * Canonical path for a specific comment deep link.
 * Uses the /p/:id/:slug?/comments/:commentId route.
 */
export function buildPredictionCommentPath(id: string, commentId: string, title?: string): string {
  const base = buildPredictionCanonicalPath(id, title);
  return `${base}/comments/${commentId}`;
}

/**
 * Canonical URL for a specific comment deep link.
 */
export function buildPredictionCommentUrl(id: string, commentId: string, title?: string): string {
  const path = buildPredictionCommentPath(id, commentId, title);
  const base = getPublicAppBaseUrl().replace(/\/+$/, '');
  return base + path;
}
