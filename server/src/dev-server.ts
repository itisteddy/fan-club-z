#!/usr/bin/env node

/**
 * Development API Server
 * Simple server that returns empty responses when Supabase is not configured
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Fan Club Z Development Server - No Database Mode');
console.log('📡 Starting server without database connection...');

// Enhanced CORS middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'development',
    database: 'not_configured',
    timestamp: new Date().toISOString()
  });
});

// API v2 routes
app.get('/api/v2/predictions', (req, res) => {
  const { page = 1, limit = 20, category, search } = req.query;
  
  console.log(`📊 GET /api/v2/predictions - page: ${page}, limit: ${limit}, category: ${category}, search: ${search}`);
  
  // Return empty response
  res.json({
    predictions: [],
    total: 0,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    has_more: false
  });
});

app.get('/api/v2/predictions/:id', (req, res) => {
  const { id } = req.params;
  console.log(`📊 GET /api/v2/predictions/${id}`);
  
  res.status(404).json({
    error: 'Prediction not found',
    message: 'No database configured - prediction not available'
  });
});

app.get('/api/v2/predictions/stats/platform', (req, res) => {
  console.log('📊 GET /api/v2/predictions/stats/platform');
  
  res.json({
    total_volume: 0,
    live_predictions: 0,
    total_players: 0,
    active_categories: []
  });
});

app.get('/api/v2/users/:id', (req, res) => {
  const { id } = req.params;
  console.log(`👤 GET /api/v2/users/${id}`);
  
  res.status(404).json({
    error: 'User not found',
    message: 'No database configured - user not available'
  });
});

app.get('/api/v2/wallets/:userId', (req, res) => {
  const { userId } = req.params;
  console.log(`💰 GET /api/v2/wallets/${userId}`);
  
  res.json({
    balance: 0,
    currency: 'NGN',
    transactions: []
  });
});

// Handle all other API routes
app.all('/api/*', (req, res) => {
  console.log(`🔍 ${req.method} ${req.path} - Not implemented`);
  res.status(501).json({
    error: 'Not implemented',
    message: 'This endpoint is not available in development mode without database'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Development server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   - GET /api/health`);
  console.log(`   - GET /api/v2/predictions`);
  console.log(`   - GET /api/v2/predictions/:id`);
  console.log(`   - GET /api/v2/predictions/stats/platform`);
  console.log(`   - GET /api/v2/users/:id`);
  console.log(`   - GET /api/v2/wallets/:userId`);
  console.log(`\n⚠️  Note: All endpoints return empty data - no database configured`);
});

export default app;
