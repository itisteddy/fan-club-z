/**
 * Canonical source of truth for BUILD_TARGET
 * 
 * CRITICAL: This module must be safe to import anywhere without side effects.
 * Priority:
 * 1. import.meta.env.VITE_BUILD_TARGET (explicit)
 * 2. import.meta.env.MODE (inferred from --mode flag: "ios" | "android" => that target)
 * 3. Default: 'web'
 * 
 * This prevents runtime crashes from undefined BUILD_TARGET references and ensures
 * BUILD_TARGET is correct even if .env.ios is missing but --mode ios is used.
 */

export type BuildTarget = 'web' | 'ios' | 'android';

// Priority 1: Explicit VITE_BUILD_TARGET
// Priority 2: Infer from MODE (vite --mode ios => MODE='ios')
// Priority 3: Default 'web'
const explicitTarget = import.meta.env.VITE_BUILD_TARGET;
const modeTarget = import.meta.env.MODE; // 'ios', 'android', 'web', 'development', 'production', etc.

let raw: string;
if (explicitTarget) {
  raw = explicitTarget.toLowerCase();
} else if (modeTarget === 'ios' || modeTarget === 'android') {
  // If MODE is 'ios' or 'android', use it as BUILD_TARGET
  raw = modeTarget.toLowerCase();
} else {
  raw = 'web';
}

// Validate and normalize
export const BUILD_TARGET: BuildTarget =
  raw === 'ios' ? 'ios' : raw === 'android' ? 'android' : 'web';

// Helper booleans for convenience
export const isIOSBuild = BUILD_TARGET === 'ios';
export const isAndroidBuild = BUILD_TARGET === 'android';
export const isWebBuild = BUILD_TARGET === 'web';

/**
 * Get build debug info (DEV only or when VITE_DEBUG_BUILD=1)
 * Reports: buildTarget, mode, isNative, platform, bundleStamp
 */
export function getBuildDebugInfo() {
  const isDebugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG_BUILD === '1';
  if (!isDebugEnabled) {
    return null;
  }

  // Try to get git SHA from build-time injection (if available)
  const gitSha = (import.meta.env.VITE_GIT_SHA as string) || 'unknown';
  
  // Bundle stamp: BUILD_TARGET + MODE + timestamp
  const bundleStamp = `${BUILD_TARGET}-${import.meta.env.MODE || 'unknown'}-${Date.now()}`;

  return {
    buildTarget: BUILD_TARGET,
    mode: import.meta.env.MODE || 'unknown',
    viteBuildTarget: import.meta.env.VITE_BUILD_TARGET || 'not-set',
    isNative: typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() || false,
    platform: typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() || 'web',
    gitSha,
    bundleStamp,
  };
}
