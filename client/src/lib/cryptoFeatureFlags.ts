/**
 * Crypto feature flags – single source for "show crypto UI" and "crypto allowed for this client".
 * Server enforces crypto testnet by client (web only); UI hides crypto on native.
 */

import { getFczClientHeader } from '@/lib/apiClient';

export type CryptoMode = 'off' | 'testnet' | 'mainnet';

export interface CryptoFeatureFlags {
  enabled: boolean;
  mode: CryptoMode;
  clientAllowed: boolean;
}

export function isZaurumModeEnabled(): boolean {
  const walletMode = String(import.meta.env.VITE_FCZ_WALLET_MODE || '').toLowerCase().trim();
  if (walletMode === 'zaurum_only') return true;
  // Backward-compat fallback while old environments migrate.
  const legacy = String(import.meta.env.VITE_ZAURUM_MODE || '').toLowerCase().trim();
  return legacy === '1' || legacy === 'true' || legacy === 'zaurum';
}

/**
 * Build-time + runtime flags for crypto. Use for UI gating only; server enforces.
 * - enabled: CRYPTO_MODE is testnet or legacy VITE_FCZ_BASE_BETS is on, or web with no explicit 'off'
 * - mode: from VITE_CRYPTO_MODE (off | testnet | mainnet), defaults to 'testnet' for web if not set
 * - clientAllowed: true only when client is web (not ios/android)
 */
export function getCryptoFeatureFlags(): CryptoFeatureFlags {
  if (isZaurumModeEnabled()) {
    return { enabled: false, mode: 'off', clientAllowed: false };
  }

  const client = getFczClientHeader();
  const clientAllowed = client === 'web';
  
  const modeRaw = (import.meta.env.VITE_CRYPTO_MODE as string) || '';
  const legacyBaseBets = import.meta.env.VITE_FCZ_BASE_BETS === '1';
  
  // Determine mode: if not set and on web, default to testnet (backward compatible)
  let mode: CryptoMode;
  if (modeRaw === 'off') {
    mode = 'off';
  } else if (modeRaw === 'testnet' || modeRaw === 'mainnet') {
    mode = modeRaw;
  } else if (clientAllowed || legacyBaseBets) {
    // Default to testnet for web clients when env var not explicitly set
    mode = 'testnet';
  } else {
    mode = 'off';
  }
  
  const enabled = mode === 'testnet' || mode === 'mainnet';
  return { enabled, mode, clientAllowed };
}

/**
 * True only when crypto testnet is on and this client is allowed (web).
 * Use to show/hide crypto rail, Connect Wallet, deposit/withdraw crypto.
 */
export function isCryptoEnabledForClient(): boolean {
  const f = getCryptoFeatureFlags();
  return f.enabled && f.mode === 'testnet' && f.clientAllowed;
}
