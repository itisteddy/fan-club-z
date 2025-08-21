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
const VERSION = '2.0.53';
console.log('🚀 Fan Club Z Server v2.0.53 - CORS FIXED - SINGLE SOURCE OF TRUTH');
console.log('📡 Starting server with enhanced CORS support...');
// Enhanced CORS middleware - Allow all origins for now to fix immediate issue
app.use((0, cors_1.default)({
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));
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
        version: VERSION,
        environment: config_1.config.server.nodeEnv || 'production',
        uptime: process.uptime(),
        cors: 'enabled'
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: VERSION,
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
// Import routes
const users_1 = __importDefault(require("./routes/users"));
// Use routes
app.use('/api/v2/users', users_1.default);
// API routes placeholder
app.get('/api/v2/predictions', async (req, res) => {
    console.log('📡 Predictions endpoint called - origin:', req.headers.origin);
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
                version: VERSION,
                details: error.message
            });
        }
        console.log(`✅ Successfully fetched ${predictions?.length || 0} predictions`);
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
            version: VERSION,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Platform statistics endpoint
app.get('/api/v2/predictions/stats/platform', async (req, res) => {
    console.log('📊 Platform stats endpoint called - origin:', req.headers.origin);
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
            version: VERSION,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Trending predictions endpoint
app.get('/api/v2/predictions/trending', async (req, res) => {
    console.log('🔥 Trending predictions endpoint called - origin:', req.headers.origin);
    try {
        // For now, return the same as regular predictions but ordered by activity
        const { data: predictions, error } = await database_1.supabase
            .from('predictions')
            .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
            .eq('status', 'active')
            .order('participant_count', { ascending: false })
            .limit(10);
        if (error) {
            console.error('Error fetching trending predictions:', error);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch trending predictions',
                version: VERSION,
                details: error.message
            });
        }
        console.log(`✅ Successfully fetched ${predictions?.length || 0} trending predictions`);
        return res.json({
            data: predictions || [],
            message: 'Trending predictions endpoint - working',
            version: VERSION
        });
    }
    catch (error) {
        console.error('Error in trending predictions endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch trending predictions',
            version: VERSION,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Specific prediction endpoint
app.get('/api/v2/predictions/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Specific prediction endpoint called for ID: ${id} - origin:`, req.headers.origin);
    try {
        const { data: prediction, error } = await database_1.supabase
            .from('predictions')
            .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
            .eq('id', id)
            .single();
        if (error) {
            console.error(`Error fetching prediction ${id}:`, error);
            return res.status(404).json({
                error: 'Not found',
                message: `Prediction ${id} not found`,
                version: VERSION,
                details: error.message
            });
        }
        return res.json({
            data: prediction,
            message: 'Prediction fetched successfully',
            version: VERSION
        });
    }
    catch (error) {
        console.error(`Error in specific prediction endpoint for ${id}:`, error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch prediction',
            version: VERSION,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Platform stats endpoint
app.get('/api/v2/predictions/stats/platform', async (req, res) => {
    console.log('📊 Platform stats endpoint called - origin:', req.headers.origin);
    try {
        // Get total volume from predictions
        const { data: volumeData, error: volumeError } = await database_1.supabase
            .from('predictions')
            .select('pool_total')
            .eq('status', 'open');
        if (volumeError) {
            console.error('Error fetching volume data:', volumeError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch volume data',
                version: VERSION
            });
        }
        // Get active predictions count
        const { count: activeCount, error: countError } = await database_1.supabase
            .from('predictions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
        if (countError) {
            console.error('Error fetching active predictions count:', countError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch active predictions count',
                version: VERSION
            });
        }
        // Get total users count
        const { count: userCount, error: userError } = await database_1.supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        if (userError) {
            console.error('Error fetching user count:', userError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch user count',
                version: VERSION
            });
        }
        // Calculate total volume
        const totalVolume = volumeData?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 0;
        const stats = {
            totalVolume: totalVolume.toFixed(2),
            activePredictions: activeCount || 0,
            totalUsers: userCount || 0,
            rawVolume: totalVolume,
            rawUsers: userCount || 0
        };
        console.log('✅ Platform stats calculated:', stats);
        return res.json({
            success: true,
            data: stats,
            message: 'Platform stats fetched successfully',
            version: VERSION
        });
    }
    catch (error) {
        console.error('Error in platform stats endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch platform stats',
            version: VERSION,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// CORS test endpoint
app.get('/api/v2/test-cors', (req, res) => {
    console.log('🧪 CORS test endpoint called - origin:', req.headers.origin);
    res.json({
        message: 'CORS test successful',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        version: VERSION
    });
});
// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.originalUrl} - origin:`, req.headers.origin);
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        version: VERSION
    });
});
// Error handler
app.use((error, req, res, next) => {
    console.error('🚨 Server error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        timestamp: new Date().toISOString(),
        version: VERSION
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
    console.log(`✅ CORS enabled for all origins (development mode)`);
});
exports.default = app;
