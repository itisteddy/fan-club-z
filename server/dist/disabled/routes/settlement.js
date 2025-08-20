"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Validation schemas
const settleManualSchema = zod_1.z.object({
    predictionId: zod_1.z.string().uuid(),
    winningOptionId: zod_1.z.string().uuid(),
    proofUrl: zod_1.z.string().url().optional(),
    reason: zod_1.z.string().min(10).max(500)
});
const disputeSchema = zod_1.z.object({
    predictionId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().min(20).max(1000),
    evidenceUrl: zod_1.z.string().url().optional()
});
const resolveDisputeSchema = zod_1.z.object({
    disputeId: zod_1.z.string().uuid(),
    resolution: zod_1.z.enum(['approved', 'rejected']),
    resolutionReason: zod_1.z.string().min(10).max(500),
    newWinningOptionId: zod_1.z.string().uuid().optional()
});
// Settlement endpoints
router.post('/settle-manual', auth_1.authenticateToken, async (req, res) => {
    try {
        const { predictionId, winningOptionId, proofUrl, reason } = settleManualSchema.parse(req.body);
        const userId = req.user?.id;
        // Verify user is the prediction creator or admin
        const { data: prediction, error: predictionError } = await supabase_1.supabase
            .from('predictions')
            .select('creator_id, status, settlement_method')
            .eq('id', predictionId)
            .single();
        if (predictionError || !prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        if (prediction.creator_id !== userId && !req.user?.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized to settle this prediction' });
        }
        if (prediction.status !== 'closed') {
            return res.status(400).json({ error: 'Prediction must be closed before settlement' });
        }
        if (prediction.settlement_method !== 'manual') {
            return res.status(400).json({ error: 'Prediction is not set for manual settlement' });
        }
        // Verify winning option belongs to this prediction
        const { data: option, error: optionError } = await supabase_1.supabase
            .from('prediction_options')
            .select('id')
            .eq('id', winningOptionId)
            .eq('prediction_id', predictionId)
            .single();
        if (optionError || !option) {
            return res.status(400).json({ error: 'Invalid winning option for this prediction' });
        }
        // Begin settlement transaction
        const { data: settlement, error: settlementError } = await supabase_1.supabase.rpc('settle_prediction_manual', {
            p_prediction_id: predictionId,
            p_winning_option_id: winningOptionId,
            p_settled_by: userId,
            p_proof_url: proofUrl,
            p_reason: reason
        });
        if (settlementError) {
            console.error('Settlement error:', settlementError);
            return res.status(500).json({ error: 'Failed to settle prediction' });
        }
        res.json({
            success: true,
            settlementId: settlement[0]?.settlement_id,
            message: 'Prediction settled successfully'
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Settlement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Auto-settlement trigger (for external oracles/admin)
router.post('/settle-auto', auth_1.authenticateToken, async (req, res) => {
    try {
        const { predictionId, winningOptionId, oracleSource } = req.body;
        const userId = req.user?.id;
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required for auto-settlement' });
        }
        const { data: settlement, error } = await supabase_1.supabase.rpc('settle_prediction_auto', {
            p_prediction_id: predictionId,
            p_winning_option_id: winningOptionId,
            p_oracle_source: oracleSource,
            p_settled_by: userId
        });
        if (error) {
            console.error('Auto-settlement error:', error);
            return res.status(500).json({ error: 'Failed to auto-settle prediction' });
        }
        res.json({
            success: true,
            settlementId: settlement[0]?.settlement_id,
            message: 'Prediction auto-settled successfully'
        });
    }
    catch (error) {
        console.error('Auto-settlement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create dispute
router.post('/dispute', auth_1.authenticateToken, async (req, res) => {
    try {
        const { predictionId, reason, evidenceUrl } = disputeSchema.parse(req.body);
        const userId = req.user?.id;
        // Verify user has an entry in this prediction
        const { data: entry, error: entryError } = await supabase_1.supabase
            .from('prediction_entries')
            .select('id')
            .eq('prediction_id', predictionId)
            .eq('user_id', userId)
            .single();
        if (entryError || !entry) {
            return res.status(403).json({ error: 'You must have participated in this prediction to dispute' });
        }
        // Check if prediction is settled
        const { data: prediction, error: predictionError } = await supabase_1.supabase
            .from('predictions')
            .select('status')
            .eq('id', predictionId)
            .single();
        if (predictionError || prediction?.status !== 'settled') {
            return res.status(400).json({ error: 'Can only dispute settled predictions' });
        }
        // Check for existing disputes from this user
        const { data: existingDispute, error: disputeCheckError } = await supabase_1.supabase
            .from('disputes')
            .select('id')
            .eq('prediction_id', predictionId)
            .eq('user_id', userId)
            .eq('status', 'open')
            .single();
        if (existingDispute) {
            return res.status(400).json({ error: 'You already have an open dispute for this prediction' });
        }
        const { data: dispute, error: disputeError } = await supabase_1.supabase
            .from('disputes')
            .insert({
            prediction_id: predictionId,
            user_id: userId,
            reason,
            evidence_url: evidenceUrl,
            status: 'open'
        })
            .select()
            .single();
        if (disputeError) {
            console.error('Dispute creation error:', disputeError);
            return res.status(500).json({ error: 'Failed to create dispute' });
        }
        res.status(201).json({
            success: true,
            dispute,
            message: 'Dispute created successfully'
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Dispute error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Resolve dispute (admin only)
router.post('/resolve-dispute', auth_1.authenticateToken, async (req, res) => {
    try {
        const { disputeId, resolution, resolutionReason, newWinningOptionId } = resolveDisputeSchema.parse(req.body);
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { data: dispute, error: disputeError } = await supabase_1.supabase
            .from('disputes')
            .select('prediction_id, status')
            .eq('id', disputeId)
            .single();
        if (disputeError || !dispute) {
            return res.status(404).json({ error: 'Dispute not found' });
        }
        if (dispute.status !== 'open') {
            return res.status(400).json({ error: 'Dispute is already resolved' });
        }
        if (resolution === 'approved' && newWinningOptionId) {
            // Re-settle the prediction with new outcome
            const { error: resettleError } = await supabase_1.supabase.rpc('resettle_prediction', {
                p_prediction_id: dispute.prediction_id,
                p_new_winning_option_id: newWinningOptionId,
                p_resolved_by: req.user.id
            });
            if (resettleError) {
                console.error('Re-settlement error:', resettleError);
                return res.status(500).json({ error: 'Failed to re-settle prediction' });
            }
        }
        // Update dispute status
        const { error: updateError } = await supabase_1.supabase
            .from('disputes')
            .update({
            status: resolution,
            resolution: resolutionReason,
            resolved_by: req.user.id,
            resolved_at: new Date().toISOString()
        })
            .eq('id', disputeId);
        if (updateError) {
            console.error('Dispute update error:', updateError);
            return res.status(500).json({ error: 'Failed to update dispute' });
        }
        res.json({
            success: true,
            message: `Dispute ${resolution} successfully`
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: error.errors });
        }
        console.error('Dispute resolution error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get pending settlements (admin only)
router.get('/pending', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { data: predictions, error } = await supabase_1.supabase
            .from('predictions')
            .select(`
        id, title, status, settlement_method, created_at, entry_deadline,
        creator:users!predictions_creator_id_fkey(username, email),
        prediction_options(id, label, total_staked),
        prediction_entries(count)
      `)
            .eq('status', 'closed')
            .order('entry_deadline', { ascending: true });
        if (error) {
            console.error('Pending settlements error:', error);
            return res.status(500).json({ error: 'Failed to fetch pending settlements' });
        }
        res.json({ predictions });
    }
    catch (error) {
        console.error('Pending settlements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get open disputes (admin only)
router.get('/disputes', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { data: disputes, error } = await supabase_1.supabase
            .from('disputes')
            .select(`
        id, reason, evidence_url, created_at, status,
        user:users!disputes_user_id_fkey(username, email),
        prediction:predictions!disputes_prediction_id_fkey(id, title)
      `)
            .eq('status', 'open')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Disputes fetch error:', error);
            return res.status(500).json({ error: 'Failed to fetch disputes' });
        }
        res.json({ disputes });
    }
    catch (error) {
        console.error('Disputes fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get settlement analytics
router.get('/analytics', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user?.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { data: analytics, error } = await supabase_1.supabase.rpc('get_settlement_analytics');
        if (error) {
            console.error('Analytics error:', error);
            return res.status(500).json({ error: 'Failed to fetch analytics' });
        }
        res.json(analytics[0] || {});
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get settlement criteria templates
router.get('/criteria-templates', auth_1.authenticateToken, async (req, res) => {
    try {
        const { category } = req.query;
        let query = supabase_1.supabase
            .from('settlement_criteria_templates')
            .select('*')
            .order('name');
        if (category) {
            query = query.eq('category', category);
        }
        const { data: templates, error } = await query;
        if (error) {
            console.error('Error fetching criteria templates:', error);
            return res.status(500).json({ error: 'Failed to fetch criteria templates' });
        }
        res.json({ templates: templates || [] });
    }
    catch (error) {
        console.error('Criteria templates error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get verification sources
router.get('/verification-sources', auth_1.authenticateToken, async (req, res) => {
    try {
        const { category } = req.query;
        let query = supabase_1.supabase
            .from('verification_sources')
            .select('*')
            .order('reliability_score', { ascending: false });
        if (category) {
            query = query.eq('category', category);
        }
        const { data: sources, error } = await query;
        if (error) {
            console.error('Error fetching verification sources:', error);
            return res.status(500).json({ error: 'Failed to fetch verification sources' });
        }
        res.json({ sources: sources || [] });
    }
    catch (error) {
        console.error('Verification sources error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
// Blockchain transaction endpoint
router.post('/blockchain-transaction', auth_1.authenticateToken, async (req, res) => {
    try {
        const { transactionType, predictionId, amount, recipientAddress } = req.body;
        const userId = req.user?.id;
        // Validate required fields
        if (!transactionType || !predictionId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Verify prediction exists
        const { data: prediction, error: predictionError } = await supabase_1.supabase
            .from('predictions')
            .select('id, status, creator_id')
            .eq('id', predictionId)
            .single();
        if (predictionError || !prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }
        // Create blockchain transaction record
        const { data: transaction, error: transactionError } = await supabase_1.supabase
            .from('blockchain_transactions')
            .insert({
            user_id: userId,
            prediction_id: predictionId,
            transaction_type: transactionType,
            amount: amount,
            recipient_address: recipientAddress,
            status: 'pending',
            network: 'polygon',
            created_at: new Date().toISOString()
        })
            .select()
            .single();
        if (transactionError) {
            console.error('Blockchain transaction error:', transactionError);
            return res.status(500).json({ error: 'Failed to create blockchain transaction' });
        }
        res.json({
            success: true,
            transactionId: transaction.id,
            message: 'Blockchain transaction initiated'
        });
    }
    catch (error) {
        console.error('Blockchain transaction error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
