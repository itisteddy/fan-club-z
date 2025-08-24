"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const social_1 = require("../services/social");
const socialService = new social_1.SocialService();
const router = express_1.default.Router();
// Get comments for a prediction
router.get('/predictions/:predictionId/comments', async (req, res) => {
    try {
        const { predictionId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        console.log(`🔍 Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);
        const result = await socialService.getPredictionComments(predictionId, { page, limit });
        return res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    }
    catch (error) {
        console.error('❌ Error fetching comments:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Create a new comment
router.post('/predictions/:predictionId/comments', async (req, res) => {
    try {
        const { predictionId } = req.params;
        const { content, userId, parentCommentId } = req.body;
        if (!content || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Content and userId are required'
            });
        }
        console.log(`💬 Creating comment for prediction ${predictionId} by user ${userId}`);
        const newComment = await socialService.createComment(userId, {
            prediction_id: predictionId,
            content: content.trim(),
            parent_comment_id: parentCommentId || null
        });
        return res.status(201).json({
            success: true,
            data: newComment
        });
    }
    catch (error) {
        console.error('❌ Error creating comment:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Like/unlike a comment
router.post('/comments/:commentId/like', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }
        console.log(`👍 Toggling like for comment ${commentId} by user ${userId}`);
        await socialService.toggleCommentLike(userId, commentId);
        return res.json({
            success: true,
            message: 'Like toggled successfully'
        });
    }
    catch (error) {
        console.error('❌ Error toggling comment like:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Edit a comment
router.put('/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content, userId } = req.body;
        if (!content || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Content and userId are required'
            });
        }
        console.log(`✏️ Editing comment ${commentId} by user ${userId}`);
        const updatedComment = await socialService.updateComment(commentId, userId, content);
        return res.json({
            success: true,
            data: updatedComment
        });
    }
    catch (error) {
        console.error('❌ Error editing comment:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Delete a comment
router.delete('/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId is required'
            });
        }
        console.log(`🗑️ Deleting comment ${commentId} by user ${userId}`);
        await socialService.deleteComment(commentId, userId);
        return res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    }
    catch (error) {
        console.error('❌ Error deleting comment:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Social service is healthy',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /predictions/:predictionId/comments',
            'POST /predictions/:predictionId/comments',
            'POST /comments/:commentId/like',
            'PUT /comments/:commentId',
            'DELETE /comments/:commentId'
        ]
    });
});
exports.default = router;
