/**
 * Feature flags for compliance and phased rollout.
 * All flags default to OFF. Set VITE_FCZ_*='1' in env to enable.
 * Usable from web and native (Capacitor) builds.
 */
import {
  SIGN_IN_APPLE,
  ACCOUNT_DELETION,
  UGC_MODERATION,
  DISPUTES,
  ODDS_V2,
  WALLET_CONNECT_V2,
} from '@/utils/environment';

export const featureFlags = {
  SIGN_IN_APPLE,
  ACCOUNT_DELETION,
  UGC_MODERATION,
  DISPUTES,
  ODDS_V2,
  WALLET_CONNECT_V2,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return featureFlags[flag] === true;
}
