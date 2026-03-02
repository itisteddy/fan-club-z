import type cors from 'cors';

export const ALLOWED_ORIGINS = [
  // Landing site (marketing)
  'https://fanclubz.app',
  // App surfaces (main app + admin)
  'https://app.fanclubz.app',
  'https://web.fanclubz.app',
  // Auth domain (Supabase hosted auth) may be used during OAuth flows
  'https://auth.fanclubz.app',
  // Capacitor native shells (iOS/Android WebView origins)
  'capacitor://localhost',
  'capacitor://app.fanclubz.app',
  'ionic://localhost',
  // Local development origins
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

export function isAllowedCorsOrigin(origin?: string | null): boolean {
  // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
  if (!origin) return true;

  // Exact allowlist
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow any capacitor:// or ionic:// origin for native builds
  if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) return true;

  return false;
}

/**
 * Express `cors()` origin callback.
 *
 * IMPORTANT: Do NOT throw for unknown origins.
 * Throwing routes through Express error middleware and becomes a 500.
 * Instead, return `false` so no CORS headers are set (browser blocks it).
 */
export const restCorsOrigin: NonNullable<cors.CorsOptions['origin']> = (origin, callback) => {
  const o = typeof origin === 'string' ? origin : undefined;
  console.log(`[CORS] Request origin: ${o || '(no origin)'}`);

  if (isAllowedCorsOrigin(o)) {
    if (o) console.log(`[CORS] ✅ Allowed origin: ${o}`);
    return callback(null, true);
  }

  console.warn(`[CORS] ❌ Blocked origin (no CORS headers will be set): ${o}`);
  return callback(null, false);
};

export const restCorsOptions: cors.CorsOptions = {
  origin: restCorsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Cache-Control',
    'If-None-Match',
    'X-Admin-Key',
    'apikey',
    'x-client-info',
    'x-fcz-client',
    'X-FCZ-Client',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'ETag'],
};

/**
 * Socket.IO CORS origin callback.
 *
 * We deny connections cleanly (`false`) without throwing.
 */
export function socketIoCorsOrigin(origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) {
  const o = typeof origin === 'string' ? origin : undefined;
  if (o) console.log(`[RT-CORS] Request origin: ${o}`);

  if (isAllowedCorsOrigin(o)) {
    if (o) console.log(`[RT-CORS] ✅ Allowed origin: ${o}`);
    return callback(null, true);
  }

  console.warn(`[RT-CORS] ❌ Blocked origin (connection denied): ${o}`);
  return callback(null, false);
}
