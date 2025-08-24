"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const shared_1 = require("@fanclubz/shared");
const router = express_1.default.Router();
// GET /api/v2/users/leaderboard - Get leaderboard data (must be before /:id route)
router.get('/leaderboard', async (req, res) => {
    try {
        const type = req.query.type || 'predictions';
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
        // Fetch all entries (recent window can be added later if needed)
        const { data: entries, error: entriesError } = await database_1.supabase
            .from('prediction_entries')
            .select('user_id, amount, actual_payout, status');
        if (entriesError) {
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch prediction entries for leaderboard',
                version: shared_1.VERSION,
                details: entriesError.message
            });
        }
        // Fetch created predictions
        const { data: created, error: createdError } = await database_1.supabase
            .from('predictions')
            .select('id, creator_id');
        if (createdError) {
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch predictions for leaderboard',
                version: shared_1.VERSION,
                details: createdError.message
            });
        }
        // Aggregate by user
        const byUser = {};
        // Process entries
        for (const entry of entries || []) {
            const uid = entry.user_id;
            if (!byUser[uid]) {
                byUser[uid] = { total_invested: 0, total_profit: 0, total_entries: 0, won_entries: 0, predictions_count: 0 };
            }
            byUser[uid].total_invested += entry.amount || 0;
            byUser[uid].total_profit += (entry.actual_payout || 0) - (entry.amount || 0);
            byUser[uid].total_entries += 1;
            // Track won entries
            if (entry.status === 'won' || (entry.actual_payout && entry.actual_payout > entry.amount)) {
                byUser[uid].won_entries += 1;
            }
        }
        // Process created predictions
        for (const pred of created || []) {
            const uid = pred.creator_id;
            if (!byUser[uid]) {
                byUser[uid] = { total_invested: 0, total_profit: 0, total_entries: 0, won_entries: 0, predictions_count: 0 };
            }
            byUser[uid].predictions_count = (byUser[uid].predictions_count || 0) + 1;
        }
        const userIds = Object.keys(byUser);
        if (userIds.length === 0) {
            return res.json({ data: [], message: 'No leaderboard data', version: shared_1.VERSION });
        }
        const { data: users, error: usersError } = await database_1.supabase
            .from('users')
            .select('id, username, full_name, avatar_url')
            .in('id', userIds);
        if (usersError) {
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to fetch users for leaderboard',
                version: shared_1.VERSION,
                details: usersError.message
            });
        }
        // Combine and sort
        const leaderboard = (users || []).map(user => {
            const stats = byUser[user.id];
            // Calculate actual win rate: (won entries / total entries) * 100
            const winRate = stats.total_entries > 0 ? Math.round((stats.won_entries / stats.total_entries) * 100) : 0;
            return {
                ...user,
                ...stats,
                win_rate: Math.max(0, Math.min(100, winRate)) // Ensure 0-100 range
            };
        });
        // Sort based on type
        if (type === 'profit') {
            leaderboard.sort((a, b) => b.total_profit - a.total_profit);
        }
        else if (type === 'accuracy') {
            leaderboard.sort((a, b) => b.win_rate - a.win_rate);
        }
        else {
            leaderboard.sort((a, b) => b.predictions_count - a.predictions_count);
        }
        return res.json({
            data: leaderboard.slice(0, limit),
            message: 'Leaderboard fetched successfully',
            version: shared_1.VERSION
        });
    }
    catch (error) {
        return res.status(500).json({
            error: 'Internal server error',
            message: error?.message || 'Failed to compute leaderboard',
            version: shared_1.VERSION
        });
    }
});
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
        created_at,
        updated_at
      `)
            .eq('id', id)
            .single();
        if (error) {
            console.error(`Error fetching user ${id}:`, error);
            return res.status(404).json({
                error: 'Not found',
                message: `User ${id} not found`,
                version: shared_1.VERSION,
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
                bio: null, // Add default bio since column doesn't exist
                reputation_score: 0, // Add default reputation score
                is_verified: false, // Add default verification status
                stats
            },
            message: 'User profile fetched successfully',
            version: shared_1.VERSION
        });
    }
    catch (error) {
        console.error(`Error in user profile endpoint for ${id}:`, error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user profile',
            version: shared_1.VERSION,
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
        options:prediction_options!prediction_options_prediction_id_fkey(*),
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
                version: shared_1.VERSION,
                details: error.message
            });
        }
        return res.json({
            data: predictions || [],
            message: 'User predictions fetched successfully',
            version: shared_1.VERSION
        });
    }
    catch (error) {
        console.error(`Error in user predictions endpoint for ${id}:`, error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user predictions',
            version: shared_1.VERSION,
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
