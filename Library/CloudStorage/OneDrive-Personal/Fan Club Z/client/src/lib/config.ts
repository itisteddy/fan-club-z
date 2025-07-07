// Frontend Configuration
// All environment variables must be prefixed with VITE_ to be accessible in the browser

interface Config {
  // API Configuration
  apiUrl: string
  baseUrl: string
  
  // Feature Flags
  isDemoMode: boolean
  enableNotifications: boolean
  
  // External Services
  stripePublishableKey: string | null
  
  // App Settings
  appName: string
  appVersion: string
  
  // Environment
  isDevelopment: boolean
  isProduction: boolean
  isTest: boolean
}

// Helper to get environment variable with fallback
const getEnv = (key: string, fallback?: string): string | null => {
  // @ts-ignore - Vite provides import.meta.env
  const value = import.meta.env[key]
  return value || fallback || null
}

// Helper to get boolean environment variable
const getBoolEnv = (key: string, fallback: boolean = false): boolean => {
  const value = getEnv(key)
  if (value === null) return fallback
  return value.toLowerCase() === 'true'
}

// Determine API URL based on environment
const getApiUrl = (): string => {
  // Require explicit environment variable for API URL
  const envApiUrl = getEnv('VITE_API_URL')
  if (envApiUrl) return envApiUrl
  throw new Error('VITE_API_URL is required in .env.local for API access. Please set it to your backend URL, e.g., http://172.20.2.210:5001/api')
}

// Determine base URL
const getBaseUrl = (): string => {
  const envBaseUrl = getEnv('VITE_BASE_URL')
  if (envBaseUrl) return envBaseUrl
  
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  return 'http://localhost:3000'
}

export const config: Config = {
  // API Configuration
  apiUrl: getApiUrl(),
  baseUrl: getBaseUrl(),
  
  // Feature Flags
  isDemoMode: getBoolEnv('VITE_DEMO_MODE', true), // Default to demo mode for MVP
  enableNotifications: getBoolEnv('VITE_ENABLE_NOTIFICATIONS', true),
  
  // External Services
  stripePublishableKey: getEnv('VITE_STRIPE_PUBLISHABLE_KEY'),
  
  // App Settings
  appName: getEnv('VITE_APP_NAME', 'Fan Club Z') || 'Fan Club Z',
  appVersion: getEnv('VITE_APP_VERSION', '1.0.0') || '1.0.0',
  
  // Environment
  // @ts-ignore - Vite provides these properties
  isDevelopment: import.meta.env.DEV,
  // @ts-ignore - Vite provides these properties
  isProduction: import.meta.env.PROD,
  // @ts-ignore - Vite provides these properties
  isTest: import.meta.env.MODE === 'test',
}

// Validate required configuration
export const validateConfig = (): void => {
  const errors: string[] = []
  
  if (!config.apiUrl) {
    errors.push('VITE_API_URL is required')
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors)
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
  }
}

// Export individual config values for convenience
export const {
  apiUrl,
  baseUrl,
  isDemoMode,
  enableNotifications,
  stripePublishableKey,
  appName,
  appVersion,
  isDevelopment,
  isProduction,
  isTest,
} = config

export default config 