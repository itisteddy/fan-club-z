const { Server } = require('socket.io');
const { createServer } = require('http');
const { supabase } = require('../config/supabase.js');

class ChatService {
  constructor(app) {
    this.httpServer = createServer(app);
    this.io = new Server(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔗 User connected:', socket.id);

      // Join prediction room
      socket.on('join_prediction', async (data) => {
        const { predictionId, userId } = data;
        console.log('👥 User joining prediction room:', predictionId);
        
        socket.join(`prediction_${predictionId}`);
        
        // Load recent messages for this prediction
        try {
          const { data: messages, error } = await supabase
            .from('chat_messages')
            .select(`
              *,
              user:users(id, username, avatar_url)
            `)
            .eq('prediction_id', predictionId)
            .order('created_at', { ascending: true })
            .limit(50);

          if (!error && messages) {
            socket.emit('message_history', messages);
          }
        } catch (error) {
          console.error('Error loading message history:', error);
        }
      });

      // Handle new message
      socket.on('send_message', async (data) => {
        const { predictionId, userId, content, username, avatar } = data;
        
        try {
          // Save message to database
          const { data: message, error } = await supabase
            .from('chat_messages')
            .insert({
              prediction_id: predictionId,
              user_id: userId,
              content: content,
              created_at: new Date().toISOString()
            })
            .select(`
              *,
              user:users(id, username, avatar_url)
            `)
            .single();

          if (error) {
            console.error('Error saving message:', error);
            socket.emit('message_error', { error: 'Failed to save message' });
            return;
          }

          // Broadcast message to all users in the prediction room
          const messageWithUser = {
            ...message,
            user: {
              id: userId,
              username: username,
              avatar_url: avatar
            }
          };

          this.io.to(`prediction_${predictionId}`).emit('new_message', messageWithUser);
          
          console.log('📨 Message sent to prediction room:', predictionId);
        } catch (error) {
          console.error('Error handling message:', error);
          socket.emit('message_error', { error: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        const { predictionId, username } = data;
        socket.to(`prediction_${predictionId}`).emit('user_typing', { username });
      });

      socket.on('typing_stop', (data) => {
        const { predictionId, username } = data;
        socket.to(`prediction_${predictionId}`).emit('user_stop_typing', { username });
      });

      // Leave prediction room
      socket.on('leave_prediction', (data) => {
        const { predictionId } = data;
        console.log('👋 User leaving prediction room:', predictionId);
        socket.leave(`prediction_${predictionId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
      });
    });
  }

  getHttpServer() {
    return this.httpServer;
  }

  getIO() {
    return this.io;
  }
}

module.exports = { ChatService };