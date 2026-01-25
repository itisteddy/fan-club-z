import { Capacitor } from '@capacitor/core';

export type WalletTab = 'demo' | 'crypto';

export type WalletVariant = {
  supportsDemo: boolean;
  supportsCrypto: boolean;
  defaultTab: WalletTab;
};

/**
 * Wallet variant resolver.
 *
 * Non-negotiable rule:
 * - Decide by runtime detection (native + platform), not by BUILD_TARGET.
 *
 * iOS native:
 * - Demo must be available and the default.
 * - Crypto can be disabled (minimum viable parity).
 */
export function resolveWalletVariant(): WalletVariant {
  const isNative = Capacitor.isNativePlatform() === true;
  const platform = Capacitor.getPlatform();

  if (isNative && platform === 'ios') {
    return {
      supportsDemo: true,
      supportsCrypto: false,
      defaultTab: 'demo',
    };
  }

  // Default (web + other platforms):
  // - Demo availability is feature-flagged
  // - Crypto is available by default (further gated elsewhere by store-safe policy/capabilities)
  const demoEnabled = import.meta.env.VITE_FCZ_ENABLE_DEMO === '1';
  return {
    supportsDemo: demoEnabled,
    supportsCrypto: true,
    defaultTab: demoEnabled ? 'demo' : 'crypto',
  };
}

