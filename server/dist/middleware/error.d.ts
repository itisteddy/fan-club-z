import { Request, Response, NextFunction } from 'express';
export declare const errorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const validationMiddleware: (schema: any, property?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
