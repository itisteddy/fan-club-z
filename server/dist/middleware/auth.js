"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.authenticate = void 0;
const authenticate = (req, res, next) => {
    // For development, we'll create a mock user
    // In production, this would verify JWT tokens from headers
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // In a real implementation, we'd verify the JWT token here
        // For now, we'll create a mock user
        req.user = {
            id: 'current-user',
            email: 'user@example.com',
            username: 'TestUser'
        };
    }
    else {
        // For development, allow unauthenticated requests with a default user
        req.user = {
            id: 'anonymous-user',
            email: 'anonymous@example.com',
            username: 'Anonymous'
        };
    }
    next();
};
exports.authenticate = authenticate;
const requireAuth = (req, res, next) => {
    if (!req.user || req.user.id === 'anonymous-user') {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    return next();
};
exports.requireAuth = requireAuth;
