// Client environment configuration with runtime validation
import { env } from './env';

// Re-export the validated environment for new imports
export { env };

// Named export for @/utils/environment.ts compatibility
export const envClient = {
  ...env,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SSR: import.meta.env.SSR,
  // Additional environment variables that may be needed
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL,
  VITE_FCZ_UNIFIED_HEADER: import.meta.env.VITE_FCZ_UNIFIED_HEADER,
  VITE_FCZ_DISCOVER_V2: import.meta.env.VITE_FCZ_DISCOVER_V2,
  VITE_FCZ_PREDICTION_DETAILS_V2: import.meta.env.VITE_FCZ_PREDICTION_DETAILS_V2,
  VITE_FCZ_SHARED_CARDS: import.meta.env.VITE_FCZ_SHARED_CARDS,
  VITE_FCZ_AUTH_GATE: import.meta.env.VITE_FCZ_AUTH_GATE,
  VITE_FCZ_COMMENTS_V2: import.meta.env.VITE_FCZ_COMMENTS_V2,
  VITE_FCZ_UNIFIED_CARDS: import.meta.env.VITE_FCZ_UNIFIED_CARDS,
  VITE_FCZ_COMMENTS_SORT: import.meta.env.VITE_FCZ_COMMENTS_SORT,
  VITE_DEBUG: import.meta.env.VITE_DEBUG,
  VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  VITE_ESCROW_CONTRACT_ADDRESS: import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS,
  VITE_GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
};