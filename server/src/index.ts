#!/usr/bin/env node

/**
 * Fan Club Z Server Entry Point
 * Simple working version for deployment
 */

import express from 'express';
import cors from 'cors';
import { config } from './config';

const app = express();
const PORT = config.server.port || 3001;

// Basic middleware
app.use(cors({
  origin: [
    'https://fanclubz.com',
    'https://app.fanclubz.app',
    'https://fan-club-z.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.45',
    environment: config.server.nodeEnv || 'production',
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Fan Club Z API Server',
    version: '2.0.45',
    environment: config.server.nodeEnv || 'production',
    status: 'running'
  });
});

// API routes placeholder
app.get('/api/v2/predictions', (req, res) => {
  res.json({
    data: [],
    message: 'Predictions endpoint - working',
    version: '2.0.45',
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  });
});

// Platform statistics endpoint
app.get('/api/v2/predictions/stats/platform', (req, res) => {
  res.json({
    data: {
      totalPredictions: 0,
      totalUsers: 0,
      totalVolume: 0,
      activePredictions: 0
    },
    message: 'Platform stats - working',
    version: '2.0.45'
  });
});

// Specific prediction endpoint
app.get('/api/v2/predictions/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    data: null,
    message: `Prediction ${id} not found`,
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
  console.log(`📡 Environment: ${config.server.nodeEnv || 'production'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Version: 2.0.45`);
});

export default app;
