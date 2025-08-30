import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { supabase } from '../config/supabase.js';
import logger from '../utils/logger';
import { config } from '../config';

interface SocketUser {
  id: string;
  username: string;
  avatar_url?: string;
  socket_id: string;
}

interface ConnectedUser {
  socketId: string;
  userId: string;
  username: string;
  joinedAt: Date;
  predictionId?: string;
}

export class ChatService {
  private io: Server;
  private httpServer: HttpServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private typingUsers: Map<string, Set<string>> = new Map(); // predictionId -> Set of usernames

  constructor(httpServer: HttpServer) {
    this.httpServer = httpServer;
    
    // Configure comprehensive CORS for Socket.IO with Render URLs
    const allowedOrigins = this.getAllowedOrigins();
    
    logger.info('🔧 Configuring Socket.IO with CORS origins:', allowedOrigins);

    this.io = new Server(this.httpServer, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) {
            logger.info('🌐 Socket.IO CORS: Allowing request with no origin');
            return callback(null, true);
          }

          logger.info(`🌐 Socket.IO CORS: Checking origin: ${origin}`);
          
          // Check if origin is in allowed list
          const isAllowed = allowedOrigins.includes(origin);
          
          // Also allow any Vercel deployment in development
          const isVercelDeployment = origin.includes('.vercel.app');
          const isRenderDeployment = origin.includes('.onrender.com');
          const isCustomDomain = origin.includes('fanclubz.app');
          const isDevelopment = process.env.NODE_ENV !== 'production';
          
          if (isAllowed || isRenderDeployment || isVercelDeployment || isCustomDomain) {
            const reason = isAllowed ? '(explicit allow)' : 
                          isVercelDeployment ? '(Vercel deployment)' : 
                          isRenderDeployment ? '(Render deployment)' :
                          '(Custom domain)';
            logger.info(`✅ Socket.IO CORS: Origin allowed - ${origin} ${reason}`);
            callback(null, true);
          } else {
            logger.warn(`❌ Socket.IO CORS: Origin blocked - ${origin}`);
            // In development, be more permissive
            if (isDevelopment) {
              logger.info('🚧 Socket.IO CORS: Development mode - allowing anyway');
              callback(null, true);
            } else {
              callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
          }
        },
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      },
      // Connection settings optimized for Render
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
      transports: ['websocket', 'polling'],
      serveClient: false,
      allowUpgrades: true,
      cookie: false,
      // Additional Render-specific optimizations
      maxHttpBufferSize: 1e6, // 1MB
      httpCompression: true,
      perMessageDeflate: true
    });

    this.setupSocketHandlers();
    this.setupPeriodicCleanup();
    this.logServerInfo();
  }

  private getAllowedOrigins(): string[] {
    const baseOrigins = process.env.NODE_ENV === 'production' 
      ? [
          // Production origins (single service for free tier)
          'https://fan-club-z.onrender.com',
          // Custom domains
          'https://fanclubz.app',
          'https://www.fanclubz.app',
          'https://app.fanclubz.app',
          'https://dev.fanclubz.app',
          // Vercel URLs (current deployments)
          'https://fan-club-z-pw49foj6y-teddys-projects-d67ab22a.vercel.app',
          'https://fan-club-z-lu5ywnjr0-teddys-projects-d67ab22a.vercel.app',
          'https://fanclubz-version2-0.vercel.app',
          // Environment-specific
          config.frontend.url,
          process.env.FRONTEND_URL,
          process.env.CLIENT_URL,
          process.env.VITE_APP_URL
        ]
      : [
          // Development origins
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:3001',
          'https://localhost:3000',
          'https://localhost:5173',
          'https://dev.fanclubz.app',
          'https://app.fanclubz.app',
          config.frontend.url,
          process.env.FRONTEND_URL || 'http://localhost:5173',
          process.env.CLIENT_URL || 'http://localhost:5173',
          process.env.VITE_APP_URL || 'http://localhost:5173'
        ];

    // Add any additional origins from environment
    const additionalOrigins = process.env.WEBSOCKET_ORIGINS?.split(',') || [];
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [];
    
    return [...new Set([...baseOrigins, ...additionalOrigins, ...corsOrigins])].filter(Boolean);
  }

  private logServerInfo(): void {
    const allowedOrigins = this.getAllowedOrigins();
    logger.info('🚀 Socket.IO Chat Service initialized');
    logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
    logger.info(`🔧 Transports: websocket, polling`);
    logger.info(`⏱️  Ping timeout: 60s, interval: 25s`);
    logger.info(`🏗️  Platform: ${process.env.RENDER ? 'Render' : 'Local'}`);
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const clientOrigin = socket.handshake.headers.origin;
      const userAgent = socket.handshake.headers['user-agent'];
      const forwardedFor = socket.handshake.headers['x-forwarded-for'];
      
      logger.info(`🔗 New socket connection: ${socket.id}`);
      logger.info(`📍 Origin: ${clientOrigin || 'unknown'}`);
      logger.info(`🌍 IP: ${forwardedFor || socket.handshake.address}`);
      logger.info(`🖥️  User Agent: ${userAgent ? userAgent.substring(0, 100) + '...' : 'unknown'}`);

      // Handle user authentication/identification
      socket.on('authenticate', (userData: { userId: string; username: string; avatar?: string }) => {
        try {
          logger.info(`🔐 Authentication attempt: ${userData.username || 'unknown'} (${socket.id})`);
          
          if (!userData.userId || !userData.username) {
            logger.warn('⚠️ Authentication failed: Invalid user data');
            socket.emit('auth_error', { message: 'Invalid user data' });
            return;
          }

          const connectedUser: ConnectedUser = {
            socketId: socket.id,
            userId: userData.userId,
            username: userData.username,
            joinedAt: new Date()
          };
          
          this.connectedUsers.set(socket.id, connectedUser);
          logger.info(`✅ User authenticated: ${userData.username} (${socket.id})`);
          
          // Send authentication confirmation IMMEDIATELY
          socket.emit('authenticated', { 
            success: true, 
            socketId: socket.id,
            userId: userData.userId,
            username: userData.username,
            timestamp: new Date().toISOString(),
            serverInfo: {
              environment: process.env.NODE_ENV,
              version: '2.0.0'
            }
          });
        } catch (error) {
          logger.error('❌ Authentication error:', error);
          socket.emit('auth_error', { 
            message: 'Authentication failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Join prediction room
      socket.on('join_prediction', async (data) => {
        try {
          const { predictionId, userId } = data;
          const user = this.connectedUsers.get(socket.id);
          
          if (!user) {
            logger.warn('⚠️ Join prediction failed: User not authenticated');
            socket.emit('error', { 
              message: 'Cannot join prediction: socket not connected or user not authenticated',
              code: 'NOT_AUTHENTICATED'
            });
            return;
          }
          
          logger.info(`👥 User ${user.username} joining prediction room: ${predictionId}`);
          
          // Update user's current prediction
          user.predictionId = predictionId;
          this.connectedUsers.set(socket.id, user);
          
          socket.join(`prediction_${predictionId}`);
          
          // Update participant status in database (with error handling)
          try {
            await this.updateParticipantStatus(predictionId, userId, true);
          } catch (dbError) {
            logger.warn('Database operation failed, continuing without participant update:', dbError);
          }
          
          // Load recent messages for this prediction (with error handling)
          let messages: any[] = [];
          let participants: any[] = [];
          
          try {
            messages = await this.loadMessageHistory(predictionId);
            participants = await this.getParticipants(predictionId);
          } catch (dbError) {
            logger.warn('Database queries failed, continuing with empty data:', dbError);
          }
          
          socket.emit('message_history', messages);
          socket.emit('participants_updated', participants);
          
          // Notify others in the room
          socket.to(`prediction_${predictionId}`).emit('user_joined', {
            userId,
            username: user?.username || 'Unknown'
          });

          // Send join confirmation
          socket.emit('joined_prediction', { 
            predictionId, 
            messageCount: messages.length,
            participantCount: participants.length,
            username: user.username
          });
          
          logger.info(`✅ User ${user.username} successfully joined prediction ${predictionId}`);
          
        } catch (error) {
          logger.error('Error joining prediction room:', error);
          socket.emit('error', { 
            message: 'Failed to join prediction room',
            code: 'JOIN_ROOM_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle new message
      socket.on('send_message', async (data) => {
        try {
          const { predictionId, userId, content, username, avatar } = data;
          
          if (!content || !content.trim()) {
            socket.emit('message_error', { 
              error: 'Message content is required',
              code: 'EMPTY_MESSAGE'
            });
            return;
          }

          logger.info(`📨 New message from ${username} in prediction ${predictionId}: ${content.substring(0, 50)}...`);
          
          // Save message to database (with error handling)
          let message: any = null;
          
          try {
            const { data: savedMessage, error } = await supabase
              .from('chat_messages')
              .insert({
                prediction_id: predictionId,
                user_id: userId,
                content: content.trim(),
                message_type: 'text'
              })
              .select(`
                *,
                user:users(id, username, avatar_url)
              `)
              .single();

            if (error) {
              throw error;
            }
            
            message = savedMessage;
          } catch (dbError) {
            logger.warn('Database save failed, broadcasting message anyway:', dbError);
            // Create a temporary message object for broadcasting
            message = {
              id: `temp_${Date.now()}`,
              prediction_id: predictionId,
              user_id: userId,
              content: content.trim(),
              message_type: 'text',
              created_at: new Date().toISOString(),
              user: {
                id: userId,
                username: username,
                avatar_url: avatar
              }
            };
          }

          // Format message for broadcast
          const messageWithUser = {
            ...message,
            user: {
              id: userId,
              username: username,
              avatar_url: avatar
            }
          };

          // Broadcast message to all users in the prediction room
          this.io.to(`prediction_${predictionId}`).emit('new_message', messageWithUser);
          
          // Remove user from typing list
          this.removeTypingUser(predictionId, username);
          
          logger.info(`✅ Message broadcast to prediction room: ${predictionId}`);
          
        } catch (error) {
          logger.error('Error handling message:', error);
          socket.emit('message_error', { 
            error: 'Failed to send message',
            code: 'SEND_MESSAGE_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        const { predictionId, username } = data;
        this.addTypingUser(predictionId, username);
        socket.to(`prediction_${predictionId}`).emit('user_typing', { username });
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          this.removeTypingUser(predictionId, username);
          socket.to(`prediction_${predictionId}`).emit('user_stop_typing', { username });
        }, 3000);
      });

      socket.on('typing_stop', (data) => {
        const { predictionId, username } = data;
        this.removeTypingUser(predictionId, username);
        socket.to(`prediction_${predictionId}`).emit('user_stop_typing', { username });
      });

      // Handle message reactions
      socket.on('add_reaction', async (data) => {
        try {
          const { messageId, userId, reactionType } = data;
          
          let reaction: any = null;
          
          try {
            const { data: savedReaction, error } = await supabase
              .from('chat_reactions')
              .upsert({
                message_id: messageId,
                user_id: userId,
                reaction_type: reactionType
              })
              .select('*')
              .single();

            if (!error && savedReaction) {
              reaction = savedReaction;
              
              // Get the message's prediction ID to broadcast to the right room
              const { data: message } = await supabase
                .from('chat_messages')
                .select('prediction_id')
                .eq('id', messageId)
                .single();

              if (message) {
                this.io.to(`prediction_${message.prediction_id}`).emit('reaction_added', {
                  messageId,
                  userId,
                  reactionType
                });
              }
            }
          } catch (dbError) {
            logger.warn('Database reaction save failed:', dbError);
            // Still emit the reaction for real-time feedback
            socket.emit('reaction_error', { 
              error: 'Failed to save reaction to database',
              details: dbError instanceof Error ? dbError.message : 'Unknown error'
            });
          }
        } catch (error) {
          logger.error('Error adding reaction:', error);
          socket.emit('reaction_error', { 
            error: 'Failed to add reaction',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Leave prediction room
      socket.on('leave_prediction', async (data) => {
        try {
          const { predictionId } = data;
          const user = this.connectedUsers.get(socket.id);
          
          if (user) {
            logger.info(`👋 User ${user.username} leaving prediction room: ${predictionId}`);
            
            // Update participant status (with error handling)
            try {
              await this.updateParticipantStatus(predictionId, user.userId, false);
            } catch (dbError) {
              logger.warn('Database participant update failed:', dbError);
            }
            
            // Remove from typing users
            this.removeTypingUser(predictionId, user.username);
            
            // Notify others
            socket.to(`prediction_${predictionId}`).emit('user_left', {
              userId: user.userId,
              username: user.username
            });
            
            user.predictionId = undefined;
            this.connectedUsers.set(socket.id, user);
          }
          
          socket.leave(`prediction_${predictionId}`);
          socket.emit('left_prediction', { predictionId });
          
        } catch (error) {
          logger.error('Error leaving prediction room:', error);
          socket.emit('error', { 
            message: 'Failed to leave prediction room',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle ping/pong for connection testing
      socket.on('ping', () => {
        socket.emit('pong', { 
          timestamp: Date.now(),
          server: process.env.NODE_ENV === 'production' ? 'render' : 'local'
        });
      });

      // Handle disconnect
      socket.on('disconnect', async (reason) => {
        const user = this.connectedUsers.get(socket.id);
        
        if (user) {
          logger.info(`🔌 User ${user.username} disconnected: ${socket.id} (reason: ${reason})`);
          
          // Update participant status if they were in a prediction room
          if (user.predictionId) {
            try {
              await this.updateParticipantStatus(user.predictionId, user.userId, false);
            } catch (dbError) {
              logger.warn('Database cleanup failed on disconnect:', dbError);
            }
            
            // Remove from typing users
            this.removeTypingUser(user.predictionId, user.username);
            
            // Notify others in the room
            socket.to(`prediction_${user.predictionId}`).emit('user_left', {
              userId: user.userId,
              username: user.username
            });
          }
          
          this.connectedUsers.delete(socket.id);
        } else {
          logger.info(`🔌 Unknown user disconnected: ${socket.id} (reason: ${reason})`);
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error(`⚠️ Socket error for ${socket.id}:`, error);
      });

      // Send connection confirmation
      socket.emit('connected', { 
        socketId: socket.id, 
        timestamp: new Date().toISOString(),
        serverVersion: '2.0.0',
        environment: process.env.NODE_ENV,
        platform: process.env.RENDER ? 'render' : 'local'
      });
    });

    // Log connection statistics periodically
    setInterval(() => {
      const totalConnections = this.io.engine.clientsCount;
      const authenticatedUsers = this.connectedUsers.size;
      const activeRooms = Array.from(this.typingUsers.keys()).length;
      
      logger.info(`📊 Connection stats: ${totalConnections} total, ${authenticatedUsers} authenticated, ${activeRooms} active rooms`);
    }, 60000); // Every minute
  }

  private async loadMessageHistory(predictionId: string): Promise<any[]> {
    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('prediction_id', predictionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100); // Load last 100 messages

      if (error) {
        logger.error('Error loading message history:', error);
        return [];
      }

      return messages || [];
    } catch (error) {
      logger.error('Error in loadMessageHistory:', error);
      return [];
    }
  }

  private async getParticipants(predictionId: string): Promise<any[]> {
    try {
      const { data: participants, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('prediction_id', predictionId)
        .eq('is_online', true);

      if (error) {
        logger.error('Error getting participants:', error);
        return [];
      }

      return participants || [];
    } catch (error) {
      logger.error('Error in getParticipants:', error);
      return [];
    }
  }

  private async updateParticipantStatus(predictionId: string, userId: string, isOnline: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .upsert({
          prediction_id: predictionId,
          user_id: userId,
          is_online: isOnline,
          last_seen_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Error updating participant status:', error);
      }
    } catch (error) {
      logger.error('Error in updateParticipantStatus:', error);
    }
  }

  private addTypingUser(predictionId: string, username: string): void {
    if (!this.typingUsers.has(predictionId)) {
      this.typingUsers.set(predictionId, new Set());
    }
    this.typingUsers.get(predictionId)?.add(username);
  }

  private removeTypingUser(predictionId: string, username: string): void {
    const typingSet = this.typingUsers.get(predictionId);
    if (typingSet) {
      typingSet.delete(username);
      if (typingSet.size === 0) {
        this.typingUsers.delete(predictionId);
      }
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up inactive connections every 5 minutes
    setInterval(() => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      for (const [socketId, user] of this.connectedUsers.entries()) {
        if (user.joinedAt < fiveMinutesAgo) {
          // Check if socket is still connected
          const socket = this.io.sockets.sockets.get(socketId);
          if (!socket || !socket.connected) {
            logger.info(`🧹 Cleaning up disconnected user: ${user.username}`);
            this.connectedUsers.delete(socketId);
          }
        }
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  // Public methods for external access
  public getHttpServer() {
    return this.httpServer;
  }

  public getIO() {
    return this.io;
  }

  public getConnectedUsers(): Map<string, ConnectedUser> {
    return this.connectedUsers;
  }

  public getUsersInPrediction(predictionId: string): ConnectedUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.predictionId === predictionId);
  }

  public getConnectionStats() {
    return {
      totalConnections: this.io.engine.clientsCount,
      authenticatedUsers: this.connectedUsers.size,
      activeRooms: Array.from(this.typingUsers.keys()).length,
      typingUsers: this.typingUsers.size,
      platform: process.env.RENDER ? 'render' : 'local',
      environment: process.env.NODE_ENV
    };
  }

  // Method to send system messages
  public async sendSystemMessage(predictionId: string, content: string): Promise<void> {
    try {
      let message: any = null;
      
      try {
        const { data: savedMessage, error } = await supabase
          .from('chat_messages')
          .insert({
            prediction_id: predictionId,
            user_id: '00000000-0000-0000-0000-000000000000', // System user ID
            content,
            message_type: 'system'
          })
          .select('*')
          .single();

        if (!error && savedMessage) {
          message = savedMessage;
        }
      } catch (dbError) {
        logger.warn('Database system message save failed:', dbError);
        // Create temporary message for broadcasting
        message = {
          id: `system_${Date.now()}`,
          prediction_id: predictionId,
          user_id: '00000000-0000-0000-0000-000000000000',
          content,
          message_type: 'system',
          created_at: new Date().toISOString()
        };
      }

      if (message) {
        const systemMessage = {
          ...message,
          user: {
            id: '00000000-0000-0000-0000-000000000000',
            username: 'System',
            avatar_url: null
          }
        };

        this.io.to(`prediction_${predictionId}`).emit('new_message', systemMessage);
        logger.info(`📢 System message sent to prediction ${predictionId}: ${content}`);
      }
    } catch (error) {
      logger.error('Error sending system message:', error);
    }
  }
}

export default ChatService;