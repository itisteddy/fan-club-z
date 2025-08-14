/**
 * Environment Detection System
 * Intelligently detects the current environment and maps to correct backend URLs
 */

export interface EnvironmentConfig {
  name: string;
  apiUrl: string;
  wsUrl: string;
  corsOrigins: string[];
  isProduction: boolean;
  isDevelopment: boolean;
  isLocal: boolean;
}

/**
 * Get the current environment configuration based on hostname
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  console.log('🌍 Environment Detection:', {
    hostname,
    protocol,
    userAgent: navigator.userAgent
  });

  // Production environment
  if (hostname === 'app.fanclubz.app' || hostname === 'fanclubz.app') {
    return {
      name: 'production',
      apiUrl: 'https://fanclubz-prod.onrender.com',
      wsUrl: 'wss://fanclubz-prod.onrender.com',
      corsOrigins: [
        'https://app.fanclubz.app',
        'https://fanclubz.app',
        'https://www.fanclubz.app'
      ],
      isProduction: true,
      isDevelopment: false,
      isLocal: false
    };
  }

  // Development environment
  if (hostname === 'dev.fanclubz.app') {
    return {
      name: 'development',
      apiUrl: 'https://fanclubz-dev.onrender.com',
      wsUrl: 'wss://fanclubz-dev.onrender.com',
      corsOrigins: [
        'https://dev.fanclubz.app',
        'https://fanclubz-dev.vercel.app'
      ],
      isProduction: false,
      isDevelopment: true,
      isLocal: false
    };
  }

  // Vercel preview deployments (development)
  if (hostname.includes('vercel.app') && hostname.includes('fan-club-z-dev')) {
    return {
      name: 'development-preview',
      apiUrl: 'https://fanclubz-dev.onrender.com',
      wsUrl: 'wss://fanclubz-dev.onrender.com',
      corsOrigins: [
        `https://${hostname}`,
        'https://dev.fanclubz.app'
      ],
      isProduction: false,
      isDevelopment: true,
      isLocal: false
    };
  }

  // Vercel preview deployments (production)
  if (hostname.includes('vercel.app') && hostname.includes('fan-club-z')) {
    return {
      name: 'production-preview',
      apiUrl: 'https://fanclubz-prod.onrender.com',
      wsUrl: 'wss://fanclubz-prod.onrender.com',
      corsOrigins: [
        `https://${hostname}`,
        'https://app.fanclubz.app'
      ],
      isProduction: true,
      isDevelopment: false,
      isLocal: false
    };
  }

  // Local development
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.')) {
    return {
      name: 'local',
      apiUrl: 'http://localhost:3001',
      wsUrl: 'ws://localhost:3001',
      corsOrigins: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      ],
      isProduction: false,
      isDevelopment: false,
      isLocal: true
    };
  }

  // Fallback to production (unknown hostname)
  console.warn('⚠️ Unknown hostname, falling back to production:', hostname);
  return {
    name: 'fallback-production',
    apiUrl: 'https://fanclubz-prod.onrender.com',
    wsUrl: 'wss://fanclubz-prod.onrender.com',
    corsOrigins: [
      `https://${hostname}`,
      'https://app.fanclubz.app'
    ],
    isProduction: true,
    isDevelopment: false,
    isLocal: false
  };
}

/**
 * Get the API URL for the current environment
 */
export function getApiUrl(): string {
  const config = getEnvironmentConfig();
  console.log('🔧 API URL for environment:', config.name, config.apiUrl);
  return config.apiUrl;
}

/**
 * Get the WebSocket URL for the current environment
 */
export function getWsUrl(): string {
  const config = getEnvironmentConfig();
  console.log('🔧 WebSocket URL for environment:', config.name, config.wsUrl);
  return config.wsUrl;
}

/**
 * Check if we're in production environment
 */
export function isProduction(): boolean {
  return getEnvironmentConfig().isProduction;
}

/**
 * Check if we're in development environment
 */
export function isDevelopment(): boolean {
  return getEnvironmentConfig().isDevelopment;
}

/**
 * Check if we're in local development
 */
export function isLocal(): boolean {
  return getEnvironmentConfig().isLocal;
}

/**
 * Get environment-specific configuration for debugging
 */
export function getEnvironmentInfo() {
  const config = getEnvironmentConfig();
  return {
    ...config,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
}

// Export the current environment config for easy access
export const currentEnvironment = getEnvironmentConfig();
