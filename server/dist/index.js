#!/usr/bin/env node
"use strict";
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
console.log(`🚀 Fan Club Z Server v${shared_1.VERSION} - CORS FIXED - WITH SETTLEMENT`);
console.log('📡 Starting server with enhanced CORS support and settlement functionality...');
app.use((0, cors_1.default)({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
    res.sendStatus(200);
});
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        uptime: process.uptime(),
        cors: 'enabled',
        settlement: 'enabled'
    });
});
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: shared_1.VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        status: 'running',
        cors: 'enabled',
        settlement: 'enabled'
    });
});
app.post('/api/v2/admin/seed-database', async (req, res) => {
    try {
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
const users_1 = __importDefault(require("./routes/users"));
const predictions_1 = __importDefault(require("./routes/predictions"));
const prediction_entries_1 = __importDefault(require("./routes/prediction-entries"));
const social_1 = __importDefault(require("./routes/social"));
const settlement_1 = __importDefault(require("./routes/settlement"));
const storage_1 = require("./startup/storage");
app.use('/api/v2/users', users_1.default);
app.use('/api/v2/predictions', predictions_1.default);
app.use('/api/v2/prediction-entries', prediction_entries_1.default);
app.use('/api/v2/social', social_1.default);
app.use('/api/v2/settlement', settlement_1.default);
console.log('✅ Routes registered:');
console.log('  - /api/v2/users');
console.log('  - /api/v2/predictions');
console.log('  - /api/v2/prediction-entries');
console.log('  - /api/v2/social (comments system)');
console.log('  - /api/v2/settlement (manual/auto settlement)');
app.get('/api/v2/test-cors', (req, res) => {
    console.log('🧪 CORS test endpoint called - origin:', req.headers.origin);
    res.json({
        message: 'CORS test successful',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION
    });
});
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.originalUrl} - origin:`, req.headers.origin);
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION
    });
});
app.use((error, req, res, next) => {
    console.error('🚨 Server error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        timestamp: new Date().toISOString(),
        version: shared_1.VERSION
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Fan Club Z Server started successfully!`);
    console.log(`📡 Environment: ${config_1.config.server.nodeEnv || 'production'}`);
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📊 Version: ${shared_1.VERSION}`);
    console.log(`🔗 API URL: ${config_1.config.api.url || `https://fan-club-z.onrender.com`}`);
    console.log(`🎯 Frontend URL: ${config_1.config.frontend.url || 'https://app.fanclubz.app'}`);
    console.log(`✅ CORS enabled for all origins (development mode)`);
    console.log(`🔨 Settlement system enabled`);
    (0, storage_1.ensureAvatarsBucket)();
});
exports.default = app;
//# sourceMappingURL=index.js.map