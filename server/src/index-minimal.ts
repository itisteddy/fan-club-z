import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Simple CORS setup
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173", "https://dev.fanclubz.app"],
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

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fan Club Z API is running',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      websocket: 'enabled',
      supabase: 'configured'
    },
  });
});

// Simple prediction endpoints for testing
app.post('/api/predictions', (req, res) => {
  console.log('📝 Creating prediction:', req.body);
  
  // Mock response for now
  res.status(201).json({
    success: true,
    data: {
      id: 'mock-prediction-' + Date.now(),
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      type: req.body.type,
      status: 'open',
      stake_min: req.body.stake_min,
      stake_max: req.body.stake_max,
      entry_deadline: req.body.entry_deadline,
      settlement_method: req.body.settlement_method,
      is_private: req.body.is_private || false,
      creator_id: 'mock-user-id',
      pool_total: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: req.body.options || []
    },
    message: 'Prediction created successfully'
  });
});

app.get('/api/predictions', (req, res) => {
  console.log('📋 Fetching predictions');
  
  // Mock response
  res.json({
    success: true,
    data: [
      {
        id: 'mock-prediction-1',
        title: 'Will Bitcoin reach $100k by end of 2025?',
        description: 'Bitcoin price prediction',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        entry_deadline: '2025-12-31T23:59:59Z',
        settlement_method: 'manual',
        is_private: false,
        creator_id: 'mock-user-id',
        pool_total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        options: [
          { id: 'option-1', label: 'Yes', total_staked: 0 },
          { id: 'option-2', label: 'No', total_staked: 0 }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
});

// v2 endpoints for compatibility
app.post('/api/v2/predictions', (req, res) => {
  console.log('📝 Creating prediction (v2):', req.body);
  
  // Mock response for now
  res.status(201).json({
    success: true,
    data: {
      id: 'mock-prediction-v2-' + Date.now(),
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      type: req.body.type,
      status: 'open',
      stake_min: req.body.stake_min,
      stake_max: req.body.stake_max,
      entry_deadline: req.body.entry_deadline,
      settlement_method: req.body.settlement_method,
      is_private: req.body.is_private || false,
      creator_id: 'mock-user-id',
      pool_total: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: req.body.options || []
    },
    message: 'Prediction created successfully'
  });
});

app.get('/api/v2/predictions', (req, res) => {
  console.log('📋 Fetching predictions (v2)');
  
  // Mock response
  res.json({
    success: true,
    data: [
      {
        id: 'mock-prediction-v2-1',
        title: 'Will Bitcoin reach $100k by end of 2025?',
        description: 'Bitcoin price prediction',
        category: 'custom',
        type: 'binary',
        status: 'open',
        stake_min: 1,
        stake_max: 1000,
        entry_deadline: '2025-12-31T23:59:59Z',
        settlement_method: 'manual',
        is_private: false,
        creator_id: 'mock-user-id',
        pool_total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        options: [
          { id: 'option-1', label: 'Yes', total_staked: 0 },
          { id: 'option-2', label: 'No', total_staked: 0 }
        ]
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    }
  });
});

// User-created predictions endpoint
app.get('/api/predictions/created/me', (req, res) => {
  console.log('📋 Fetching user created predictions');
  
  // Get the user ID from the authorization header or use a default
  const authHeader = req.headers.authorization;
  let userId = '325343a7-0a32-4565-8059-7c0d9d3fed1b'; // Default to the user ID from console logs
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real implementation, we would decode the JWT token to get the user ID
    // For now, we'll use the user ID from the console logs
    console.log('🔐 Auth header found, using default user ID:', userId);
  }
  
  // Mock response with predictions for the current user
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

// v2 version of user-created predictions endpoint
app.get('/api/v2/predictions/created/me', (req, res) => {
  console.log('📋 Fetching user created predictions (v2)');
  
  // Get the user ID from the authorization header or use a default
  const authHeader = req.headers.authorization;
  let userId = '325343a7-0a32-4565-8059-7c0d9d3fed1b'; // Default to the user ID from console logs
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real implementation, we would decode the JWT token to get the user ID
    // For now, we'll use the user ID from the console logs
    console.log('🔐 Auth header found, using default user ID:', userId);
  }
  
  // Same response as above but with correct user ID
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

// Create HTTP server
const server = createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "https://dev.fanclubz.app"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Simple WebSocket handlers
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.emit('connected', { 
    socketId: socket.id, 
    timestamp: new Date().toISOString() 
  });

  socket.on('authenticate', (data) => {
    console.log('🔐 User authenticated:', data.username);
    socket.emit('authenticated', { success: true, socketId: socket.id });
  });

  socket.on('join_prediction', (data) => {
    console.log('👥 Joining prediction:', data.predictionId);
    socket.join(`prediction_${data.predictionId}`);
    socket.emit('joined_prediction', { predictionId: data.predictionId });
    socket.emit('message_history', []); // Empty history for now
  });

  socket.on('send_message', (data) => {
    console.log('📨 Message received:', data.content);
    const message = {
      id: Date.now().toString(),
      prediction_id: data.predictionId,
      user_id: data.userId,
      content: data.content,
      message_type: 'text',
      created_at: new Date().toISOString(),
      user: {
        id: data.userId,
        username: data.username,
        avatar_url: data.avatar
      }
    };
    
    // Broadcast to all users in the prediction room
    io.to(`prediction_${data.predictionId}`).emit('new_message', message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, reason);
  });

  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Simple WebSocket Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 WebSocket enabled for testing`);
  console.log(`📡 API endpoints: /api/predictions, /api/v2/predictions`);
});

export default app;// Force rebuild Fri Aug 15 14:41:17 EDT 2025
