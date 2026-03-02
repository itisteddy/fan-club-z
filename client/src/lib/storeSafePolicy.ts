/**
 * Phase 7B: Store Safe Mode Policy Matrix
 * 
 * Centralized App Store compliance policy for iOS builds.
 * This ensures all feature gating is consistent, testable, and isolated from web.
 * 
 * Critical Rule:
 * - Store Safe Mode only applies when BUILD_TARGET==='ios' AND VITE_STORE_SAFE_MODE==='true'
 * - Web builds are never affected
 */

import { STORE_SAFE_MODE } from '@/config/runtime';

export type FundingSource = 'demo' | 'crypto' | 'fiat';

/**
 * Store Safe Mode policy object
 */
export const policy = {
  /**
   * Allowed funding sources in current mode
   */
  get allowedFundingSources(): FundingSource[] {
    if (STORE_SAFE_MODE) {
      return ['demo']; // iOS store-safe: demo only
    }
    // Web: all funding sources supported by the app
    return ['demo', 'crypto', 'fiat'];
  },

  /**
   * Can user connect crypto wallets?
   */
  get allowCryptoWalletConnect(): boolean {
    return !STORE_SAFE_MODE;
  },

  /**
   * Can user use fiat payment methods (Paystack, etc.)?
   */
  get allowFiatPayments(): boolean {
    return !STORE_SAFE_MODE;
  },

  /**
   * Can user withdraw funds?
   */
  get allowWithdrawals(): boolean {
    return !STORE_SAFE_MODE;
  },

  /**
   * Can use real-money language in UI?
   * If false, use neutral wording like "Stakes", "Predictions", "Demo credits"
   */
  get allowRealMoneyLanguage(): boolean {
    return !STORE_SAFE_MODE;
  },
};

/**
 * Check if a feature is allowed by store safe policy
 * 
 * @param featureKey - Feature to check
 * @param onBlocked - Optional callback if feature is blocked
 * @returns true if feature is allowed, false otherwise
 */
export function guardFeature(
  featureKey: 'crypto-wallet' | 'fiat-payments' | 'withdrawals',
  onBlocked?: () => void
): boolean {
  const allowed = (() => {
    switch (featureKey) {
      case 'crypto-wallet':
        return policy.allowCryptoWalletConnect;
      case 'fiat-payments':
        return policy.allowFiatPayments;
      case 'withdrawals':
        return policy.allowWithdrawals;
      default:
        return true;
    }
  })();

  if (!allowed && onBlocked) {
    onBlocked();
  }

  return allowed;
}

/**
 * Get UI-friendly label for funding mode
 * Adjusts copy based on store-safe mode
 */
export function getFundingModeLabel(mode: FundingSource): string {
  if (STORE_SAFE_MODE) {
    // In store-safe mode, use neutral language
    switch (mode) {
      case 'demo':
        return 'Demo Credits';
      case 'crypto':
        return 'Crypto (Unavailable)';
      case 'fiat':
        return 'Fiat (Unavailable)';
      default:
        return mode;
    }
  }

  // Web: use normal labels
  switch (mode) {
    case 'demo':
      return 'Demo Credits';
    case 'crypto':
      return 'Crypto';
    case 'fiat':
      return 'Fiat';
    default:
      return mode;
  }
}

/**
 * Check if store-safe mode is currently active
 */
export function isStoreSafeMode(): boolean {
  return STORE_SAFE_MODE;
}

/**
 * Get user-friendly explanation for why a feature is unavailable
 */
export function getBlockedFeatureMessage(featureKey: 'crypto-wallet' | 'fiat-payments' | 'withdrawals'): string {
  if (!STORE_SAFE_MODE) {
    return '';
  }

  switch (featureKey) {
    case 'crypto-wallet':
      return 'Crypto wallet features are not available in demo mode. Try demo credits instead.';
    case 'fiat-payments':
      return 'Fiat payments are not available in demo mode. Try demo credits instead.';
    case 'withdrawals':
      return 'Withdrawals are not available in demo mode.';
    default:
      return 'This feature is not available in demo mode.';
  }
}
