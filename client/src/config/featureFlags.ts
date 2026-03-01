/**
 * Feature flags for compliance and phased rollout.
 * All flags default to OFF. Set VITE_FCZ_*='1' in env to enable.
 * Usable from web and native (Capacitor) builds.
 *
 * PARITY POLICY:
 * - Web: all flags controlled by env vars
 * - Android native: features match web (env vars OR always-on for parity)
 * - iOS store-safe: restricted per STORE_SAFE_MODE policy
 *
 * If a flag is OFF because the env var wasn't set in the native build,
 * but it's a feature that should have web parity on Android, we enable it.
 */
import {
  SIGN_IN_APPLE,
  ACCOUNT_DELETION,
  UGC_MODERATION,
  DISPUTES,
  ODDS_V2,
  WALLET_CONNECT_V2,
} from '@/utils/environment';
import { Capacitor } from '@capacitor/core';
import { BUILD_TARGET } from '@/config/buildTarget';

/**
 * Android native builds should have full feature parity with web.
 * Some env vars may not propagate to the native build — this ensures
 * parity features are ON for Android unless EXPLICITLY disabled.
 *
 * CRITICAL FIX (2026-02-11): Use BUILD_TARGET as AUTHORITATIVE fallback.
 * After logout on Android, Capacitor.isNativePlatform() can briefly return
 * false during bridge re-initialization. BUILD_TARGET is set at compile time
 * and never changes — if it's 'android', we ARE in the native app.
 */
const isAndroidNative =
  (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') ||
  BUILD_TARGET === 'android';

export const featureFlags = {
  SIGN_IN_APPLE,
  // These features should always be available on web and Android native
  ACCOUNT_DELETION:  ACCOUNT_DELETION  || isAndroidNative,
  UGC_MODERATION:    UGC_MODERATION    || isAndroidNative,
  DISPUTES:          DISPUTES          || isAndroidNative,
  ODDS_V2,
  WALLET_CONNECT_V2: WALLET_CONNECT_V2 || isAndroidNative,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return featureFlags[flag] === true;
}
