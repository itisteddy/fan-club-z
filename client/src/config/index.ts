// Centralized configuration for Fan Club Z
// Single source of truth for all configuration values

export const APP_CONFIG = {
  version: '2.0.55',
  name: 'Fan Club Z',
  description: 'Social Prediction Platform',
  
  api: {
    url: import.meta.env.VITE_API_URL || 'https://fan-club-z.onrender.com',
    timeout: 15000,
    retries: 3
  },
  
  frontend: {
    url: import.meta.env.VITE_FRONTEND_URL || 'https://app.fanclubz.app'
  },
  
  features: {
    realTimeUpdates: true,
    socialEngagement: true,
    walletIntegration: true,
    settlementSystem: true,
    clubSystem: true
  },
  
  limits: {
    maxStakeAmount: 10000,
    minStakeAmount: 1,
    maxDescriptionLength: 500,
    maxCommentLength: 280
  },
  
  ui: {
    theme: {
      primaryColor: '#22c55e',
      brandColors: {
        green: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d'
        }
      }
    },
    animations: {
      duration: {
        fast: 200,
        normal: 300,
        slow: 500
      }
    }
  }
} as const;

// Environment helpers
export const isDevelopment = () => import.meta.env.DEV;
export const isProduction = () => import.meta.env.PROD;

// API helpers
export const getApiUrl = () => APP_CONFIG.api.url;
export const getFrontendUrl = () => APP_CONFIG.frontend.url;

// Version helpers
export const getVersion = () => APP_CONFIG.version;
export const getFullVersion = () => `${APP_CONFIG.name} v${APP_CONFIG.version}`;

// Feature flags
export const isFeatureEnabled = (feature: keyof typeof APP_CONFIG.features): boolean => {
  return APP_CONFIG.features[feature];
};

export default APP_CONFIG;