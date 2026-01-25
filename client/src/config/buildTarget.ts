/**
 * Canonical source of truth for BUILD_TARGET
 * 
 * CRITICAL: This module must be safe to import anywhere without side effects.
 * It reads directly from import.meta.env.VITE_BUILD_TARGET and provides a safe default.
 * 
 * This prevents runtime crashes from undefined BUILD_TARGET references.
 */

export type BuildTarget = 'web' | 'ios' | 'android';

// Read from env with safe default
const raw = (import.meta.env.VITE_BUILD_TARGET || 'web').toLowerCase();

// Validate and normalize
export const BUILD_TARGET: BuildTarget =
  raw === 'ios' ? 'ios' : raw === 'android' ? 'android' : 'web';

// Helper booleans for convenience
export const isIOSBuild = BUILD_TARGET === 'ios';
export const isAndroidBuild = BUILD_TARGET === 'android';
export const isWebBuild = BUILD_TARGET === 'web';
