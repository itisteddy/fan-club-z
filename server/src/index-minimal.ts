import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();

// Simple CORS setup
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
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

// Create HTTP server
const server = createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
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
});

export default app;