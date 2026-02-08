import { envClient } from "@/config/env.client";
import { Capacitor } from '@capacitor/core';
// NB: do NOT import envServer into client bundles

export const isDev = envClient.DEV;
export const isProd = envClient.PROD;
export const mode = envClient.MODE;

// API Configuration
export const API_BASE = envClient.VITE_API_BASE;
export const SUPABASE_URL = envClient.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = envClient.VITE_SUPABASE_ANON_KEY;
export const FRONTEND_URL = envClient.VITE_FRONTEND_URL;

function envFlag(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

// Feature Flags
export const FCZ_UNIFIED_HEADER = envFlag(envClient.VITE_FCZ_UNIFIED_HEADER);
export const FCZ_DISCOVER_V2 = envFlag(envClient.VITE_FCZ_DISCOVER_V2);
export const FCZ_PREDICTION_DETAILS_V2 = envFlag(envClient.VITE_FCZ_PREDICTION_DETAILS_V2);
export const FCZ_SHARED_CARDS = envFlag(envClient.VITE_FCZ_SHARED_CARDS);
export const FCZ_AUTH_GATE = envFlag(envClient.VITE_FCZ_AUTH_GATE);
export const FCZ_COMMENTS_V2 = envFlag(envClient.VITE_FCZ_COMMENTS_V2);
export const FCZ_UNIFIED_CARDS = envFlag(envClient.VITE_FCZ_UNIFIED_CARDS);
export const FCZ_COMMENTS_SORT = envFlag(envClient.VITE_FCZ_COMMENTS_SORT);

// Compliance / phased rollout (default OFF unless env set to '1')
export const SIGN_IN_APPLE = envFlag((envClient as any).VITE_FCZ_SIGN_IN_APPLE);
export const ACCOUNT_DELETION = envFlag((envClient as any).VITE_FCZ_ACCOUNT_DELETION);
export const UGC_MODERATION = envFlag((envClient as any).VITE_FCZ_UGC_MODERATION);
export const DISPUTES = envFlag((envClient as any).VITE_FCZ_DISPUTES);
export const ODDS_V2 = envFlag((envClient as any).VITE_FCZ_ODDS_V2);
export const WALLET_CONNECT_V2 = envFlag((envClient as any).VITE_FCZ_WALLET_CONNECT_V2);

// Debug and Development
export const DEBUG_ENABLED = envClient.VITE_DEBUG === 'true';

// Optional Services
export const VAPID_PUBLIC_KEY = envClient.VITE_VAPID_PUBLIC_KEY;
export const ESCROW_CONTRACT_ADDRESS = envClient.VITE_ESCROW_CONTRACT_ADDRESS;
export const GOOGLE_ANALYTICS_ID = envClient.VITE_GOOGLE_ANALYTICS_ID;

/**
 * Environment detection and configuration for Fan Club Z
 * Handles dev, staging, and production environments with dynamic LAN support
 */

export interface EnvironmentConfig {
  apiUrl: string;
  socketUrl: string;
  environment: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
}

let didLogNativeEnv = false;

export function getEnvironmentConfig(): EnvironmentConfig {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const runningInNativeApp = typeof window !== 'undefined' && Boolean(Capacitor?.isNativePlatform?.());
  const productionApi = 'https://fan-club-z.onrender.com';
  
  if (DEBUG_ENABLED) {
    console.log('🌍 Environment Detection:');
    console.log('  - Hostname:', hostname);
    console.log('  - Protocol:', protocol);
    console.log('  - VITE_API_BASE:', API_BASE);
    console.log('  - MODE:', mode);
  }
  
  // Production environment
  if (hostname === 'app.fanclubz.app' || hostname === 'fanclubz.app' || hostname === 'www.fanclubz.app') {
    const config: EnvironmentConfig = {
      apiUrl: productionApi,
      socketUrl: productionApi,
      environment: 'production',
      isDevelopment: false,
      isProduction: true
    };
    if (DEBUG_ENABLED) console.log('🚀 Production environment detected (single service):', config);
    return config;
  }
  
  // Development environment
  if (hostname === 'dev.fanclubz.app') {
    const config: EnvironmentConfig = {
      apiUrl: 'https://fan-club-z.onrender.com',
      socketUrl: 'https://fan-club-z.onrender.com',
      environment: 'staging',
      isDevelopment: false,
      isProduction: false
    };
    if (DEBUG_ENABLED) console.log('🧪 Development environment detected (single service):', config);
    return config;
  }
  
  // Vercel deployments (default to production)
  if (hostname.includes('vercel.app')) {
    const config: EnvironmentConfig = {
      apiUrl: productionApi,
      socketUrl: productionApi,
      environment: 'production',
      isDevelopment: false,
      isProduction: true
    };
    if (DEBUG_ENABLED) console.log('🚀 Vercel deployment detected, using single service:', config);
    return config;
  }

  // Environment variable override (useful for pointing native shells at a dev/staging API)
  // NOTE: This must run before the native-shell forced-production branch.
  if (API_BASE) {
    let normalizedApiBase = API_BASE;
    if (runningInNativeApp) {
      // Android WebView/network-security can reject cleartext "localhost".
      // Use loopback IP so adb reverse routing stays deterministic.
      normalizedApiBase = normalizedApiBase.replace(/^http:\/\/localhost(?=[:/]|$)/i, 'http://127.0.0.1');
    }
    // In native shells, a relative API base like "/api" points to the Capacitor local origin
    // (http://localhost/...), which is not a backend. Ignore it and fall through.
    if (runningInNativeApp && normalizedApiBase.trim().startsWith('/')) {
      if (DEBUG_ENABLED) console.log('📱 Native shell detected: ignoring relative VITE_API_BASE:', API_BASE);
    } else {
    const config: EnvironmentConfig = {
      apiUrl: normalizedApiBase,
      socketUrl: normalizedApiBase,
      environment: isProd ? 'production' : 'development',
      isDevelopment: !isProd,
      isProduction: isProd
    };
    if (DEBUG_ENABLED) console.log('🔧 Using VITE_API_BASE:', config);
    return config;
    }
  }

  // Capacitor / native shell builds always target production API (unless overridden above)
  if (runningInNativeApp && !isDev) {
    const config: EnvironmentConfig = {
      apiUrl: productionApi,
      socketUrl: productionApi,
      environment: 'production',
      isDevelopment: false,
      isProduction: true,
    };
    if (DEBUG_ENABLED) console.log('📱 Native shell detected -> using production API:', config);
    return config;
  }
  
  // Native dev shells must use loopback so adb reverse is deterministic.
  if (runningInNativeApp && (isDev || mode === 'development')) {
    const devNativeApi = 'http://127.0.0.1:3001';
    const config: EnvironmentConfig = {
      apiUrl: devNativeApi,
      socketUrl: devNativeApi,
      environment: 'development',
      isDevelopment: true,
      isProduction: false,
    };
    if (DEBUG_ENABLED) console.log('📱 Native dev shell detected -> forcing loopback API:', config);
    return config;
  }

  // Check if local development server is running (regardless of hostname)
  // Prefer the current hostname for LAN access so other devices can reach the API
  if (isDev || mode === 'development') {
    const isLoopback = hostname === 'localhost' || hostname.startsWith('127.');
    const apiHost = isLoopback ? 'localhost' : hostname; // e.g., 172.20.x.x
    const devApiUrl = `${protocol}//${apiHost}:3001`;
    const config: EnvironmentConfig = {
      apiUrl: devApiUrl,
      socketUrl: devApiUrl,
      environment: 'development',
      isDevelopment: true,
      isProduction: false
    };
    if (DEBUG_ENABLED) console.log('🏠 Development mode detected (dynamic host for LAN):', config);
    return config;
  }
  
  // Local development
  if (!runningInNativeApp && (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.'))) {
    const config: EnvironmentConfig = {
      apiUrl: 'http://localhost:3001',
      socketUrl: 'http://localhost:3001',
      environment: 'development',
      isDevelopment: true,
      isProduction: false
    };
    if (DEBUG_ENABLED) console.log('🏠 Local development detected:', config);
    return config;
  }
  
  // Fallback to production
  const config: EnvironmentConfig = {
    apiUrl: productionApi,
    socketUrl: productionApi,
    environment: 'production',
    isDevelopment: false,
    isProduction: true
  };
  if (DEBUG_ENABLED) console.log('🔄 Unknown hostname, falling back to single service:', config);
  return config;
}

export function getApiUrl(): string {
  const config = getEnvironmentConfig();
  // Always log the chosen API base once in native shells to make device debugging deterministic.
  if (!didLogNativeEnv && typeof window !== 'undefined' && Boolean(Capacitor?.isNativePlatform?.())) {
    didLogNativeEnv = true;
    console.log('[env] native apiUrl:', config.apiUrl);
  }
  return config.apiUrl;
}

export function getSocketUrl(): string {
  const config = getEnvironmentConfig();
  if (DEBUG_ENABLED) {
    console.log('🔧 Socket URL configuration:', {
      hostname: window.location.hostname,
      configuredUrl: config.socketUrl,
      environment: config.environment,
      isDevelopment: config.isDevelopment,
      isProduction: config.isProduction
    });
  }
  return config.socketUrl;
}

export function isDevelopment(): boolean {
  return getEnvironmentConfig().isDevelopment;
}

export function isProduction(): boolean {
  return getEnvironmentConfig().isProduction;
}
