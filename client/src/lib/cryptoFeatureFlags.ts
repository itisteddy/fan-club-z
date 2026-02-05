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

/**
 * Build-time + runtime flags for crypto. Use for UI gating only; server enforces.
 * - enabled: CRYPTO_MODE is testnet or legacy VITE_FCZ_BASE_BETS is on
 * - mode: from VITE_CRYPTO_MODE (off | testnet | mainnet)
 * - clientAllowed: true only when client is web (not ios/android)
 */
export function getCryptoFeatureFlags(): CryptoFeatureFlags {
  const modeRaw = (import.meta.env.VITE_CRYPTO_MODE as string) || '';
  const mode: CryptoMode =
    modeRaw === 'testnet' || modeRaw === 'mainnet' ? modeRaw : 'off';
  const legacyBaseBets = import.meta.env.VITE_FCZ_BASE_BETS === '1';
  const enabled = mode === 'testnet' || legacyBaseBets;
  const client = getFczClientHeader();
  const clientAllowed = client === 'web';
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
