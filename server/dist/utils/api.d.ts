import { Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';
export declare class ApiUtils {
    static success<T>(res: Response, data?: T, message?: string, statusCode?: number): Response;
    static error(res: Response, message: string, statusCode?: number, errors?: Record<string, string[]>): Response;
    static validationError(res: Response, error: ZodError): Response;
    static validate<T>(schema: ZodSchema<T>, data: any): T;
    static asyncHandler(fn: (req: Request, res: Response, next: Function) => Promise<any>): (req: Request, res: Response, next: Function) => void;
    static paginate(page?: number, limit?: number): {
        page: number;
        limit: number;
        offset: number;
    };
    static generatePaginationResponse(data: any[], total: number, page: number, limit: number): {
        success: boolean;
        data: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    };
}
export declare const calculateOdds: (totalPool: number, optionStaked: number) => number;
export declare const calculatePotentialPayout: (stake: number, odds: number) => number;
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const slugify: (text: string) => string;
export declare const generateUsername: (email: string) => string;
export declare const isValidDeadline: (deadline: string) => boolean;
export declare const validateStakeRange: (stakeMin: number, stakeMax?: number) => boolean;
export default ApiUtils;
