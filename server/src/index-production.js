#!/usr/bin/env node

/**
 * Fan Club Z Production Server Entry Point
 * Production optimized startup with WebSocket support
 */

// Load TypeScript runtime for production
require('tsx/cjs');

// Import the main application
require('./app.ts');