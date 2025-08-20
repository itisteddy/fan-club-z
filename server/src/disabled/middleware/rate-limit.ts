import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config';
import { ApiUtils } from '../utils/api';
import logger from '../utils/logger';

// Default rate limit
export const defaultRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    
    ApiUtils.error(res, 'Too many requests, please try again later', 429);
  },
});

// Strict rate limit for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    
    ApiUtils.error(res, 'Too many authentication attempts, please try again later', 429);
  },
});

// More lenient rate limit for authenticated users
export const authenticatedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window for authenticated users
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if available, otherwise fall back to IP
    const user = (req as any).user;
    return user ? `user:${user.id}` : req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Authenticated rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    
    ApiUtils.error(res, 'Too many requests, please try again later', 429);
  },
});

// Strict rate limit for prediction creation
export const createPredictionRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 predictions per hour
  message: {
    success: false,
    error: 'Too many predictions created, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `create_prediction:${user.id}` : req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Create prediction rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    ApiUtils.error(res, 'Too many predictions created, please try again later', 429);
  },
});

// Rate limit for wallet operations
export const walletRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 wallet operations per window
  message: {
    success: false,
    error: 'Too many wallet operations, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user ? `wallet:${user.id}` : req.ip;
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Wallet rate limit exceeded', {
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    
    ApiUtils.error(res, 'Too many wallet operations, please try again later', 429);
  },
});
