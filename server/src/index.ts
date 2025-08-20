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

const app = express();
const PORT = config.server.port || 3001;
const VERSION = '2.0.49';

console.log('🚀 Fan Club Z Server v2.0.49 - CONSOLIDATED ARCHITECTURE - SINGLE SOURCE OF TRUTH');
console.log('📡 Starting server with fixed prediction rendering...');

// Enhanced CORS middleware
app.use(cors({
  origin: [
    'https://fanclubz.com',
    'https://app.fanclubz.app',
    'https://fan-club-z.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
    // Vercel preview domains
    /https:\/\/.*\.vercel\.app$/,
    // Render preview domains
    /https:\/\/.*\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

app.use(express.json());

// Handle CORS preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: VERSION,
    environment: config.server.nodeEnv || 'production',
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fan Club Z API Server',
    version: VERSION,
    environment: config.server.nodeEnv || 'production',
    status: 'running'
  });
});

// Database seeding endpoint (for development/testing)
app.post('/api/v2/admin/seed-database', async (req, res) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
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

// API routes placeholder
app.get('/api/v2/predictions', async (req, res) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    // Fetch real predictions from Supabase database
    const { data: predictions, error, count } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch predictions',
        version: VERSION
      });
    }

    return res.json({
      data: predictions || [],
      message: 'Predictions endpoint - working',
      version: VERSION,
      pagination: {
        page: 1,
        limit: 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / 20),
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Error in predictions endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch predictions',
      version: VERSION
    });
  }
});

// Platform statistics endpoint
app.get('/api/v2/predictions/stats/platform', async (req, res) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    // Fetch real platform statistics from database
    const [predictionsCount, usersCount, activePredictionsCount] = await Promise.all([
      supabase.from('predictions').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);

    return res.json({
      data: {
        totalPredictions: predictionsCount.count || 0,
        totalUsers: usersCount.count || 0,
        totalVolume: 0, // Will be calculated from prediction entries
        activePredictions: activePredictionsCount.count || 0
      },
      message: 'Platform stats endpoint - working',
      version: VERSION
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch platform statistics',
      version: VERSION
    });
  }
});

// Specific prediction endpoint
app.get('/api/v2/predictions/:id', (req, res) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  const { id } = req.params;
  res.json({
    data: null,
    message: `Prediction ${id} not found`,
    version: VERSION
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
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
});

export default app;
