import { Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '@fanclubz/shared';
import logger from './logger';

export class ApiUtils {
  static success<T>(res: Response, data?: T, message?: string, statusCode: number = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errors?: Record<string, string[]>
  ): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      errors,
    };

    logger.error('API Error', {
      statusCode,
      message,
      errors,
    });

    return res.status(statusCode).json(response);
  }

  static validationError(res: Response, error: ZodError): Response {
    const errors: Record<string, string[]> = {};
    
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(err.message);
    });

    return this.error(res, 'Validation failed', 400, errors);
  }

  static validate<T>(schema: ZodSchema<T>, data: any): T {
    return schema.parse(data);
  }

  static asyncHandler(fn: (req: Request, res: Response, next: Function) => Promise<any>) {
    return (req: Request, res: Response, next: Function) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  static paginate(page: number = 1, limit: number = 20) {
    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(100, Math.max(1, limit));
    const offset = (normalizedPage - 1) * normalizedLimit;

    return {
      page: normalizedPage,
      limit: normalizedLimit,
      offset,
    };
  }

  static generatePaginationResponse(
    data: any[],
    total: number,
    page: number,
    limit: number
  ) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

export const calculateOdds = (totalPool: number, optionStaked: number): number => {
  if (optionStaked === 0 || totalPool === 0) return 1;
  return Math.max(1, totalPool / optionStaked);
};

export const calculatePotentialPayout = (stake: number, odds: number): number => {
  return stake * odds;
};

export const formatCurrency = (amount: number, currency: string = 'NGN'): string => {
  const formatters: Record<string, Intl.NumberFormat> = {
    NGN: new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    USD: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    USDT: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
    ETH: new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    }),
  };

  const formatter = formatters[currency] || formatters.NGN;
  
  if (currency === 'USDT') {
    return `${formatter?.format(amount)} USDT`;
  }
  
  if (currency === 'ETH') {
    return `${formatter?.format(amount)} ETH`;
  }
  
  return formatter?.format(amount) || `${amount} ${currency}`;
};

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const generateUsername = (email: string): string => {
  const baseUsername = email.split('@')[0].toLowerCase();
  const cleanUsername = baseUsername.replace(/[^a-z0-9]/g, '');
  const randomSuffix = Math.floor(Math.random() * 10000);
  
  return `${cleanUsername}${randomSuffix}`;
};

export const isValidDeadline = (deadline: string): boolean => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const minDeadline = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
  
  return deadlineDate > minDeadline;
};

export const validateStakeRange = (stakeMin: number, stakeMax?: number): boolean => {
  if (stakeMin <= 0) return false;
  if (stakeMax && stakeMax <= stakeMin) return false;
  return true;
};

export default ApiUtils;
