/**
 * Crypto feature flags – single source for "show crypto UI" and "crypto allowed for this client".
 * Server enforces crypto testnet by client (web only); UI hides crypto on native.
 */

import { getFczClientHeader } from '@/lib/apiClient';
import { FCZ_WALLET_MODE } from '@/utils/environment';

export type CryptoMode = 'off' | 'testnet' | 'mainnet';

export interface CryptoFeatureFlags {
  enabled: boolean;
  mode: CryptoMode;
  clientAllowed: boolean;
}

/**
 * Build-time + runtime flags for crypto. Use for UI gating only; server enforces.
 * - enabled: CRYPTO_MODE is testnet or legacy VITE_FCZ_BASE_BETS is on, or web with no explicit 'off'
 * - mode: from VITE_CRYPTO_MODE (off | testnet | mainnet), defaults to 'testnet' for web if not set
 * - clientAllowed: true for web AND android native (parity). iOS store-safe disabled via STORE_SAFE_MODE.
 */
export function getCryptoFeatureFlags(): CryptoFeatureFlags {
  if (FCZ_WALLET_MODE === 'zaurum_only') {
    return { enabled: false, mode: 'off', clientAllowed: false };
  }

  const client = getFczClientHeader();
  // PARITY: Android native gets full crypto access like web.
  // iOS is gated by STORE_SAFE_MODE in storeSafePolicy.ts (which disallows crypto wallet).
  const clientAllowed = client === 'web' || client === 'android';
  
  const modeRaw = (import.meta.env.VITE_CRYPTO_MODE as string) || '';
  const legacyBaseBets = import.meta.env.VITE_FCZ_BASE_BETS === '1';
  
  // Determine mode: if not set and on web/android, default to testnet (backward compatible)
  let mode: CryptoMode;
  if (modeRaw === 'off') {
    mode = 'off';
  } else if (modeRaw === 'testnet' || modeRaw === 'mainnet') {
    mode = modeRaw;
  } else if (clientAllowed || legacyBaseBets) {
    // Default to testnet for web and android clients when env var not explicitly set
    mode = 'testnet';
  } else {
    mode = 'off';
  }
  
  const enabled = mode === 'testnet' || mode === 'mainnet';
  return { enabled, mode, clientAllowed };
}

/**
 * True when crypto testnet is on and this client is allowed (web or android native).
 * Use to show/hide crypto rail, Connect Wallet, deposit/withdraw crypto.
 */
export function isCryptoEnabledForClient(): boolean {
  const f = getCryptoFeatureFlags();
  return f.enabled && f.mode === 'testnet' && f.clientAllowed;
}
