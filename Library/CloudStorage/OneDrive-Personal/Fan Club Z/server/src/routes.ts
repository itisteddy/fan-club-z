import express from 'express'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { config } from './config'
import { databaseStorage } from './services/databaseStorage'
import { StatsService } from './services/statsService'
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

// Helper to authenticate user from JWT token
const authenticateToken = async (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    })
  }
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string }
    ;(req as any).userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    })
  }
}

// Health check - now handled in index.ts to bypass middleware
// router.get('/health', (req: Request, res: Response) => {
//   res.json({ 
//     success: true, 
//     message: 'Fan Club Z API is running',
//     timestamp: new Date().toISOString()
//   })
// })

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

    // Create user with welcome bonus
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
      walletBalance: 500 // Give new users $500 welcome bonus
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

    // Find user in database
    const user = await databaseStorage.getUserByEmail(email)
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password!)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      })
    }

    // Generate tokens
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

// Get current user profile - Protected by authentication
router.get('/users/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required'
      })
    }
    
    // Get user from database
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          walletBalance: user.walletBalance,
          kycLevel: user.kycLevel,
          dateOfBirth: user.dateOfBirth,
          phone: user.phone
        }
      }
    })
  } catch (error: any) {
    console.error('Get user profile error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    })
  }
})

// User Stats Routes - Protected by authentication
router.get('/stats/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const tokenUserId = (req as any).userId
    
    // Ensure users can only access their own stats
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get user stats from database
    const stats = await StatsService.getUserStats(userId)
    
    res.json({
      success: true,
      data: {
        stats
      }
    })
  } catch (error: any) {
    console.error('Get user stats error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
    })
  }
})

// User Bets Routes - Protected by authentication
router.get('/bets/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const tokenUserId = (req as any).userId
    
    // Ensure users can only access their own bets
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get user's created bets from database
    const bets = await databaseStorage.getBetsByCreator(userId)
    
    res.json({
      success: true,
      data: {
        bets
      }
    })
  } catch (error: any) {
    console.error('Get user bets error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user bets'
    })
  }
})

// Wallet Routes - Protected by authentication
router.get('/wallet/balance/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const tokenUserId = (req as any).userId
    
    // Ensure users can only access their own balance
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get user from database
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        balance: user.walletBalance || 0,
        currency: 'USD'
      }
    })
  } catch (error: any) {
    console.error('Wallet balance error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balance'
    })
  }
})

// Wallet deposit endpoint - Protected by authentication
router.post('/wallet/deposit', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'USD' } = req.body
    const userId = (req as any).userId
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required for deposit'
      })
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid deposit amount'
      })
    }
    
    // Get current user
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    // Update user balance in database
    const newBalance = (user.walletBalance || 0) + amount
    await databaseStorage.updateUser(userId, { walletBalance: newBalance })
    
    // Create transaction record
    const transaction = {
      id: `deposit-${Date.now()}`,
      userId,
      type: 'deposit' as const,
      amount,
      currency,
      status: 'completed' as const,
      description: 'Wallet deposit',
      reference: `deposit-${userId}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Store transaction
    await databaseStorage.createTransaction(transaction)
    
    res.json({
      success: true,
      data: {
        transaction,
        newBalance
      }
    })
  } catch (error: any) {
    console.error('Deposit error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process deposit'
    })
  }
})

// Bet Routes
router.get('/bets', async (req: Request, res: Response) => {
  try {
    const bets = await databaseStorage.getBets()
    res.json({
      success: true,
      data: {
        bets
      }
    })
  } catch (error) {
    console.error('Get bets error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bets'
    })
  }
})

// Create new bet endpoint - Protected by authentication
router.post('/bets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, description, type, category, options, stakeMin, stakeMax, entryDeadline, settlementMethod, isPrivate } = req.body
    const userId = (req as any).userId
    
    console.log('🏁 Create bet request:', { title, type, category, options: options?.length })
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required for bet creation'
      })
    }
    
    // Validate required fields
    if (!title || !type || !options || !Array.isArray(options) || options.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, type, options'
      })
    }
    
    if (!entryDeadline) {
      return res.status(400).json({
        success: false,
        error: 'Entry deadline is required'
      })
    }
    
    // Validate deadline is in the future
    const deadlineDate = new Date(entryDeadline)
    if (deadlineDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Entry deadline must be in the future'
      })
    }
    
    // Get user details
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    console.log('✅ User found:', user.email)
    
    // Create bet object
    const betData = {
      creatorId: userId,
      title: title.trim(),
      description: description?.trim() || '',
      type,
      category: category || 'custom',
      options: options.map((option: any, index: number) => ({
        id: option.id || `option-${index + 1}`,
        label: option.label,
        totalStaked: 0
      })),
      status: 'open' as const,
      stakeMin: stakeMin || 1,
      stakeMax: stakeMax || 1000,
      poolTotal: 0,
      entryDeadline,
      settlementMethod: settlementMethod || 'manual',
      isPrivate: isPrivate || false,
      likes: 0,
      comments: 0,
      shares: 0
    }
    
    console.log('🛠️ Creating bet with data:', {
      title: betData.title,
      type: betData.type,
      category: betData.category,
      optionsCount: betData.options.length,
      creator: user.email
    })
    
    // Create bet in database
    const bet = await databaseStorage.createBet(betData)
    
    console.log('✅ Bet created successfully:', bet.id)
    
    res.status(201).json({
      success: true,
      data: {
        bet
      }
    })
  } catch (error: any) {
    console.error('💥 Create bet error:', error)
    console.error('💥 Error stack:', error.stack)
    
    let errorMessage = 'Failed to create bet'
    
    if (error.message.includes('UNIQUE constraint')) {
      errorMessage = 'A bet with this title already exists'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
})

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
    console.error('Get trending bets error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending bets'
    })
  }
})

// Get bet by ID route
router.get('/bets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    console.log('🔍 DEBUG: Searching for bet ID:', id)
    console.log('🔍 DEBUG: ID type:', typeof id)
    console.log('🔍 DEBUG: ID length:', id?.length)
    
    // Debug: Show all available bets
    const allBets = await databaseStorage.getBets()
    console.log('📋 DEBUG: Available bet IDs:', allBets.map(b => b.id))
    console.log('📊 DEBUG: Total bets in database:', allBets.length)
    
    // Check for exact match
    const exactMatch = allBets.find(b => b.id === id)
    console.log('🎯 DEBUG: Exact match found:', !!exactMatch)
    
    // Get bet from database
    const bet = await databaseStorage.getBetById(id)
    
    if (!bet) {
      console.log('❌ DEBUG: Bet not found in database')
      console.log('❌ DEBUG: Requested ID:', `"${id}"`)
      console.log('❌ DEBUG: First 5 available IDs:', allBets.map(b => `"${b.id}"`).slice(0, 5))
      
      return res.status(404).json({
        success: false,
        error: 'Bet not found',
        debug: {
          requestedId: id,
          availableIds: allBets.map(b => b.id).slice(0, 5),
          totalBets: allBets.length
        }
      })
    }
    
    console.log('✅ DEBUG: Bet found successfully:', bet.id)
    console.log('✅ DEBUG: Bet title:', bet.title)
    
    res.json({
      success: true,
      data: {
        bet
      }
    })
  } catch (error) {
    console.error('❌ DEBUG: Error getting bet:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bet',
      details: (error as any)?.message || 'Unknown error'
    })
  }
})

// Comments Routes
router.get('/bets/:id/comments', async (req: Request, res: Response) => {
  try {
    const betId = req.params.id
    
    // Get comments from database
    const comments = await databaseStorage.getCommentsByBetId(betId)
    
    res.json({
      success: true,
      data: {
        comments
      }
    })
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    })
  }
})

router.post('/bets/:id/comments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { content } = req.body
    const betId = req.params.id
    const userId = (req as any).userId
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      })
    }
    
    // Get user details
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    // Create comment
    const comment = await databaseStorage.createComment({
      content,
      authorId: userId,
      targetType: 'bet',
      targetId: betId,
      likes: 0 // Initialize with 0 likes
    })
    
    // Return comment with author details
    const commentWithAuthor = {
      ...comment,
      author: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      }
    }

    res.status(201).json({
      success: true,
      data: {
        comment: commentWithAuthor
      }
    })
  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    })
  }
})

// Bet Entry Routes - Protected by authentication
router.post('/bet-entries', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { betId, optionId, amount } = req.body
    const userId = (req as any).userId
    
    console.log('🎯 Bet placement request:', { betId, optionId, amount, userId })
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required for bet placement'
      })
    }
    
    if (!betId || !optionId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: betId, optionId, amount'
      })
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bet amount'
      })
    }
    
    // STEP 1: Verify bet exists and is valid
    console.log('🔍 Step 1: Checking if bet exists...')
    const bet = await databaseStorage.getBetById(betId)
    if (!bet) {
      console.log('❌ Bet not found:', betId)
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      })
    }
    
    // Verify the option exists in the bet
    const validOption = bet.options.find(opt => opt.id === optionId)
    if (!validOption) {
      console.log('❌ Invalid option:', optionId, 'for bet:', betId)
      return res.status(400).json({
        success: false,
        error: 'Invalid option selected'
      })
    }
    
    console.log('✅ Bet exists:', bet.title)
    console.log('✅ Option valid:', validOption.label)
    
    // STEP 2: Get and validate user
    console.log('🔍 Step 2: Checking user...')
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      console.log('❌ User not found:', userId)
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    console.log('✅ User found:', user.email, 'Balance:', user.walletBalance)
    
    // STEP 3: Check sufficient balance
    if ((user.walletBalance || 0) < amount) {
      console.log('❌ Insufficient balance:', user.walletBalance, 'needed:', amount)
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. You have ${user.walletBalance}, but need ${amount}`
      })
    }
    
    // STEP 4: Check if user already has a bet on this
    console.log('🔍 Step 4: Checking for existing bet entry...')
    const existingBetEntries = await databaseStorage.getBetEntriesByUserId(userId)
    const existingEntry = existingBetEntries.find(entry => entry.betId === betId)
    
    if (existingEntry) {
      console.log('❌ User already has bet on this:', existingEntry.id)
      return res.status(400).json({
        success: false,
        error: 'You have already placed a bet on this event'
      })
    }
    
    console.log('✅ No existing bet entry found')
    
    // STEP 5: Update user balance first
    console.log('🔍 Step 5: Updating user balance...')
    const newBalance = (user.walletBalance || 0) - amount
    await databaseStorage.updateUser(userId, { walletBalance: newBalance })
    console.log('✅ Balance updated from', user.walletBalance, 'to', newBalance)
    
    // STEP 6: Create bet entry
    console.log('🔍 Step 6: Creating bet entry...')
    const betEntry = await databaseStorage.createBetEntry({
      betId,
      userId,
      optionId,
      amount,
      odds: 1.5,
      potentialWinnings: amount * 1.5,
      status: 'active'
    })
    
    console.log('✅ Bet entry created:', betEntry.id)
    
    // STEP 7: Create transaction record
    console.log('🔍 Step 7: Creating transaction...')
    const transaction = {
      id: `bet-${betEntry.id}`,
      userId,
      type: 'bet_lock' as const,
      amount,
      currency: 'USD' as const,
      status: 'completed' as const,
      description: `Bet placed on ${bet.title}`,
      reference: betEntry.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    try {
      await databaseStorage.createTransaction(transaction)
      console.log('✅ Transaction created:', transaction.id)
    } catch (txError) {
      console.warn('⚠️ Transaction creation failed, but bet entry was successful:', txError)
      // Don't fail the whole request if transaction creation fails
    }
    
    console.log('🎉 Bet placement successful!')
    
    res.status(201).json({
      success: true,
      data: {
        betEntry,
        newBalance
      }
    })
  } catch (error: any) {
    console.error('💥 Bet entry error:', error)
    console.error('💥 Error stack:', error.stack)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to place bet entry'
    
    if (error.message.includes('UNIQUE constraint failed')) {
      errorMessage = 'You have already placed a bet on this event'
    } else if (error.message.includes('FOREIGN KEY constraint failed')) {
      errorMessage = 'Invalid bet or user data'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
})

router.get('/bet-entries/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const tokenUserId = (req as any).userId
    
    // Ensure users can only access their own bet entries
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get bet entries from database
    const betEntries = await databaseStorage.getBetEntriesByUserId(userId)
    
    res.json({
      success: true,
      data: {
        betEntries
      }
    })
  } catch (error) {
    console.error('Get bet entries error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bet entries'
    })
  }
})

// Transactions endpoint - Protected by authentication
router.get('/transactions/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const tokenUserId = (req as any).userId
    
    // Ensure users can only access their own transactions
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get transactions from database
    const transactions = await databaseStorage.getTransactionsByUserId(userId)
    
    res.json({
      success: true,
      data: {
        transactions
      }
    })
  } catch (error) {
    console.error('Get transactions error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    })
  }
})

// Bet reactions (likes) endpoint - Protected by authentication
router.post('/bets/:id/reactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { type } = req.body // 'like' or 'unlike'
    const userId = (req as any).userId
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required'
      })
    }
    
    // Handle like/unlike logic in database
    const reaction = await databaseStorage.handleBetReaction(userId, id, type)
    
    res.json({
      success: true,
      data: {
        betId: id,
        isLiked: reaction.isLiked,
        totalLikes: reaction.totalLikes
      }
    })
  } catch (error) {
    console.error('Bet reaction error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update reaction'
    })
  }
})

// Clubs Routes
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
    console.error('Get clubs error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clubs'
    })
  }
})

// Create new club endpoint - Protected by authentication
router.post('/clubs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, description, category, isPrivate, maxMembers, rules } = req.body
    const userId = (req as any).userId
    
    console.log('🏁 Create club request:', { name, category, isPrivate })
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required for club creation'
      })
    }
    
    // Validate required fields
    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, category'
      })
    }
    
    // Get user details
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    console.log('✅ User found:', user.email)
    
    // Create club object
    const clubData = {
      name: name.trim(),
      description: description.trim(),
      category,
      creatorId: userId,
      memberCount: 1, // Creator is the first member
      activeBets: 0,
      discussions: 0,
      isPrivate: isPrivate || false,
      maxMembers: maxMembers || 100,
      rules: rules || '',
      imageUrl: getCategoryEmoji(category)
    }
    
    // Helper function for category emoji
    function getCategoryEmoji(category: string) {
      const categories: { [key: string]: string } = {
        'sports': '⚽',
        'crypto': '₿',
        'entertainment': '🎬',
        'politics': '🗳️',
        'technology': '💻',
        'finance': '💰',
        'gaming': '🎮'
      }
      return categories[category] || '🏠'
    }
    
    console.log('🛠️ Creating club with data:', {
      name: clubData.name,
      category: clubData.category,
      creator: user.email
    })
    
    // Create club in database
    const club = await databaseStorage.createClub(clubData)
    
    console.log('✅ Club created successfully:', club.id)
    
    res.status(201).json({
      success: true,
      data: {
        club
      }
    })
  } catch (error: any) {
    console.error('💥 Create club error:', error)
    console.error('💥 Error stack:', error.stack)
    
    let errorMessage = 'Failed to create club'
    
    if (error.message.includes('UNIQUE constraint')) {
      errorMessage = 'A club with this name already exists'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
})

// Get user's clubs endpoint - Protected by authentication
router.get('/clubs/user/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const tokenUserId = (req as any).userId
    
    // Ensure users can only access their own clubs
    if (userId !== tokenUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      })
    }
    
    // Get user's clubs from database
    const clubs = await databaseStorage.getClubsByUserId(userId)
    
    res.json({
      success: true,
      data: {
        clubs
      }
    })
  } catch (error) {
    console.error('Get user clubs error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user clubs'
    })
  }
})

// Join club endpoint - Protected by authentication
router.post('/clubs/:clubId/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params
    // Support both token-based auth and request body userId
    const userId = (req as any).userId || req.body?.userId
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required'
      })
    }
    
    // Check if club exists
    const club = await databaseStorage.getClubById(clubId)
    if (!club) {
      return res.status(404).json({
        success: false,
        error: 'Club not found'
      })
    }
    
    // Add user to club
    await databaseStorage.joinClub(userId, clubId)
    
    res.json({
      success: true,
      message: 'Successfully joined the club',
      data: {
        clubId,
        userId
      }
    })
  } catch (error: any) {
    console.error('Join club error:', error)
    
    // Handle specific error cases
    let errorMessage = 'Failed to join club'
    if (error.message?.includes('already a member')) {
      errorMessage = 'You are already a member of this club'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
})

// Leave club endpoint - Protected by authentication
router.post('/clubs/:clubId/leave', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params
    // Support both token-based auth and request body userId
    const userId = (req as any).userId || req.body?.userId
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required'
      })
    }
    
    // Remove user from club
    await databaseStorage.leaveClub(userId, clubId)
    
    res.json({
      success: true,
      message: 'Successfully left the club',
      data: {
        clubId,
        userId
      }
    })
  } catch (error: any) {
    console.error('Leave club error:', error)
    
    // Handle specific error cases
    let errorMessage = 'Failed to leave club'
    if (error.message?.includes('not a member')) {
      errorMessage = 'You are not a member of this club'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
})

// Withdraw endpoint - Protected by authentication
router.post('/payment/withdraw', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { amount, currency, destination } = req.body
    const userId = (req as any).userId
    
    console.log('💰 Withdrawal request:', { amount, currency, destination, userId })
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID required for withdrawal'
      })
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid withdrawal amount'
      })
    }
    
    if (amount < 5) {
      return res.status(400).json({
        success: false,
        error: 'Minimum withdrawal amount is $5.00'
      })
    }
    
    // Get current user
    const user = await databaseStorage.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      })
    }
    
    console.log('✅ User found:', user.email, 'Balance:', user.walletBalance)
    
    // Check sufficient balance
    if ((user.walletBalance || 0) < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient wallet balance. You have ${user.walletBalance}, but need ${amount}`
      })
    }
    
    // For demo user, just return success
    if (userId === 'demo-user-id') {
      console.log('🎭 Demo user withdrawal processed')
      return res.json({
        success: true,
        data: {
          amount,
          currency: currency || 'USD',
          status: 'completed',
          message: 'Withdrawal request processed (demo mode)'
        }
      })
    }
    
    // Update user balance
    const newBalance = (user.walletBalance || 0) - amount
    await databaseStorage.updateUser(userId, { walletBalance: newBalance })
    
    console.log('💳 Balance updated from', user.walletBalance, 'to', newBalance)
    
    // Create transaction record
    const transaction = {
      id: `withdraw-${Date.now()}`,
      userId,
      type: 'withdraw' as const,
      amount,
      currency: (currency || 'USD') as 'USD',
      status: 'completed' as const,
      description: `Withdrawal to ${destination || 'Bank Account'}`,
      reference: `WTH-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Store transaction
    await databaseStorage.createTransaction(transaction)
    
    console.log('✅ Withdrawal completed successfully:', transaction.id)
    
    res.json({
      success: true,
      data: {
        amount,
        currency: currency || 'USD',
        status: 'completed',
        newBalance,
        message: 'Withdrawal processed successfully'
      }
    })
  } catch (error: any) {
    console.error('💥 Withdrawal error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to process withdrawal'
    })
  }
})

export default router