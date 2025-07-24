import express from 'express'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from './config'
import { databaseStorage } from './services/databaseStorage'
import { 
  User, 
  Bet, 
  BetEntry, 
  Club, 
  Transaction,
  RegisterRequest,
  LoginRequest,
  CreateBetRequest,
  PlaceBetRequest
} from '@shared/schema'

const router = express.Router()

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'Fan Club Z API is running',
    timestamp: new Date().toISOString()
  })
})

// Auth Routes
router.post('/users/register', async (req: Request, res: Response) => {
  try {
    const { email, phone, username, firstName, lastName, dateOfBirth, password } = req.body
    
    // Check if user already exists
    const existingUserByEmail = await databaseStorage.getUserByEmail(email)
    if (existingUserByEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      })
    }

    const existingUserByUsername = await databaseStorage.getUserByUsername(username)
    if (existingUserByUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already taken' 
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const user = await databaseStorage.createUser({
      email,
      phone,
      username,
      firstName,
      lastName,
      dateOfBirth,
      password: hashedPassword,
      walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
      kycLevel: 'none',
      walletBalance: 0
    })

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn 
    } as SignOptions)
    
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtRefreshSecret, { 
      expiresIn: config.jwtRefreshExpiresIn 
    } as SignOptions)

    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          walletBalance: user.walletBalance,
          kycLevel: user.kycLevel
        }
      }
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

router.post('/users/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Demo account check
    if (email === 'demo@fanclubz.app' && password === 'demo123') {
      const demoUser = {
        id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        username: 'demo_user',
        email: 'demo@fanclubz.app',
        phone: '+1 (555) 123-4567',
        bio: 'Demo account for testing Fan Club Z features',
        profileImage: null,
        walletAddress: '0xDemoWalletAddress123456789',
        kycLevel: 'verified' as const,
        walletBalance: 2500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const accessToken = jwt.sign({ userId: demoUser.id }, config.jwtSecret, { 
        expiresIn: config.jwtExpiresIn 
      } as SignOptions)
      
      const refreshToken = jwt.sign({ userId: demoUser.id, type: 'refresh' }, config.jwtRefreshSecret, { 
        expiresIn: config.jwtRefreshExpiresIn 
      } as SignOptions)
      
      return res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: demoUser
        }
      })
    }

    // Regular login
    const user = await databaseStorage.getUserByEmail(email)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.password!)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn 
    } as SignOptions)
    
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtRefreshSecret, { 
      expiresIn: config.jwtRefreshExpiresIn 
    } as SignOptions)

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          walletBalance: user.walletBalance,
          kycLevel: user.kycLevel
        }
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
})

// Wallet Routes
router.get('/wallet/balance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    // Demo user
    if (userId === 'demo-user-id') {
      return res.json({
        success: true,
        data: {
          balance: 2500,
          currency: 'USD'
        }
      })
    }
    
    // Real user - return 0 for now
    res.json({
      success: true,
      data: {
        balance: 0,
        currency: 'USD'
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balance'
    })
  }
})

// Bet Routes
router.get('/bets/trending', async (req: Request, res: Response) => {
  try {
    const bets = await databaseStorage.getBets()
    res.json({
      success: true,
      data: {
        bets: bets.slice(0, 10) // Return top 10
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending bets'
    })
  }
})

// Comments Routes
router.get('/bets/:id/comments', async (req: Request, res: Response) => {
  try {
    const betId = req.params.id
    
    // Return mock comments
    const mockComments = [
      {
        id: 'comment-1',
        content: 'This is going to be interesting! 🎯',
        authorId: 'demo-user-id',
        author: {
          id: 'demo-user-id',
          username: 'demo_user',
          firstName: 'Demo',
          lastName: 'User'
        },
        targetType: 'bet',
        targetId: betId,
        likes: 5,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]

    res.json({
      success: true,
      data: {
        comments: mockComments
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    })
  }
})

router.post('/bets/:id/comments', async (req: Request, res: Response) => {
  try {
    const { content } = req.body
    const betId = req.params.id

    // Create mock comment
    const mockComment = {
      id: `comment-${Date.now()}`,
      content,
      authorId: 'demo-user-id',
      author: {
        id: 'demo-user-id',
        username: 'demo_user',
        firstName: 'Demo',
        lastName: 'User'
      },
      targetType: 'bet',
      targetId: betId,
      likes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    res.status(201).json({
      success: true,
      data: {
        comment: mockComment
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    })
  }
})

// Bet Entry Routes
router.post('/bet-entries', async (req: Request, res: Response) => {
  try {
    const { betId, optionId, amount, userId } = req.body

    // Create mock bet entry
    const mockBetEntry = {
      id: `bet-entry-${Date.now()}`,
      betId,
      userId: userId || 'demo-user-id',
      optionId,
      amount,
      odds: 1.5,
      potentialWinnings: amount * 1.5,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    res.status(201).json({
      success: true,
      data: {
        betEntry: mockBetEntry
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to place bet entry'
    })
  }
})

router.get('/bet-entries/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    // Return empty array for now
    res.json({
      success: true,
      data: {
        betEntries: []
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bet entries'
    })
  }
})

export default router 