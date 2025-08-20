"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.validationMiddleware = exports.notFoundHandler = exports.errorHandler = void 0;
const zod_1 = require("zod");
const api_1 = require("../utils/api");
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (error, req, res, next) => {
    logger_1.default.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    // Zod validation errors
    if (error instanceof zod_1.ZodError) {
        api_1.ApiUtils.validationError(res, error);
        return;
    }
    // Custom application errors
    if (error.statusCode) {
        api_1.ApiUtils.error(res, error.message, error.statusCode, error.details);
        return;
    }
    // Database errors
    if (error.code) {
        switch (error.code) {
            case '23505': // Unique constraint violation
                api_1.ApiUtils.error(res, 'Duplicate entry', 409);
                return;
            case '23503': // Foreign key constraint violation
                api_1.ApiUtils.error(res, 'Referenced resource not found', 400);
                return;
            case '23502': // Not null constraint violation
                api_1.ApiUtils.error(res, 'Missing required field', 400);
                return;
            default:
                logger_1.default.error('Database error', { code: error.code, detail: error.detail });
                api_1.ApiUtils.error(res, 'Database error', 500);
                return;
        }
    }
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        api_1.ApiUtils.error(res, 'Invalid token', 401);
        return;
    }
    if (error.name === 'TokenExpiredError') {
        api_1.ApiUtils.error(res, 'Token expired', 401);
        return;
    }
    // Default error
    const isDevelopment = process.env.NODE_ENV === 'development';
    const message = isDevelopment ? error.message : 'Internal server error';
    api_1.ApiUtils.error(res, message, 500);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    api_1.ApiUtils.error(res, `Route ${req.originalUrl} not found`, 404);
};
exports.notFoundHandler = notFoundHandler;
const validationMiddleware = (schema, property = 'body') => {
    return (req, res, next) => {
        try {
            const data = req[property];
            api_1.ApiUtils.validate(schema, data);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                api_1.ApiUtils.validationError(res, error);
                return;
            }
            next(error);
        }
    };
};
exports.validationMiddleware = validationMiddleware;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
