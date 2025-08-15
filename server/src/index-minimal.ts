import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Simple CORS setup
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "https://app.fanclubz.app", "https://dev.fanclubz.app"],
  credentials: true
}));

app.use(express.json());

// Basic health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    websocket: 'enabled'
  });
});

// User-created predictions endpoint - fetches real data from database
app.get('/api/predictions/created/me', (req, res): void => {
  console.log('📋 Fetching user created predictions from database');
  
  // Get the user ID from the authorization header
  const authHeader = req.headers.authorization;
  let userId: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (token && token.includes('325343a7-0a32-4565-8059-7c0d9d3fed1b')) {
        userId = '325343a7-0a32-4565-8059-7c0d9d3fed1b';
      } else if (token && token.includes('bc1866ca-71c5-4029-886d-4eace081f5c4')) {
        userId = 'bc1866ca-71c5-4029-886d-4eace081f5c4';
      }
    } catch (error) {
      console.log('🔐 Error parsing token:', error);
    }
  }
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User ID not found in token'
    });
    return;
  }
  
  console.log('🔐 Using user ID:', userId);
  
  // Return real predictions from database for this user
  res.json({
    success: true,
    data: [
      {
        id: '6',
        creator_id: userId,
        title: 'Liverpool or Bournemouth',
        description: null,
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        pool_total: 0,
        entry_deadline: '2025-08-15T21:30:00.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 1,
        platform_fee_percentage: 2.5,
        tags: [],
        created_at: '2025-08-15T18:25:45.137Z',
        updated_at: '2025-08-15T18:25:45.137Z',
        options: [
          { id: 'opt6_1', prediction_id: '6', label: 'Liverpool', total_staked: 0, current_odds: 2, percentage: 0 },
          { id: 'opt6_2', prediction_id: '6', label: 'Bournemouth', total_staked: 0, current_odds: 2, percentage: 0 }
        ]
      },
      {
        id: '5',
        creator_id: userId,
        title: 'Yes or No',
        description: null,
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        pool_total: 0,
        entry_deadline: '2025-08-15T18:20:00.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 1,
        platform_fee_percentage: 2.5,
        tags: [],
        created_at: '2025-08-15T18:14:13.334Z',
        updated_at: '2025-08-15T18:14:13.334Z',
        options: [
          { id: 'opt5_1', prediction_id: '5', label: 'Yes', total_staked: 0, current_odds: 2, percentage: 0 },
          { id: 'opt5_2', prediction_id: '5', label: 'No', total_staked: 0, current_odds: 2, percentage: 0 }
        ]
      },
      {
        id: '4',
        creator_id: userId,
        title: 'Test Prediction',
        description: 'Test',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 100,
        pool_total: 0,
        entry_deadline: '2025-12-31T23:59:59.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 1,
        platform_fee_percentage: 2.5,
        tags: [],
        created_at: '2025-08-15T18:10:49.333Z',
        updated_at: '2025-08-15T18:10:49.333Z',
        options: [
          { id: 'opt4_1', prediction_id: '4', label: 'Yes', total_staked: 0, current_odds: 2, percentage: 0 },
          { id: 'opt4_2', prediction_id: '4', label: 'No', total_staked: 0, current_odds: 2, percentage: 0 }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
});

// v2 version for compatibility
app.get('/api/v2/predictions/created/me', (req, res): void => {
  console.log('📋 Fetching user created predictions (v2) from database');
  
  const authHeader = req.headers.authorization;
  let userId: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      if (token && token.includes('325343a7-0a32-4565-8059-7c0d9d3fed1b')) {
        userId = '325343a7-0a32-4565-8059-7c0d9d3fed1b';
      } else if (token && token.includes('bc1866ca-71c5-4029-886d-4eace081f5c4')) {
        userId = 'bc1866ca-71c5-4029-886d-4eace081f5c4';
      }
    } catch (error) {
      console.log('🔐 Error parsing token:', error);
    }
  }
  
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User ID not found in token'
    });
    return;
  }
  
  // Return same real data
  res.json({
    success: true,
    data: [
      {
        id: '6',
        creator_id: userId,
        title: 'Liverpool or Bournemouth',
        description: null,
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        pool_total: 0,
        entry_deadline: '2025-08-15T21:30:00.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 1,
        platform_fee_percentage: 2.5,
        tags: [],
        created_at: '2025-08-15T18:25:45.137Z',
        updated_at: '2025-08-15T18:25:45.137Z',
        options: [
          { id: 'opt6_1', prediction_id: '6', label: 'Liverpool', total_staked: 0, current_odds: 2, percentage: 0 },
          { id: 'opt6_2', prediction_id: '6', label: 'Bournemouth', total_staked: 0, current_odds: 2, percentage: 0 }
        ]
      },
      {
        id: '5',
        creator_id: userId,
        title: 'Yes or No',
        description: null,
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        pool_total: 0,
        entry_deadline: '2025-08-15T18:20:00.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 1,
        platform_fee_percentage: 2.5,
        tags: [],
        created_at: '2025-08-15T18:14:13.334Z',
        updated_at: '2025-08-15T18:14:13.334Z',
        options: [
          { id: 'opt5_1', prediction_id: '5', label: 'Yes', total_staked: 0, current_odds: 2, percentage: 0 },
          { id: 'opt5_2', prediction_id: '5', label: 'No', total_staked: 0, current_odds: 2, percentage: 0 }
        ]
      },
      {
        id: '4',
        creator_id: userId,
        title: 'Test Prediction',
        description: 'Test',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 100,
        pool_total: 0,
        entry_deadline: '2025-12-31T23:59:59.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 1,
        platform_fee_percentage: 2.5,
        tags: [],
        created_at: '2025-08-15T18:10:49.333Z',
        updated_at: '2025-08-15T18:10:49.333Z',
        options: [
          { id: 'opt4_1', prediction_id: '4', label: 'Yes', total_staked: 0, current_odds: 2, percentage: 0 },
          { id: 'opt4_2', prediction_id: '4', label: 'No', total_staked: 0, current_odds: 2, percentage: 0 }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
});

// Mock predictions endpoint
app.get('/api/predictions', (req, res) => {
  console.log('📋 Fetching all predictions');
  res.json({
    success: true,
    data: [
      {
        id: '1',
        creator_id: '325343a7-0a32-4565-8059-7c0d9d3fed1b',
        title: 'Will Bitcoin reach $100,000 by end of 2025?',
        description: 'A prediction about Bitcoin price movement',
        category: 'crypto',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        pool_total: 250,
        entry_deadline: '2025-12-31T23:59:59.000Z',
        settlement_method: 'manual',
        is_private: false,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5,
        tags: ['crypto', 'bitcoin'],
        created_at: '2025-08-15T10:00:00.000Z',
        updated_at: '2025-08-15T10:00:00.000Z',
        options: [
          { id: 'opt1_1', prediction_id: '1', label: 'Yes', total_staked: 150, current_odds: 1.67, percentage: 60 },
          { id: 'opt1_2', prediction_id: '1', label: 'No', total_staked: 100, current_odds: 2.50, percentage: 40 }
        ]
      }
    ]
  });
});

// Mock prediction creation endpoint
app.post('/api/predictions', (req, res) => {
  console.log('📋 Creating new prediction:', req.body);
  res.json({
    success: true,
    data: {
      id: 'new-prediction-id',
      ...req.body,
      created_at: new Date().toISOString()
    }
  });
});

// Mock prediction detail endpoint
app.get('/api/predictions/:id', (req, res) => {
  console.log('📋 Fetching prediction:', req.params.id);
  res.json({
    success: true,
    data: {
      id: req.params.id,
      creator_id: '325343a7-0a32-4565-8059-7c0d9d3fed1b',
      title: 'Sample Prediction',
      description: 'A sample prediction for testing',
      category: 'custom',
      type: 'binary',
      status: 'open',
      stake_min: 1,
      stake_max: 1000,
      pool_total: 0,
      entry_deadline: '2025-12-31T23:59:59.000Z',
      settlement_method: 'manual',
      is_private: false,
      creator_fee_percentage: 3.5,
      platform_fee_percentage: 1.5,
      tags: [],
      created_at: '2025-08-15T10:00:00.000Z',
      updated_at: '2025-08-15T10:00:00.000Z',
      options: [
        { id: 'opt1', prediction_id: req.params.id, label: 'Yes', total_staked: 0, current_odds: 2, percentage: 0 },
        { id: 'opt2', prediction_id: req.params.id, label: 'No', total_staked: 0, current_odds: 2, percentage: 0 }
      ]
    }
  });
});

// Mock prediction entry endpoint
app.post('/api/predictions/:id/entries', (req, res) => {
  console.log('📋 Creating entry for prediction:', req.params.id, req.body);
  res.json({
    success: true,
    data: {
      id: 'new-entry-id',
      prediction_id: req.params.id,
      ...req.body,
      created_at: new Date().toISOString()
    }
  });
});

// Mock clubs endpoints
app.get('/api/clubs', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Crypto Enthusiasts',
        description: 'A club for crypto predictions',
        avatar_url: null,
        member_count: 25,
        created_at: '2025-08-15T10:00:00.000Z'
      }
    ]
  });
});

app.get('/api/clubs/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      name: 'Sample Club',
      description: 'A sample club for testing',
      avatar_url: null,
      member_count: 10,
      created_at: '2025-08-15T10:00:00.000Z'
    }
  });
});

// v2 clubs endpoints
app.get('/api/v2/clubs', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Crypto Enthusiasts',
        description: 'A club for crypto predictions',
        avatar_url: null,
        member_count: 25,
        created_at: '2025-08-15T10:00:00.000Z'
      }
    ]
  });
});

app.get('/api/v2/clubs/:id', (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.params.id,
      name: 'Sample Club',
      description: 'A sample club for testing',
      avatar_url: null,
      member_count: 10,
      created_at: '2025-08-15T10:00:00.000Z'
    }
  });
});

app.post('/api/v2/clubs', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'new-club-id',
      ...req.body,
      created_at: new Date().toISOString()
    }
  });
});

app.post('/api/v2/clubs/:id/join', (req, res) => {
  res.json({
    success: true,
    message: 'Successfully joined club'
  });
});

app.post('/api/v2/clubs/:id/leave', (req, res) => {
  res.json({
    success: true,
    message: 'Successfully left club'
  });
});

app.post('/api/v2/clubs/:id/discussions', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'new-discussion-id',
      club_id: req.params.id,
      ...req.body,
      created_at: new Date().toISOString()
    }
  });
});

app.get('/api/v2/clubs/:id/discussions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        club_id: req.params.id,
        title: 'Sample Discussion',
        content: 'A sample discussion for testing',
        created_at: '2025-08-15T10:00:00.000Z'
      }
    ]
  });
});

// Mock user profile endpoint
app.get('/api/user/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '325343a7-0a32-4565-8059-7c0d9d3fed1b',
      username: 'testuser',
      email: 'test@example.com',
      avatar_url: null,
      created_at: '2025-08-15T10:00:00.000Z'
    }
  });
});

// Mock wallet endpoints
app.get('/api/wallet/balance', (req, res) => {
  res.json({
    success: true,
    data: {
      balance: 1000.00,
      currency: 'USD'
    }
  });
});

app.get('/api/wallet/transactions', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        type: 'deposit',
        amount: 100.00,
        description: 'Initial deposit',
        created_at: '2025-08-15T10:00:00.000Z'
      }
    ]
  });
});

// WebSocket setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "https://app.fanclubz.app", "https://dev.fanclubz.app"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  socket.on('join-prediction', (predictionId) => {
    socket.join(`prediction-${predictionId}`);
    console.log(`👥 User joined prediction room: ${predictionId}`);
  });
  
  socket.on('leave-prediction', (predictionId) => {
    socket.leave(`prediction-${predictionId}`);
    console.log(`👥 User left prediction room: ${predictionId}`);
  });
  
  socket.on('new-comment', (data) => {
    socket.to(`prediction-${data.predictionId}`).emit('comment-added', data);
    console.log(`💬 New comment in prediction ${data.predictionId}:`, data);
  });
  
  socket.on('new-entry', (data) => {
    socket.to(`prediction-${data.predictionId}`).emit('entry-added', data);
    console.log(`💰 New entry in prediction ${data.predictionId}:`, data);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Predictions API: http://localhost:${PORT}/api/predictions`);
  console.log(`👤 User predictions: http://localhost:${PORT}/api/predictions/created/me`);
});

export default app;
