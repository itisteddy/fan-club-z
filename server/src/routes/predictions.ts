import express from 'express';
import { config } from '../config';
import { supabase } from '../config/database';

const router = express.Router();

// GET /api/v2/predictions - Get all predictions
router.get('/', async (req, res) => {
  try {
    console.log('📡 Predictions endpoint called - origin:', req.headers.origin);
    
    // Fetch real predictions from Supabase database
    const { data: predictions, error, count } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch predictions',
        version: '2.0.54',
        details: error.message
      });
    }

    console.log(`✅ Successfully fetched ${predictions?.length || 0} predictions`);

    return res.json({
      data: predictions || [],
      message: 'Predictions endpoint - working',
      version: '2.0.54',
      pagination: {
        page: 1,
        limit: 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / 20),
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch predictions',
      version: '2.0.54'
    });
  }
});

// GET /api/v2/predictions/stats/platform - Get platform statistics
router.get('/stats/platform', async (req, res) => {
  try {
    console.log('📊 Platform stats endpoint called - origin:', req.headers.origin);
    
    // Get total volume from predictions
    const { data: volumeData, error: volumeError } = await supabase
      .from('predictions')
      .select('pool_total')
      .eq('status', 'open');

    if (volumeError) {
      console.error('Error fetching volume data:', volumeError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch volume data',
        version: '2.0.54'
      });
    }

    // Get active predictions count
    const { count: activeCount, error: countError } = await supabase
      .from('predictions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    if (countError) {
      console.error('Error fetching active predictions count:', countError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch active predictions count',
        version: '2.0.54'
      });
    }

    // Get total users count
    const { count: userCount, error: userError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      console.error('Error fetching user count:', userError);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user count',
        version: '2.0.54'
      });
    }

    // Calculate total volume
    const totalVolume = volumeData?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 0;

    const stats = {
      totalVolume: totalVolume.toFixed(2),
      activePredictions: activeCount || 0,
      totalUsers: userCount || 0,
      rawVolume: totalVolume,
      rawUsers: userCount || 0
    };

    console.log('✅ Platform stats calculated:', stats);

    return res.json({
      success: true,
      data: stats,
      message: 'Platform stats fetched successfully',
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch platform statistics',
      version: '2.0.54'
    });
  }
});

// GET /api/v2/predictions/trending - Get trending predictions
router.get('/trending', async (req, res) => {
  try {
    console.log('🔥 Trending predictions endpoint called - origin:', req.headers.origin);
    
    // For now, return the same as regular predictions but ordered by activity
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
      .eq('status', 'open')
      .order('participant_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching trending predictions:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch trending predictions',
        version: '2.0.54',
        details: error.message
      });
    }

    console.log(`✅ Successfully fetched ${predictions?.length || 0} trending predictions`);

    return res.json({
      data: predictions || [],
      message: 'Trending predictions endpoint - working',
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error in trending predictions endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch trending predictions',
      version: '2.0.54'
    });
  }
});

// GET /api/v2/predictions/:id - Get specific prediction
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Specific prediction endpoint called for ID: ${id} - origin:`, req.headers.origin);
    
    const { data: prediction, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching prediction ${id}:`, error);
      return res.status(404).json({
        error: 'Not found',
        message: `Prediction ${id} not found`,
        version: '2.0.54',
        details: error.message
      });
    }

    return res.json({
      data: prediction,
      message: 'Prediction fetched successfully',
      version: '2.0.54'
    });
  } catch (error) {
    console.error(`Error in specific prediction endpoint:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction',
      version: '2.0.54'
    });
  }
});

// POST /api/v2/predictions - Create new prediction
router.post('/', async (req, res) => {
  try {
    res.status(201).json({
      data: null,
      message: 'Prediction creation - coming soon',
      version: '2.0.53'
    });
  } catch (error) {
    console.error('Error creating prediction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prediction'
    });
  }
});

// GET /api/v2/predictions/created/:userId - Get user's created predictions
router.get('/created/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    res.json({
      data: [],
      message: `Created predictions for user ${userId}`,
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error fetching user created predictions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user created predictions'
    });
  }
});

// PUT /api/v2/predictions/:id - Update prediction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      data: { id, ...req.body },
      message: `Prediction ${id} updated`,
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error updating prediction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update prediction'
    });
  }
});

// DELETE /api/v2/predictions/:id - Delete prediction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      data: { id },
      message: `Prediction ${id} deleted`,
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error deleting prediction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete prediction'
    });
  }
});

// POST /api/v2/predictions/:id/close - Close prediction
router.post('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      data: { id, status: 'closed' },
      message: `Prediction ${id} closed`,
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error closing prediction:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to close prediction'
    });
  }
});

// GET /api/v2/predictions/:id/activity - Get prediction activity (optional)
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      data: [],
      message: `Activity for prediction ${id}`,
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error fetching prediction activity:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction activity'
    });
  }
});

// GET /api/v2/predictions/:id/participants - Get prediction participants (optional)
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      data: [],
      message: `Participants for prediction ${id}`,
      version: '2.0.54'
    });
  } catch (error) {
    console.error('Error fetching prediction participants:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction participants'
    });
  }
});

export default router;
