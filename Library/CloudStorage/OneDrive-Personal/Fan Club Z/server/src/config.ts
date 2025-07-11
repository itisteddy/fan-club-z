// Backend Configuration
// All configuration values should be read from environment variables

// Load environment variables first
import dotenv from 'dotenv'
dotenv.config()

interface Config {
  // Server Configuration
  port: number
  host: string
  nodeEnv: string
  
  // Database Configuration
  databaseUrl: string
  
  // Authentication
  jwtSecret: string
  jwtExpiresIn: string
  jwtRefreshExpiresIn: string
  jwtRefreshSecret: string
  enableTokenRotation: boolean
  
  // External Services
  stripeSecretKey: string | null
  stripeWebhookSecret: string | null
  stripePublishableKey: string | null
  
  // CORS Configuration
  corsOrigins: string[]
  
  // Feature Flags
  enableDemoMode: boolean
  enableNotifications: boolean
  
  // App Settings
  appName: string
  appVersion: string
}

// Helper to get environment variable with fallback
const getEnv = (key: string, fallback?: string): string | null => {
  const value = process.env[key]
  return value || fallback || null
}

// Helper to get required environment variable
const getRequiredEnv = (key: string): string => {
  const value = getEnv(key)
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

// Helper to get boolean environment variable
const getBoolEnv = (key: string, fallback: boolean = false): boolean => {
  const value = getEnv(key)
  if (value === null) return fallback
  return value.toLowerCase() === 'true'
}

// Helper to get number environment variable
const getNumberEnv = (key: string, fallback: number): number => {
  const value = getEnv(key)
  if (value === null) return fallback
  const num = parseInt(value, 10)
  return isNaN(num) ? fallback : num
}

// Parse CORS origins from environment
const getCorsOrigins = (): string[] => {
  const corsOrigins = getEnv('CORS_ORIGINS')
  if (corsOrigins) {
    return corsOrigins.split(',').map(origin => origin.trim())
  }
  
  // Default origins based on environment
  const nodeEnv = getEnv('NODE_ENV', 'development')
  if (nodeEnv === 'production') {
    return ['https://fanclubz.app', 'https://www.fanclubz.app']
  }
  
  // Development: allow all origins
  return ['*']
}

export const config: Config = {
  // Server Configuration
  port: getNumberEnv('PORT', 5001),
  host: getEnv('HOST', '0.0.0.0') || '0.0.0.0',
  nodeEnv: getEnv('NODE_ENV', 'development') || 'development',
  
  // Database Configuration
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  
  // Authentication
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  jwtExpiresIn: getEnv('JWT_EXPIRES_IN', '24h') || '24h',
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d') || '7d',
  jwtRefreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
  enableTokenRotation: getBoolEnv('ENABLE_TOKEN_ROTATION', true),
  
  // External Services
  stripeSecretKey: getEnv('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: getEnv('STRIPE_WEBHOOK_SECRET'),
  stripePublishableKey: getEnv('STRIPE_PUBLISHABLE_KEY'),
  
  // CORS Configuration
  corsOrigins: getCorsOrigins(),
  
  // Feature Flags
  enableDemoMode: getBoolEnv('ENABLE_DEMO_MODE', true), // Default to demo mode for MVP
  enableNotifications: getBoolEnv('ENABLE_NOTIFICATIONS', true),
  
  // App Settings
  appName: getEnv('APP_NAME', 'Fan Club Z') || 'Fan Club Z',
  appVersion: getEnv('APP_VERSION', '1.0.0') || '1.0.0',
}

// Validate required configuration
export const validateConfig = (): void => {
  const errors: string[] = []
  
  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required')
  }
  
  if (!config.jwtSecret) {
    errors.push('JWT_SECRET is required')
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors)
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`)
  }
}

// Export individual config values for convenience
export const {
  port,
  host,
  nodeEnv,
  databaseUrl,
  jwtSecret,
  jwtExpiresIn,
  jwtRefreshExpiresIn,
  jwtRefreshSecret,
  enableTokenRotation,
  stripeSecretKey,
  stripeWebhookSecret,
  stripePublishableKey,
  corsOrigins,
  enableDemoMode,
  enableNotifications,
  appName,
  appVersion,
} = config

export default config 