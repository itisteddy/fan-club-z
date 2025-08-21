#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point
 * Simple working version for deployment
 */

import express from 'express';
import cors from 'cors';
import { config } from './config';
import { supabase } from './config/database';
import { db } from './config/database';
import { VERSION } from '../../shared/src/version';

const app = express();
const PORT = config.server.port || 3001;

console.log(`🚀 Fan Club Z Server v${VERSION} - CORS FIXED - SINGLE SOURCE OF TRUTH`);
console.log('📡 Starting server with enhanced CORS support...');

// Enhanced CORS middleware - Allow all origins for now to fix immediate issue
app.use(cors({
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Explicit OPTIONS preflight handler (some hosts require this)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.sendStatus(200);
});

// Additional CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  
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
    cors: 'enabled'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fan Club Z API Server',
    version: VERSION,
    environment: config.server.nodeEnv || 'production',
    status: 'running',
    cors: 'enabled'
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

// Use routes
app.use('/api/v2/users', usersRoutes);
app.use('/api/v2/predictions', predictionsRoutes);
app.use('/api/v2/prediction-entries', predictionEntriesRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fan Club Z Server started successfully!`);
  console.log(`📡 Environment: ${config.server.nodeEnv || 'production'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Version: ${VERSION}`);
  console.log(`🔗 API URL: ${config.api.url || `https://fan-club-z.onrender.com`}`);
  console.log(`🎯 Frontend URL: ${config.frontend.url || 'https://app.fanclubz.app'}`);
  console.log(`✅ CORS enabled for all origins (development mode)`);
});

export default app;