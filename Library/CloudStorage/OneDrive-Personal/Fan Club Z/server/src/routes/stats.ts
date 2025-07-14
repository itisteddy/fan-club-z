import { Router } from 'express'
import { StatsService } from '../services/statsService.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/stats/user/:userId
 * Get user statistics
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    
    console.log('📊 Stats request for userId:', userId, 'from user:', req.user?.id)
    
    // Special handling for demo user
    if (userId === 'demo-user-id') {
      console.log('📊 Returning demo user stats')
      const demoStats = {
        totalBets: 15,
        activeBets: 3,
        wonBets: 8,
        lostBets: 4,
        cancelledBets: 0,
        totalStaked: 750,
        totalWon: 1200,
        totalLost: 300,
        netProfit: 900,
        winRate: 53.3,
        clubsJoined: 5,
        betsCreated: 7,
        totalLikesReceived: 24,
        totalCommentsReceived: 18,
        totalSharesReceived: 6,
        reputationScore: 4.2,
        reputationVotes: 12,
        currentWinStreak: 2,
        longestWinStreak: 5,
        currentLossStreak: 0,
        longestLossStreak: 2,
        lastBetAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastWinAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: new Date().toISOString()
      }
      
      return res.json(demoStats)
    }
    
    // Check if user is requesting their own stats or has permission
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const stats = await StatsService.getUserStats(userId)
    
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' })
    }

    res.json(stats)
  } catch (error) {
    console.error('Error getting user stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/stats/user/:userId/refresh
 * Force refresh user statistics
 */
router.post('/user/:userId/refresh', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    
    console.log('🔄 Stats refresh request for userId:', userId, 'from user:', req.user?.id)
    
    // Special handling for demo user
    if (userId === 'demo-user-id') {
      console.log('🔄 Returning refreshed demo user stats')
      const demoStats = {
        totalBets: 15,
        activeBets: 3,
        wonBets: 8,
        lostBets: 4,
        cancelledBets: 0,
        totalStaked: 750,
        totalWon: 1200,
        totalLost: 300,
        netProfit: 900,
        winRate: 53.3,
        clubsJoined: 5,
        betsCreated: 7,
        totalLikesReceived: 24,
        totalCommentsReceived: 18,
        totalSharesReceived: 6,
        reputationScore: 4.2,
        reputationVotes: 12,
        currentWinStreak: 2,
        longestWinStreak: 5,
        currentLossStreak: 0,
        longestLossStreak: 2,
        lastBetAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastWinAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        lastLoginAt: new Date().toISOString()
      }
      
      return res.json(demoStats)
    }
    
    // Check if user is requesting their own stats or has permission
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const stats = await StatsService.calculateUserStats(userId)
    res.json(stats)
  } catch (error) {
    console.error('Error refreshing user stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/stats/leaderboard
 * Get leaderboard statistics
 */
router.get('/leaderboard', async (req, res) => {
  try {
    // For now, return empty leaderboard since we're using in-memory storage
    res.json([])
  } catch (error) {
    console.error('Error getting leaderboard:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router 