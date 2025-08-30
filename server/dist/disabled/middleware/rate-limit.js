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
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
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
exports.authenticatedRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: {
        success: false,
        error: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
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
exports.createPredictionRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
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
exports.walletRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
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
//# sourceMappingURL=rate-limit.js.map