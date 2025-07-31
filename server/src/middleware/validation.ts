import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '../../../shared/src/types';

export const validateRequest = (schema: z.ZodSchema, location: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let dataToValidate;
      
      switch (location) {
        case 'query':
          // Convert query string values to appropriate types
          dataToValidate = { ...req.query };
          
          // Convert numeric query parameters
          Object.keys(dataToValidate).forEach(key => {
            const value = dataToValidate[key];
            if (typeof value === 'string') {
              // Try to convert to number if it looks like a number
              if (!isNaN(Number(value)) && value !== '') {
                dataToValidate[key] = Number(value);
              }
            }
          });
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }
      
      const validatedData = schema.parse(dataToValidate);
      
      // Replace the original data with validated data
      switch (location) {
        case 'query':
          req.query = validatedData as any;
          break;
        case 'params':
          req.params = validatedData as any;
          break;
        default:
          req.body = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });
        
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          errors,
        };
        
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid request data',
      };
      
      res.status(400).json(response);
    }
  };
};

export const validateOptionalRequest = (schema: z.ZodSchema, location: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let dataToValidate;
      
      switch (location) {
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }
      
      // If no data provided, skip validation
      if (!dataToValidate || Object.keys(dataToValidate).length === 0) {
        return next();
      }
      
      const validatedData = schema.partial().parse(dataToValidate);
      
      // Replace the original data with validated data
      switch (location) {
        case 'query':
          req.query = validatedData as any;
          break;
        case 'params':
          req.params = validatedData as any;
          break;
        default:
          req.body = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(err.message);
        });
        
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          errors,
        };
        
        return res.status(400).json(response);
      }
      
      const response: ApiResponse = {
        success: false,
        error: 'Invalid request data',
      };
      
      res.status(400).json(response);
    }
  };
};
