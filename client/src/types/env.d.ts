/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: "development" | "test" | "production";
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly VITE_API_BASE?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_FRONTEND_URL?: string;
  readonly VITE_HMR_CLIENT_PORT?: string;
  // Feature flags
  readonly VITE_FCZ_UNIFIED_HEADER?: string;
  readonly VITE_FCZ_DISCOVER_V2?: string;
  readonly VITE_FCZ_PREDICTION_DETAILS_V2?: string;
  readonly VITE_FCZ_SHARED_CARDS?: string;
  readonly VITE_FCZ_AUTH_GATE?: string;
  readonly VITE_FCZ_COMMENTS_V2?: string;
  readonly VITE_FCZ_UNIFIED_CARDS?: string;
  readonly VITE_FCZ_COMMENTS_SORT?: string;
  // Optional services
  readonly VITE_DEBUG?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_ESCROW_CONTRACT_ADDRESS?: string;
  readonly VITE_GOOGLE_ANALYTICS_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
