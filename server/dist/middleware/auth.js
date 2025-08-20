"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.checkPermission = exports.requireVerification = exports.requireKYC = exports.optionalAuth = exports.authenticateToken = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
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
                logger_1.logger.warn('User not found or inactive', { userId: decoded.sub });
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
            logger_1.logger.warn('Invalid token attempt', {
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
        logger_1.logger.error('Authentication middleware error', error);
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
        }
        catch (tokenError) {
            // Ignore token errors for optional auth
            logger_1.logger.debug('Optional auth token invalid', tokenError);
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Optional auth middleware error', error);
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireKYC = (level = 'basic') => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                error: 'Authentication required',
            };
            res.status(401).json(response);
            return;
        }
        const userKycLevel = req.user.kyc_level;
        const requiredLevels = level === 'enhanced' ? ['enhanced'] : ['basic', 'enhanced'];
        if (!requiredLevels.includes(userKycLevel)) {
            const response = {
                success: false,
                error: `KYC ${level} verification required`,
                errors: {
                    kyc_required: [`KYC ${level} verification is required for this action`],
                },
            };
            res.status(403).json(response);
            return;
        }
        next();
    };
};
exports.requireKYC = requireKYC;
const requireVerification = (req, res, next) => {
    if (!req.user) {
        const response = {
            success: false,
            error: 'Authentication required',
        };
        res.status(401).json(response);
        return;
    }
    if (!req.user.is_verified) {
        const response = {
            success: false,
            error: 'Account verification required',
            errors: {
                verification_required: ['Account verification is required for this action'],
            },
        };
        res.status(403).json(response);
        return;
    }
    next();
};
exports.requireVerification = requireVerification;
const checkPermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            const response = {
                success: false,
                error: 'Authentication required',
            };
            res.status(401).json(response);
            return;
        }
        // For now, we'll implement basic permission checking
        // In the future, this can be extended with role-based permissions
        switch (permission) {
            case 'admin':
                // Check if user is admin (implement admin check logic)
                if (req.user.email?.endsWith('@fanclubz.com')) {
                    next();
                }
                else {
                    const response = {
                        success: false,
                        error: 'Admin permission required',
                    };
                    res.status(403).json(response);
                }
                break;
            case 'moderator':
                // Check if user is moderator (implement moderator check logic)
                next(); // For now, allow all authenticated users
                break;
            default:
                next();
        }
    };
};
exports.checkPermission = checkPermission;
exports.authenticate = exports.authenticateToken;
