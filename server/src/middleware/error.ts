import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiUtils } from '../utils/api';
import logger from '../utils/logger';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    ApiUtils.validationError(res, error);
    return;
  }

  // Custom application errors
  if (error.statusCode) {
    ApiUtils.error(res, error.message, error.statusCode, error.details);
    return;
  }

  // Database errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        ApiUtils.error(res, 'Duplicate entry', 409);
        return;
      case '23503': // Foreign key constraint violation
        ApiUtils.error(res, 'Referenced resource not found', 400);
        return;
      case '23502': // Not null constraint violation
        ApiUtils.error(res, 'Missing required field', 400);
        return;
      default:
        logger.error('Database error', { code: error.code, detail: error.detail });
        ApiUtils.error(res, 'Database error', 500);
        return;
    }
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    ApiUtils.error(res, 'Invalid token', 401);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    ApiUtils.error(res, 'Token expired', 401);
    return;
  }

  // Default error
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = isDevelopment ? error.message : 'Internal server error';
  
  ApiUtils.error(res, message, 500);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiUtils.error(res, `Route ${req.originalUrl} not found`, 404);
};

export const validationMiddleware = (schema: any, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[property];
      ApiUtils.validate(schema, data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        ApiUtils.validationError(res, error);
        return;
      }
      next(error);
    }
  };
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
