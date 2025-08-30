"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRateLimit = exports.createPredictionRateLimit = exports.authenticatedRateLimit = exports.authRateLimit = exports.defaultRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("../config"));
const api_1 = require("../utils/api");
const logger_1 = __importDefault(require("../utils/logger"));
// Default rate limit
exports.defaultRateLimit = (0, express_rate_limit_1.default)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.default.warn('Rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
        });
        api_1.ApiUtils.error(res, 'Too many requests, please try again later', 429);
    },
});
// Strict rate limit for auth endpoints
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_1.default.warn('Auth rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
        });
        api_1.ApiUtils.error(res, 'Too many authentication attempts, please try again later', 429);
    },
});
// More lenient rate limit for authenticated users
exports.authenticatedRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window for authenticated users
    message: {
        success: false,
        error: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID if available, otherwise fall back to IP
        const user = req.user;
        return user ? `user:${user.id}` : req.ip;
    },
    handler: (req, res) => {
        logger_1.default.warn('Authenticated rate limit exceeded', {
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
        });
        api_1.ApiUtils.error(res, 'Too many requests, please try again later', 429);
    },
});
// Strict rate limit for prediction creation
exports.createPredictionRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 predictions per hour
    message: {
        success: false,
        error: 'Too many predictions created, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const user = req.user;
        return user ? `create_prediction:${user.id}` : req.ip;
    },
    handler: (req, res) => {
        logger_1.default.warn('Create prediction rate limit exceeded', {
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        api_1.ApiUtils.error(res, 'Too many predictions created, please try again later', 429);
    },
});
// Rate limit for wallet operations
exports.walletRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 wallet operations per window
    message: {
        success: false,
        error: 'Too many wallet operations, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const user = req.user;
        return user ? `wallet:${user.id}` : req.ip;
    },
    handler: (req, res) => {
        logger_1.default.warn('Wallet rate limit exceeded', {
            userId: req.user?.id,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.url,
        });
        api_1.ApiUtils.error(res, 'Too many wallet operations, please try again later', 429);
    },
});
