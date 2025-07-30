#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point - Minimal Version with Mock Data
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

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
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    ],
    creator: {
      username: 'sportsexpert',
      avatar_url: null,
      is_verified: true
    },
    participant_count: 45
  },
  {
    id: '2',
    creator_id: 'user2',
    title: 'Who will win Big Brother Nigeria?',
    description: 'Final week predictions',
    category: 'pop_culture',
    type: 'multi_outcome',
    status: 'open',
    stake_min: 5,
    stake_max: 500,
    pool_total: 1800,
    entry_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    settlement_method: 'auto',
    is_private: false,
    creator_fee_percentage: 1,
    platform_fee_percentage: 2,
    tags: ['bbn', 'reality-tv'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      {
        id: 'opt3',
        prediction_id: '2',
        label: 'Contestant A',
        total_staked: 600,
        current_odds: 3.0,
        percentage: 33.3
      },
      {
        id: 'opt4',
        prediction_id: '2',
        label: 'Contestant B',
        total_staked: 720,
        current_odds: 2.5,
        percentage: 40
      },
      {
        id: 'opt5',
        prediction_id: '2',
        label: 'Contestant C',
        total_staked: 480,
        current_odds: 3.75,
        percentage: 26.7
      }
    ],
    creator: {
      username: 'realityfan',
      avatar_url: null,
      is_verified: false
    },
    participant_count: 28
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fan Club Z API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'mock', 
      redis: 'mock',     
    },
  });
});

// API v2 Routes
app.get('/api/v2/predictions', (req, res) => {
  const { category } = req.query;
  let predictions = mockPredictions;
  
  if (category && category !== 'all') {
    predictions = predictions.filter(p => p.category === category);
  }
  
  res.json(predictions);
});

app.get('/api/v2/predictions/trending', (req, res) => {
  // Return predictions sorted by pool total
  const trending = [...mockPredictions].sort((a, b) => b.pool_total - a.pool_total);
  res.json(trending);
});

app.get('/api/v2/predictions/user', (req, res) => {
  // Return empty array for now (user not logged in)
  res.json([]);
});

app.post('/api/v2/predictions', (req, res) => {
  // Mock prediction creation
  const newPrediction = {
    id: Date.now().toString(),
    creator_id: 'current_user',
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    pool_total: 0,
    participant_count: 0,
    creator: {
      username: 'you',
      avatar_url: null,
      is_verified: false
    }
  };
  
  mockPredictions.unshift(newPrediction);
  res.status(201).json(newPrediction);
});

app.post('/api/v2/prediction-entries', (req, res) => {
  // Mock prediction entry
  const { prediction_id, option_id, amount } = req.body;
  
  res.json({
    id: Date.now().toString(),
    prediction_id,
    option_id,
    amount,
    potential_payout: amount * 2, // Mock 2x payout
    created_at: new Date().toISOString()
  });
});

// Simple test endpoints
app.get('/api/v2/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is working!',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Fan Club Z Server started on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API URL: http://localhost:${PORT}/api/v2`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`📊 Mock Data: ${mockPredictions.length} predictions loaded`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
