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

// Feature Flags
export const FCZ_UNIFIED_HEADER = envClient.VITE_FCZ_UNIFIED_HEADER === '1';
export const FCZ_DISCOVER_V2 = envClient.VITE_FCZ_DISCOVER_V2 === '1';
export const FCZ_PREDICTION_DETAILS_V2 = envClient.VITE_FCZ_PREDICTION_DETAILS_V2 === '1';
export const FCZ_SHARED_CARDS = envClient.VITE_FCZ_SHARED_CARDS === '1';
export const FCZ_AUTH_GATE = envClient.VITE_FCZ_AUTH_GATE === '1';
export const FCZ_COMMENTS_V2 = envClient.VITE_FCZ_COMMENTS_V2 === '1';
export const FCZ_UNIFIED_CARDS = envClient.VITE_FCZ_UNIFIED_CARDS === '1';
export const FCZ_COMMENTS_SORT = envClient.VITE_FCZ_COMMENTS_SORT === '1';

// Compliance / phased rollout (default OFF unless env set to '1')
export const SIGN_IN_APPLE = (envClient as any).VITE_FCZ_SIGN_IN_APPLE === '1';
export const ACCOUNT_DELETION = (envClient as any).VITE_FCZ_ACCOUNT_DELETION === '1';
export const UGC_MODERATION = (envClient as any).VITE_FCZ_UGC_MODERATION === '1';
export const DISPUTES = (envClient as any).VITE_FCZ_DISPUTES === '1';
export const ODDS_V2 = (envClient as any).VITE_FCZ_ODDS_V2 === '1';
export const WALLET_CONNECT_V2 = (envClient as any).VITE_FCZ_WALLET_CONNECT_V2 === '1';

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

  // Capacitor / native shell builds always target production API
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
  
  // Check environment variable override
  if (API_BASE) {
    const config: EnvironmentConfig = {
      apiUrl: API_BASE,
      socketUrl: API_BASE,
      environment: isProd ? 'production' : 'development',
      isDevelopment: !isProd,
      isProduction: isProd
    };
    if (DEBUG_ENABLED) console.log('🔧 Using VITE_API_BASE:', config);
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
  return getEnvironmentConfig().apiUrl;
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
