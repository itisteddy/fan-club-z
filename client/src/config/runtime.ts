/**
 * Runtime configuration for Fan Club Z
 * Single source of truth for build mode and capabilities
 * 
 * Phase 2: Build targets + Store Safe Mode containment
 * 
 * BUILD_TARGET: Explicit build target ('web' | 'ios' | 'android')
 * - Determines which build configuration to use
 * - Default: 'web'
 * 
 * STORE_SAFE_MODE: App Store compliance mode
 * - true only when BUILD_TARGET === 'ios' AND VITE_STORE_SAFE_MODE === 'true'
 * - This ensures web is never affected by store-safe restrictions
 * 
 * MODE resolution:
 * - WEB: default for web deployments
 * - STORE_SAFE: iOS builds with store-safe mode enabled
 * - INTERNAL_FULL: native builds with VITE_INTERNAL_FULL=true (for internal testing)
 */

import { Capacitor } from '@capacitor/core';

export type BuildTarget = 'web' | 'ios' | 'android';
export type RuntimeMode = 'WEB' | 'STORE_SAFE' | 'INTERNAL_FULL';

export interface RuntimeCapabilities {
  allowDemo: boolean;
  allowFiat: boolean;
  allowCrypto: boolean;
}

class RuntimeConfig {
  private _buildTarget: BuildTarget;
  private _isNative: boolean;
  private _storeSafeMode: boolean;
  private _mode: RuntimeMode;
  private _capabilities: RuntimeCapabilities;

  constructor() {
    // BUILD_TARGET: from env, default 'web'
    const buildTargetEnv = (import.meta.env.VITE_BUILD_TARGET || 'web').toLowerCase();
    this._buildTarget = (['web', 'ios', 'android'].includes(buildTargetEnv) 
      ? buildTargetEnv 
      : 'web') as BuildTarget;

    // IS_NATIVE: runtime detection (Capacitor platform check)
    this._isNative = Capacitor.isNativePlatform();

    // STORE_SAFE_MODE: true only when BUILD_TARGET === 'ios' AND env flag is true
    // This is the critical containment: web never sees store-safe restrictions
    const storeSafeEnv = import.meta.env.VITE_STORE_SAFE_MODE === 'true' || import.meta.env.VITE_STORE_SAFE_MODE === '1';
    this._storeSafeMode = this._buildTarget === 'ios' && storeSafeEnv;

    // Resolve MODE
    const internalFull = import.meta.env.VITE_INTERNAL_FULL === 'true' || import.meta.env.VITE_INTERNAL_FULL === '1';
    
    if (this._isNative && internalFull) {
      this._mode = 'INTERNAL_FULL';
    } else if (this._storeSafeMode) {
      this._mode = 'STORE_SAFE';
    } else {
      this._mode = 'WEB';
    }

    // Resolve capabilities based on MODE
    const fiatEnabled = import.meta.env.VITE_FIAT_ENABLED === 'true' || import.meta.env.VITE_FIAT_ENABLED === '1';
    const cryptoEnabled = import.meta.env.VITE_CRYPTO_ENABLED === 'true' || import.meta.env.VITE_CRYPTO_ENABLED === '1';

    this._capabilities = {
      allowDemo: true, // Always enabled
      allowFiat: this._mode === 'INTERNAL_FULL' && fiatEnabled,
      allowCrypto: this._mode === 'INTERNAL_FULL' && cryptoEnabled,
    };
  }

  get BUILD_TARGET(): BuildTarget {
    return this._buildTarget;
  }

  get IS_NATIVE(): boolean {
    return this._isNative;
  }

  get STORE_SAFE_MODE(): boolean {
    return this._storeSafeMode;
  }

  get isNative(): boolean {
    return this._isNative;
  }

  get mode(): RuntimeMode {
    return this._mode;
  }

  get capabilities(): RuntimeCapabilities {
    return { ...this._capabilities };
  }

  get storeSafeMode(): boolean {
    return this._storeSafeMode;
  }
}

// Singleton instance
export const Runtime = new RuntimeConfig();

// Convenience exports (Phase 2: use these instead of direct Capacitor checks)
export const BUILD_TARGET = Runtime.BUILD_TARGET;
export const IS_NATIVE = Runtime.IS_NATIVE;
export const STORE_SAFE_MODE = Runtime.STORE_SAFE_MODE;
export const isNative = () => Runtime.isNative;
export const getRuntimeMode = () => Runtime.mode;
export const getCapabilities = () => Runtime.capabilities;
export const isStoreSafeMode = () => Runtime.storeSafeMode;

// Phase 6: DEV-only runtime debug helper
export function getRuntimeDebugInfo() {
  return {
    BUILD_TARGET: BUILD_TARGET,
    IS_NATIVE: IS_NATIVE,
    STORE_SAFE_MODE: STORE_SAFE_MODE,
    origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    apiBaseUrl: typeof window !== 'undefined' ? (import.meta.env.VITE_API_BASE_URL || 'N/A') : 'N/A',
    mode: getRuntimeMode(),
    capabilities: getCapabilities(),
  };
}
