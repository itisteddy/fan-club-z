"use strict";
// ============================================================================
// UTILITY TYPES
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = exports.validatePredictionStakeRange = exports.validatePredictionDeadline = exports.getAvatarUrl = exports.generateInitials = exports.isValidPassword = exports.isValidEmail = exports.truncateText = exports.slugify = exports.calculatePotentialPayout = exports.calculateOdds = exports.formatTimeRemaining = exports.formatDate = exports.formatCurrency = void 0;
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
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
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString();
};
exports.formatDate = formatDate;
const formatTimeRemaining = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs <= 0)
        return 'Ended';
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays > 0)
        return `${diffDays}d left`;
    if (diffHours > 0)
        return `${diffHours}h left`;
    if (diffMins > 0)
        return `${diffMins}m left`;
    return 'Ending soon';
};
exports.formatTimeRemaining = formatTimeRemaining;
const calculateOdds = (totalPool, optionStaked) => {
    if (optionStaked === 0)
        return 1;
    return Math.max(1, totalPool / optionStaked);
};
exports.calculateOdds = calculateOdds;
const calculatePotentialPayout = (stake, odds) => {
    return stake * odds;
};
exports.calculatePotentialPayout = calculatePotentialPayout;
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
const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength)
        return text;
    return `${text.substring(0, maxLength)}...`;
};
exports.truncateText = truncateText;
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidPassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.isValidPassword = isValidPassword;
const generateInitials = (name) => {
    if (!name)
        return 'U';
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
};
exports.generateInitials = generateInitials;
const getAvatarUrl = (user) => {
    if (user.avatar_url)
        return user.avatar_url;
    const initials = (0, exports.generateInitials)(user.full_name || user.username);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=00D084&color=fff&size=128`;
};
exports.getAvatarUrl = getAvatarUrl;
// ============================================================================
// VALIDATION HELPERS
// ============================================================================
const validatePredictionDeadline = (deadline) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const minDeadline = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
    return deadlineDate > minDeadline;
};
exports.validatePredictionDeadline = validatePredictionDeadline;
const validatePredictionStakeRange = (stakeMin, stakeMax) => {
    if (stakeMin <= 0)
        return false;
    if (stakeMax && stakeMax <= stakeMin)
        return false;
    return true;
};
exports.validatePredictionStakeRange = validatePredictionStakeRange;
// ============================================================================
// ERROR TYPES
// ============================================================================
class AppError extends Error {
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'AUTHORIZATION_ERROR');
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND_ERROR');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT_ERROR');
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
