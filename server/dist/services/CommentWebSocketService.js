"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentWebSocketService = void 0;
const socket_io_1 = require("socket.io");
const supabase_1 = require("../config/supabase");
const logger_1 = __importDefault(require("../utils/logger"));
class CommentWebSocketService {
    constructor(server) {
        this.connectedUsers = new Map(); // predictionId -> Set of socketIds
        this.userSockets = new Map(); // userId -> socketId
        this.io = new socket_io_1.Server(server, {
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
        logger_1.default.info('💬 Comment WebSocket Service initialized');
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.default.info(`🔌 Client connected: ${socket.id}`);
            // Handle authentication
            socket.on('authenticate', async (data) => {
                try {
                    // Verify the JWT token
                    const { data: user, error } = await supabase_1.supabase.auth.getUser(data.token);
                    if (error || !user.user || user.user.id !== data.userId) {
                        socket.emit('auth_error', { message: 'Invalid authentication' });
                        return;
                    }
                    // Store user association
                    this.userSockets.set(data.userId, socket.id);
                    socket.data.userId = data.userId;
                    socket.data.authenticated = true;
                    socket.emit('authenticated', { userId: data.userId });
                    logger_1.default.info(`✅ User authenticated: ${data.userId} (${socket.id})`);
                }
                catch (error) {
                    logger_1.default.error('❌ Authentication failed:', error);
                    socket.emit('auth_error', { message: 'Authentication failed' });
                }
            });
            // Handle joining prediction comment rooms
            socket.on('join_prediction', (data) => {
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
                this.connectedUsers.get(predictionId).add(socket.id);
                socket.emit('joined_prediction', { predictionId });
                logger_1.default.info(`📨 User ${socket.data.userId} joined prediction ${predictionId}`);
                // Send current online count
                const onlineCount = this.connectedUsers.get(predictionId)?.size || 0;
                this.io.to(`prediction:${predictionId}`).emit('online_count', {
                    predictionId,
                    count: onlineCount
                });
            });
            // Handle leaving prediction comment rooms
            socket.on('leave_prediction', (data) => {
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
                logger_1.default.info(`📤 User ${socket.data.userId} left prediction ${predictionId}`);
                // Send updated online count
                const onlineCount = this.connectedUsers.get(predictionId)?.size || 0;
                this.io.to(`prediction:${predictionId}`).emit('online_count', {
                    predictionId,
                    count: onlineCount
                });
            });
            // Handle real-time typing indicators
            socket.on('typing_start', (data) => {
                socket.to(`prediction:${data.predictionId}`).emit('user_typing', {
                    userId: socket.data.userId,
                    username: data.username,
                    predictionId: data.predictionId
                });
            });
            socket.on('typing_stop', (data) => {
                socket.to(`prediction:${data.predictionId}`).emit('user_stopped_typing', {
                    userId: socket.data.userId,
                    predictionId: data.predictionId
                });
            });
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                logger_1.default.info(`🔌 Client disconnected: ${socket.id} (${reason})`);
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
    setupSupabaseListeners() {
        // Listen for comment changes
        supabase_1.supabase
            .channel('comments_channel')
            .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'comments'
        }, (payload) => {
            this.handleCommentChange('comment_created', payload.new);
        })
            .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'comments'
        }, (payload) => {
            this.handleCommentChange('comment_updated', payload.new);
        })
            .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'comments'
        }, (payload) => {
            this.handleCommentChange('comment_deleted', payload.old);
        })
            .subscribe();
        // Listen for comment likes
        supabase_1.supabase
            .channel('comment_likes_channel')
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'comment_likes'
        }, (payload) => {
            this.handleCommentLikeChange(payload);
        })
            .subscribe();
        logger_1.default.info('📡 Supabase real-time listeners set up');
    }
    async handleCommentChange(type, comment) {
        try {
            const predictionId = comment.prediction_id;
            // Get additional comment data if needed
            if (type === 'comment_created' || type === 'comment_updated') {
                const { data: fullComment, error } = await supabase_1.supabase
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
                    logger_1.default.error('Failed to fetch full comment data:', error);
                    return;
                }
                comment = fullComment;
            }
            const update = {
                type,
                data: comment,
                predictionId,
                userId: comment.user_id
            };
            // Broadcast to all users in the prediction room
            this.io.to(`prediction:${predictionId}`).emit('comment_update', update);
            logger_1.default.info(`📢 Broadcasted ${type} for prediction ${predictionId}`);
        }
        catch (error) {
            logger_1.default.error('Error handling comment change:', error);
        }
    }
    async handleCommentLikeChange(payload) {
        try {
            const commentId = payload.new?.comment_id || payload.old?.comment_id;
            if (!commentId)
                return;
            // Get the comment to find the prediction ID
            const { data: comment, error } = await supabase_1.supabase
                .from('comments')
                .select('prediction_id, likes_count')
                .eq('id', commentId)
                .single();
            if (error || !comment) {
                logger_1.default.error('Failed to fetch comment for like update:', error);
                return;
            }
            const update = {
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
            logger_1.default.info(`📢 Broadcasted like update for comment ${commentId}`);
        }
        catch (error) {
            logger_1.default.error('Error handling comment like change:', error);
        }
    }
    // Public methods for manual broadcasts
    broadcastToUser(userId, event, data) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }
    broadcastToPrediction(predictionId, event, data) {
        this.io.to(`prediction:${predictionId}`).emit(event, data);
    }
    getOnlineCount(predictionId) {
        return this.connectedUsers.get(predictionId)?.size || 0;
    }
    getConnectedUsers() {
        return this.connectedUsers;
    }
    getTotalConnections() {
        return this.io.engine.clientsCount;
    }
    // Cleanup method
    shutdown() {
        this.io.close();
        this.connectedUsers.clear();
        this.userSockets.clear();
        logger_1.default.info('💬 Comment WebSocket Service shut down');
    }
}
exports.CommentWebSocketService = CommentWebSocketService;
