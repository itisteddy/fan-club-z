import { z } from "zod";

const ClientSchema = z.object({
  MODE: z.enum(["development","test","production"]).default("development"),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
  VITE_API_BASE: z.string().optional(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_FRONTEND_URL: z.string().url().optional(),
  VITE_HMR_CLIENT_PORT: z.string().optional(),
  // Feature flags
  VITE_FCZ_UNIFIED_HEADER: z.string().optional(),
  VITE_FCZ_DISCOVER_V2: z.string().optional(),
  VITE_FCZ_PREDICTION_DETAILS_V2: z.string().optional(),
  VITE_FCZ_SHARED_CARDS: z.string().optional(),
  VITE_FCZ_AUTH_GATE: z.string().optional(),
  VITE_FCZ_COMMENTS_V2: z.string().optional(),
  VITE_FCZ_UNIFIED_CARDS: z.string().optional(),
  VITE_FCZ_COMMENTS_SORT: z.string().optional(),
  // Optional services
  VITE_DEBUG: z.string().optional(),
  VITE_VAPID_PUBLIC_KEY: z.string().optional(),
  VITE_ESCROW_CONTRACT_ADDRESS: z.string().optional(),
  VITE_GOOGLE_ANALYTICS_ID: z.string().optional(),
});

export const envClient = (() => {
  const ie = import.meta.env;
  const parsed = ClientSchema.safeParse({
    MODE: ie.MODE,
    DEV: ie.DEV,
    PROD: ie.PROD,
    VITE_API_BASE: ie.VITE_API_BASE,
    VITE_SUPABASE_URL: ie.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: ie.VITE_SUPABASE_ANON_KEY,
    VITE_FRONTEND_URL: ie.VITE_FRONTEND_URL,
    VITE_HMR_CLIENT_PORT: (ie as any).VITE_HMR_CLIENT_PORT,
    // Feature flags
    VITE_FCZ_UNIFIED_HEADER: ie.VITE_FCZ_UNIFIED_HEADER,
    VITE_FCZ_DISCOVER_V2: ie.VITE_FCZ_DISCOVER_V2,
    VITE_FCZ_PREDICTION_DETAILS_V2: ie.VITE_FCZ_PREDICTION_DETAILS_V2,
    VITE_FCZ_SHARED_CARDS: ie.VITE_FCZ_SHARED_CARDS,
    VITE_FCZ_AUTH_GATE: ie.VITE_FCZ_AUTH_GATE,
    VITE_FCZ_COMMENTS_V2: ie.VITE_FCZ_COMMENTS_V2,
    VITE_FCZ_UNIFIED_CARDS: ie.VITE_FCZ_UNIFIED_CARDS,
    VITE_FCZ_COMMENTS_SORT: ie.VITE_FCZ_COMMENTS_SORT,
    // Optional services
    VITE_DEBUG: ie.VITE_DEBUG,
    VITE_VAPID_PUBLIC_KEY: ie.VITE_VAPID_PUBLIC_KEY,
    VITE_ESCROW_CONTRACT_ADDRESS: ie.VITE_ESCROW_CONTRACT_ADDRESS,
    VITE_GOOGLE_ANALYTICS_ID: ie.VITE_GOOGLE_ANALYTICS_ID,
  });
  if (!parsed.success) {
    // Throw on client missing required keys (fail fast)
    throw new Error("[env.client] Missing/invalid env: " + JSON.stringify(parsed.error.format()));
  }
  return parsed.data;
})();

export type ClientEnv = z.infer<typeof ClientSchema>;
