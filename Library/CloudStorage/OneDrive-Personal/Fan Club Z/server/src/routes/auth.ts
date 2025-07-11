import express from 'express'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config.js'

const router = express.Router()

// Social authentication request schema
const socialAuthSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profileImage: z.string().optional(),
    provider: z.enum(['apple', 'google'])
  }),
  token: z.string(),
  provider: z.enum(['apple', 'google'])
})

// Mock user storage (replace with database)
const users = new Map()

/**
 * POST /api/auth/social
 * Handle social authentication (Apple/Google)
 */
router.post('/social', async (req, res) => {
  try {
    // Validate request body
    const { user, token, provider } = socialAuthSchema.parse(req.body)

    // In a real implementation, you would:
    // 1. Verify the token with Apple/Google
    // 2. Check if user exists in database
    // 3. Create user if they don't exist
    // 4. Generate JWT token

    // For now, we'll simulate the flow
    console.log(`Social auth attempt: ${provider}`, { user, token })

    // Check if user exists
    let existingUser = users.get(user.email)
    
    if (!existingUser) {
      // Create new user
      existingUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        profileImage: user.profileImage,
        provider,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      users.set(user.email, existingUser)
      console.log('Created new user via social auth:', existingUser)
    } else {
      // Update existing user
      existingUser.updatedAt = new Date().toISOString()
      existingUser.profileImage = user.profileImage || existingUser.profileImage
      users.set(user.email, existingUser)
      console.log('Updated existing user via social auth:', existingUser)
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        id: existingUser.id, 
        email: existingUser.email,
        provider 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      user: existingUser,
      token: jwtToken
    })

  } catch (error) {
    console.error('Social auth error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Social authentication failed'
    })
  }
})

/**
 * POST /api/auth/verify-token
 * Verify social authentication token
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token, provider } = req.body

    if (!token || !provider) {
      return res.status(400).json({
        success: false,
        error: 'Token and provider are required'
      })
    }

    // In a real implementation, verify the token with the provider
    // For now, we'll just acknowledge the request
    console.log(`Token verification request: ${provider}`)

    res.json({
      success: true,
      message: 'Token verification endpoint ready'
    })

  } catch (error) {
    console.error('Token verification error:', error)
    res.status(500).json({
      success: false,
      error: 'Token verification failed'
    })
  }
})

/**
 * POST /api/auth/refresh
 * Exchange a refresh token for a new access token
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: 'Refresh token required' })
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret)
    if (!decoded || typeof decoded !== 'object' || decoded.type !== 'refresh') {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' })
    }

    // Issue new access token
    const accessToken = jwt.sign(
      { id: decoded.userId },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    )
    // Optionally, issue a new refresh token (rotation)
    const newRefreshToken = jwt.sign(
      { id: decoded.userId, type: 'refresh' },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn } as SignOptions
    )
    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: config.jwtExpiresIn
    })
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' })
  }
})

export default router 