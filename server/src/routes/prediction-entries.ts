import express from 'express';
import { config } from '../config';

const router = express.Router();

// GET /api/v2/prediction-entries/user/:userId - Get user's prediction entries
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 Fetching prediction entries for user: ${userId}`);
    
    // Import supabase here since it's not imported at the top
    const { supabase } = require('../config/database');
    
    // Fetch user's prediction entries with all related data
    const { data: entries, error } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        prediction:predictions!prediction_id(
          id,
          title,
          category,
          type,
          status,
          entry_deadline,
          pool_total,
          participant_count,
          creator:users!creator_id(id, username, full_name)
        ),
        option:prediction_options!option_id(
          id,
          label,
          current_odds,
          total_staked
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching prediction entries for ${userId}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user prediction entries',
        version: '2.0.55',
        details: error.message
      });
    }

    console.log(`✅ Found ${entries?.length || 0} prediction entries for user ${userId}`);

    res.json({
      data: entries || [],
      message: `Prediction entries for user ${userId}`,
      version: '2.0.55',
      pagination: {
        page: 1,
        limit: 50,
        total: entries?.length || 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Error fetching user prediction entries:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user prediction entries',
      version: '2.0.55'
    });
  }
});

// POST /api/v2/prediction-entries - Create new prediction entry
router.post('/', async (req, res) => {
  try {
    const { prediction_id, option_id, amount, user_id } = req.body;
    
    // For now, return mock response
    res.status(201).json({
      data: {
        id: `entry_${Date.now()}`,
        prediction_id,
        option_id,
        amount,
        user_id,
        status: 'active',
        potential_payout: amount * 2, // Mock calculation
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      message: 'Prediction entry created successfully',
      version: '2.0.55'
    });
  } catch (error) {
    console.error('Error creating prediction entry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prediction entry'
    });
  }
});

// GET /api/v2/prediction-entries/:id - Get specific prediction entry
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    res.json({
      data: null,
      message: `Prediction entry ${id} not found`,
      version: '2.0.55'
    });
  } catch (error) {
    console.error('Error fetching prediction entry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch prediction entry'
    });
  }
});

export default router;
