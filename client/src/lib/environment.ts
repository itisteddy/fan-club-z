/**
 * Environment detection and configuration for Fan Club Z
 * Handles dev, staging, and production environments
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
  
  console.log('🌍 Environment Detection:');
  console.log('  - Hostname:', hostname);
  console.log('  - Protocol:', protocol);
  console.log('  - VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  - MODE:', import.meta.env.MODE);
  
  // Production environment
  if (hostname === 'app.fanclubz.app' || hostname === 'fanclubz.app' || hostname === 'www.fanclubz.app') {
    const config: EnvironmentConfig = {
      apiUrl: 'https://fan-club-z.onrender.com',
      socketUrl: 'https://fan-club-z.onrender.com',
      environment: 'production',
      isDevelopment: false,
      isProduction: true
    };
    console.log('🚀 Production environment detected (single service):', config);
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
    console.log('🧪 Development environment detected (single service):', config);
    return config;
  }
  
  // Vercel deployments (default to production)
  if (hostname.includes('vercel.app')) {
    const config: EnvironmentConfig = {
      apiUrl: 'https://fan-club-z.onrender.com',
      socketUrl: 'https://fan-club-z.onrender.com',
      environment: 'production',
      isDevelopment: false,
      isProduction: true
    };
    console.log('🚀 Vercel deployment detected, using single service:', config);
    return config;
  }
  
  // Check if local development server is running (regardless of hostname)
  // This allows development even when accessing via production domains
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    const config: EnvironmentConfig = {
      apiUrl: 'http://localhost:3001',
      socketUrl: 'http://localhost:3001',
      environment: 'development',
      isDevelopment: true,
      isProduction: false
    };
    console.log('🏠 Development mode detected (using local server):', config);
    return config;
  }
  
  // Check environment variable
  if (import.meta.env.VITE_API_URL) {
    const config: EnvironmentConfig = {
      apiUrl: import.meta.env.VITE_API_URL,
      socketUrl: import.meta.env.VITE_API_URL,
      environment: import.meta.env.PROD ? 'production' : 'development',
      isDevelopment: !import.meta.env.PROD,
      isProduction: import.meta.env.PROD
    };
    console.log('🔧 Using VITE_API_URL:', config);
    return config;
  }
  
  // Local development
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.')) {
    const config: EnvironmentConfig = {
      apiUrl: 'http://localhost:3001',
      socketUrl: 'http://localhost:3001',
      environment: 'development',
      isDevelopment: true,
      isProduction: false
    };
    console.log('🏠 Local development detected:', config);
    return config;
  }
  
  // Fallback to production
  const config: EnvironmentConfig = {
    apiUrl: 'https://fan-club-z.onrender.com',
    socketUrl: 'https://fan-club-z.onrender.com',
    environment: 'production',
    isDevelopment: false,
    isProduction: true
  };
  console.log('🔄 Unknown hostname, falling back to single service:', config);
  return config;
}

export function getApiUrl(): string {
  return getEnvironmentConfig().apiUrl;
}

export function getSocketUrl(): string {
  const config = getEnvironmentConfig();
  console.log('🔧 Socket URL configuration:', {
    hostname: window.location.hostname,
    configuredUrl: config.socketUrl,
    environment: config.environment,
    isDevelopment: config.isDevelopment,
    isProduction: config.isProduction
  });
  return config.socketUrl;
}

export function isDevelopment(): boolean {
  return getEnvironmentConfig().isDevelopment;
}

export function isProduction(): boolean {
  return getEnvironmentConfig().isProduction;
}
