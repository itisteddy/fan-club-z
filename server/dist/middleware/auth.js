"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.authenticate = exports.optionalAuth = exports.authenticateToken = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
const supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.serviceRoleKey);
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            const response = {
                success: false,
                error: 'Authentication required',
            };
            res.status(401).json(response);
            return;
        }
        const token = authHeader.substring(7);
        try {
            // Verify JWT token
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            // Fetch user from database
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.sub)
                .eq('is_active', true)
                .single();
            if (error || !user) {
                logger_1.default.warn('User not found or inactive', { userId: decoded.sub });
                const response = {
                    success: false,
                    error: 'User not found or inactive',
                };
                res.status(401).json(response);
                return;
            }
            req.user = user;
            next();
        }
        catch (tokenError) {
            logger_1.default.warn('Invalid token attempt', {
                error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
                token: token.substring(0, 10) + '...'
            });
            const response = {
                success: false,
                error: 'Invalid or expired token',
            };
            res.status(401).json(response);
            return;
        }
    }
    catch (error) {
        logger_1.default.error('Authentication middleware error', error);
        const response = {
            success: false,
            error: 'Authentication error',
        };
        res.status(500).json(response);
        return;
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.sub)
                .eq('is_active', true)
                .single();
            if (!error && user) {
                req.user = user;
            }
            next();
        }
        catch (tokenError) {
            // For optional auth, we just continue without setting user
            next();
        }
    }
    catch (error) {
        logger_1.default.error('Optional auth middleware error', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Legacy functions for backward compatibility
exports.authenticate = exports.authenticateToken;
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    return next();
};
exports.requireAuth = requireAuth;
