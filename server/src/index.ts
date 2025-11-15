#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point
 * Simple working version for deployment with settlement support
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config';
import { supabase } from './config/database';
import { db } from './config/database';
import { VERSION } from '@fanclubz/shared';

const app = express();
const PORT = config.server.port || 3001;

console.log(`🚀 Fan Club Z Server v${VERSION} - CORS FIXED - WITH SETTLEMENT`);
console.log('📡 Starting server with enhanced CORS support and settlement functionality...');
console.log('✅ Clubs table references removed - Ready for production');

// Enhanced CORS middleware - Allow all origins for now to fix immediate issue
app.use(cors({
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Explicit OPTIONS preflight handler (some hosts require this)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
  res.sendStatus(200);
});

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: config.server.nodeEnv || 'production',
    uptime: process.uptime(),
    cors: 'enabled',
    settlement: 'enabled'
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

// Database seeding endpoint (for development/testing)
app.post('/api/v2/admin/seed-database', async (req, res) => {
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
import { chainActivity } from './routes/chain/activity';
import { healthPayments } from './routes/healthPayments';
import { healthBase } from './routes/healthBase';
import { healthApp } from './routes/healthApp';
import { qaCryptoMock } from './routes/qaCryptoMock';
import { startBaseDepositWatcher } from './chain/base/depositWatcher';
import { resolveAndValidateAddresses } from './chain/base/addressRegistry';
import { validatePaymentsEnv } from './utils/envValidation';
import { ensureAvatarsBucket } from './startup/storage';
import { startReconciliationJob } from './cron/reconcileEscrow';
import { startLockExpirationJob } from './cron/expireLocks';
import { initRealtime } from './services/realtime';

// Use routes
app.use('/api/v2/users', usersRoutes);
app.use('/api/v2/predictions', predictionsRoutes);
app.use('/api/predictions', placeBetRouter);
app.use('/api/v1/predictions', placeBetRouter); // Back-compat for older clients (snake_case route supported inside)
app.use('/api/v2/prediction-entries', predictionEntriesRoutes);
app.use('/api/v2/bets', betsRoutes);
app.use('/api/v2/social', socialRoutes);
app.use('/api/v2/settlement', settlementRoutes);
app.use('/api/v2/activity', activityRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/wallet', walletRead);
app.use('/api/wallet', walletSummary);
app.use('/api/wallet', walletActivity);
app.use('/api/wallet', walletReconcile);
app.use('/api/wallet', walletMaintenance);
app.use('/api/chain', chainActivity);
app.use(healthPayments);
app.use(healthBase);
app.use(healthApp);

// QA Mock routes (guarded by flag)
if (process.env.BASE_DEPOSITS_MOCK === '1') {
  app.use(qaCryptoMock());
}

// Debug logging for route registration
console.log('✅ Routes registered:');
console.log('  - /api/v2/users');
console.log('  - /api/v2/predictions');
console.log('  - /api/v2/prediction-entries');
console.log('  - /api/v2/bets (NEW: idempotent bet placement)');
console.log('  - /api/v2/social (comments system)');
console.log('  - /api/v2/settlement (manual/auto settlement)');
console.log('  - /api/v2/activity (activity feed)');
console.log('  - /api/images (auto-generated images)');
console.log('  - /api/escrow (escrow lock/unlock)');
console.log('  - /api/wallet (wallet summary & activity)');
console.log('  - /api/health/payments (payment system health)');
console.log('  - /api/health/base (Base chain health)');
if (process.env.BASE_DEPOSITS_MOCK === '1') {
  console.log('  - /api/qa/crypto/mock-deposit (QA mock deposits)');
}

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

// Start server (HTTP + Socket.io)
const httpServer = http.createServer(app);
initRealtime(httpServer);
httpServer.listen(PORT, async () => {
  console.log(`🚀 Fan Club Z Server started successfully!`);
  console.log(`📡 Environment: ${config.server.nodeEnv || 'production'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Version: ${VERSION}`);
  console.log(`🔗 API URL: ${config.api.url || `https://fan-club-z.onrender.com`}`);
  console.log(`🎯 Frontend URL: ${config.frontend.url || 'https://app.fanclubz.app'}`);
  console.log(`✅ CORS enabled for all origins (development mode)`);
  console.log(`🔨 Settlement system enabled`);
  ensureAvatarsBucket();
  
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
        const { usdc } = await resolveAndValidateAddresses();
        
        // Use real PostgreSQL pool connection (not Supabase RPC)
        const { getDbPool } = await import('./utils/dbPool');
        const pool = getDbPool();
        
        if (!pool) {
          console.warn('[FCZ-PAY] ⚠️ Cannot start deposit watcher: DATABASE_URL not configured');
          console.warn('[FCZ-PAY] Deposit watcher requires direct PostgreSQL connection for transactions');
          console.warn('[FCZ-PAY] Watcher will not start, but server will continue running');
          return;
        }
        
        await startBaseDepositWatcher({ 
          pool, 
          usdc: usdc as `0x${string}`
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