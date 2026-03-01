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
 */
export function resolveWalletVariant(): WalletVariant {
  const isNative = Capacitor.isNativePlatform() === true ||
    import.meta.env.VITE_BUILD_TARGET === 'android' ||
    import.meta.env.VITE_BUILD_TARGET === 'ios';

  // Parity rule:
  // - Native mobile must support Demo and default to Demo (server can still override the chosen mode).
  // - Web can optionally enable Demo via VITE_FCZ_ENABLE_DEMO.
  const demoEnabled = import.meta.env.VITE_FCZ_ENABLE_DEMO === '1' || isNative;
  return {
    supportsDemo: demoEnabled,
    supportsCrypto: true,
    defaultTab: demoEnabled ? 'demo' : 'crypto',
  };
}

