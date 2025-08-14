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
  'https://fan-club-z.vercel.app',
  'https://fanclubz-version-2-0.vercel.app',
  'https://app.fanclubz.app',
  'https://dev.fanclubz.app',
  'https://web.fanclubz.app',
  // Allow all Vercel preview domains
  /^https:\/\/.*\.vercel\.app$/,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('🌐 CORS: Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
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
    title: 'Will Apple release a new iPhone this year?',
    description: 'Tech prediction for Apple\'s product lineup. Will they surprise us with a new iPhone model?',
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
    participant_count: 28,
    likes_count: 15,
    comments_count: 5,
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
    ],
    creator: {
      username: 'techguru',
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
        id: 'opt5',
        prediction_id: '3',
        label: 'Yes - Bitcoin reaches $100k+',
        total_staked: 2100,
        current_odds: 1.67,
        percentage: 60
      },
      {
        id: 'opt6',
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

const mockClubs = [
  {
    id: '1',
    name: 'Premier League Predictors',
    description: 'The ultimate destination for Premier League predictions and analysis. Join thousands of football fans making winning predictions!',
    category: 'sports',
    memberCount: 2547,
    isVerified: true,
    isPopular: true,
    recentActivity: '5 new predictions today',
    isJoined: false,
    onlineMembers: 234,
    visibility: 'public',
    owner_id: 'user1',
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
    memberCount: 1823,
    isVerified: true,
    recentActivity: 'Bitcoin prediction just closed',
    isJoined: true,
    onlineMembers: 156,
    visibility: 'public',
    owner_id: 'user2',
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

// Health check endpoint
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

// User profile endpoint
app.get('/api/user/profile', mockAuth, (req, res) => {
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

// Social endpoints
app.get('/api/v2/social/comments', mockAuth, (req, res) => {
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

// WebSocket test endpoint
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

// API Routes
app.get('/api/predictions', mockAuth, (req, res) => {
  res.json({
    success: true,
    data: mockPredictions,
    message: 'Predictions retrieved successfully'
  });
});

app.post('/api/predictions', mockAuth, (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      options,
      stake_min,
      stake_max,
      entry_deadline,
      settlement_method,
      is_private
    } = req.body;

    // Basic validation
    if (!title || !category || !type || !options || !entry_deadline) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (options.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 options are required'
      });
    }

    // Validate deadline is in future
    const deadline = new Date(entry_deadline);
    if (deadline <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Entry deadline must be in the future'
      });
    }

    // Create new prediction
    const newPrediction = {
      id: (mockPredictions.length + 1).toString(),
      creator_id: req.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      category,
      type: type === 'binary' ? 'binary' : 'multi_outcome',
      status: 'open',
      stake_min: Math.max(1, Number(stake_min) || 1),
      stake_max: stake_max ? Number(stake_max) : null,
      pool_total: 0,
      entry_deadline: deadline.toISOString(),
      settlement_method: settlement_method || 'manual',
      is_private: Boolean(is_private),
      creator_fee_percentage: 1,
      platform_fee_percentage: 2.5,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: options.map((option, index) => ({
        id: `opt${mockPredictions.length + 1}_${index + 1}`,
        prediction_id: (mockPredictions.length + 1).toString(),
        label: option.label.trim(),
        total_staked: 0,
        current_odds: 2.0,
        percentage: 0
      }))
    };

    // Add to mock data
    mockPredictions.unshift(newPrediction);

    console.log(`🎯 New prediction created: ${newPrediction.title}`);

    res.status(201).json({
      success: true,
      data: newPrediction,
      message: 'Prediction created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
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

// API v2 endpoints for clubs
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

app.post('/api/predictions/:id/entries', mockAuth, (req, res) => {
  const { id: predictionId } = req.params;
  const { option_id, amount } = req.body;
  
  if (!option_id || !amount) {
    return res.status(400).json({
      success: false,
      message: 'Option ID and amount are required'
    });
  }
  
  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Amount must be greater than 0'
    });
  }
  
  // Mock successful stake placement
  const stakeEntry = {
    id: `entry_${Date.now()}`,
    prediction_id: predictionId,
    user_id: req.user.id,
    option_id: option_id,
    amount: parseFloat(amount),
    potential_payout: parseFloat(amount) * 2.5, // Mock odds
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  console.log(`💰 Stake placed: ${amount} on prediction ${predictionId}`);
  
  res.status(201).json({
    success: true,
    data: stakeEntry,
    message: 'Stake placed successfully'
  });
});

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
    data: { club_id: id, user_id: req.user.id, role: 'member' }
  });
});

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

app.post('/api/v2/clubs', mockAuth, (req, res) => {
  const { name, description, category, isPrivate } = req.body;
  
  if (!name || !description || !category) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, description, category'
    });
  }
  
  const newClub = {
    id: (mockClubs.length + 1).toString(),
    name: name.trim(),
    description: description.trim(),
    category,
    memberCount: 1,
    isVerified: false,
    isPopular: false,
    recentActivity: 'Just created',
    isJoined: true,
    onlineMembers: 1,
    visibility: isPrivate ? 'private' : 'public',
    owner_id: req.user.id,
    is_member: true,
    member_role: 'admin',
    owner: {
      username: req.user.username || req.user.first_name,
      avatar_url: null
    },
    activePredictions: 0,
    stats: {
      totalPredictions: 0,
      correctPredictions: 0,
      totalWinnings: 0,
      topMembers: 0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Add to mock data
  mockClubs.unshift(newClub);
  
  console.log(`🎉 New club created: ${newClub.name}`);
  
  res.json({
    success: true,
    message: 'Club created successfully',
    data: newClub
  });
});

// Wallet endpoints
app.get('/api/wallet/balance', mockAuth, (req, res) => {
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

// Discussion endpoints
app.post('/api/v2/clubs/:id/discussions', mockAuth, (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  
  // Find the club
  const club = mockClubs.find(c => c.id === id);
  if (!club) {
    return res.status(404).json({
      success: false,
      message: 'Club not found'
    });
  }
  
  // Create new discussion
  const newDiscussion = {
    id: `disc_${Date.now()}`,
    club_id: id,
    title: title.trim(),
    content: content.trim(),
    author_id: req.user.id,
    author_name: req.user.username,
    replies: 0,
    likes: 0,
    is_pinned: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Add to mock discussions (initialize if doesn't exist)
  if (!global.mockDiscussions) {
    global.mockDiscussions = [];
  }
  global.mockDiscussions.push(newDiscussion);
  
  console.log(`💬 New discussion created: ${newDiscussion.title}`);
  
  res.json({
    success: true,
    message: 'Discussion created successfully',
    data: newDiscussion
  });
});

app.get('/api/v2/clubs/:id/discussions', mockAuth, (req, res) => {
  const { id } = req.params;
  
  // Find the club
  const club = mockClubs.find(c => c.id === id);
  if (!club) {
    return res.status(404).json({
      success: false,
      message: 'Club not found'
    });
  }
  
  // Get discussions for this club
  const discussions = global.mockDiscussions?.filter(d => d.club_id === id) || [];
  
  res.json({
    success: true,
    data: discussions,
    message: 'Discussions retrieved successfully'
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
      'POST /api/predictions',
      'GET /api/predictions/:id',
      'POST /api/predictions/:id/entries',
      'GET /api/clubs',
      'GET /api/clubs/:id',
      'GET /api/v2/clubs',
      'GET /api/v2/clubs/:id',
      'POST /api/v2/clubs',
      'POST /api/v2/clubs/:id/join',
      'POST /api/v2/clubs/:id/leave',
      'POST /api/v2/clubs/:id/discussions',
      'GET /api/v2/clubs/:id/discussions',
      'GET /api/user/profile',
      'GET /api/wallet/balance',
      'GET /api/wallet/transactions'
    ]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocket: 'enabled'
  });
});

// WebSocket test endpoint
app.get('/api/v2/websocket-test', (req, res) => {
  res.json({
    success: true,
    message: 'WebSocket test endpoint',
    websocket_url: `ws://localhost:${PORT}/ws`,
    socket_io_url: `http://localhost:${PORT}/socket.io/`
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Fan Club Z Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origins: ${allowedOrigins.join(', ')}`);
});

// Initialize ChatService for WebSocket functionality
let chatService;
try {
  if (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) {
    const { ChatService } = require('./services/ChatService.js');
    chatService = new ChatService(server);
    console.log('✅ ChatService initialized successfully');
  } else {
    console.log('⚠️ Skipping ChatService - Supabase not configured');
  }
} catch (error) {
  console.error('❌ Failed to initialize ChatService:', error);
  console.log('⚠️ Continuing without WebSocket functionality');
}
console.log(`💬 WebSocket Chat: ${chatService ? 'Enabled' : 'Disabled'}`); 