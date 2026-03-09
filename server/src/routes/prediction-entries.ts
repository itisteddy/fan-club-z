import express from 'express';
import { config } from '../config';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { idempotency } from '../middleware/idempotency';

const router = express.Router();
const USER_ID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/v2/prediction-entries/user/:userId - Get user's prediction entries
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 User prediction entries endpoint called for ID: ${userId} - origin:`, req.headers.origin);
    if (!USER_ID_UUID_REGEX.test(String(userId || ''))) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid userId format',
        version: VERSION,
      });
    }

    const { data: entries, error } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        prediction:predictions(
          *,
          options:prediction_options!prediction_options_prediction_id_fkey(*)
        ),
        option:prediction_options(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(`Error fetching user prediction entries for ${userId}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user prediction entries',
        version: VERSION,
        details: error.message
      });
    }

    return res.json({
      data: entries || [],
      message: 'User prediction entries fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error('Error in user prediction entries endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user prediction entries',
      version: VERSION
    });
  }
});

// POST /api/v2/prediction-entries - Create new prediction entry with idempotency
router.post('/', idempotency(), async (req, res) => {
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
      version: VERSION
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
      version: VERSION
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
