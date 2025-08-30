"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const config_1 = require("./config");
const logger_1 = __importDefault(require("./utils/logger"));
const error_1 = require("./middleware/error");
const rate_limit_1 = require("./middleware/rate-limit");
const ChatService_1 = require("./services/ChatService");
const auth_1 = __importDefault(require("./routes/auth"));
const predictions_1 = __importDefault(require("./routes/predictions"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const social_1 = __importDefault(require("./routes/social"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const settlement_1 = __importDefault(require("./routes/settlement"));
function validateEnvironment() {
    const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        logger_1.default.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        logger_1.default.error('Please configure these variables in your Render dashboard');
        process.exit(1);
    }
    if (!process.env.PORT) {
        logger_1.default.warn('⚠️ PORT environment variable not set, using default 3001');
    }
    logger_1.default.info('✅ All required environment variables validated');
}
validateEnvironment();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [
        'https://fan-club-z.onrender.com',
        'https://fanclubz.app',
        'https://www.fanclubz.app',
        'https://app.fanclubz.app',
        'https://dev.fanclubz.app',
        'https://fan-club-z-pw49foj6y-teddys-projects-d67ab22a.vercel.app',
        'https://fan-club-z-lu5ywnjr0-teddys-projects-d67ab22a.vercel.app',
        'https://fanclubz-version2-0.vercel.app',
        ...(process.env.CORS_ORIGINS?.split(',') || [])
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
        ...(process.env.CORS_ORIGINS?.split(',') || [])
    ];
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin) {
            console.log('🌐 CORS: Allowing request with no origin');
            return callback(null, true);
        }
        console.log('🌐 CORS: Checking origin:', origin);
        console.log('🌐 CORS: NODE_ENV:', process.env.NODE_ENV);
        if (process.env.NODE_ENV !== 'production') {
            console.log('🌐 CORS: Allowed origins:', allowedOrigins);
        }
        const isAllowed = allowedOrigins.indexOf(origin) !== -1;
        const isVercelDeployment = origin.includes('.vercel.app');
        const isRenderDeployment = origin.includes('.onrender.com');
        const isLocalDevelopment = origin.includes('localhost') || origin.includes('127.0.0.1');
        const isCustomDomain = origin.includes('fanclubz.app');
        if (isAllowed || isVercelDeployment || isRenderDeployment || isCustomDomain) {
            const reason = isAllowed ? '(explicit allow)' :
                isVercelDeployment ? '(Vercel deployment)' :
                    isRenderDeployment ? '(Render deployment)' :
                        '(Custom domain)';
            console.log('✅ CORS: Origin allowed', reason);
            callback(null, true);
        }
        else {
            console.log('❌ CORS: Origin blocked:', origin);
            if (process.env.NODE_ENV !== 'production' || isLocalDevelopment) {
                console.log('🚧 CORS: Development mode or localhost - allowing anyway');
                callback(null, true);
            }
            else {
                callback(new Error(`Origin ${origin} not allowed by CORS`));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined', {
        stream: {
            write: (message) => {
                logger_1.default.info(message.trim());
            },
        },
    }));
}
app.use('/api/', rate_limit_1.defaultRateLimit);
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '0.0.0',
        port: config_1.config.server.port,
        websocket: 'enabled'
    });
});
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Fan Club Z API is running',
        timestamp: new Date().toISOString(),
        services: {
            database: 'connected',
            redis: 'connected',
            websocket: 'enabled',
            supabase: process.env.VITE_SUPABASE_URL ? 'configured' : 'missing'
        },
    });
});
app.get('/socket.io/health', (req, res) => {
    res.json({
        status: 'Socket.IO server is running',
        environment: process.env.NODE_ENV,
        port: config_1.config.server.port,
        timestamp: new Date().toISOString()
    });
});
app.get('/ws', (req, res) => {
    res.json({
        status: 'WebSocket endpoint available',
        protocol: req.secure ? 'wss' : 'ws',
        url: req.secure
            ? `wss://${req.get('host')}`
            : `ws://${req.get('host')}`,
        socketio_url: req.secure
            ? `https://${req.get('host')}`
            : `http://${req.get('host')}`,
        timestamp: new Date().toISOString()
    });
});
app.use('/api/v2/auth', auth_1.default);
app.use('/api/v2/predictions', predictions_1.default);
app.use('/api/v2/wallet', wallet_1.default);
app.use('/api/v2/social', social_1.default);
app.use('/api/v2/clubs', clubs_1.default);
app.use('/api/v2/settlement', settlement_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/predictions', predictions_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/social', social_1.default);
app.use('/api/clubs', clubs_1.default);
app.use('/api/settlement', settlement_1.default);
logger_1.default.info('🛣️ Registered API routes:');
logger_1.default.info('- /api/v2/auth (authRoutes)');
logger_1.default.info('- /api/v2/predictions (predictionRoutes)');
logger_1.default.info('- /api/v2/wallet (walletRoutes)');
logger_1.default.info('- /api/v2/social (socialRoutes)');
logger_1.default.info('- /api/v2/clubs (clubRoutes)');
logger_1.default.info('- /api/* (legacy routes)');
logger_1.default.info('✅ All routes registered successfully');
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
    });
});
app.use(error_1.errorHandler);
const PORT = parseInt(process.env.PORT || '3001', 10);
const server = (0, http_1.createServer)(app);
let chatService = null;
try {
    chatService = new ChatService_1.ChatService(server);
    logger_1.default.info('💬 WebSocket Chat Service initialized successfully');
}
catch (error) {
    logger_1.default.error('❌ Failed to initialize WebSocket Chat Service:', error);
}
server.listen(PORT, '0.0.0.0', () => {
    logger_1.default.info('🚀 Fan Club Z Server started successfully');
    logger_1.default.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    const getPublicUrl = () => {
        if (process.env.NODE_ENV === 'production') {
            return 'https://fan-club-z.onrender.com';
        }
        return `http://localhost:${PORT}`;
    };
    const publicUrl = getPublicUrl();
    logger_1.default.info(`🌐 Server URL: ${publicUrl}`);
    logger_1.default.info(`🔗 API Base: ${publicUrl}/api/v2`);
    logger_1.default.info(`💬 WebSocket: ${chatService ? 'Enabled' : 'Disabled (Check Supabase config)'}`);
    logger_1.default.info(`🏥 Health Check: ${publicUrl}/health`);
    logger_1.default.info(`🔧 Binding: 0.0.0.0:${PORT} (Render compatible)`);
    logger_1.default.info(`🏢 Service: Single service (free tier)`);
    logger_1.default.info(`🌍 Frontend URLs: dev.fanclubz.app, app.fanclubz.app`);
});
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT received. Shutting down gracefully...');
    server.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=app.js.map