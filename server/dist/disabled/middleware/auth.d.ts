import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/auth';
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireKYC: (level?: "basic" | "enhanced") => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireVerification: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const checkPermission: (permission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
