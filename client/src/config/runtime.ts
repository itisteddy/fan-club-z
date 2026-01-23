/**
 * Runtime configuration for Fan Club Z
 * Single source of truth for build mode and capabilities
 * 
 * MODE resolution:
 * - WEB: default for web deployments
 * - STORE_SAFE: default for native builds (Capacitor)
 * - INTERNAL_FULL: native builds with VITE_INTERNAL_FULL=true (for internal testing)
 */

import { Capacitor } from '@capacitor/core';

export type RuntimeMode = 'WEB' | 'STORE_SAFE' | 'INTERNAL_FULL';

export interface RuntimeCapabilities {
  allowDemo: boolean;
  allowFiat: boolean;
  allowCrypto: boolean;
}

class RuntimeConfig {
  private _isNative: boolean;
  private _mode: RuntimeMode;
  private _capabilities: RuntimeCapabilities;

  constructor() {
    // Detect native platform
    this._isNative = Capacitor.isNativePlatform();

    // Resolve MODE
    const internalFull = import.meta.env.VITE_INTERNAL_FULL === 'true' || import.meta.env.VITE_INTERNAL_FULL === '1';
    const storeSafeOverride = import.meta.env.VITE_STORE_SAFE_MODE === 'true' || import.meta.env.VITE_STORE_SAFE_MODE === '1';
    
    if (this._isNative && internalFull) {
      this._mode = 'INTERNAL_FULL';
    } else if (this._isNative || storeSafeOverride) {
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
    return this._mode === 'STORE_SAFE';
  }
}

// Singleton instance
export const Runtime = new RuntimeConfig();

// Convenience exports
export const isNative = () => Runtime.isNative;
export const getRuntimeMode = () => Runtime.mode;
export const getCapabilities = () => Runtime.capabilities;
export const isStoreSafeMode = () => Runtime.storeSafeMode;
