"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const logger_1 = __importDefault(require("./logger"));
class ErrorHandler {
    static handleDatabaseError(error, res, context) {
        logger_1.default.error(`Database error in ${context}:`, error);
        const response = {
            success: false,
            error: 'Database operation failed'
        };
        res.status(500).json(response);
    }
    static handleAuthError(res, message = 'Authentication required') {
        const response = {
            success: false,
            error: message
        };
        res.status(401).json(response);
    }
    static returnEmptyData(res, dataType) {
        const response = {
            success: true,
            data: []
        };
        logger_1.default.info(`Returning empty ${dataType} data`);
        res.json(response);
    }
}
exports.ErrorHandler = ErrorHandler;
