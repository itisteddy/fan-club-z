import { Response } from 'express';
import { ApiResponse } from '@fanclubz/shared';
import logger from './logger';

export class ErrorHandler {
  static handleDatabaseError(error: any, res: Response, context: string): void {
    logger.error(`Database error in ${context}:`, error);
    const response: ApiResponse = {
      success: false,
      error: 'Database operation failed'
    };
    res.status(500).json(response);
  }

  static handleAuthError(res: Response, message: string = 'Authentication required'): void {
    const response: ApiResponse = {
      success: false,
      error: message
    };
    res.status(401).json(response);
  }

  static returnEmptyData(res: Response, dataType: string): void {
    const response: ApiResponse = {
      success: true,
      data: []
    };
    logger.info(`Returning empty ${dataType} data`);
    res.json(response);
  }
}
