"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStakeRange = exports.isValidDeadline = exports.generateUsername = exports.slugify = exports.formatCurrency = exports.calculatePotentialPayout = exports.calculateOdds = exports.ApiUtils = void 0;
const logger_1 = __importDefault(require("./logger"));
class ApiUtils {
    static success(res, data, message, statusCode = 200) {
        const response = {
            success: true,
            message,
            data,
        };
        return res.status(statusCode).json(response);
    }
    static error(res, message, statusCode = 500, errors) {
        const response = {
            success: false,
            error: message,
            errors,
        };
        logger_1.default.error('API Error', {
            statusCode,
            message,
            errors,
        });
        return res.status(statusCode).json(response);
    }
    static validationError(res, error) {
        const errors = {};
        error.errors.forEach((err) => {
            const path = err.path.join('.');
            if (!errors[path]) {
                errors[path] = [];
            }
            errors[path].push(err.message);
        });
        return this.error(res, 'Validation failed', 400, errors);
    }
    static validate(schema, data) {
        return schema.parse(data);
    }
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
    static paginate(page = 1, limit = 20) {
        const normalizedPage = Math.max(1, page);
        const normalizedLimit = Math.min(100, Math.max(1, limit));
        const offset = (normalizedPage - 1) * normalizedLimit;
        return {
            page: normalizedPage,
            limit: normalizedLimit,
            offset,
        };
    }
    static generatePaginationResponse(data, total, page, limit) {
        const totalPages = Math.ceil(total / limit);
        return {
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        };
    }
}
exports.ApiUtils = ApiUtils;
const calculateOdds = (totalPool, optionStaked) => {
    if (optionStaked === 0 || totalPool === 0)
        return 1;
    return Math.max(1, totalPool / optionStaked);
};
exports.calculateOdds = calculateOdds;
const calculatePotentialPayout = (stake, odds) => {
    return stake * odds;
};
exports.calculatePotentialPayout = calculatePotentialPayout;
const formatCurrency = (amount, currency = 'NGN') => {
    const formatters = {
        NGN: new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }),
        USD: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }),
        USDT: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
        }),
        ETH: new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 8,
        }),
    };
    const formatter = formatters[currency] || formatters.NGN;
    if (currency === 'USDT') {
        return `${formatter?.format(amount)} USDT`;
    }
    if (currency === 'ETH') {
        return `${formatter?.format(amount)} ETH`;
    }
    return formatter?.format(amount) || `${amount} ${currency}`;
};
exports.formatCurrency = formatCurrency;
const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};
exports.slugify = slugify;
const generateUsername = (email) => {
    const baseUsername = email.split('@')[0].toLowerCase();
    const cleanUsername = baseUsername.replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(Math.random() * 10000);
    return `${cleanUsername}${randomSuffix}`;
};
exports.generateUsername = generateUsername;
const isValidDeadline = (deadline) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const minDeadline = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    return deadlineDate > minDeadline;
};
exports.isValidDeadline = isValidDeadline;
const validateStakeRange = (stakeMin, stakeMax) => {
    if (stakeMin <= 0)
        return false;
    if (stakeMax && stakeMax <= stakeMin)
        return false;
    return true;
};
exports.validateStakeRange = validateStakeRange;
exports.default = ApiUtils;
