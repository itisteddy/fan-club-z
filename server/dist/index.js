#!/usr/bin/env node
"use strict";
/**
 * Fan Club Z Server Entry Point
 * Simple working version for deployment
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const shared_1 = require("@fanclubz/shared");
const app = (0, express_1.default)();
const PORT = config_1.config.server.port || 3001;
console.log(`🚀 Fan Club Z Server v${shared_1.VERSION} - CORS FIXED - SINGLE SOURCE OF TRUTH`);
console.log('📡 Starting server with enhanced CORS support...');
// Enhanced CORS middleware - Allow all origins for now to fix immediate issue
app.use((0, cors_1.default)({
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
// Explicit OPTIONS preflight handler (some hosts require this)
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.sendStatus(200);
});
// Additional CORS headers middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        uptime: process.uptime(),
        cors: 'enabled'
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: shared_1.VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        status: 'running',
        cors: 'enabled'
    });
});
// Database seeding endpoint (for development/testing)
app.post('/api/v2/admin/seed-database', async (req, res) => {
    try {
        // Import and run seeding function
        const { seedDatabase } = await Promise.resolve().then(() => __importStar(require('./scripts/seedDatabase')));
        const result = await seedDatabase();
        res.json({
            success: true,
            message: 'Database seeded successfully',
            data: result,
            version: shared_1.VERSION
        });
    }
    catch (error) {
        console.error('Error seeding database:', error);
        res.status(500).json({
            success: false,
            error: 'Database seeding failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            version: shared_1.VERSION
        });
    }
});
// Import routes
const users_1 = __importDefault(require("./routes/users"));
const predictions_1 = __importDefault(require("./routes/predictions"));
const prediction_entries_1 = __importDefault(require("./routes/prediction-entries"));
const storage_1 = require("./startup/storage");
// Use routes
app.use('/api/v2/users', users_1.default);
app.use('/api/v2/predictions', predictions_1.default);
app.use('/api/v2/prediction-entries', prediction_entries_1.default);
// CORS test endpoint
app.get('/api/v2/test-cors', (req, res) => {
    console.log('🧪 CORS test endpoint called - origin:', req.headers.origin);
    res.json({
        message: 'CORS test successful',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION
    });
});
// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.originalUrl} - origin:`, req.headers.origin);
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION
    });
});
// Error handler
app.use((error, req, res, next) => {
    console.error('🚨 Server error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Fan Club Z Server started successfully!`);
    console.log(`📡 Environment: ${config_1.config.server.nodeEnv || 'production'}`);
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📊 Version: ${shared_1.VERSION}`);
    console.log(`🔗 API URL: ${config_1.config.api.url || `https://fan-club-z.onrender.com`}`);
    console.log(`🎯 Frontend URL: ${config_1.config.frontend.url || 'https://app.fanclubz.app'}`);
    console.log(`✅ CORS enabled for all origins (development mode)`);
    (0, storage_1.ensureAvatarsBucket)();
});
exports.default = app;
