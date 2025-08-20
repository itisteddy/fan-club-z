import { Response } from 'express';
export declare class ErrorHandler {
    static handleDatabaseError(error: any, res: Response, context: string): void;
    static handleAuthError(res: Response, message?: string): void;
    static returnEmptyData(res: Response, dataType: string): void;
}
