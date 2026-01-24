/**
 * Platform detection utility with fail-safe guards
 * 
 * CRITICAL: Build target alone must NEVER be enough to activate native-only behavior.
 * This prevents iOS builds accidentally deployed to web from breaking production.
 * 
 * Rule: Native behavior requires BOTH build target AND runtime native detection.
 */

import { Capacitor } from '@capacitor/core';
import { BUILD_TARGET } from './runtime';

/**
 * Get build target from env (web | ios | android)
 */
export function getBuildTarget(): 'web' | 'ios' | 'android' {
  return BUILD_TARGET;
}

/**
 * TRUE only when Capacitor native bridge is actually present
 */
export function isNativeRuntime(): boolean {
  return Capacitor.isNativePlatform() === true;
}

/**
 * TRUE only when running in native iOS Capacitor container
 */
export function isIOSRuntime(): boolean {
  return isNativeRuntime() && Capacitor.getPlatform() === 'ios';
}

/**
 * TRUE only when BOTH: build target is iOS AND runtime is native iOS
 * This is the fail-safe: even if iOS build is deployed to web, it won't use deep links
 */
export function shouldUseIOSDeepLinks(): boolean {
  const buildTarget = getBuildTarget();
  const native = isNativeRuntime();
  const ios = isIOSRuntime();
  
  const shouldUse = buildTarget === 'ios' && ios;
  
  // Fail-safe warning if build target says iOS but runtime is not native
  if (buildTarget === 'ios' && !native) {
    console.warn('[platform] iOS build flag detected on web runtime; forcing web behavior');
  }
  
  return shouldUse;
}

/**
 * TRUE only when BOTH: build target is iOS AND runtime is native AND store-safe flag is set
 */
export function shouldUseStoreSafeMode(): boolean {
  const buildTarget = getBuildTarget();
  const native = isNativeRuntime();
  const ios = isIOSRuntime();
  const storeSafeEnv = import.meta.env.VITE_STORE_SAFE_MODE === 'true' || import.meta.env.VITE_STORE_SAFE_MODE === '1';
  
  // Fail-safe: if build target is iOS but not native runtime, never use store-safe
  if (buildTarget === 'ios' && !native) {
    return false;
  }
  
  return buildTarget === 'ios' && ios && storeSafeEnv;
}

/**
 * Get platform debug info (DEV only)
 */
export function getPlatformDebugInfo() {
  return {
    buildTarget: getBuildTarget(),
    isNativeRuntime: isNativeRuntime(),
    isIOSRuntime: isIOSRuntime(),
    shouldUseIOSDeepLinks: shouldUseIOSDeepLinks(),
    shouldUseStoreSafeMode: shouldUseStoreSafeMode(),
    capacitorPlatform: Capacitor.getPlatform(),
  };
}
