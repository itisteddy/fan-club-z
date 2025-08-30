"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const socket_io_1 = require("socket.io");
const supabase_js_1 = require("../config/supabase.js");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = require("../config");
class ChatService {
    constructor(httpServer) {
        this.connectedUsers = new Map();
        this.typingUsers = new Map();
        this.httpServer = httpServer;
        const allowedOrigins = this.getAllowedOrigins();
        logger_1.default.info('🔧 Configuring Socket.IO with CORS origins:', allowedOrigins);
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: (origin, callback) => {
                    if (!origin) {
                        logger_1.default.info('🌐 Socket.IO CORS: Allowing request with no origin');
                        return callback(null, true);
                    }
                    logger_1.default.info(`🌐 Socket.IO CORS: Checking origin: ${origin}`);
                    const isAllowed = allowedOrigins.includes(origin);
                    const isVercelDeployment = origin.includes('.vercel.app');
                    const isRenderDeployment = origin.includes('.onrender.com');
                    const isCustomDomain = origin.includes('fanclubz.app');
                    const isDevelopment = process.env.NODE_ENV !== 'production';
                    if (isAllowed || isRenderDeployment || isVercelDeployment || isCustomDomain) {
                        const reason = isAllowed ? '(explicit allow)' :
                            isVercelDeployment ? '(Vercel deployment)' :
                                isRenderDeployment ? '(Render deployment)' :
                                    '(Custom domain)';
                        logger_1.default.info(`✅ Socket.IO CORS: Origin allowed - ${origin} ${reason}`);
                        callback(null, true);
                    }
                    else {
                        logger_1.default.warn(`❌ Socket.IO CORS: Origin blocked - ${origin}`);
                        if (isDevelopment) {
                            logger_1.default.info('🚧 Socket.IO CORS: Development mode - allowing anyway');
                            callback(null, true);
                        }
                        else {
                            callback(new Error(`Origin ${origin} not allowed by CORS`));
                        }
                    }
                },
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            connectTimeout: 45000,
            transports: ['websocket', 'polling'],
            serveClient: false,
            allowUpgrades: true,
            cookie: false,
            maxHttpBufferSize: 1e6,
            httpCompression: true,
            perMessageDeflate: true
        });
        this.setupSocketHandlers();
        this.setupPeriodicCleanup();
        this.logServerInfo();
    }
    getAllowedOrigins() {
        const baseOrigins = process.env.NODE_ENV === 'production'
            ? [
                'https://fan-club-z.onrender.com',
                'https://fanclubz.app',
                'https://www.fanclubz.app',
                'https://app.fanclubz.app',
                'https://dev.fanclubz.app',
                'https://fan-club-z-pw49foj6y-teddys-projects-d67ab22a.vercel.app',
                'https://fan-club-z-lu5ywnjr0-teddys-projects-d67ab22a.vercel.app',
                'https://fanclubz-version2-0.vercel.app',
                config_1.config.frontend.url,
                process.env.FRONTEND_URL,
                process.env.CLIENT_URL,
                process.env.VITE_APP_URL
            ]
            : [
                'http://localhost:3000',
                'http://localhost:5173',
                'http://localhost:3001',
                'https://localhost:3000',
                'https://localhost:5173',
                'https://dev.fanclubz.app',
                'https://app.fanclubz.app',
                config_1.config.frontend.url,
                process.env.FRONTEND_URL || 'http://localhost:5173',
                process.env.CLIENT_URL || 'http://localhost:5173',
                process.env.VITE_APP_URL || 'http://localhost:5173'
            ];
        const additionalOrigins = process.env.WEBSOCKET_ORIGINS?.split(',') || [];
        const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [];
        return [...new Set([...baseOrigins, ...additionalOrigins, ...corsOrigins])].filter(Boolean);
    }
    logServerInfo() {
        const allowedOrigins = this.getAllowedOrigins();
        logger_1.default.info('🚀 Socket.IO Chat Service initialized');
        logger_1.default.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger_1.default.info(`🌐 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
        logger_1.default.info(`🔧 Transports: websocket, polling`);
        logger_1.default.info(`⏱️  Ping timeout: 60s, interval: 25s`);
        logger_1.default.info(`🏗️  Platform: ${process.env.RENDER ? 'Render' : 'Local'}`);
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            const clientOrigin = socket.handshake.headers.origin;
            const userAgent = socket.handshake.headers['user-agent'];
            const forwardedFor = socket.handshake.headers['x-forwarded-for'];
            logger_1.default.info(`🔗 New socket connection: ${socket.id}`);
            logger_1.default.info(`📍 Origin: ${clientOrigin || 'unknown'}`);
            logger_1.default.info(`🌍 IP: ${forwardedFor || socket.handshake.address}`);
            logger_1.default.info(`🖥️  User Agent: ${userAgent ? userAgent.substring(0, 100) + '...' : 'unknown'}`);
            socket.on('authenticate', (userData) => {
                try {
                    logger_1.default.info(`🔐 Authentication attempt: ${userData.username || 'unknown'} (${socket.id})`);
                    if (!userData.userId || !userData.username) {
                        logger_1.default.warn('⚠️ Authentication failed: Invalid user data');
                        socket.emit('auth_error', { message: 'Invalid user data' });
                        return;
                    }
                    const connectedUser = {
                        socketId: socket.id,
                        userId: userData.userId,
                        username: userData.username,
                        joinedAt: new Date()
                    };
                    this.connectedUsers.set(socket.id, connectedUser);
                    logger_1.default.info(`✅ User authenticated: ${userData.username} (${socket.id})`);
                    socket.emit('authenticated', {
                        success: true,
                        socketId: socket.id,
                        userId: userData.userId,
                        username: userData.username,
                        timestamp: new Date().toISOString(),
                        serverInfo: {
                            environment: process.env.NODE_ENV,
                            version: process.env.npm_package_version || '2.0.81'
                        }
                    });
                }
                catch (error) {
                    logger_1.default.error('❌ Authentication error:', error);
                    socket.emit('auth_error', {
                        message: 'Authentication failed',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            socket.on('join_prediction', async (data) => {
                try {
                    const { predictionId, userId } = data;
                    const user = this.connectedUsers.get(socket.id);
                    if (!user) {
                        logger_1.default.warn('⚠️ Join prediction failed: User not authenticated');
                        socket.emit('error', {
                            message: 'Cannot join prediction: socket not connected or user not authenticated',
                            code: 'NOT_AUTHENTICATED'
                        });
                        return;
                    }
                    logger_1.default.info(`👥 User ${user.username} joining prediction room: ${predictionId}`);
                    user.predictionId = predictionId;
                    this.connectedUsers.set(socket.id, user);
                    socket.join(`prediction_${predictionId}`);
                    try {
                        await this.updateParticipantStatus(predictionId, userId, true);
                    }
                    catch (dbError) {
                        logger_1.default.warn('Database operation failed, continuing without participant update:', dbError);
                    }
                    let messages = [];
                    let participants = [];
                    try {
                        messages = await this.loadMessageHistory(predictionId);
                        participants = await this.getParticipants(predictionId);
                    }
                    catch (dbError) {
                        logger_1.default.warn('Database queries failed, continuing with empty data:', dbError);
                    }
                    socket.emit('message_history', messages);
                    socket.emit('participants_updated', participants);
                    socket.to(`prediction_${predictionId}`).emit('user_joined', {
                        userId,
                        username: user?.username || 'Unknown'
                    });
                    socket.emit('joined_prediction', {
                        predictionId,
                        messageCount: messages.length,
                        participantCount: participants.length,
                        username: user.username
                    });
                    logger_1.default.info(`✅ User ${user.username} successfully joined prediction ${predictionId}`);
                }
                catch (error) {
                    logger_1.default.error('Error joining prediction room:', error);
                    socket.emit('error', {
                        message: 'Failed to join prediction room',
                        code: 'JOIN_ROOM_ERROR',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
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
                    logger_1.default.info(`📨 New message from ${username} in prediction ${predictionId}: ${content.substring(0, 50)}...`);
                    let message = null;
                    try {
                        const { data: savedMessage, error } = await supabase_js_1.supabase
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
                    }
                    catch (dbError) {
                        logger_1.default.warn('Database save failed, broadcasting message anyway:', dbError);
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
                    const messageWithUser = {
                        ...message,
                        user: {
                            id: userId,
                            username: username,
                            avatar_url: avatar
                        }
                    };
                    this.io.to(`prediction_${predictionId}`).emit('new_message', messageWithUser);
                    this.removeTypingUser(predictionId, username);
                    logger_1.default.info(`✅ Message broadcast to prediction room: ${predictionId}`);
                }
                catch (error) {
                    logger_1.default.error('Error handling message:', error);
                    socket.emit('message_error', {
                        error: 'Failed to send message',
                        code: 'SEND_MESSAGE_ERROR',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            socket.on('typing_start', (data) => {
                const { predictionId, username } = data;
                this.addTypingUser(predictionId, username);
                socket.to(`prediction_${predictionId}`).emit('user_typing', { username });
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
            socket.on('add_reaction', async (data) => {
                try {
                    const { messageId, userId, reactionType } = data;
                    let reaction = null;
                    try {
                        const { data: savedReaction, error } = await supabase_js_1.supabase
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
                            const { data: message } = await supabase_js_1.supabase
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
                    }
                    catch (dbError) {
                        logger_1.default.warn('Database reaction save failed:', dbError);
                        socket.emit('reaction_error', {
                            error: 'Failed to save reaction to database',
                            details: dbError instanceof Error ? dbError.message : 'Unknown error'
                        });
                    }
                }
                catch (error) {
                    logger_1.default.error('Error adding reaction:', error);
                    socket.emit('reaction_error', {
                        error: 'Failed to add reaction',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            socket.on('leave_prediction', async (data) => {
                try {
                    const { predictionId } = data;
                    const user = this.connectedUsers.get(socket.id);
                    if (user) {
                        logger_1.default.info(`👋 User ${user.username} leaving prediction room: ${predictionId}`);
                        try {
                            await this.updateParticipantStatus(predictionId, user.userId, false);
                        }
                        catch (dbError) {
                            logger_1.default.warn('Database participant update failed:', dbError);
                        }
                        this.removeTypingUser(predictionId, user.username);
                        socket.to(`prediction_${predictionId}`).emit('user_left', {
                            userId: user.userId,
                            username: user.username
                        });
                        user.predictionId = undefined;
                        this.connectedUsers.set(socket.id, user);
                    }
                    socket.leave(`prediction_${predictionId}`);
                    socket.emit('left_prediction', { predictionId });
                }
                catch (error) {
                    logger_1.default.error('Error leaving prediction room:', error);
                    socket.emit('error', {
                        message: 'Failed to leave prediction room',
                        details: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
            socket.on('ping', () => {
                socket.emit('pong', {
                    timestamp: Date.now(),
                    server: process.env.NODE_ENV === 'production' ? 'render' : 'local'
                });
            });
            socket.on('disconnect', async (reason) => {
                const user = this.connectedUsers.get(socket.id);
                if (user) {
                    logger_1.default.info(`🔌 User ${user.username} disconnected: ${socket.id} (reason: ${reason})`);
                    if (user.predictionId) {
                        try {
                            await this.updateParticipantStatus(user.predictionId, user.userId, false);
                        }
                        catch (dbError) {
                            logger_1.default.warn('Database cleanup failed on disconnect:', dbError);
                        }
                        this.removeTypingUser(user.predictionId, user.username);
                        socket.to(`prediction_${user.predictionId}`).emit('user_left', {
                            userId: user.userId,
                            username: user.username
                        });
                    }
                    this.connectedUsers.delete(socket.id);
                }
                else {
                    logger_1.default.info(`🔌 Unknown user disconnected: ${socket.id} (reason: ${reason})`);
                }
            });
            socket.on('error', (error) => {
                logger_1.default.error(`⚠️ Socket error for ${socket.id}:`, error);
            });
            socket.emit('connected', {
                socketId: socket.id,
                timestamp: new Date().toISOString(),
                serverVersion: process.env.npm_package_version || '2.0.81',
                environment: process.env.NODE_ENV,
                platform: process.env.RENDER ? 'render' : 'local'
            });
        });
        setInterval(() => {
            const totalConnections = this.io.engine.clientsCount;
            const authenticatedUsers = this.connectedUsers.size;
            const activeRooms = Array.from(this.typingUsers.keys()).length;
            logger_1.default.info(`📊 Connection stats: ${totalConnections} total, ${authenticatedUsers} authenticated, ${activeRooms} active rooms`);
        }, 60000);
    }
    async loadMessageHistory(predictionId) {
        try {
            const { data: messages, error } = await supabase_js_1.supabase
                .from('chat_messages')
                .select(`
          *,
          user:users(id, username, avatar_url)
        `)
                .eq('prediction_id', predictionId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
                .limit(100);
            if (error) {
                logger_1.default.error('Error loading message history:', error);
                return [];
            }
            return messages || [];
        }
        catch (error) {
            logger_1.default.error('Error in loadMessageHistory:', error);
            return [];
        }
    }
    async getParticipants(predictionId) {
        try {
            const { data: participants, error } = await supabase_js_1.supabase
                .from('chat_participants')
                .select(`
          *,
          user:users(id, username, avatar_url)
        `)
                .eq('prediction_id', predictionId)
                .eq('is_online', true);
            if (error) {
                logger_1.default.error('Error getting participants:', error);
                return [];
            }
            return participants || [];
        }
        catch (error) {
            logger_1.default.error('Error in getParticipants:', error);
            return [];
        }
    }
    async updateParticipantStatus(predictionId, userId, isOnline) {
        try {
            const { error } = await supabase_js_1.supabase
                .from('chat_participants')
                .upsert({
                prediction_id: predictionId,
                user_id: userId,
                is_online: isOnline,
                last_seen_at: new Date().toISOString()
            });
            if (error) {
                logger_1.default.error('Error updating participant status:', error);
            }
        }
        catch (error) {
            logger_1.default.error('Error in updateParticipantStatus:', error);
        }
    }
    addTypingUser(predictionId, username) {
        if (!this.typingUsers.has(predictionId)) {
            this.typingUsers.set(predictionId, new Set());
        }
        this.typingUsers.get(predictionId)?.add(username);
    }
    removeTypingUser(predictionId, username) {
        const typingSet = this.typingUsers.get(predictionId);
        if (typingSet) {
            typingSet.delete(username);
            if (typingSet.size === 0) {
                this.typingUsers.delete(predictionId);
            }
        }
    }
    setupPeriodicCleanup() {
        setInterval(() => {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            for (const [socketId, user] of this.connectedUsers.entries()) {
                if (user.joinedAt < fiveMinutesAgo) {
                    const socket = this.io.sockets.sockets.get(socketId);
                    if (!socket || !socket.connected) {
                        logger_1.default.info(`🧹 Cleaning up disconnected user: ${user.username}`);
                        this.connectedUsers.delete(socketId);
                    }
                }
            }
        }, 5 * 60 * 1000);
    }
    getHttpServer() {
        return this.httpServer;
    }
    getIO() {
        return this.io;
    }
    getConnectedUsers() {
        return this.connectedUsers;
    }
    getUsersInPrediction(predictionId) {
        return Array.from(this.connectedUsers.values())
            .filter(user => user.predictionId === predictionId);
    }
    getConnectionStats() {
        return {
            totalConnections: this.io.engine.clientsCount,
            authenticatedUsers: this.connectedUsers.size,
            activeRooms: Array.from(this.typingUsers.keys()).length,
            typingUsers: this.typingUsers.size,
            platform: process.env.RENDER ? 'render' : 'local',
            environment: process.env.NODE_ENV
        };
    }
    async sendSystemMessage(predictionId, content) {
        try {
            let message = null;
            try {
                const { data: savedMessage, error } = await supabase_js_1.supabase
                    .from('chat_messages')
                    .insert({
                    prediction_id: predictionId,
                    user_id: '00000000-0000-0000-0000-000000000000',
                    content,
                    message_type: 'system'
                })
                    .select('*')
                    .single();
                if (!error && savedMessage) {
                    message = savedMessage;
                }
            }
            catch (dbError) {
                logger_1.default.warn('Database system message save failed:', dbError);
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
                logger_1.default.info(`📢 System message sent to prediction ${predictionId}: ${content}`);
            }
        }
        catch (error) {
            logger_1.default.error('Error sending system message:', error);
        }
    }
}
exports.ChatService = ChatService;
exports.default = ChatService;
//# sourceMappingURL=ChatService.js.map