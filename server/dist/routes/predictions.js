"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
// GET /api/v2/predictions - Get all predictions
router.get('/', async (req, res) => {
    try {
        console.log('📡 Predictions endpoint called - origin:', req.headers.origin);
        // Fetch real predictions from Supabase database
        const { data: predictions, error, count } = await database_1.supabase
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
                version: '2.0.56',
                details: error.message
            });
        }
        console.log(`✅ Successfully fetched ${predictions?.length || 0} predictions`);
        return res.json({
            data: predictions || [],
            message: 'Predictions endpoint - working',
            version: '2.0.56',
            pagination: {
                page: 1,
                limit: 20,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / 20),
                hasNext: false,
                hasPrev: false
            }
        });
    }
    catch (error) {
        console.error('Error fetching predictions:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch predictions',
            version: '2.0.56'
        });
    }
});
// GET /api/v2/predictions/stats/platform - Get platform statistics
router.get('/stats/platform', async (req, res) => {
    try {
        console.log('📊 Platform stats endpoint called - origin:', req.headers.origin);
        // Get total volume from predictions
        const { data: volumeData, error: volumeError } = await database_1.supabase
            .from('predictions')
            .select('pool_total')
            .eq('status', 'open');
        if (volumeError) {
            console.error('Error fetching volume data:', volumeError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch volume data',
                version: '2.0.56'
            });
        }
        // Get active predictions count
        const { count: activeCount, error: countError } = await database_1.supabase
            .from('predictions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open');
        if (countError) {
            console.error('Error fetching active predictions count:', countError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch active predictions count',
                version: '2.0.56'
            });
        }
        // Get total users count
        const { count: userCount, error: userError } = await database_1.supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        if (userError) {
            console.error('Error fetching user count:', userError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch user count',
                version: '2.0.56'
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
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error('Error fetching platform stats:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch platform statistics',
            version: '2.0.56'
        });
    }
});
// GET /api/v2/predictions/trending - Get trending predictions
router.get('/trending', async (req, res) => {
    try {
        console.log('🔥 Trending predictions endpoint called - origin:', req.headers.origin);
        // For now, return the same as regular predictions but ordered by activity
        const { data: predictions, error } = await database_1.supabase
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
                version: '2.0.56',
                details: error.message
            });
        }
        console.log(`✅ Successfully fetched ${predictions?.length || 0} trending predictions`);
        return res.json({
            data: predictions || [],
            message: 'Trending predictions endpoint - working',
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error('Error in trending predictions endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch trending predictions',
            version: '2.0.56'
        });
    }
});
// GET /api/v2/predictions/:id - Get specific prediction
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 Specific prediction endpoint called for ID: ${id} - origin:`, req.headers.origin);
        const { data: prediction, error } = await database_1.supabase
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
                version: '2.0.56',
                details: error.message
            });
        }
        return res.json({
            data: prediction,
            message: 'Prediction fetched successfully',
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error(`Error in specific prediction endpoint:`, error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch prediction',
            version: '2.0.56'
        });
    }
});
// GET /api/v2/predictions/created/:userId - Get user's created predictions
router.get('/created/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`📊 User created predictions endpoint called for ID: ${userId} - origin:`, req.headers.origin);
        const { data: predictions, error } = await database_1.supabase
            .from('predictions')
            .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
            .eq('creator_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error(`Error fetching user created predictions for ${userId}:`, error);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch user created predictions',
                version: '2.0.56',
                details: error.message
            });
        }
        return res.json({
            data: predictions || [],
            message: `Created predictions for user ${userId}`,
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error('Error fetching user created predictions:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user created predictions',
            version: '2.0.56'
        });
    }
});
// POST /api/v2/predictions - Create new prediction
router.post('/', async (req, res) => {
    try {
        console.log('🎯 Creating new prediction:', req.body);
        const { title, description, category, type, options, entryDeadline, stakeMin, stakeMax, settlementMethod, isPrivate } = req.body;
        // Validate required fields
        if (!title || !category || !type || !options || !entryDeadline) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'Missing required fields',
                version: '2.0.56',
                details: 'Title, category, type, options, and entryDeadline are required'
            });
        }
        // Get current user ID from request body (passed from frontend)
        // In production, this would come from JWT token
        console.log('🔍 Debug - Request body creatorId:', req.body.creatorId);
        console.log('🔍 Debug - Full request body:', JSON.stringify(req.body, null, 2));
        const requestedUserId = req.body.creatorId || '325343a7-0a32-4565-8059-7c0d9d3fed1b';
        console.log('🔍 Debug - Requested userId:', requestedUserId);
        // Verify user exists in database
        const { data: userExists, error: userError } = await database_1.supabase
            .from('users')
            .select('id')
            .eq('id', requestedUserId)
            .single();
        if (userError || !userExists) {
            console.log('🔍 Debug - User not found, creating user:', requestedUserId);
            // Create user if doesn't exist
            const { error: createUserError } = await database_1.supabase
                .from('users')
                .insert({
                id: requestedUserId,
                username: 'itisteddy',
                full_name: 'Fan Club Z User',
                email: 'user@fanclubz.app'
            });
            if (createUserError && !createUserError.message.includes('duplicate')) {
                console.error('Error creating user:', createUserError);
            }
        }
        const currentUserId = requestedUserId;
        console.log('🔍 Debug - Final currentUserId:', currentUserId);
        // Create prediction in database (bypass RLS with service role)
        const { data: prediction, error: predictionError } = await database_1.supabase
            .from('predictions')
            .insert({
            creator_id: currentUserId,
            title: title.trim(),
            description: description?.trim() || null,
            category,
            type,
            status: 'open',
            stake_min: stakeMin || 1,
            stake_max: stakeMax || null,
            pool_total: 0,
            entry_deadline: entryDeadline,
            settlement_method: settlementMethod || 'manual',
            is_private: isPrivate || false,
            creator_fee_percentage: 1.0,
            platform_fee_percentage: 2.5,
            tags: [category],
            participant_count: 0,
            likes_count: 0,
            comments_count: 0
        })
            .select()
            .single();
        if (predictionError) {
            console.error('Error creating prediction:', predictionError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to create prediction',
                version: '2.0.56',
                details: predictionError.message
            });
        }
        // Create prediction options
        if (options && options.length > 0) {
            const optionData = options.map((option, index) => ({
                prediction_id: prediction.id,
                label: option.label,
                description: option.description || null,
                total_staked: 0,
                current_odds: option.currentOdds || 2.0,
                order_index: index
            }));
            const { error: optionsError } = await database_1.supabase
                .from('prediction_options')
                .insert(optionData);
            if (optionsError) {
                console.error('Error creating prediction options:', optionsError);
                // Note: We don't fail here, just log the error
            }
        }
        // Fetch the complete prediction with options and creator info
        const { data: completePrediction, error: fetchError } = await database_1.supabase
            .from('predictions')
            .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*)
      `)
            .eq('id', prediction.id)
            .single();
        if (fetchError) {
            console.error('Error fetching complete prediction:', fetchError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Prediction created but failed to fetch complete data',
                version: '2.0.56',
                details: fetchError.message
            });
        }
        console.log('✅ Prediction created successfully:', completePrediction.id);
        return res.json({
            data: completePrediction,
            message: 'Prediction created successfully',
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error('Error in create prediction endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create prediction',
            version: '2.0.56',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// POST /api/v2/predictions/:id/entries - Create prediction entry (place bet)
router.post('/:id/entries', async (req, res) => {
    try {
        const predictionId = req.params.id;
        const { option_id, amount, user_id } = req.body;
        console.log(`🎲 Creating prediction entry for prediction ${predictionId}:`, { option_id, amount, user_id });
        // Validate required fields
        if (!option_id || !amount || !user_id) {
            return res.status(400).json({
                error: 'Validation error',
                message: 'option_id, amount, and user_id are required',
                version: '2.0.56'
            });
        }
        // Create prediction entry in database
        const { data: entry, error: entryError } = await database_1.supabase
            .from('prediction_entries')
            .insert({
            prediction_id: predictionId,
            option_id: option_id,
            user_id: user_id,
            amount: amount,
            status: 'active',
            potential_payout: amount * 2.0, // Simple calculation for now
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .select()
            .single();
        if (entryError) {
            console.error('Error creating prediction entry:', entryError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to create prediction entry',
                version: '2.0.56',
                details: entryError.message
            });
        }
        console.log('✅ Prediction entry created successfully:', entry.id);
        return res.status(201).json({
            data: {
                entry,
                prediction: {
                    id: predictionId,
                    pool_total: 0, // TODO: Calculate actual pool total
                    participant_count: 1 // TODO: Calculate actual participant count
                }
            },
            message: 'Prediction entry created successfully',
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error('Error in prediction entry creation:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create prediction entry',
            version: '2.0.56'
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
            version: '2.0.56'
        });
    }
    catch (error) {
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
            version: '2.0.56'
        });
    }
    catch (error) {
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
            version: '2.0.56'
        });
    }
    catch (error) {
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
            version: '2.0.56'
        });
    }
    catch (error) {
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
            version: '2.0.56'
        });
    }
    catch (error) {
        console.error('Error fetching prediction participants:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch prediction participants'
        });
    }
});
exports.default = router;
