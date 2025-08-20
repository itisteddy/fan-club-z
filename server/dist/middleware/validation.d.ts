import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const validateRequest: (schema: z.ZodSchema, location?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateOptionalRequest: (schema: z.ZodSchema, location?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
