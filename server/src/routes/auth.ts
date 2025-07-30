import { Router, Response } from 'express';
import { 
  RegisterUserSchema, 
  LoginUserSchema,
  UpdateUserSchema,
} from '@fanclubz/shared';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { validationMiddleware, asyncHandler } from '../middleware/error';
import { authRateLimit } from '../middleware/rate-limit';
import { AuthUtils } from '../utils/auth';
import { ApiUtils, generateUsername } from '../utils/api';
import { db } from '../config/database';
import logger from '../utils/logger';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Register new user
router.post(
  '/register',
  validationMiddleware(RegisterUserSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password, phone, username, full_name, auth_provider } = req.body;

    // Check if user already exists
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return ApiUtils.error(res, 'User already exists with this email', 409);
    }

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(password);

    // Generate username if not provided
    const finalUsername = username || generateUsername(email);

    // Create user
    const userData = {
      id: AuthUtils.generateSecureId(),
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

    const user = await db.users.create(userData);

    // Create default wallet
    await db.wallets.createOrUpdate(user.id, 'NGN', {
      id: AuthUtils.generateSecureId(),
      available_balance: 0,
      reserved_balance: 0,
      total_deposited: 0,
      total_withdrawn: 0,
      created_at: new Date().toISOString(),
    });

    // Generate tokens
    const tokens = AuthUtils.generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Remove sensitive data
    const { password_hash, ...userResponse } = user;

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return ApiUtils.success(res, {
      user: userResponse,
      tokens,
    }, 'Registration successful', 201);
  })
);

// Login user
router.post(
  '/login',
  validationMiddleware(LoginUserSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await db.users.findByEmail(email);
    if (!user) {
      return ApiUtils.error(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.is_active) {
      return ApiUtils.error(res, 'Account is deactivated', 403);
    }

    // Verify password
    const isPasswordValid = await AuthUtils.comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return ApiUtils.error(res, 'Invalid email or password', 401);
    }

    // Generate tokens
    const tokens = AuthUtils.generateTokens({
      userId: user.id,
      email: user.email,
    });

    // Remove sensitive data
    const { password_hash, ...userResponse } = user;

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return ApiUtils.success(res, {
      user: userResponse,
      tokens,
    }, 'Login successful');
  })
);

// Refresh token
router.post(
  '/refresh',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return ApiUtils.error(res, 'Refresh token is required', 400);
    }

    try {
      const decoded = AuthUtils.verifyToken(refresh_token);
      
      // Verify user still exists and is active
      const user = await db.users.findById(decoded.userId);
      if (!user || !user.is_active) {
        return ApiUtils.error(res, 'User not found or inactive', 401);
      }

      // Generate new tokens
      const tokens = AuthUtils.generateTokens({
        userId: user.id,
        email: user.email,
      });

      return ApiUtils.success(res, { tokens }, 'Token refreshed successfully');
    } catch (error) {
      return ApiUtils.error(res, 'Invalid refresh token', 401);
    }
  })
);

// Get current user profile
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await db.users.findById(req.user!.id);
    
    if (!user) {
      return ApiUtils.error(res, 'User not found', 404);
    }

    // Remove sensitive data
    const { password_hash, ...userResponse } = user;

    return ApiUtils.success(res, userResponse);
  })
);

// Update user profile
router.put(
  '/me',
  authenticate,
  validationMiddleware(UpdateUserSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const updates = req.body;
    const userId = req.user!.id;

    // Update user
    const updatedUser = await db.users.update(userId, updates);

    // Remove sensitive data
    const { password_hash, ...userResponse } = updatedUser;

    logger.info('User profile updated', { userId, updates: Object.keys(updates) });

    return ApiUtils.success(res, userResponse, 'Profile updated successfully');
  })
);

// Change password
router.put(
  '/change-password',
  authenticate,
  validationMiddleware(RegisterUserSchema.pick({ password: true }).extend({
    current_password: RegisterUserSchema.shape.password,
    new_password: RegisterUserSchema.shape.password,
  })),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { current_password, new_password } = req.body;
    const userId = req.user!.id;

    // Get current user with password
    const user = await db.users.findById(userId);
    if (!user) {
      return ApiUtils.error(res, 'User not found', 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthUtils.comparePassword(
      current_password,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      return ApiUtils.error(res, 'Current password is incorrect', 400);
    }

    // Hash new password
    const hashedNewPassword = await AuthUtils.hashPassword(new_password);

    // Update password
    await db.users.update(userId, {
      password_hash: hashedNewPassword,
    });

    logger.info('User password changed', { userId });

    return ApiUtils.success(res, null, 'Password changed successfully');
  })
);

// Logout (client should handle token cleanup)
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // In a more advanced implementation, we might invalidate the token
    // For now, we'll just return success as client handles token cleanup
    
    logger.info('User logged out', { userId: req.user!.id });
    
    return ApiUtils.success(res, null, 'Logged out successfully');
  })
);

export default router;
