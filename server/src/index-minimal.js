#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point - Minimal Version with Mock Data (JavaScript)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers - relaxed for development
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://fanclubz-version-2-0.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  // Mock user for development
  req.user = {
    id: '1',
    email: 'alex@fanclubz.app',
    username: 'alex',
    first_name: 'Alex',
    last_name: 'Johnson',
    is_active: true,
    is_verified: true,
    kyc_level: 'basic',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  next();
};

// Mock data
const mockPredictions = [
  {
    id: '1',
    creator_id: 'user1',
    title: 'Will Manchester United win against Chelsea?',
    description: 'Premier League match this weekend',
    category: 'sports',
    type: 'binary',
    status: 'open',
    stake_min: 10,
    stake_max: 1000,
    pool_total: 2500,
    entry_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    settlement_method: 'auto',
    is_private: false,
    creator_fee_percentage: 1,
    platform_fee_percentage: 2,
    tags: ['football', 'premier-league'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      {
        id: 'opt1',
        prediction_id: '1',
        label: 'Yes - Manchester United wins',
        total_staked: 1500,
        current_odds: 1.67,
        percentage: 60
      },
      {
        id: 'opt2',
        prediction_id: '1',
        label: 'No - Chelsea wins or draw',
        total_staked: 1000,
        current_odds: 2.5,
        percentage: 40
      }
    ]
  },
  {
    id: '2',
    creator_id: 'user2',
    title: 'Will Apple release a new iPhone this year?',
    description: 'Tech prediction for Apple\'s product lineup',
    category: 'technology',
    type: 'binary',
    status: 'open',
    stake_min: 5,
    stake_max: 500,
    pool_total: 1200,
    entry_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 1.5,
    platform_fee_percentage: 2,
    tags: ['apple', 'iphone', 'tech'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      {
        id: 'opt3',
        prediction_id: '2',
        label: 'Yes - New iPhone released',
        total_staked: 800,
        current_odds: 1.5,
        percentage: 67
      },
      {
        id: 'opt4',
        prediction_id: '2',
        label: 'No - No new iPhone',
        total_staked: 400,
        current_odds: 3.0,
        percentage: 33
      }
    ]
  }
];

const mockClubs = [
  {
    id: '1',
    name: 'Premier League Fans',
    description: 'The ultimate destination for Premier League predictions and discussions',
    category: 'sports',
    member_count: 1250,
    is_private: false,
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Tech Predictions',
    description: 'Predicting the future of technology and innovation',
    category: 'technology',
    member_count: 890,
    is_private: false,
    created_by: 'user2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// API Routes
app.get('/api/predictions', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: mockPredictions,
    message: 'Predictions retrieved successfully'
  });
});

app.get('/api/predictions/:id', mockAuth, (req, res) => {
  const prediction = mockPredictions.find(p => p.id === req.params.id);
  if (!prediction) {
    return res.status(404).json({
      success: false,
      message: 'Prediction not found'
    });
  }
  res.json({
    success: true,
    data: prediction,
    message: 'Prediction retrieved successfully'
  });
});

app.get('/api/clubs', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: mockClubs,
    message: 'Clubs retrieved successfully'
  });
});

app.get('/api/clubs/:id', mockAuth, (req, res) => {
  const club = mockClubs.find(c => c.id === req.params.id);
  if (!club) {
    return res.status(404).json({
      success: false,
      message: 'Club not found'
    });
  }
  res.json({
    success: true,
    data: club,
    message: 'Club retrieved successfully'
  });
});

// User profile endpoint
app.get('/api/user/profile', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: req.user,
    message: 'User profile retrieved successfully'
  });
});

// Wallet endpoints
app.get('/api/wallet/balance', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      balance: 1250.50,
      currency: 'USD',
      user_id: req.user.id
    },
    message: 'Wallet balance retrieved successfully'
  });
});

app.get('/api/wallet/transactions', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        user_id: req.user.id,
        type: 'deposit',
        amount: 100,
        currency: 'USD',
        status: 'completed',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: req.user.id,
        type: 'bet',
        amount: -25,
        currency: 'USD',
        status: 'completed',
        created_at: new Date().toISOString()
      }
    ],
    message: 'Transactions retrieved successfully'
  });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.json({
    success: false,
    message: 'API endpoint not found',
    available_endpoints: [
      'GET /health',
      'GET /api/predictions',
      'GET /api/predictions/:id',
      'GET /api/clubs',
      'GET /api/clubs/:id',
      'GET /api/user/profile',
      'GET /api/wallet/balance',
      'GET /api/wallet/transactions'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Fan Club Z Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origins: ${allowedOrigins.join(', ')}`);
}); 