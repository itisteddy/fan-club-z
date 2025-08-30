"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptionalRequest = exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema, location = 'body') => {
    return (req, res, next) => {
        try {
            let dataToValidate;
            switch (location) {
                case 'query':
                    dataToValidate = { ...req.query };
                    Object.keys(dataToValidate).forEach(key => {
                        const value = dataToValidate[key];
                        if (typeof value === 'string') {
                            if (!isNaN(Number(value)) && value !== '') {
                                dataToValidate[key] = Number(value);
                            }
                        }
                    });
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                default:
                    dataToValidate = req.body;
            }
            const validatedData = schema.parse(dataToValidate);
            switch (location) {
                case 'query':
                    req.query = validatedData;
                    break;
                case 'params':
                    req.params = validatedData;
                    break;
                default:
                    req.body = validatedData;
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errors = {};
                error.errors.forEach((err) => {
                    const path = err.path.join('.');
                    if (!errors[path]) {
                        errors[path] = [];
                    }
                    errors[path].push(err.message);
                });
                const response = {
                    success: false,
                    error: 'Validation failed',
                    errors,
                };
                return res.status(400).json(response);
            }
            const response = {
                success: false,
                error: 'Invalid request data',
            };
            res.status(400).json(response);
        }
    };
};
exports.validateRequest = validateRequest;
const validateOptionalRequest = (schema, location = 'body') => {
    return (req, res, next) => {
        try {
            let dataToValidate;
            switch (location) {
                case 'query':
                    dataToValidate = req.query;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                default:
                    dataToValidate = req.body;
            }
            if (!dataToValidate || Object.keys(dataToValidate).length === 0) {
                return next();
            }
            const validatedData = schema.parse(dataToValidate);
            switch (location) {
                case 'query':
                    req.query = validatedData;
                    break;
                case 'params':
                    req.params = validatedData;
                    break;
                default:
                    req.body = validatedData;
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errors = {};
                error.errors.forEach((err) => {
                    const path = err.path.join('.');
                    if (!errors[path]) {
                        errors[path] = [];
                    }
                    errors[path].push(err.message);
                });
                const response = {
                    success: false,
                    error: 'Validation failed',
                    errors,
                };
                return res.status(400).json(response);
            }
            const response = {
                success: false,
                error: 'Invalid request data',
            };
            res.status(400).json(response);
        }
    };
};
exports.validateOptionalRequest = validateOptionalRequest;
//# sourceMappingURL=validation.js.map