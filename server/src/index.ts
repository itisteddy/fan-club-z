#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point
 * Simple working version for deployment with settlement support
 * 
 * [PERF] Performance optimizations:
 * - compression middleware for response compression
 * - helmet for security headers
 * - Static asset caching with immutable headers
 * - API response caching with ETag support
 */

// CRITICAL: Set DNS to prefer IPv4 first to avoid IPv6 connectivity issues on Render
// Render doesn't support IPv6, but Supabase uses IPv6 by default
import dns from 'dns';
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
  console.log('[FCZ-DB] DNS configured to prefer IPv4 connections');
} else {
  console.warn('[FCZ-DB] DNS.setDefaultResultOrder not available - IPv6 connectivity issues may occur on Render');
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { config } from './config';
import { supabase } from './config/database';
import { db } from './config/database';
import { VERSION } from '@fanclubz/shared';
import { checkMaintenanceMode } from './middleware/maintenance';
import { clientIdMiddleware } from './middleware/clientId';
import { requireCryptoEnabled } from './middleware/requireCryptoEnabled';

const app = express();
const PORT = config.server.port || 3001;
const HOST =
  process.env.HOST ||
  (String(process.env.NODE_ENV || config.server.nodeEnv || '').toLowerCase() === 'production'
    ? undefined
    : '0.0.0.0');

console.log(`🚀 Fan Club Z Server v${VERSION} - CORS FIXED - WITH SETTLEMENT`);
console.log('📡 Starting server with enhanced CORS support and settlement functionality...');
console.log('✅ Clubs table references removed - Ready for production');

// [PERF] Enable gzip/brotli compression for all responses
app.use(compression({
  // [PERF] Compress responses larger than 1KB
  threshold: 1024,
  // [PERF] Don't compress responses with this header
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// [PERF] Security headers via helmet (CSP disabled to avoid breaking inline scripts)
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP - frontend handles this
  crossOriginEmbedderPolicy: false, // Required for some wallet integrations
}));

// CORS configuration: Single source of truth for all CORS logic
// Phase 1: Use cors() middleware properly to eliminate preflight 500s
const allowedOrigins = [
  'https://fanclubz.app',
  'https://app.fanclubz.app',
  // Admin portal
  'https://web.fanclubz.app',
  // Auth domain (Supabase auth hosted) may be used during OAuth flows
  'https://auth.fanclubz.app',
  // Capacitor native shells (iOS/Android WebView origins)
  // iOS uses capacitor://app.fanclubz.app (appId-based) or capacitor://localhost
  // These must be allowed for native app API calls to work
  'capacitor://localhost',
  'capacitor://app.fanclubz.app',
  'ionic://localhost',
  // Local development origins
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:5174', // Vite default dev port
  'http://localhost:3000',
];

// Avoid turning "origin not allowed" into a 500 again.
// We log blocked origins (deduped) and simply omit CORS headers for them.
const warnedBlockedOrigins = new Set<string>();

// Single CORS options object used for both normal requests and preflight
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Log all origins for debugging native app issues
    console.log(`[CORS] Request origin: ${origin || '(no origin)'}`);
    
    // Allow requests with no origin (like mobile apps, Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check exact match first
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] ✅ Allowed origin: ${origin}`);
      callback(null, true);
      return;
    }
    
    // Allow any capacitor:// or ionic:// origin for native builds
    // This ensures iOS/Android Capacitor apps can make API calls
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
      console.log(`[CORS] ✅ Allowed Capacitor origin: ${origin}`);
      callback(null, true);
      return;
    }
    
    if (!warnedBlockedOrigins.has(origin)) {
      warnedBlockedOrigins.add(origin);
      console.warn(
        `[CORS] ❌ Blocked origin (no CORS headers will be set): ${origin}. ` +
          `If this is a real frontend surface, add it to allowedOrigins in server/src/index.ts and server/src/services/realtime.ts.`
      );
    }
    // CRITICAL: do NOT throw here; throwing becomes a 500 and looks like "server broken"
    // Instead, fail closed by omitting CORS headers (browser will block the response).
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control', 'If-None-Match', 'X-Admin-Key', 'apikey', 'x-client-info', 'X-FCZ-Client'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'ETag']
};

// CRITICAL: Register CORS middleware BEFORE any routes or auth middleware
// This ensures OPTIONS preflight requests are handled correctly and never hit auth guards
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Paystack webhooks require raw body for signature verification.
// We capture the raw buffer ONLY for that route via express.json verify hook.
app.use(express.json({
  verify: (req: any, _res, buf) => {
    try {
      const url = String(req?.originalUrl || '');
      if (url.includes('/api/v2/fiat/paystack/webhook')) {
        req.rawBody = buf;
      }
    } catch {
      // ignore
    }
  },
}));

// Maintenance mode check (must be before routes)
app.use(checkMaintenanceMode);

// Client identification (X-FCZ-Client) for crypto testnet gating and logging
app.use(clientIdMiddleware);

// [PERF] Static assets with immutable cache headers (1 year)
// Note: In production, these are typically served by CDN/Vercel, but this helps for direct server access
app.use('/assets', express.static(path.join(__dirname, '../dist/assets'), {
  immutable: true,
  maxAge: '365d',
  etag: true,
}));

// [PERF] Helper function to generate ETag from response data
function generateETag(data: unknown): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

// [PERF] Helper function to set cache headers for API responses
function setCacheHeaders(res: express.Response, maxAge: number = 15, etag?: string) {
  res.setHeader('Cache-Control', `private, max-age=${maxAge}`);
  if (etag) {
    res.setHeader('ETag', etag);
  }
}

// [PERF] Helper function to check conditional GET (304 responses)
function checkConditionalGet(req: express.Request, res: express.Response, etag: string): boolean {
  const ifNoneMatch = req.headers['if-none-match'];
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304).end();
    return true;
  }
  return false;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: config.server.nodeEnv || 'production',
    uptime: process.uptime(),
    cors: 'enabled',
    settlement: 'enabled',
    compression: 'enabled', // [PERF] Added compression indicator
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fan Club Z API Server',
    version: VERSION,
    environment: config.server.nodeEnv || 'production',
    status: 'running',
    cors: 'enabled',
    settlement: 'enabled'
  });
});

// Database seeding endpoint (for development/testing) - ADMIN ONLY
app.post('/api/v2/admin/seed-database', async (req, res): Promise<void> => {
  // Admin authorization check
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
  const apiKey = req.headers['x-admin-key'] as string | undefined;
  
  if (!ADMIN_API_KEY || !apiKey || apiKey !== ADMIN_API_KEY) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin access required',
      version: VERSION
    });
    return;
  }
  
  try {
    // Import and run seeding function
    const { seedDatabase } = await import('./scripts/seedDatabase');
    const result = await seedDatabase();
    
    res.json({
      success: true,
      message: 'Database seeded successfully',
      data: result,
      version: VERSION
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({
      success: false,
      error: 'Database seeding failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      version: VERSION
    });
  }
});

// Import routes
import usersRoutes from './routes/users';
import predictionsRoutes from './routes/predictions';
import predictionEntriesRoutes from './routes/prediction-entries';
import betsRoutes from './routes/bets';
import socialRoutes from './routes/social';
import { moderationRouter } from './routes/moderation';
import settlementRoutes from './routes/settlement';
import activityRoutes from './routes/activity';
import imagesRoutes from './api/images/router';
import escrowRoutes from './routes/escrow';
import { walletRead } from './routes/walletRead';
import { walletSummary } from './routes/walletSummary';
import { walletActivity } from './routes/walletActivity';
import { walletReconcile } from './routes/walletReconcile';
import walletMaintenance from './routes/walletMaintenance';
import { placeBetRouter } from './routes/predictions/placeBet';
import { demoWallet } from './routes/demoWallet';
import { chainActivity } from './routes/chain/activity';
import { healthPayments } from './routes/healthPayments';
import { healthBase } from './routes/healthBase';
import { healthApp } from './routes/healthApp';
import transactionLogRouter from './routes/wallet/transactionLog';
import { qaCryptoMock } from './routes/qaCryptoMock';
import referralRoutes from './routes/referrals';
import badgeRoutes from './routes/badges';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import notificationsRoutes from './routes/notifications';
import { remindersRouter } from './routes/notificationsReminders';
import categoriesRoutes from './routes/categories';
import { contentReportsRouter } from './routes/contentReports';
import { uploadsRouter } from './routes/uploads';
import { fiatPaystackRouter } from './routes/fiatPaystack';
import { fiatWithdrawalsRouter } from './routes/fiatWithdrawals';
import { fxRouter } from './routes/fx';
import { seedCategories } from './services/categoriesSeed';
import { startBaseDepositWatcher } from './chain/base/depositWatcher';
import { resolveAndValidateAddresses } from './chain/base/addressRegistry';
import { validatePaymentsEnv } from './utils/envValidation';
import { ensureAvatarsBucket, ensurePredictionImagesBucket } from './startup/storage';
import { startReconciliationJob } from './cron/reconcileEscrow';
import { startLockExpirationJob } from './cron/expireLocks';
import { initRealtime } from './services/realtime';

// Use routes
app.use('/api/v2/users', usersRoutes);
app.use('/api/v2/auth', authRouter);
app.use('/api/v2/predictions', predictionsRoutes);
app.use('/api/predictions', placeBetRouter);
app.use('/api/v1/predictions', placeBetRouter); // Back-compat for older clients (snake_case route supported inside)
app.use('/api/v2/prediction-entries', predictionEntriesRoutes);
app.use('/api/v2/bets', betsRoutes);
app.use('/api/v2/social', socialRoutes);
app.use('/api/v2/moderation', moderationRouter);
app.use('/api/v2/settlement', settlementRoutes);
app.use('/api/v2/activity', activityRoutes);
app.use('/api/v2/notifications', notificationsRoutes);
app.use('/api/v2/notifications/reminders', remindersRouter);
app.use('/api/v2/categories', categoriesRoutes);
app.use('/api/v2/content', contentReportsRouter);
app.use('/api/v2/uploads', uploadsRouter);
app.use('/api/images', imagesRoutes);
app.use('/api/escrow', requireCryptoEnabled('testnet'), escrowRoutes);
// walletSummary must come BEFORE walletRead to avoid route conflicts
// Both handle /summary/:userId, but walletSummary returns reconciled on-chain data
app.use('/api/wallet', walletSummary);
app.use('/api/wallet', walletRead);
app.use('/api/wallet', walletActivity);
app.use('/api/wallet', walletReconcile);
app.use('/api/wallet', walletMaintenance);
app.use('/api/wallet', transactionLogRouter);
app.use('/api/demo-wallet', demoWallet);
app.use('/api/v2/fiat/paystack', fiatPaystackRouter);
app.use('/api/v2/fiat/withdrawals', fiatWithdrawalsRouter);
app.use('/api/v2/fx', fxRouter);
app.use('/api/chain', chainActivity);
app.use(healthPayments);
app.use(healthBase);
app.use(healthApp);

// QA Mock routes (guarded by flag)
if (process.env.BASE_DEPOSITS_MOCK === '1') {
  app.use(qaCryptoMock());
}

// Referral routes (feature-flagged internally)
app.use(referralRoutes);

// Badge routes (feature-flagged internally)
app.use(badgeRoutes);

// Admin dashboard API
app.use('/api/v2/admin', adminRouter);

// Debug logging for route registration
console.log('✅ Routes registered:');
console.log('  - /api/v2/users');
console.log('  - /api/v2/predictions');
console.log('  - /api/v2/prediction-entries');
console.log('  - /api/v2/bets (NEW: idempotent bet placement)');
console.log('  - /api/v2/social (comments system)');
console.log('  - /api/v2/settlement (manual/auto settlement)');
console.log('  - /api/v2/activity (activity feed)');
console.log('  - /api/v2/categories (prediction categories)');
console.log('  - /api/images (auto-generated images)');
console.log('  - /api/escrow (escrow lock/unlock)');
console.log('  - /api/wallet (wallet summary & activity)');
console.log('  - /api/demo-wallet (demo credits ledger)');
console.log('  - /api/health/payments (payment system health)');
console.log('  - /api/health/base (Base chain health)');
console.log('  - /r/:code (Referral link handler)');
console.log('  - /api/leaderboard/referrals (Referral leaderboard)');
console.log('  - /api/referrals/* (Referral system)');
console.log('  - /api/badges/og/* (OG badges system)');
if (process.env.BASE_DEPOSITS_MOCK === '1') {
  console.log('  - /api/qa/crypto/mock-deposit (QA mock deposits)');
}
console.log('[PERF] ✅ Compression enabled');
console.log('[PERF] ✅ Security headers (helmet) enabled');

// CORS test endpoint
app.get('/api/v2/test-cors', (req, res) => {
  console.log('🧪 CORS test endpoint called - origin:', req.headers.origin);
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    version: VERSION
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.originalUrl} - origin:`, req.headers.origin);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    version: VERSION
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong',
    timestamp: new Date().toISOString(),
    version: VERSION
  });
});

// [PERF] Export helper functions for use in route handlers
export { generateETag, setCacheHeaders, checkConditionalGet };

// Start server (HTTP + Socket.io)
const httpServer = http.createServer(app);
initRealtime(httpServer);
httpServer.listen(PORT, HOST as any, async () => {
  console.log(`🚀 Fan Club Z Server started successfully!`);
  console.log(`📡 Environment: ${config.server.nodeEnv || 'production'}`);
  console.log(`🌐 Server running on ${HOST || '0.0.0.0'}:${PORT}`);
  console.log(`📊 Version: ${VERSION}`);
  console.log(`🔗 API URL: ${config.api.url || `https://fan-club-z.onrender.com`}`);
  console.log(`🎯 Frontend URL: ${config.frontend.url || 'https://app.fanclubz.app'}`);
  console.log(`✅ CORS enabled (restricted to whitelisted origins)`);
  console.log(`🔨 Settlement system enabled`);
  ensureAvatarsBucket();
  ensurePredictionImagesBucket();

  // Seed categories on startup (idempotent)
  seedCategories().catch((err) => {
    console.error('⚠️ Categories seeding failed (non-fatal):', err);
  });
  
  // Validate payment environment variables
  try {
    validatePaymentsEnv();
  } catch (e) {
    console.error('[FCZ-PAY] Environment validation failed:', e);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Fail fast in production
    }
  }
  
  // Start Base deposit watcher if enabled
  if (process.env.PAYMENTS_ENABLE === '1' && process.env.ENABLE_BASE_DEPOSITS === '1') {
    (async () => {
      try {
        // Resolve and validate addresses from registry
        const { usdc, escrow } = await resolveAndValidateAddresses();
        
        if (!escrow) {
          console.warn('[FCZ-PAY] ⚠️ Escrow address not found in registry, deposit watcher cannot start');
          return;
        }
        
        // Use real PostgreSQL pool connection (not Supabase RPC)
        const { ensureDbPool } = await import('./utils/dbPool');
        const pool = await ensureDbPool();
        
        if (!pool) {
          console.warn('[FCZ-PAY] ⚠️ Cannot start deposit watcher: DATABASE_URL not configured');
          console.warn('[FCZ-PAY] Deposit watcher requires direct PostgreSQL connection for transactions');
          console.warn('[FCZ-PAY] Watcher will not start, but server will continue running');
          return;
        }
        
        await startBaseDepositWatcher({ 
          pool, 
          usdc: usdc as `0x${string}`,
          escrow: escrow as `0x${string}`
        });
        
        console.log('[FCZ-PAY] ✅ Deposit watcher started successfully');
      } catch (e) {
        // Don't crash the server if watcher fails to start
        console.error('[FCZ-PAY] ⚠️ Deposit watcher failed to start (non-fatal):', e);
        console.error('[FCZ-PAY] Server will continue running without deposit watcher');
        // Don't exit in production - let the server continue
      }
    })();
  }

  // Start reconciliation job if payments enabled
  if (process.env.PAYMENTS_ENABLE === '1') {
    startReconciliationJob();
  }
  
  // Start lock expiration job (always run, not just when payments enabled)
  // This prevents locks from staying forever even in demo/test environments
  startLockExpirationJob();
  console.log('✅ Lock expiration cron job started');
});

export default app;
