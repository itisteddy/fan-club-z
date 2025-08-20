#!/usr/bin/env node
"use strict";
/**
 * Fan Club Z Server Entry Point
 * Simple working version for deployment
 */
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
// Basic middleware
app.use((0, cors_1.default)({
    origin: [
        'https://fanclubz.com',
        'https://app.fanclubz.app',
        'https://fan-club-z.onrender.com',
        'http://localhost:5173',
        'http://localhost:3000'
    ],
    credentials: true
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
        version: process.env.npm_package_version || '2.0.46',
        environment: config_1.config.server.nodeEnv || 'production',
        uptime: process.uptime()
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: process.env.npm_package_version || '2.0.46',
        environment: config_1.config.server.nodeEnv || 'production',
        status: 'running'
    });
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
                version: process.env.npm_package_version || '2.0.46'
            });
        }
        res.json({
            data: predictions || [],
            message: 'Predictions fetched from database',
            version: process.env.npm_package_version || '2.0.46',
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
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch predictions',
            version: process.env.npm_package_version || '2.0.46'
        });
    }
});
hasNext: false,
    hasPrev;
false;
;
;
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
        res.json({
            data: {
                totalPredictions: predictionsCount.count || 0,
                totalUsers: usersCount.count || 0,
                totalVolume: 0, // Will be calculated from prediction entries
                activePredictions: activePredictionsCount.count || 0
            },
            message: 'Platform stats fetched from database',
            version: process.env.npm_package_version || '2.0.46'
        });
    }
    catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch platform statistics',
            version: process.env.npm_package_version || '2.0.46'
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
        version: process.env.npm_package_version || '2.0.46'
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
    console.log(`📊 Version: ${process.env.npm_package_version || '2.0.46'}`);
    console.log(`🔗 API URL: ${config_1.config.api.url || `https://fan-club-z.onrender.com`}`);
    console.log(`🎯 Frontend URL: ${config_1.config.frontend.url || 'https://app.fanclubz.app'}`);
});
exports.default = app;
