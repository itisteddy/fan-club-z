import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  
  // Frontend Configuration
  frontend: {
    url: process.env.CLIENT_URL || process.env.VITE_APP_URL || 'http://localhost:5173',
  },
  
  // API Configuration
  api: {
    url: process.env.API_URL || 'http://localhost:3001',
    version: 'v2',
  },
  
  // Supabase Configuration
  supabase: {
    url: process.env.VITE_SUPABASE_URL!,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-for-production-security',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  
  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
  
  // Payment Configuration (Demo Mode)
  payment: {
    demoMode: process.env.PAYMENT_DEMO_MODE !== 'false', // Default to true for development
    demoSuccessRate: parseFloat(process.env.DEMO_PAYMENT_SUCCESS_RATE || '0.9'),
    demoProcessingDelay: parseInt(process.env.DEMO_PAYMENT_DELAY || '3000', 10), // 3 seconds
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      publicKey: process.env.PAYSTACK_PUBLIC_KEY,
    },
  },
  
  // KYC Configuration
  kyc: {
    enabled: process.env.KYC_ENABLED === 'true',
    providerApiKey: process.env.KYC_PROVIDER_API_KEY,
    basicLimit: parseFloat(process.env.KYC_BASIC_LIMIT || '1000'), // NGN 1,000
    enhancedLimit: parseFloat(process.env.KYC_ENHANCED_LIMIT || '100000'), // NGN 100,000
  },
  
  // Feature Flags
  features: {
    socialFeatures: process.env.ENABLE_SOCIAL_FEATURES !== 'false',
    clubs: process.env.ENABLE_CLUBS !== 'false',
    realTime: process.env.ENABLE_REAL_TIME !== 'false',
    pushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    blockchain: process.env.ENABLE_BLOCKCHAIN === 'true',
  },
  
  // Email Configuration
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, sendgrid, ses
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'Fan Club Z',
      email: process.env.EMAIL_FROM_ADDRESS || 'noreply@fanclubz.com',
    },
  },
  
  // Blockchain Configuration (Future Implementation)
  blockchain: {
    enabled: process.env.ENABLE_BLOCKCHAIN === 'true',
    network: process.env.BLOCKCHAIN_NETWORK || 'polygon-mumbai', // polygon-mumbai, polygon-mainnet
    rpcUrl: process.env.POLYGON_RPC_URL,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
    escrowContractAddress: process.env.ESCROW_CONTRACT_ADDRESS,
  },
  
  // Analytics Configuration
  analytics: {
    enabled: process.env.ENABLE_ANALYTICS === 'true',
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
    mixpanelToken: process.env.MIXPANEL_TOKEN,
    apiKey: process.env.ANALYTICS_API_KEY,
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    enableConsole: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
    enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
    enableJson: process.env.NODE_ENV === 'production',
    maxFiles: process.env.LOG_MAX_FILES || '5',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },
  
  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-for-production',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [],
    trustProxy: process.env.TRUST_PROXY === 'true',
  },
  
  // Cache Configuration
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour in seconds
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100', 10), // Max items in cache
  },
  
  // Database Configuration
  database: {
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10), // 10 seconds
  },
  
  // WebSocket Configuration
  websocket: {
    enabled: process.env.ENABLE_WEBSOCKET !== 'false',
    port: parseInt(process.env.WEBSOCKET_PORT || '3002', 10),
    origins: process.env.WEBSOCKET_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// Only validate in production or when explicitly required
if (process.env.NODE_ENV === 'production' || process.env.VALIDATE_ENV === 'true') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}. Please check your .env.local file.`);
    }
  }
}

// Validate Supabase URL format
if (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.startsWith('https://')) {
  throw new Error('VITE_SUPABASE_URL must be a valid HTTPS URL');
}

// Validate JWT secret strength in production
if (process.env.NODE_ENV === 'production' && config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long in production');
}

export default config;
