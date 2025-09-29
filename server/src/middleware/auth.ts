import { Request, Response, NextFunction } from 'express';

/**
 * Simple authentication middleware for Fan Club Z
 * In development, this allows all requests through
 * In production, this would verify JWT tokens
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username?: string;
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  } else {
    // For development, allow unauthenticated requests with a default user
    req.user = {
      id: 'anonymous-user',
      email: 'anonymous@example.com',
      username: 'Anonymous'
    };
  }
  
  next();
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.id === 'anonymous-user') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  return next();
};
