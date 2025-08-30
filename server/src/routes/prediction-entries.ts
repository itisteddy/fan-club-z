import express from 'express';
import { config } from '../config';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = express.Router();

// GET /api/v2/prediction-entries/user/:userId - Get user's prediction entries
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📊 User prediction entries endpoint called for ID: ${userId} - origin:`, req.headers.origin);

    const { data: entries, error } = await supabase
      .from('prediction_entries')
      .select(`
        *,
        prediction:predictions(*),
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

// POST /api/v2/prediction-entries - Create new prediction entry
router.post('/', async (req, res) => {
  try {
    const { prediction_id, option_id, amount, user_id } = req.body;
    
    // Return error - endpoint not implemented yet
    res.status(501).json({
      error: 'Not implemented',
      message: 'Prediction entry creation is not implemented yet',
      version: VERSION
    });
  } catch (error) {
    console.error('Error creating prediction entry:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create prediction entry',
      version: VERSION
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
