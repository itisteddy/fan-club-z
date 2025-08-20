"use strict";
/**
 * Fan Club Z Express Application
 * Main application setup with middleware, routes, and error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const logger_simple_1 = require("./utils/logger-simple");
const error_1 = require("./middleware/error");
const validation_1 = require("./middleware/validation");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const predictions_1 = __importDefault(require("./routes/predictions"));
const social_1 = __importDefault(require("./routes/social"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const users_1 = __importDefault(require("./routes/users"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.supabase.co", "wss:", "ws:"],
        },
    },
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: [
        config_1.config.frontend.url,
        'https://fanclubz.com',
        'https://app.fanclubz.app',
        'https://fan-club-z.onrender.com',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Compression middleware
app.use((0, compression_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)(config_1.config.rateLimit);
app.use('/api/', limiter);
// Logging middleware
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger_simple_1.logger.info(message.trim())
    }
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '2.0.45',
        environment: config_1.config.server.nodeEnv,
        uptime: process.uptime()
    });
});
// API version prefix
const apiPrefix = `/api/${config_1.config.api.version}`;
// Routes
app.use(`${apiPrefix}/auth`, auth_1.default);
app.use(`${apiPrefix}/predictions`, predictions_1.default);
app.use(`${apiPrefix}/social`, social_1.default);
app.use(`${apiPrefix}/wallet`, wallet_1.default);
app.use(`${apiPrefix}/users`, users_1.default);
app.use(`${apiPrefix}/clubs`, clubs_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: process.env.npm_package_version || '2.0.45',
        environment: config_1.config.server.nodeEnv,
        documentation: `${config_1.config.api.url}/docs`,
        health: `${config_1.config.api.url}/health`
    });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use(validation_1.validationErrorHandler);
app.use(error_1.errorHandler);
exports.default = app;
