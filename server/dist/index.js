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
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.45',
        environment: config_1.config.server.nodeEnv || 'production',
        uptime: process.uptime()
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Fan Club Z API Server',
        version: '2.0.45',
        environment: config_1.config.server.nodeEnv || 'production',
        status: 'running'
    });
});
// API routes placeholder
app.get('/api/v2/predictions', (req, res) => {
    res.json({
        data: [],
        message: 'Predictions endpoint - coming soon',
        version: '2.0.45'
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
    console.log(`📊 Version: 2.0.45`);
});
exports.default = app;
