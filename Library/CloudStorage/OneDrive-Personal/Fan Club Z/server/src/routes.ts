import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { storage } from './storage.js'
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

const router = Router()

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'fan-club-z-secret-key'

// Validation schemas
const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    const user = await storage.getUserById(decoded.userId)
    
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
router.post('/users/register', async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body)
    
    // Check if user already exists
    const existingUserByEmail = await storage.getUserByEmail(validatedData.email)
    if (existingUserByEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      })
    }

    const existingUserByUsername = await storage.getUserByUsername(validatedData.username)
    if (existingUserByUsername) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already taken' 
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
      walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
      kycLevel: 'none',
      walletBalance: 0
    })

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' })

    // Remove password from response
    const { password, ...userResponse } = user
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: userResponse
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

router.post('/users/login', async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body)
    
    // Find user
    let user
    if (validatedData.email) {
      user = await storage.getUserByEmail(validatedData.email)
    } else if (validatedData.username) {
      user = await storage.getUserByUsername(validatedData.username)
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

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' })

    // Remove password from response
    const { password, ...userResponse } = user
    
    res.json({
      success: true,
      data: {
        token,
        user: userResponse
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

// User Profile Routes
router.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserById(req.params.id)
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

    const updatedUser = await storage.updateUser(req.params.id, req.body)
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
    const bets = await storage.getBets(req.query)
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
    const bets = await storage.getBets()
    // Sort by a combination of pool total and recent activity
    const trendingBets = bets
      .filter(bet => bet.status === 'open')
      .sort((a, b) => (b.poolTotal + b.likes * 10) - (a.poolTotal + a.likes * 10))
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
    const bets = await storage.getBetsByCreator(req.params.userId)
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
    const bet = await storage.getBetById(req.params.id)
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

router.post('/bets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validatedData = createBetSchema.parse(req.body)
    
    // Create bet options with IDs
    const options = validatedData.options.map((option, index) => ({
      id: `option-${index + 1}`,
      label: option.label,
      totalStaked: 0
    }))

    const bet = await storage.createBet({
      ...validatedData,
      creatorId: req.user.id,
      options,
      status: 'open'
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
    const bet = await storage.getBetById(req.params.id)
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

    const updatedBet = await storage.updateBet(req.params.id, {
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
    const bet = await storage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    // Simulate adding a like
    const updatedBet = await storage.updateBet(req.params.id, {
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
    const bet = await storage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    // Simulate adding a comment
    const updatedBet = await storage.updateBet(req.params.id, {
      comments: bet.comments + 1
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
      error: 'Failed to add comment'
    })
  }
})

router.post('/bets/:id/share', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bet = await storage.getBetById(req.params.id)
    if (!bet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }

    // Simulate sharing
    const updatedBet = await storage.updateBet(req.params.id, {
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

    const bet = await storage.getBetById(betId)
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
    await storage.updateUserBalance(req.user.id, -amount)

    // Create transaction
    await storage.createTransaction({
      userId: req.user.id,
      type: 'bet_lock',
      currency: 'USD',
      amount,
      status: 'completed',
      reference: `BET-${Date.now()}`,
      description: `Bet: ${bet.title}`,
      betId
    })

    // Update bet pool (simplified - in real app, this would be more complex)
    const updatedOptions = bet.options.map(option => 
      option.id === optionId 
        ? { ...option, totalStaked: option.totalStaked + amount }
        : option
    )
    
    await storage.updateBet(betId, {
      options: updatedOptions,
      poolTotal: bet.poolTotal + amount
    })

    // Create bet entry (simplified)
    const betEntry = {
      id: `entry-${Date.now()}`,
      betId,
      userId: req.user.id,
      optionId,
      amount,
      odds: 1.5, // Simplified odds calculation
      potentialWinnings: amount * 1.5,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    res.json({
      success: true,
      data: {
        betEntry
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to place bet'
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

router.post('/wallet/deposit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount, currency, paymentMethod } = req.body

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      })
    }

    // Simulate deposit processing
    await storage.updateUserBalance(req.user.id, amount)

    const transaction = await storage.createTransaction({
      userId: req.user.id,
      type: 'deposit',
      currency: currency || 'USD',
      amount,
      status: 'completed',
      reference: `DEP-${Date.now()}`,
      description: `${paymentMethod} deposit`
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

router.post('/wallet/withdraw', authenticateToken, async (req: Request, res: Response) => {
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
    await storage.updateUserBalance(req.user.id, -amount)

    const transaction = await storage.createTransaction({
      userId: req.user.id,
      type: 'withdraw',
      currency: currency || 'USD',
      amount,
      status: 'pending',
      reference: `WTH-${Date.now()}`,
      description: `Withdrawal to ${destination}`
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

router.post('/wallet/transfer', authenticateToken, async (req: Request, res: Response) => {
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

    const recipient = await storage.getUserById(toUserId)
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      })
    }

    // Process transfer
    await storage.updateUserBalance(req.user.id, -amount)
    await storage.updateUserBalance(toUserId, amount)

    const transaction = await storage.createTransaction({
      userId: req.user.id,
      type: 'transfer',
      currency: currency || 'USD',
      amount,
      status: 'completed',
      reference: `TXF-${Date.now()}`,
      description: `Transfer to @${recipient.username}`,
      toUserId
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

    const transactions = await storage.getTransactionsByUser(req.params.userId)
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
    const clubs = await storage.getClubs()
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
    const club = await storage.getClubById(req.params.id)
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
    const club = await storage.createClub({
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
    const bets = await storage.getBets({ clubId: req.params.id })
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

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Fan Club Z API is running!',
    timestamp: new Date().toISOString()
  })
})

export default router
