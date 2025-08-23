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
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
