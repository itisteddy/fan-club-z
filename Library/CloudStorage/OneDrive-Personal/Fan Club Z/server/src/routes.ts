import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import { databaseStorage } from './services/databaseStorage.js'
import paymentRoutes from './routes/payment.js'
import kycRoutes from './routes/kyc.js'
import authRoutes from './routes/auth.js'
import statsRoutes from './routes/stats.js'
import { config } from './config.js'
import type { 
  RegisterRequest, 
  LoginRequest, 
  CreateBetRequest, 
  PlaceBetRequest,
  CreateClubRequest,
  DepositRequest,
  WithdrawRequest,
  TransferRequest
} from '@shared/schema'
import { notificationService } from './services/notificationService.js'
import { 
  generalLimiter, 
  authLimiter, 
  loginLimiter, 
  betCreationLimiter, 
  walletLimiter, 
  notificationLimiter,
  devLimiter 
} from './middleware/rateLimit.js'
import {
  validateRegistration,
  validateLogin,
  validateBetCreation,
  validateBetPlacement,
  validateWalletTransaction,
  validateProfileUpdate,
  validateClubCreation,
  validateComment,
  validateSearch,
  validateUUID,
  validatePagination,
  handleValidationErrors,
  sanitizeInput,
  xssProtection
} from './middleware/validation.js'

const router = Router()

// Validation schemas
const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18
    }
    return age >= 18
  }, {
    message: "You must be at least 18 years old to register"
  }),
  password: z.string().min(8)
})

const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().min(1)
}).refine(data => data.email || data.username, {
  message: "Either email or username is required"
})

const createBetSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  type: z.enum(['binary', 'multi', 'pool']),
  category: z.enum(['sports', 'pop', 'custom', 'crypto', 'politics']),
  options: z.array(z.object({
    label: z.string().min(1)
  })).min(2),
  stakeMin: z.number().positive(),
  stakeMax: z.number().positive(),
  entryDeadline: z.string(),
  settlementMethod: z.enum(['auto', 'manual']),
  isPrivate: z.boolean().default(false),
  clubId: z.string().optional()
})

// Middleware for authentication
const authenticateToken = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string }
    
    // Special handling for demo user
    if (decoded.userId === 'demo-user-id') {
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
      req.user = demoUser
      next()
      return
    }
    
    // For real users, check database
    const user = await databaseStorage.getUserById(decoded.userId)
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' })
  }
}

// Auth Routes
router.post('/users/register', authLimiter, sanitizeInput, xssProtection, validateRegistration, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    // Debug logging
    console.log('🔥 Registration request received:', req.body)
    console.log('🔥 Request headers:', req.headers)
    // Use validated data from express-validator instead of Zod
    const validatedData = req.body
    
    // Check if user already exists
    const existingUserByEmail = await databaseStorage.getUserByEmail(validatedData.email)
    if (existingUserByEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      })
    }

    const existingUserByUsername = await databaseStorage.getUserByUsername(validatedData.username)
    if (existingUserByUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already taken' 
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await databaseStorage.createUser({
      ...validatedData,
      password: hashedPassword,
      walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
      kycLevel: 'none',
      walletBalance: 0
    })

    // Generate access and refresh tokens
    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn 
    } as SignOptions)
    
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtRefreshSecret, { 
      expiresIn: config.jwtRefreshExpiresIn 
    } as SignOptions)

    // Remove password from response
    const { password, ...userResponse } = user
    
    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse,
        expiresIn: config.jwtExpiresIn
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    })
  }
})

router.post('/users/login', sanitizeInput, xssProtection, validateLogin, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    // Use validated data from express-validator instead of Zod
    const validatedData = req.body

    // Demo account check (bypass rate limiting for demo)
    if (validatedData.email === 'demo@fanclubz.app' && validatedData.password === 'demo123') {
      // Return demo user data
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

      // Generate access and refresh tokens for demo user
      const accessToken = jwt.sign({ userId: demoUser.id }, config.jwtSecret, { 
        expiresIn: config.jwtExpiresIn 
      } as SignOptions)
      
      const refreshToken = jwt.sign({ userId: demoUser.id, type: 'refresh' }, config.jwtRefreshSecret, { 
        expiresIn: config.jwtRefreshExpiresIn 
      } as SignOptions)
      
      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: demoUser,
          expiresIn: config.jwtExpiresIn
        }
      })
      return
    }

    // Find user
    let user
    if (validatedData.email) {
      user = await databaseStorage.getUserByEmail(validatedData.email)
    } else if (validatedData.username) {
      user = await databaseStorage.getUserByUsername(validatedData.username)
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(validatedData.password, user.password!)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Generate access and refresh tokens
    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { 
      expiresIn: config.jwtExpiresIn 
    } as SignOptions)
    
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtRefreshSecret, { 
      expiresIn: config.jwtRefreshExpiresIn 
    } as SignOptions)

    // Remove password from response
    const { password, ...userResponse } = user
  
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: userResponse,
        expiresIn: config.jwtExpiresIn
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Login failed'
    })
  }
})

router.get('/users/me', authenticateToken, async (req: Request, res: Response) => {
  const { password, ...userResponse } = req.user
  res.json({
    success: true,
    data: {
      user: userResponse
    }
  })
})

router.patch('/users/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const updateData = req.body
    
    // Special handling for demo user
    if (req.user.id === 'demo-user-id') {
      // For demo user, just return the updated user data without saving to database
      const updatedDemoUser = {
        ...req.user,
        ...updateData,
        updatedAt: new Date().toISOString()
      }
      
      res.json({
        success: true,
        data: {
          user: updatedDemoUser
        }
      })
      return
    }
    
    // For real users, update in database
    const updatedUser = await databaseStorage.updateUser(req.user.id, updateData)
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    const { password, ...userResponse } = updatedUser
    res.json({
      success: true,
      data: {
        user: userResponse
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    })
  }
})

// User Profile Routes
router.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const user = await databaseStorage.getUserById(req.params.id)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    const { password, email, phone, ...publicProfile } = user
    res.json({
      success: true,
      data: {
        user: publicProfile
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    })
  }
})

router.put('/user/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const updatedUser = await databaseStorage.updateUser(req.params.id, req.body)
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }

    const { password, ...userResponse } = updatedUser
    res.json({
      success: true,
      data: {
        user: userResponse
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    })
  }
})

// Bet Routes
router.get('/bets', async (req: Request, res: Response) => {
  try {
    const bets = await databaseStorage.getBets(req.query)
    res.json({
      success: true,
      data: {
        bets
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bets'
    })
  }
})

router.get('/bets/trending', async (req: Request, res: Response) => {
  try {
    const bets = await databaseStorage.getBets()
    // Sort by a combination of pool total and recent activity
    const trendingBets = bets
      .filter((bet: any) => bet.status === 'open')
      .sort((a: any, b: any) => (b.poolTotal + b.likes * 10) - (a.poolTotal + a.likes * 10))
      .slice(0, 10)
    
    res.json({
      success: true,
      data: {
        bets: trendingBets
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending bets'
    })
  }
})

router.get('/bets/user/:userId', async (req: Request, res: Response) => {
  try {
    const bets = await databaseStorage.getBetsByCreator(req.params.userId)
    res.json({
      success: true,
      data: {
        bets
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user bets'
    })
  }
})

router.get('/bets/:id', async (req: Request, res: Response) => {
  try {
    const bet = await databaseStorage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    res.json({
      success: true,
      data: {
        bet
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bet'
    })
  }
})

router.post('/bets', authenticateToken, betCreationLimiter, sanitizeInput, xssProtection, validateBetCreation, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    // Use validated data from express-validator instead of Zod
    const validatedData = req.body
    
    // Create bet options with IDs
    const options = validatedData.options.map((option: { label: string }, index: number) => ({
      id: `option-${index + 1}`,
      label: option.label,
      totalStaked: 0
    }))

    const bet = await databaseStorage.createBet({
      ...validatedData,
      creatorId: req.user.id,
      options,
      status: 'open',
      poolTotal: 0,
      likes: 0,
      comments: 0,
      shares: 0
    })

    res.status(201).json({
      success: true,
      data: {
        bet
      }
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bet data',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create bet'
    })
  }
})

router.post('/bets/:id/settle', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bet = await databaseStorage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    if (bet.creatorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only bet creator can settle'
      })
    }

    const updatedBet = await databaseStorage.updateBet(req.params.id, {
      status: 'settled'
    })

    res.json({
      success: true,
      data: {
        bet: updatedBet
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to settle bet'
    })
  }
})

// Social Actions
router.post('/bets/:id/reactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bet = await databaseStorage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    // Simulate adding a like
    const updatedBet = await databaseStorage.updateBet(req.params.id, {
      likes: bet.likes + 1
    })

    res.json({
      success: true,
      data: {
        bet: updatedBet
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add reaction'
    })
  }
})

router.post('/bets/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { content } = req.body
    const betId = req.params.id

    const bet = await databaseStorage.getBetById(betId)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    // Create comment
    const comment = await databaseStorage.createComment({
      content,
      authorId: req.user.id,
      targetType: 'bet',
      targetId: betId
    })

    // Update bet comment count
    await databaseStorage.updateBet(betId, {
      comments: bet.comments + 1
    })

    res.status(201).json({
      success: true,
      data: {
        comment
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    })
  }
})

// GET comments for a bet
router.get('/bets/:id/comments', async (req: Request, res: Response) => {
  try {
    const betId = req.params.id
    
    const bet = await databaseStorage.getBetById(betId)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    const comments = await databaseStorage.getCommentsByBet(betId)

    res.json({
      success: true,
      data: {
        comments
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    })
  }
})

router.post('/bets/:id/share', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bet = await databaseStorage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    // Simulate sharing
    const updatedBet = await databaseStorage.updateBet(req.params.id, {
      shares: bet.shares + 1
    })

    res.json({
      success: true,
      data: {
        bet: updatedBet
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to share bet'
    })
  }
})

// Bet Entry Routes
router.post('/bet-entries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { betId, optionId, amount } = req.body

    const bet = await databaseStorage.getBetById(betId)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    if (bet.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Bet is not open for entries'
      })
    }

    if (amount < bet.stakeMin || amount > bet.stakeMax) {
      return res.status(400).json({
        success: false,
        error: `Stake must be between ${bet.stakeMin} and ${bet.stakeMax}`
      })
    }

    // Check user balance
    if (req.user.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      })
    }

    // Deduct from user balance
    await databaseStorage.updateUserBalance(req.user.id, -amount)

    // Create transaction for bet entry
    const transaction = await databaseStorage.createTransaction({
      userId: req.user.id,
      type: 'bet_lock',
      amount: amount,
      currency: 'USD',
      status: 'completed',
      description: `Bet entry for: ${bet.title}`,
      referenceId: betId,
      referenceType: 'bet_entry'
    })

    // Update bet pool
    const updatedOptions = bet.options.map((option: any) => 
      option.id === optionId 
        ? { ...option, totalStaked: option.totalStaked + amount }
        : option
    )
    
    await databaseStorage.updateBet(betId, {
      options: updatedOptions,
      poolTotal: bet.poolTotal + amount
    })

    // Create bet entry
    const betEntry = await databaseStorage.createBetEntry({
      betId,
      userId: req.user.id,
      optionId,
      amount,
      odds: 1.5, // Simplified - in real app, calculate based on pool distribution
      potentialWinnings: amount * 1.5, // Simplified calculation
      status: 'active'
    })

    res.status(201).json({
      success: true,
      data: {
        betEntry
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
    // Simplified - return empty array for now
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

// Get user's bets
router.get('/users/:userId/bets', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    // For demo user, return mock data
    if (userId === 'demo-user-id') {
      const mockUserBets = [
        {
          id: 'bet-entry-1',
          betId: '3235f312-e442-4ca1-9fce-dcf9d9b4bce5',
          bet: {
            id: '3235f312-e442-4ca1-9fce-dcf9d9b4bce5',
            title: 'Will Bitcoin reach $100K by end of 2025?',
            description: 'Bitcoin has been on a bull run. Will it hit the magical 100K mark by December 31st, 2025?',
            status: 'open',
            poolTotal: 23500,
            entryDeadline: '2025-12-31T23:59:59Z'
          },
          selectedOption: 'yes',
          stakeAmount: 100,
          potentialWinnings: 156.67,
          status: 'active',
          createdAt: new Date('2025-07-01T11:00:00Z').toISOString()
        },
        {
          id: 'bet-entry-2',
          betId: '5c6d0df9-442b-41dc-9af6-9fb88816a727',
          bet: {
            id: '5c6d0df9-442b-41dc-9af6-9fb88816a727',
            title: 'Premier League: Man City vs Arsenal - Who wins?',
            description: 'The title race is heating up! City and Arsenal face off.',
            status: 'open',
            poolTotal: 25000,
            entryDeadline: '2025-07-15T14:00:00Z'
          },
          selectedOption: 'city',
          stakeAmount: 50,
          potentialWinnings: 104.17,
          status: 'active',
          createdAt: new Date('2025-07-02T10:00:00Z').toISOString()
        }
      ]

      return res.json({
        success: true,
        data: {
          userBets: mockUserBets
        }
      })
    }

    // For real users, get from database
    const userBets = await databaseStorage.getUserBetEntries(userId)
    
    res.json({
      success: true,
      data: {
        userBets: userBets || []
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user bets'
    })
  }
})

// Wallet Routes
router.get('/wallet/balance/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    res.json({
      success: true,
      data: {
        balance: req.user.walletBalance
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance'
    })
  }
})

router.post('/wallet/deposit', authenticateToken, walletLimiter, sanitizeInput, xssProtection, validateWalletTransaction, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { amount, currency, paymentMethod } = req.body

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      })
    }

    // Simulate deposit processing
    await databaseStorage.updateUserBalance(req.user.id, amount)

    // Create transaction for deposit
    const transaction = await databaseStorage.createTransaction({
      userId: req.user.id,
      type: 'deposit',
      amount: amount,
      currency: currency || 'USD',
      status: 'completed',
      description: `Deposit via ${paymentMethod || 'default'}`,
      referenceId: `deposit_${Date.now()}`,
      referenceType: 'deposit'
    })

    res.json({
      success: true,
      data: {
        transaction
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit'
    })
  }
})

router.post('/wallet/withdraw', authenticateToken, walletLimiter, sanitizeInput, xssProtection, validateWalletTransaction, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { amount, currency, destination } = req.body

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      })
    }

    if (req.user.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      })
    }

    // Process withdrawal
    await databaseStorage.updateUserBalance(req.user.id, -amount)

    // Create transaction for withdrawal
    const transaction = await databaseStorage.createTransaction({
      userId: req.user.id,
      type: 'withdraw',
      amount: amount,
      currency: currency || 'USD',
      status: 'completed',
      description: `Withdrawal to ${destination || 'default'}`,
      referenceId: `withdraw_${Date.now()}`,
      referenceType: 'withdrawal'
    })

    res.json({
      success: true,
      data: {
        transaction
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal'
    })
  }
})

router.post('/wallet/transfer', authenticateToken, walletLimiter, sanitizeInput, xssProtection, validateWalletTransaction, handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { toUserId, amount, currency } = req.body

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      })
    }

    if (req.user.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      })
    }

    const recipient = await databaseStorage.getUserById(toUserId)
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      })
    }

    // Process transfer
    await databaseStorage.updateUserBalance(req.user.id, -amount)
    await databaseStorage.updateUserBalance(toUserId, amount)

    // Create transaction for transfer
    const transaction = await databaseStorage.createTransaction({
      userId: req.user.id,
      type: 'transfer',
      amount: amount,
      currency: currency || 'USD',
      status: 'completed',
      description: `Transfer to ${recipient.firstName} ${recipient.lastName}`,
      referenceId: toUserId,
      referenceType: 'transfer'
    })

    res.json({
      success: true,
      data: {
        transaction
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process transfer'
    })
  }
})

// Transaction Routes
router.get('/transactions/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      })
    }

    const transactions = await databaseStorage.getTransactionsByUser(req.params.userId)
    res.json({
      success: true,
      data: {
        transactions
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    })
  }
})

// Club Routes
router.get('/clubs', async (req: Request, res: Response) => {
  try {
    const clubs = await databaseStorage.getClubs()
    res.json({
      success: true,
      data: {
        clubs
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clubs'
    })
  }
})

router.get('/clubs/:id', async (req: Request, res: Response) => {
  try {
    const club = await databaseStorage.getClubById(req.params.id)
    if (!club) {
      return res.status(404).json({
        success: false,
        error: 'Club not found'
      })
    }

    res.json({
      success: true,
      data: {
        club
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch club'
    })
  }
})

router.post('/clubs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const club = await databaseStorage.createClub({
      ...req.body,
      creatorId: req.user.id
    })

    res.status(201).json({
      success: true,
      data: {
        club
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create club'
    })
  }
})

router.get('/clubs/:id/bets', async (req: Request, res: Response) => {
  try {
    const bets = await databaseStorage.getBets({ clubId: req.params.id })
    res.json({
      success: true,
      data: {
        bets
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch club bets'
    })
  }
})

// Leaderboard Routes
router.get('/leaderboards/:type', async (req: Request, res: Response) => {
  try {
    // Simplified leaderboard - return empty for now
    res.json({
      success: true,
      data: {
        leaderboard: []
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    })
  }
})

// Payment Routes
router.use('/payments', paymentRoutes)

// KYC Routes
router.use('/kyc', kycRoutes)

// Auth Routes
router.use('/auth', authRoutes)

// Stats Routes
router.use('/stats', statsRoutes)

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Fan Club Z API is running!',
    timestamp: new Date().toISOString()
  })
})

// Notification Routes
router.get('/notifications/status', authenticateToken, notificationLimiter, (req: Request, res: Response) => {
  const connectedUsers = notificationService.getConnectedUsers()
  const connectionCount = notificationService.getConnectionCount()
  
  res.json({
    success: true,
    data: {
      isConnected: connectedUsers.includes(req.user.id),
      connectedUsers: connectedUsers.length,
      totalConnections: connectionCount,
      websocketUrl: `/ws/notifications?token=${req.headers.authorization?.replace('Bearer ', '')}`
    }
  })
})

// Test notification endpoint
router.post('/notifications/test', authenticateToken, notificationLimiter, (req: Request, res: Response) => {
  try {
    const { type = 'system', title = 'Test Notification', message = 'This is a test notification' } = req.body
    
    notificationService.sendSystemNotification(req.user.id, title, message)
    
    res.json({
      success: true,
      message: 'Test notification sent'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    })
  }
})

// Send bet update notification
router.post('/notifications/bet-update', authenticateToken, (req: Request, res: Response) => {
  try {
    const { betId, message, data } = req.body
    
    notificationService.sendBetUpdate(req.user.id, betId, message, data)
    
    res.json({
      success: true,
      message: 'Bet update notification sent'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send bet update notification'
    })
  }
})

// Send wallet transaction notification
router.post('/notifications/wallet-transaction', authenticateToken, (req: Request, res: Response) => {
  try {
    const { amount, type, description } = req.body
    
    notificationService.sendWalletTransaction(req.user.id, amount, type, description)
    
    res.json({
      success: true,
      message: 'Wallet transaction notification sent'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send wallet transaction notification'
    })
  }
})

export default router
