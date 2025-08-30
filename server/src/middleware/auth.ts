import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';
import type { ApiResponse } from '@fanclubz/shared';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username?: string;
    full_name?: string;
    is_verified?: boolean;
    reputation_score?: number;
    created_at?: string;
    updated_at?: string;
  };
}

interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

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
      
      next();
    } catch (tokenError) {
      // For optional auth, we just continue without setting user
      next();
    }
  } catch (error) {
    logger.error('Optional auth middleware error', error);
    next();
  }
};

// Legacy functions for backward compatibility
export const authenticate = authenticateToken;

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  return next();
};
