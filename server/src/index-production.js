#!/usr/bin/env node

/**
 * Fan Club Z Production Server Entry Point
 * Minimal WebSocket server for initial deployment testing
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

console.log('🔍 Checking environment variables...');

// Check for required environment variables
const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_ANON_KEY'];
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Present`);
  } else {
    console.log(`❌ ${varName}: Missing`);
  }
});

console.log('Environment variables available:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));

const app = express();

// Environment-aware CORS setup for production
const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:3000", 
    "http://localhost:5173",
    "https://fanclubz.onrender.com",
    "https://fanclubz-dev.onrender.com",
    "https://fan-club-z.vercel.app",
    "https://fanclubz-version2-0.vercel.app"
  ];

  // Add any additional origins from environment
  if (process.env.CORS_ORIGINS) {
    origins.push(...process.env.CORS_ORIGINS.split(','));
  }

  // Also allow any Vercel deployment URLs
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  return origins;
};

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🌐 CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('🌐 CORS: Checking origin:', origin);
    
    // Check if origin is in allowed list or is a Vercel deployment
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('.vercel.app');
    
    if (isAllowed) {
      console.log('✅ CORS: Origin allowed');
      callback(null, true);
    } else {
      console.log('❌ CORS: Origin blocked, allowed:', allowedOrigins);
      // In development, be more permissive
      if (process.env.NODE_ENV !== 'production') {
        console.log('🚧 CORS: Development mode - allowing anyway');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());

// Basic health endpoint
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    websocket: 'enabled',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    supabase: {
      url: !!process.env.SUPABASE_URL,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      anonKey: !!process.env.VITE_SUPABASE_ANON_KEY
    }
  });
});

// Environment debug endpoint
app.get('/debug', (req, res) => {
  console.log('🔍 Debug info requested');
  res.json({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    timestamp: new Date().toISOString(),
    origins: getAllowedOrigins(),
    supabase: {
      hasUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY
    }
  });
});

// API placeholder endpoints for testing
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fan Club Z API is running',
    timestamp: new Date().toISOString(),
    services: {
      websocket: 'enabled',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'missing'
    },
  });
});

// Create HTTP server
const server = createServer(app);

// Setup Socket.IO with production-ready configuration
const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Simple WebSocket handlers for chat
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.emit('connected', { 
    socketId: socket.id, 
    timestamp: new Date().toISOString() 
  });

  socket.on('authenticate', (data) => {
    console.log('🔐 User authenticated:', data.username || 'Unknown');
    socket.emit('authenticated', { success: true, socketId: socket.id });
  });

  socket.on('join_prediction', (data) => {
    console.log('👥 Joining prediction:', data.predictionId);
    socket.join(`prediction_${data.predictionId}`);
    socket.emit('joined_prediction', { predictionId: data.predictionId });
    socket.emit('message_history', []); // Empty history for minimal implementation
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
        username: data.username || 'Anonymous',
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

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Minimal WebSocket Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 WebSocket enabled for chat functionality`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`📍 Allowed origins:`, getAllowedOrigins().length);
  console.log(`🔧 Binding: 0.0.0.0:${PORT} (Render compatible)`);
});

module.exports = app;
