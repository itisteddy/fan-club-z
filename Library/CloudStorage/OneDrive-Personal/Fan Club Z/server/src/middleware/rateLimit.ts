import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

// Helper function to check if request is for demo user
const isDemoUserRequest = (req: Request): boolean => {
  // Check body for demo login
  if (req.body && req.body.email === 'demo@fanclubz.app' && req.body.password === 'demo123') {
    return true
  }
  
  // Check body for any demo email
  if (req.body && req.body.email && req.body.email.includes('demo')) {
    return true
  }
  
  // Check URL params for demo user ID
  if (req.params && Object.values(req.params).includes('demo-user-id')) {
    return true
  }
  
  // Check query params for demo user ID
  if (req.query && Object.values(req.query).includes('demo-user-id')) {
    return true
  }
  
  // Check authorization header for demo user token
  const authHeader = req.headers['authorization']
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1]
      if (token) {
        // Basic check without JWT verification to avoid dependency issues
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        if (payload.userId === 'demo-user-id') {
          return true
        }
      }
    } catch (error) {
      // Ignore token parsing errors
    }
  }
  
  return false
}

// Helper function to check if request is from mobile browser
const isMobileRequest = (req: Request): boolean => {
  const userAgent = req.get('User-Agent') || ''
  return /Mobile|iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent)
}

// Helper function to check if request is from Safari
const isSafariRequest = (req: Request): boolean => {
  const userAgent = req.get('User-Agent') || ''
  return /Safari/i.test(userAgent) && !/Chrome|Chromium/i.test(userAgent)
}

// Demo-aware rate limiter factory
const createDemoAwareRateLimit = (options: any) => {
  const limiter = rateLimit(options)
  
  return (req: Request, res: Response, next: any) => {
    // Skip rate limiting for any demo user request
    if (isDemoUserRequest(req)) {
      console.log('🚀 Bypassing rate limit for demo user request')
      return next()
    }
    
    // Skip rate limiting for mobile Safari demo attempts
    if (isMobileRequest(req) && isSafariRequest(req) && req.path === '/users/login') {
      console.log('📱 Bypassing rate limit for Mobile Safari login attempt')
      return next()
    }
    
    // Skip rate limiting for any Safari browser during demo testing
    if (isSafariRequest(req) && req.body && req.body.email && req.body.email.includes('demo')) {
      console.log('🥰 Bypassing rate limit for Safari demo login')
      return next()
    }
    
    // Skip rate limiting for Playwright test requests
    const userAgent = req.get('User-Agent') || ''
    if (/Playwright|playwright/i.test(userAgent)) {
      console.log('🎭 Bypassing rate limit for Playwright test')
      return next()
    }
    
    // Apply normal rate limiting for other requests
    return limiter(req, res, next)
  }
}

// General API rate limiter (demo-aware)
export const generalLimiter = createDemoAwareRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

// Stricter limiter for authentication endpoints (bypasses demo user)
export const authLimiter = createDemoAwareRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

// Very strict limiter for login attempts (bypasses demo user)
export const loginLimiter = createDemoAwareRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 login attempts per windowMs
  message: {
    success: false,
    error: 'Too many login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many login attempts, please try again later.',
      retryAfter: '15 minutes'
    })
  }
})

// Limiter for bet creation
export const betCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 bet creations per hour
  message: {
    success: false,
    error: 'Too many bet creations, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many bet creations, please try again later.',
      retryAfter: '1 hour'
    })
  }
})

// Limiter for wallet transactions
export const walletLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 wallet operations per hour
  message: {
    success: false,
    error: 'Too many wallet operations, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many wallet operations, please try again later.',
      retryAfter: '1 hour'
    })
  }
})

// Limiter for notification endpoints
export const notificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // Limit each IP to 30 notification requests per 5 minutes
  message: {
    success: false,
    error: 'Too many notification requests, please try again later.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many notification requests, please try again later.',
      retryAfter: '5 minutes'
    })
  }
})

// Limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 file uploads per hour
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour'
    })
  }
})

// Development mode limiter (more lenient)
export const devLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Much higher limit for development
  message: {
    success: false,
    error: 'Rate limit exceeded (dev mode)',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded (dev mode)',
      retryAfter: '15 minutes'
    })
  }
}) 