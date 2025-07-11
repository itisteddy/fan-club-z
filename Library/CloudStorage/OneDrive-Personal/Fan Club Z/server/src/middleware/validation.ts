import { body, param, query, validationResult, ValidationChain } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

// Generic validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    // Log errors for debugging
    console.error('Validation errors:', errors.array())
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    })
  }
  next()
}

// User registration validation
export const validateRegistration: ValidationChain[] = [
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Must be a valid phone number'),
  
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Must be a valid date')
    .custom((value) => {
      const birthDate = new Date(value)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        if (age - 1 < 18) {
          throw new Error('You must be at least 18 years old')
        }
      } else {
        if (age < 18) {
          throw new Error('You must be at least 18 years old')
        }
      }
      return true
    }),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
]

// User login validation
export const validateLogin: ValidationChain[] = [
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  
  body('password')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  
  body()
    .custom((value) => {
      if (!value.email && !value.username) {
        throw new Error('Either email or username is required')
      }
      return true
    })
]

// Bet creation validation
export const validateBetCreation: ValidationChain[] = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Description must be between 1 and 2000 characters'),
  
  body('type')
    .isIn(['binary', 'multi', 'pool'])
    .withMessage('Type must be binary, multi, or pool'),
  
  body('category')
    .isIn(['sports', 'pop', 'custom', 'crypto', 'politics'])
    .withMessage('Category must be sports, pop, custom, crypto, or politics'),
  
  body('options')
    .isArray({ min: 2, max: 10 })
    .withMessage('Must have between 2 and 10 options'),
  
  body('options.*.label')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Option label must be between 1 and 100 characters'),
  
  body('stakeMin')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Minimum stake must be between $0.01 and $1,000,000'),
  
  body('stakeMax')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Maximum stake must be between $0.01 and $1,000,000')
    .custom((value, { req }) => {
      if (value <= req.body.stakeMin) {
        throw new Error('Maximum stake must be greater than minimum stake')
      }
      return true
    }),
  
  body('entryDeadline')
    .isISO8601()
    .withMessage('Must be a valid date')
    .custom((value) => {
      const deadline = new Date(value)
      const now = new Date()
      const minDeadline = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
      
      if (deadline <= now) {
        throw new Error('Entry deadline must be in the future')
      }
      
      if (deadline < minDeadline) {
        throw new Error('Entry deadline must be at least 1 hour from now')
      }
      
      return true
    }),
  
  body('settlementMethod')
    .isIn(['auto', 'manual'])
    .withMessage('Settlement method must be auto or manual'),
  
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  
  body('clubId')
    .optional()
    .isUUID()
    .withMessage('Club ID must be a valid UUID')
]

// Bet placement validation
export const validateBetPlacement: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Bet ID must be a valid UUID'),
  
  body('optionId')
    .isUUID()
    .withMessage('Option ID must be a valid UUID'),
  
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'BTC', 'ETH'])
    .withMessage('Currency must be USD, EUR, GBP, BTC, or ETH')
]

// Wallet transaction validation
export const validateWalletTransaction: ValidationChain[] = [
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between $0.01 and $1,000,000'),
  
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'BTC', 'ETH'])
    .withMessage('Currency must be USD, EUR, GBP, BTC, or ETH'),
  
  body('paymentMethod')
    .optional()
    .isIn(['card', 'bank', 'crypto', 'apple_pay', 'google_pay'])
    .withMessage('Payment method must be card, bank, crypto, apple_pay, or google_pay')
]

// User profile update validation
export const validateProfileUpdate: ValidationChain[] = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-\(\)]{10,20}$/)
    .withMessage('Must be a valid phone number')
]

// Club creation validation
export const validateClubCreation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Club name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()]+$/)
    .withMessage('Club name contains invalid characters'),
  
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  
  body('maxMembers')
    .optional()
    .isInt({ min: 2, max: 1000 })
    .withMessage('Maximum members must be between 2 and 1000')
]

// Comment validation
export const validateComment: ValidationChain[] = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
    .matches(/^[a-zA-Z0-9\s\-_.,!?()@#$%&*]+$/)
    .withMessage('Comment contains invalid characters')
]

// Search validation
export const validateSearch: ValidationChain[] = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('category')
    .optional()
    .isIn(['sports', 'pop', 'custom', 'crypto', 'politics', 'all'])
    .withMessage('Category must be sports, pop, custom, crypto, politics, or all'),
  
  query('sort')
    .optional()
    .isIn(['trending', 'newest', 'ending_soon', 'highest_stakes'])
    .withMessage('Sort must be trending, newest, ending_soon, or highest_stakes'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

// UUID parameter validation
export const validateUUID: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('ID must be a valid UUID')
]

// Pagination validation
export const validatePagination: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
]

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string inputs
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim()
      }
    })
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key]?.toString().trim()
      }
    })
  }
  
  next()
}

// XSS protection middleware
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }
  
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key])
      }
    })
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]?.toString() || '')
      }
    })
  }
  
  next()
} 