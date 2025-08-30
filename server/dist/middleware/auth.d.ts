import { Request, Response, NextFunction } from 'express';
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
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
