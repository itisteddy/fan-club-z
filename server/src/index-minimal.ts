#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point - Minimal Version with Mock Data
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Extend Express namespace to add user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        first_name: string;
        last_name: string;
        is_active: boolean;
        is_verified: boolean;
        kyc_level: string;
        created_at: string;
        updated_at: string;
      };
    }
  }
}

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

// CORS configuration - Allow all development domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://app.fanclubz.app',
  'https://dev.fanclubz.app',
  'https://fanclubz.app',
  'https://www.fanclubz.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🌐 CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('🌐 CORS: Checking origin:', origin);
    console.log('🌐 CORS: Allowed origins:', allowedOrigins);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;
    
    // Also allow any Vercel deployment (for development)
    const isVercelDeployment = origin.includes('.vercel.app');
    
    if (isAllowed || isVercelDeployment) {
      console.log('✅ CORS: Origin allowed', isVercelDeployment ? '(Vercel deployment)' : '(explicit allow)');
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin blocked');
      // In development, be more permissive
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚧 CORS: Development mode - allowing anyway');
        callback(null, true);
      } else {
        console.log('🚧 CORS: Production mode - allowing anyway for now');
        callback(null, true); // Temporarily allow all for debugging
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock authentication middleware
const mockAuth = (req: Request, res: Response, next: NextFunction) => {
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
    description: 'Premier League match this weekend at Old Trafford. Both teams are in good form, but United has home advantage.',
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
    participant_count: 45,
    likes_count: 23,
    comments_count: 8,
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
    }
  },
  {
    id: '2',
    creator_id: 'user2',
    title: 'Who will win Big Brother Nigeria?',
    description: 'Final week predictions for the most popular reality show in Nigeria.',
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
    participant_count: 28,
    likes_count: 15,
    comments_count: 5,
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
    }
  },
  {
    id: '3',
    creator_id: 'user3',
    title: 'Will Bitcoin reach $100,000 by end of 2025?',
    description: 'Crypto prediction based on current market trends and institutional adoption.',
    category: 'finance',
    type: 'binary',
    status: 'open',
    stake_min: 5,
    stake_max: 2000,
    pool_total: 3500,
    entry_deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    settlement_method: 'auto',
    is_private: false,
    creator_fee_percentage: 1,
    platform_fee_percentage: 2,
    tags: ['bitcoin', 'crypto', 'finance'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    participant_count: 67,
    likes_count: 34,
    comments_count: 12,
    options: [
      {
        id: 'opt6',
        prediction_id: '3',
        label: 'Yes - Bitcoin reaches $100k+',
        total_staked: 2100,
        current_odds: 1.67,
        percentage: 60
      },
      {
        id: 'opt7',
        prediction_id: '3',
        label: 'No - Bitcoin stays below $100k',
        total_staked: 1400,
        current_odds: 2.5,
        percentage: 40
      }
    ],
    creator: {
      username: 'cryptotrader',
      avatar_url: null,
      is_verified: true
    }
  }
];

// Mock clubs data
const mockClubs = [
  {
    id: '1',
    name: 'Premier League Predictors',
    description: 'The ultimate destination for Premier League predictions and analysis. Join thousands of football fans making winning predictions!',
    category: 'sports',
    visibility: 'public',
    owner_id: 'user1',
    member_count: 2547,
    is_member: false,
    member_role: null,
    owner: {
      username: 'PremierLeaguePro',
      avatar_url: null
    },
    activePredictions: 12,
    stats: {
      totalPredictions: 234,
      correctPredictions: 156,
      totalWinnings: 45600,
      topMembers: 15
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Crypto Bulls',
    description: 'Daily crypto predictions and market analysis from experts and enthusiasts. Bitcoin, Ethereum, and altcoin predictions.',
    category: 'crypto',
    visibility: 'public',
    owner_id: 'user2',
    member_count: 1823,
    is_member: true,
    member_role: 'member',
    owner: {
      username: 'CryptoExpert',
      avatar_url: null
    },
    activePredictions: 8,
    stats: {
      totalPredictions: 156,
      correctPredictions: 89,
      totalWinnings: 23400,
      topMembers: 12
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Mock club members data
const mockClubMembers = [
  {
    club_id: '1',
    user_id: '1',
    role: 'admin',
    joined_at: new Date().toISOString(),
    user: {
      id: '1',
      username: 'alex',
      avatar_url: null,
      created_at: new Date().toISOString()
    }
  },
  {
    club_id: '1',
    user_id: '2',
    role: 'member',
    joined_at: new Date().toISOString(),
    user: {
      id: '2',
      username: 'johnsmith',
      avatar_url: null,
      created_at: new Date().toISOString()
    }
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

// ============================================================================
// CLUB ROUTES (Mock Implementation)
// ============================================================================

// Get all clubs
app.get('/api/v2/clubs', (req, res) => {
  const { category, search } = req.query;
  let clubs = [...mockClubs];
  
  if (category && category !== 'all') {
    clubs = clubs.filter(club => club.category === category);
  }
  
  if (search) {
    const searchLower = search.toString().toLowerCase();
    clubs = clubs.filter(club => 
      club.name.toLowerCase().includes(searchLower) ||
      club.description.toLowerCase().includes(searchLower)
    );
  }
  
  res.json({
    success: true,
    data: clubs
  });
});

// Get club by ID
app.get('/api/v2/clubs/:id', (req, res) => {
  const { id } = req.params;
  const club = mockClubs.find(c => c.id === id);
  
  if (!club) {
    return res.status(404).json({
      success: false,
      error: 'Club not found'
    });
  }
  
  res.json({
    success: true,
    data: club
  });
});

// Join club
app.post('/api/v2/clubs/:id/join', mockAuth, (req, res) => {
  const { id } = req.params;
  const club = mockClubs.find(c => c.id === id);
  
  if (!club) {
    return res.status(404).json({
      success: false,
      error: 'Club not found'
    });
  }
  
  // Update mock data to show user has joined
  club.is_member = true;
  club.member_role = 'member';
  club.member_count = (club.member_count || 0) + 1;
  
  console.log(`✅ User joined club: ${club.name}`);
  
  res.json({
    success: true,
    message: 'Successfully joined club',
    data: { club_id: id, user_id: req.user?.id || 'unknown', role: 'member' }
  });
});

// Leave club
app.post('/api/v2/clubs/:id/leave', mockAuth, (req, res) => {
  const { id } = req.params;
  const club = mockClubs.find(c => c.id === id);
  
  if (!club) {
    return res.status(404).json({
      success: false,
      error: 'Club not found'
    });
  }
  
  // Update mock data to show user has left
  club.is_member = false;
  club.member_role = null;
  club.member_count = Math.max((club.member_count || 1) - 1, 0);
  
  console.log(`👋 User left club: ${club.name}`);
  
  res.json({
    success: true,
    message: 'Successfully left club'
  });
});

// Get club members
app.get('/api/v2/clubs/:id/members', mockAuth, (req, res) => {
  const { id } = req.params;
  const members = mockClubMembers.filter(m => m.club_id === id);
  
  res.json({
    success: true,
    data: members
  });
});

// Create club
app.post('/api/v2/clubs', mockAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  
  const newClub = {
    id: Date.now().toString(),
    owner_id: req.user.id,
    member_count: 1,
    is_member: true,
    member_role: 'admin',
    activePredictions: 0,
    stats: {
      totalPredictions: 0,
      correctPredictions: 0,
      totalWinnings: 0,
      topMembers: 1
    },
    owner: {
      username: req.user.username,
      avatar_url: null
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...req.body
  };
  
  mockClubs.unshift(newClub);
  console.log(`🎉 New club created: ${newClub.name}`);
  
  res.status(201).json({
    success: true,
    data: newClub,
    message: 'Club created successfully'
  });
});

// ============================================================================
// PREDICTION ROUTES (v2 and legacy routes)
// ============================================================================

// Get all predictions (v2)
app.get('/api/v2/predictions', (req, res) => {
  const { category } = req.query;
  let predictions = mockPredictions;
  
  if (category && category !== 'all') {
    predictions = predictions.filter(p => p.category === category);
  }
  
  res.json(predictions);
});

// Get trending predictions (v2)
app.get('/api/v2/predictions/trending', (req, res) => {
  // Return predictions sorted by pool total
  const trending = [...mockPredictions].sort((a, b) => b.pool_total - a.pool_total);
  res.json(trending);
});

// Get user predictions (v2)
app.get('/api/v2/predictions/user', (req, res) => {
  // Return empty array for now (user not logged in)
  res.json([]);
});

// Create prediction (v2)
app.post('/api/v2/predictions', (req, res) => {
  console.log('🎯 Creating prediction via v2 API:', req.body);
  
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
  console.log('✅ Prediction created successfully:', newPrediction.id);
  res.status(201).json(newPrediction);
});

// Create prediction entry (v2)
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

// ============================================================================
// LEGACY ROUTES (for backward compatibility)
// ============================================================================

// Legacy prediction routes (without v2)
app.get('/api/predictions', (req, res) => {
  console.log('🔗 Legacy route accessed: GET /api/predictions');
  const { category } = req.query;
  let predictions = mockPredictions;
  
  if (category && category !== 'all') {
    predictions = predictions.filter(p => p.category === category);
  }
  
  res.json(predictions);
});

app.get('/api/predictions/trending', (req, res) => {
  console.log('🔗 Legacy route accessed: GET /api/predictions/trending');
  const trending = [...mockPredictions].sort((a, b) => b.pool_total - a.pool_total);
  res.json(trending);
});

app.get('/api/predictions/user', (req, res) => {
  console.log('🔗 Legacy route accessed: GET /api/predictions/user');
  res.json([]);
});

app.post('/api/predictions', (req, res) => {
  console.log('🎯 Creating prediction via legacy API:', req.body);
  
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
  console.log('✅ Prediction created successfully via legacy route:', newPrediction.id);
  res.status(201).json(newPrediction);
});

app.post('/api/prediction-entries', (req, res) => {
  console.log('🔗 Legacy route accessed: POST /api/prediction-entries');
  const { prediction_id, option_id, amount } = req.body;
  
  res.json({
    id: Date.now().toString(),
    prediction_id,
    option_id,
    amount,
    potential_payout: amount * 2,
    created_at: new Date().toISOString()
  });
});

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

app.get('/api/v2/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    }
  });
});

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

app.get('/api/user/profile', mockAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      full_name: `${req.user.first_name} ${req.user.last_name}`,
      avatar_url: null,
      reputation_score: 85.5,
      is_verified: req.user.is_verified,
      kyc_level: req.user.kyc_level,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at,
      stats: {
        predictions_created: 12,
        predictions_participated: 45,
        total_wins: 28,
        total_losses: 17,
        win_rate: 62.2,
        total_profit: 1250.50
      }
    },
    message: 'User profile retrieved successfully'
  });
});

// ============================================================================
// WALLET ENDPOINTS
// ============================================================================

app.get('/api/wallet/balance', mockAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  
  res.json({
    success: true,
    data: {
      balance: 1000.00,
      currency: 'USD',
      user_id: req.user.id,
      available_balance: 1000.00,
      reserved_balance: 0.00,
      total_balance: 1000.00
    },
    message: 'Wallet balance retrieved successfully'
  });
});

app.get('/api/wallet/transactions', mockAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  
  res.json({
    success: true,
    data: [
      {
        id: '1',
        user_id: req.user.id,
        type: 'deposit',
        amount: 1000,
        currency: 'USD',
        status: 'completed',
        description: 'Demo balance initialization',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: req.user.id,
        type: 'bet',
        amount: -25,
        currency: 'USD',
        status: 'completed',
        description: 'Prediction stake',
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    message: 'Transactions retrieved successfully'
  });
});

// ============================================================================
// SOCIAL ENDPOINTS
// ============================================================================

app.get('/api/v2/social/comments', mockAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  
  const { prediction_id } = req.query;
  
  // Mock comments data
  const mockComments = [
    {
      id: '1',
      prediction_id: prediction_id || '1',
      user_id: req.user.id,
      content: 'This is going to be interesting!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: req.user.id,
        username: req.user.username,
        avatar_url: null
      },
      likes_count: 3,
      is_liked_by_user: false
    },
    {
      id: '2',
      prediction_id: prediction_id || '1',
      user_id: 'user2',
      content: 'I think the odds are in favor of this outcome.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      user: {
        id: 'user2',
        username: 'prediction_expert',
        avatar_url: null
      },
      likes_count: 1,
      is_liked_by_user: true
    }
  ];
  
  res.json({
    success: true,
    data: mockComments,
    message: 'Comments retrieved successfully'
  });
});

app.post('/api/v2/social/comments', mockAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }
  
  const { prediction_id, content } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required'
    });
  }
  
  const newComment = {
    id: `comment_${Date.now()}`,
    prediction_id,
    user_id: req.user.id,
    content: content.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: req.user.id,
      username: req.user.username,
      avatar_url: null
    },
    likes_count: 0,
    is_liked_by_user: false
  };
  
  res.status(201).json({
    success: true,
    data: newComment,
    message: 'Comment created successfully'
  });
});

// ============================================================================
// WEBSOCKET TEST ENDPOINT
// ============================================================================

app.get('/api/v2/websocket-test', (req, res) => {
  res.json({
    success: true,
    data: {
      websocket_available: true,
      endpoint: 'ws://localhost:3001/ws',
      status: 'ready'
    },
    message: 'WebSocket connectivity available'
  });
});

// ============================================================================
// TEST ROUTES
// ============================================================================

app.get('/api/v2/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is working!',
    data: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      clubs_available: mockClubs.length,
      predictions_available: mockPredictions.length,
    },
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Not Found: ${req.method} ${req.originalUrl}`);
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
  console.log(`📊 Mock Data: ${mockPredictions.length} predictions, ${mockClubs.length} clubs loaded`);
  console.log(`🔗 Available Club Routes:`);
  console.log(`   GET /api/v2/clubs - List all clubs`);
  console.log(`   GET /api/v2/clubs/:id - Get club details`);
  console.log(`   POST /api/v2/clubs/:id/join - Join a club`);
  console.log(`   POST /api/v2/clubs/:id/leave - Leave a club`);
  console.log(`   GET /api/v2/clubs/:id/members - Get club members`);
  console.log(`   POST /api/v2/clubs - Create new club`);
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