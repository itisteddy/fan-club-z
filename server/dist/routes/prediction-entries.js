"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const shared_1 = require("@fanclubz/shared");
const router = express_1.default.Router();
// GET /api/v2/prediction-entries/user/:userId - Get user's prediction entries
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log(`📊 User prediction entries endpoint called for ID: ${userId} - origin:`, req.headers.origin);
        const { data: entries, error } = await database_1.supabase
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
                version: shared_1.VERSION,
                details: error.message
            });
        }
        return res.json({
            data: entries || [],
            message: 'User prediction entries fetched successfully',
            version: shared_1.VERSION
        });
    }
    catch (error) {
        console.error('Error in user prediction entries endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch user prediction entries',
            version: shared_1.VERSION
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
            version: shared_1.VERSION
        });
    }
    catch (error) {
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
            version: shared_1.VERSION
        });
    }
    catch (error) {
        console.error('Error fetching prediction entry:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch prediction entry'
        });
    }
});
exports.default = router;
