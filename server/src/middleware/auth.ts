import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest, JWTPayload } from '../types/auth';
import type { ApiResponse } from '../../../shared/src/types';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    const token = authHeader.substring(7);
    
    // Handle mock authentication in development
    if (process.env.NODE_ENV !== 'production' && token === 'mock-jwt-token-for-development') {
      // Mock user for development
      req.user = {
        id: '1',
        email: 'alex@fanclubz.app',
        username: 'alex',
        first_name: 'Alex',
        last_name: 'Johnson',
        is_active: true,
        is_verified: true,
        kyc_level: 'basic',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      next();
      return;
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      
      // Fetch user from database
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .eq('is_active', true)
        .single();
      
      if (error || !user) {
        logger.warn('User not found or inactive', { userId: decoded.sub });
        const response: ApiResponse = {
          success: false,
          error: 'User not found or inactive',
        };
        res.status(401).json(response);
        return;
      }

      req.user = user;
      next();
    } catch (tokenError) {
      logger.warn('Invalid token attempt', { 
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        token: token.substring(0, 10) + '...' 
      });
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired token',
      };
      res.status(401).json(response);
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error', error);
    const response: ApiResponse = {
      success: false,
      error: 'Authentication error',
    };
    res.status(500).json(response);
    return;
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    // Handle mock authentication in development
    if (process.env.NODE_ENV !== 'production' && token === 'mock-jwt-token-for-development') {
      // Mock user for development
      req.user = {
        id: '1',
        email: 'alex@fanclubz.app',
        username: 'alex',
        first_name: 'Alex',
        last_name: 'Johnson',
        is_active: true,
        is_verified: true,
        kyc_level: 'basic',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      next();
      return;
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.sub)
        .eq('is_active', true)
        .single();
      
      if (!error && user) {
        req.user = user;
      }
    } catch (tokenError) {
      // Ignore token errors for optional auth
      logger.debug('Optional auth token invalid', tokenError);
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', error);
    next();
  }
};

export const requireKYC = (level: 'basic' | 'enhanced' = 'basic') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: 'Authentication required',
      };
      res.status(401).json(response);
      return;
    }

    const userKycLevel = req.user.kyc_level;
    const requiredLevels = level === 'enhanced' ? ['enhanced'] : ['basic', 'enhanced'];

    if (!requiredLevels.includes(userKycLevel)) {
      const response: ApiResponse = {
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

export const requireVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    const response: ApiResponse = {
      success: false,
      error: 'Authentication required',
    };
    res.status(401).json(response);
    return;
  }

  if (!req.user.is_verified) {
    const response: ApiResponse = {
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

export const checkPermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const response: ApiResponse = {
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
        } else {
          const response: ApiResponse = {
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
