import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = Router();

// GET /api/v2/activity/predictions/:id - Get activity feed for a prediction
router.get('/predictions/:id', async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    const { cursor, limit = '25' } = req.query;
    
    console.log('📊 Activity feed endpoint called:', { predictionId, cursor, limit });

    // Validate prediction ID
    if (!predictionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction ID is required',
        version: VERSION
      });
    }

    // Parse limit
    const limitNum = Math.min(parseInt(limit as string) || 25, 100); // Max 100 items

    // For now, return a simple response since we don't have the database view yet
    // TODO: Implement the actual activity feed query once the database view is created
    const mockActivity = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'comment',
        actor: {
          id: 'user1',
          username: 'testuser',
          full_name: 'Test User',
          avatar_url: null,
          is_verified: false
        },
        data: {
          content: 'This is a test comment'
        }
      }
    ];

    res.json({
      items: mockActivity,
      nextCursor: null,
      hasMore: false,
      version: VERSION
    });

  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity feed',
      version: VERSION
    });
  }
});

// GET /api/v2/activity/user/:userId - Get activity feed for a user across all predictions
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = '25' } = req.query;
    
    console.log('👤 User activity feed endpoint called:', { userId, cursor, limit });

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required',
        version: VERSION
      });
    }

    // Parse limit
    const limitNum = Math.min(parseInt(limit as string) || 25, 100);

    // For now, return empty array
    res.json({
      items: [],
      nextCursor: null,
      hasMore: false,
      version: VERSION
    });

  } catch (error) {
    console.error('User activity feed error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user activity feed',
      version: VERSION
    });
  }
});

export default router;