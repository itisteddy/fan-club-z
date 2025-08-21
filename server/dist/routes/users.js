"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const router = express_1.default.Router();
// GET /api/v2/users/:id - Get user profile by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`👤 User profile endpoint called for ID: ${id} - origin:`, req.headers.origin);
    try {
        // Fetch user profile from Supabase
        const { data: user, error } = await database_1.supabase
            .from('users')
            .select(`
        id,
        username,
        full_name,
        email,
        avatar_url,
        bio,
        created_at,
        updated_at,
        reputation_score,
        is_verified
      `)
            .eq('id', id)
            .single();
        if (error) {
            console.error(`Error fetching user ${id}:`, error);
            return res.status(404).json({
                error: 'Not found',
                message: `User ${id} not found`,
                version: '2.0.53',
                details: error.message
            });
        }
        // Get user's prediction statistics
        const [createdPredictions, participatedPredictions] = await Promise.all([
            database_1.supabase
                .from('predictions')
                .select('id, status, pool_total', { count: 'exact' })
                .eq('creator_id', id),
            database_1.supabase
                .from('prediction_entries')
                .select('id, status, amount, actual_payout', { count: 'exact' })
                .eq('user_id', id)
        ]);
        // Calculate user statistics
        const stats = {
            predictionsCreated: createdPredictions.count || 0,
            predictionsParticipated: participatedPredictions.count || 0,
            totalVolume: createdPredictions.data?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 0,
            totalInvested: participatedPredictions.data?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0,
            totalEarnings: participatedPredictions.data?.reduce((sum, entry) => sum + (entry.actual_payout || 0), 0) || 0,
            winRate: 0 // Will calculate based on won vs total predictions
        };
        // Calculate win rate
        const wonPredictions = participatedPredictions.data?.filter(entry => entry.status === 'won').length || 0;
        stats.winRate = stats.predictionsParticipated > 0 ? (wonPredictions / stats.predictionsParticipated) * 100 : 0;
        return res.json({
            data: {
                ...user,
                stats
            },
            message: 'User profile fetched successfully',
            version: '2.0.53'
        });
    }
    catch (error) {
        console.error(`Error in user profile endpoint for ${id}:`, error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user profile',
            version: '2.0.53',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/v2/users/:id/predictions - Get user's created predictions
router.get('/:id/predictions', async (req, res) => {
    const { id } = req.params;
    console.log(`📊 User predictions endpoint called for ID: ${id} - origin:`, req.headers.origin);
    try {
        const { data: predictions, error } = await database_1.supabase
            .from('predictions')
            .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options(*),
        club:clubs(id, name, avatar_url)
      `)
            .eq('creator_id', id)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) {
            console.error(`Error fetching user predictions for ${id}:`, error);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch user predictions',
                version: '2.0.53',
                details: error.message
            });
        }
        return res.json({
            data: predictions || [],
            message: 'User predictions fetched successfully',
            version: '2.0.53'
        });
    }
    catch (error) {
        console.error(`Error in user predictions endpoint for ${id}:`, error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user predictions',
            version: '2.0.53',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
