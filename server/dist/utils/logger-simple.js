"use strict";
/**
 * Simple Logger for Development
 * Fallback when full Winston logger fails
 */
Object.defineProperty(exports, "__esModule", { value: true });
const createSimpleLogger = () => {
    const timestamp = () => new Date().toISOString();
    return {
        info: (message, ...args) => {
            console.log(`[${timestamp()}] INFO: ${message}`, ...args);
        },
        error: (message, ...args) => {
            console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
        },
        warn: (message, ...args) => {
            console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
        },
        debug: (message, ...args) => {
            console.log(`[${timestamp()}] DEBUG: ${message}`, ...args);
        }
    };
};
let logger;
try {
    // Try to import the full Winston logger
    const winston = require('winston');
    const config = require('../config');
    logger = winston.createLogger({
        level: config.default?.logging?.level || 'info',
        format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.colorize(), winston.format.simple())
            })
        ]
    });
}
catch (error) {
    // Fallback to simple logger if Winston fails
    console.warn('⚠️ Winston logger failed to initialize, using simple logger');
    logger = createSimpleLogger();
}
exports.default = logger;
