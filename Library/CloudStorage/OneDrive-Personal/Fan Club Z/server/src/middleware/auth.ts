import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
    })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    }
    
    next()
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired token',
    })
  }
}

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
      }
    } catch (error) {
      // Token is invalid, but we continue without user
    }
  }
  
  next()
} 