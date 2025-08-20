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
const database_1 = require("./config/database");
const app = (0, express_1.default)();
const PORT = config_1.config.server.port || 3001;
const VERSION = '2.0.49';
// Enhanced CORS middleware
app.use((0, cors_1.default)({
    origin: [
        'https://fanclubz.com',
        'https://app.fanclubz.app',
        'https://fan-club-z.onrender.com',
        'http://localhost:5173',
        'http://localhost:3000',
        // Vercel preview domains
        /https:\/\/.*\.vercel\.app$/,
        // Render preview domains
        /https:\/\/.*\.onrender\.com$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
app.use(express_1.default.json());
// Handle CORS preflight requests
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        uptime: process.uptime()
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        status: 'running'
    });
});
// Database seeding endpoint (for development/testing)
app.post('/api/v2/admin/seed-database', async (req, res) => {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    try {
        // Import and run seeding function
        const { seedDatabase } = await Promise.resolve().then(() => __importStar(require('./scripts/seedDatabase')));
        const result = await seedDatabase();
        res.json({
            success: true,
            message: 'Database seeded successfully',
            data: result,
            version: VERSION
        });
    }
    catch (error) {
        console.error('Error seeding database:', error);
        res.status(500).json({
            success: false,
            error: 'Database seeding failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            version: VERSION
        });
    }
});
// API routes placeholder
app.get('/api/v2/predictions', async (req, res) => {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    try {
        // Fetch real predictions from Supabase database
        const { data: predictions, error, count } = await database_1.supabase
            .from('predictions')
            .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error('Error fetching predictions:', error);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch predictions',
                version: VERSION
            });
        }
        return res.json({
            data: predictions || [],
            message: 'Predictions endpoint - working',
            version: VERSION,
            pagination: {
                page: 1,
                limit: 20,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / 20),
                hasNext: false,
                hasPrev: false
            }
        });
    }
    catch (error) {
        console.error('Error in predictions endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch predictions',
            version: VERSION
        });
    }
});
// Platform statistics endpoint
app.get('/api/v2/predictions/stats/platform', async (req, res) => {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    try {
        // Fetch real platform statistics from database
        const [predictionsCount, usersCount, activePredictionsCount] = await Promise.all([
            database_1.supabase.from('predictions').select('*', { count: 'exact', head: true }),
            database_1.supabase.from('users').select('*', { count: 'exact', head: true }),
            database_1.supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('status', 'active')
        ]);
        return res.json({
            data: {
                totalPredictions: predictionsCount.count || 0,
                totalUsers: usersCount.count || 0,
                totalVolume: 0, // Will be calculated from prediction entries
                activePredictions: activePredictionsCount.count || 0
            },
            message: 'Platform stats endpoint - working',
            version: VERSION
        });
    }
    catch (error) {
        console.error('Error fetching platform stats:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch platform statistics',
            version: VERSION
        });
    }
});
// Specific prediction endpoint
app.get('/api/v2/predictions/:id', (req, res) => {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', 'https://app.fanclubz.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    const { id } = req.params;
    res.json({
        data: null,
        message: `Prediction ${id} not found`,
        version: VERSION
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
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Fan Club Z Server started successfully!`);
    console.log(`📡 Environment: ${config_1.config.server.nodeEnv || 'production'}`);
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📊 Version: ${VERSION}`);
    console.log(`🔗 API URL: ${config_1.config.api.url || `https://fan-club-z.onrender.com`}`);
    console.log(`🎯 Frontend URL: ${config_1.config.frontend.url || 'https://app.fanclubz.app'}`);
});
exports.default = app;
