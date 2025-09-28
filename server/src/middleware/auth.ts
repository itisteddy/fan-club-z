import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

// Extend the Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url?: string;
        is_verified?: boolean;
      };
    }
  }
}

// Simple auth middleware that tries to get user from token, but doesn't require it
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // Try to verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          // Get user profile from the users table
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id, username, full_name, avatar_url, is_verified')
            .eq('id', user.id)
            .single();
          
          if (!profileError && profile) {
            req.user = profile;
          } else {
            // Fallback to minimal user info from auth
            req.user = {
              id: user.id,
              username: user.email?.split('@')[0] || 'user',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              avatar_url: user.user_metadata?.avatar_url,
              is_verified: false
            };
          }
        }
      } catch (tokenError) {
        // Token is invalid, but we continue without user (optional auth)
        console.log('Invalid token provided, continuing without auth');
      }
    }
    
    // If no user found from token, create a demo user for development
    if (!req.user) {
      req.user = {
        id: 'demo-user',
        username: 'demo_user',
        full_name: 'Demo User',
        avatar_url: null,
        is_verified: false
      };
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Continue without user in case of error (optional auth)
    req.user = {
      id: 'demo-user',
      username: 'demo_user', 
      full_name: 'Demo User',
      avatar_url: null,
      is_verified: false
    };
    next();
  }
};

// Required auth middleware - returns 401 if no valid user
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing or invalid'
      });
    }
    
    const token = authHeader.substring(7);
    
    // Try to verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Get user profile from the users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, is_verified')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      // Fallback to minimal user info from auth
      req.user = {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url,
        is_verified: false
      };
    } else {
      req.user = profile;
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};
