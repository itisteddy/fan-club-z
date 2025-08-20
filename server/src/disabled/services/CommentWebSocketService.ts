import { Server } from 'socket.io';
import { createServer } from 'http';
import { supabase } from '../config/supabase';
import logger from '../utils/logger';

interface CommentUpdate {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted' | 'comment_liked';
  data: any;
  predictionId: string;
  userId?: string;
}

export class CommentWebSocketService {
  private io: Server;
  private connectedUsers: Map<string, Set<string>> = new Map(); // predictionId -> Set of socketIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? [
              'https://fan-club-z.onrender.com',
              'https://fanclubz.app',
              'https://www.fanclubz.app',
              'https://app.fanclubz.app',
              'https://dev.fanclubz.app',
            ]
          : [
              'http://localhost:3000',
              'http://localhost:5173',
              'https://localhost:3000',
              'https://localhost:5173',
            ],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    this.setupEventHandlers();
    this.setupSupabaseListeners();
    logger.info('💬 Comment WebSocket Service initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`🔌 Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data: { userId: string; token: string }) => {
        try {
          // Verify the JWT token
          const { data: user, error } = await supabase.auth.getUser(data.token);
          
          if (error || !user.user || user.user.id !== data.userId) {
            socket.emit('auth_error', { message: 'Invalid authentication' });
            return;
          }

          // Store user association
          this.userSockets.set(data.userId, socket.id);
          socket.data.userId = data.userId;
          socket.data.authenticated = true;

          socket.emit('authenticated', { userId: data.userId });
          logger.info(`✅ User authenticated: ${data.userId} (${socket.id})`);
        } catch (error) {
          logger.error('❌ Authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      // Handle joining prediction comment rooms
      socket.on('join_prediction', (data: { predictionId: string }) => {
        const { predictionId } = data;
        
        if (!socket.data.authenticated) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Join the prediction room
        socket.join(`prediction:${predictionId}`);
        
        // Track connected users for this prediction
        if (!this.connectedUsers.has(predictionId)) {
          this.connectedUsers.set(predictionId, new Set());
        }
        this.connectedUsers.get(predictionId)!.add(socket.id);

        socket.emit('joined_prediction', { predictionId });
        logger.info(`📨 User ${socket.data.userId} joined prediction ${predictionId}`);

        // Send current online count
        const onlineCount = this.connectedUsers.get(predictionId)?.size || 0;
        this.io.to(`prediction:${predictionId}`).emit('online_count', { 
          predictionId, 
          count: onlineCount 
        });
      });

      // Handle leaving prediction comment rooms
      socket.on('leave_prediction', (data: { predictionId: string }) => {
        const { predictionId } = data;
        
        socket.leave(`prediction:${predictionId}`);
        
        // Remove from tracking
        const users = this.connectedUsers.get(predictionId);
        if (users) {
          users.delete(socket.id);
          if (users.size === 0) {
            this.connectedUsers.delete(predictionId);
          }
        }

        socket.emit('left_prediction', { predictionId });
        logger.info(`📤 User ${socket.data.userId} left prediction ${predictionId}`);

        // Send updated online count
        const onlineCount = this.connectedUsers.get(predictionId)?.size || 0;
        this.io.to(`prediction:${predictionId}`).emit('online_count', { 
          predictionId, 
          count: onlineCount 
        });
      });

      // Handle real-time typing indicators
      socket.on('typing_start', (data: { predictionId: string; username: string }) => {
        socket.to(`prediction:${data.predictionId}`).emit('user_typing', {
          userId: socket.data.userId,
          username: data.username,
          predictionId: data.predictionId
        });
      });

      socket.on('typing_stop', (data: { predictionId: string }) => {
        socket.to(`prediction:${data.predictionId}`).emit('user_stopped_typing', {
          userId: socket.data.userId,
          predictionId: data.predictionId
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`🔌 Client disconnected: ${socket.id} (${reason})`);
        
        // Clean up user associations
        if (socket.data.userId) {
          this.userSockets.delete(socket.data.userId);
        }

        // Clean up prediction room tracking
        for (const [predictionId, users] of this.connectedUsers.entries()) {
          if (users.has(socket.id)) {
            users.delete(socket.id);
            
            // Send updated online count
            const onlineCount = users.size;
            this.io.to(`prediction:${predictionId}`).emit('online_count', { 
              predictionId, 
              count: onlineCount 
            });
            
            if (users.size === 0) {
              this.connectedUsers.delete(predictionId);
            }
          }
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  private setupSupabaseListeners() {
    // Listen for comment changes
    supabase
      .channel('comments_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          this.handleCommentChange('comment_created', payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          this.handleCommentChange('comment_updated', payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          this.handleCommentChange('comment_deleted', payload.old);
        }
      )
      .subscribe();

    // Listen for comment likes
    supabase
      .channel('comment_likes_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes'
        },
        (payload) => {
          this.handleCommentLikeChange(payload);
        }
      )
      .subscribe();

    logger.info('📡 Supabase real-time listeners set up');
  }

  private async handleCommentChange(
    type: 'comment_created' | 'comment_updated' | 'comment_deleted',
    comment: any
  ) {
    try {
      const predictionId = comment.prediction_id;
      
      // Get additional comment data if needed
      if (type === 'comment_created' || type === 'comment_updated') {
        const { data: fullComment, error } = await supabase
          .from('comments')
          .select(`
            *,
            user:users!user_id (
              id,
              username,
              avatar_url,
              is_verified
            )
          `)
          .eq('id', comment.id)
          .single();

        if (error) {
          logger.error('Failed to fetch full comment data:', error);
          return;
        }

        comment = fullComment;
      }

      const update: CommentUpdate = {
        type,
        data: comment,
        predictionId,
        userId: comment.user_id
      };

      // Broadcast to all users in the prediction room
      this.io.to(`prediction:${predictionId}`).emit('comment_update', update);
      
      logger.info(`📢 Broadcasted ${type} for prediction ${predictionId}`);
    } catch (error) {
      logger.error('Error handling comment change:', error);
    }
  }

  private async handleCommentLikeChange(payload: any) {
    try {
      const commentId = payload.new?.comment_id || payload.old?.comment_id;
      
      if (!commentId) return;

      // Get the comment to find the prediction ID
      const { data: comment, error } = await supabase
        .from('comments')
        .select('prediction_id, likes_count')
        .eq('id', commentId)
        .single();

      if (error || !comment) {
        logger.error('Failed to fetch comment for like update:', error);
        return;
      }

      const update: CommentUpdate = {
        type: 'comment_liked',
        data: {
          comment_id: commentId,
          user_id: payload.new?.user_id || payload.old?.user_id,
          likes_count: comment.likes_count,
          is_liked: payload.eventType === 'INSERT'
        },
        predictionId: comment.prediction_id,
        userId: payload.new?.user_id || payload.old?.user_id
      };

      // Broadcast to all users in the prediction room
      this.io.to(`prediction:${comment.prediction_id}`).emit('comment_update', update);
      
      logger.info(`📢 Broadcasted like update for comment ${commentId}`);
    } catch (error) {
      logger.error('Error handling comment like change:', error);
    }
  }

  // Public methods for manual broadcasts
  public broadcastToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public broadcastToPrediction(predictionId: string, event: string, data: any) {
    this.io.to(`prediction:${predictionId}`).emit(event, data);
  }

  public getOnlineCount(predictionId: string): number {
    return this.connectedUsers.get(predictionId)?.size || 0;
  }

  public getConnectedUsers(): Map<string, Set<string>> {
    return this.connectedUsers;
  }

  public getTotalConnections(): number {
    return this.io.engine.clientsCount;
  }

  // Cleanup method
  public shutdown() {
    this.io.close();
    this.connectedUsers.clear();
    this.userSockets.clear();
    logger.info('💬 Comment WebSocket Service shut down');
  }
}