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