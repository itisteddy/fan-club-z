"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shared_1 = require("@fanclubz/shared");
const auth_1 = require("../middleware/auth");
const error_1 = require("../middleware/error");
const rate_limit_1 = require("../middleware/rate-limit");
const auth_2 = require("../utils/auth");
const api_1 = require("../utils/api");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.use(rate_limit_1.authRateLimit);
router.post('/register', (0, error_1.validationMiddleware)(shared_1.RegisterUserSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const { email, password, phone, username, full_name, auth_provider } = req.body;
    const existingUser = await database_1.db.users.findByEmail(email);
    if (existingUser) {
        return api_1.ApiUtils.error(res, 'User already exists with this email', 409);
    }
    const hashedPassword = await auth_2.AuthUtils.hashPassword(password);
    const finalUsername = username || (0, api_1.generateUsername)(email);
    const userData = {
        id: auth_2.AuthUtils.generateSecureId(),
        email,
        password_hash: hashedPassword,
        phone: phone || null,
        username: finalUsername,
        full_name: full_name || null,
        auth_provider: auth_provider || 'email',
        kyc_level: 'none',
        kyc_status: 'pending',
        two_fa_enabled: false,
        reputation_score: 0,
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    const user = await database_1.db.users.create(userData);
    await database_1.db.wallets.createOrUpdate(user.id, 'NGN', {
        id: auth_2.AuthUtils.generateSecureId(),
        available_balance: 0,
        reserved_balance: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        created_at: new Date().toISOString(),
    });
    const tokens = auth_2.AuthUtils.generateTokens({
        userId: user.id,
        email: user.email,
    });
    const { password_hash, ...userResponse } = user;
    logger_1.default.info('User registered successfully', { userId: user.id, email: user.email });
    return api_1.ApiUtils.success(res, {
        user: userResponse,
        tokens,
    }, 'Registration successful', 201);
}));
router.post('/login', (0, error_1.validationMiddleware)(shared_1.LoginUserSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await database_1.db.users.findByEmail(email);
    if (!user) {
        return api_1.ApiUtils.error(res, 'Invalid email or password', 401);
    }
    if (!user.is_active) {
        return api_1.ApiUtils.error(res, 'Account is deactivated', 403);
    }
    const isPasswordValid = await auth_2.AuthUtils.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
        return api_1.ApiUtils.error(res, 'Invalid email or password', 401);
    }
    const tokens = auth_2.AuthUtils.generateTokens({
        userId: user.id,
        email: user.email,
    });
    const { password_hash, ...userResponse } = user;
    logger_1.default.info('User logged in successfully', { userId: user.id, email: user.email });
    return api_1.ApiUtils.success(res, {
        user: userResponse,
        tokens,
    }, 'Login successful');
}));
router.post('/refresh', (0, error_1.asyncHandler)(async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        return api_1.ApiUtils.error(res, 'Refresh token is required', 400);
    }
    try {
        const decoded = auth_2.AuthUtils.verifyToken(refresh_token);
        const user = await database_1.db.users.findById(decoded.userId);
        if (!user || !user.is_active) {
            return api_1.ApiUtils.error(res, 'User not found or inactive', 401);
        }
        const tokens = auth_2.AuthUtils.generateTokens({
            userId: user.id,
            email: user.email,
        });
        return api_1.ApiUtils.success(res, { tokens }, 'Token refreshed successfully');
    }
    catch (error) {
        return api_1.ApiUtils.error(res, 'Invalid refresh token', 401);
    }
}));
router.get('/me', auth_1.authenticate, (0, error_1.asyncHandler)(async (req, res) => {
    const user = await database_1.db.users.findById(req.user.id);
    if (!user) {
        return api_1.ApiUtils.error(res, 'User not found', 404);
    }
    const { password_hash, ...userResponse } = user;
    return api_1.ApiUtils.success(res, userResponse);
}));
router.put('/me', auth_1.authenticate, (0, error_1.validationMiddleware)(shared_1.UpdateUserSchema), (0, error_1.asyncHandler)(async (req, res) => {
    const updates = req.body;
    const userId = req.user.id;
    const updatedUser = await database_1.db.users.update(userId, updates);
    const { password_hash, ...userResponse } = updatedUser;
    logger_1.default.info('User profile updated', { userId, updates: Object.keys(updates) });
    return api_1.ApiUtils.success(res, userResponse, 'Profile updated successfully');
}));
router.put('/change-password', auth_1.authenticate, (0, error_1.validationMiddleware)(shared_1.RegisterUserSchema.pick({ password: true }).extend({
    current_password: shared_1.RegisterUserSchema.shape.password,
    new_password: shared_1.RegisterUserSchema.shape.password,
})), (0, error_1.asyncHandler)(async (req, res) => {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;
    const user = await database_1.db.users.findById(userId);
    if (!user) {
        return api_1.ApiUtils.error(res, 'User not found', 404);
    }
    const isCurrentPasswordValid = await auth_2.AuthUtils.comparePassword(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
        return api_1.ApiUtils.error(res, 'Current password is incorrect', 400);
    }
    const hashedNewPassword = await auth_2.AuthUtils.hashPassword(new_password);
    await database_1.db.users.update(userId, {
        password_hash: hashedNewPassword,
    });
    logger_1.default.info('User password changed', { userId });
    return api_1.ApiUtils.success(res, null, 'Password changed successfully');
}));
router.post('/logout', auth_1.authenticate, (0, error_1.asyncHandler)(async (req, res) => {
    logger_1.default.info('User logged out', { userId: req.user.id });
    return api_1.ApiUtils.success(res, null, 'Logged out successfully');
}));
exports.default = router;
//# sourceMappingURL=auth.js.map