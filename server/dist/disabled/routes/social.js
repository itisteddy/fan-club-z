"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const shared_1 = require("@fanclubz/shared");
const social_1 = require("../services/social");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
const socialService = new social_1.SocialService();
router.get('/clubs', (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const { page, limit } = req.query;
        const { search, category } = req.query;
        const result = await socialService.getPublicClubs({ page, limit }, { search, category });
        const response = {
            success: true,
            data: result.clubs,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching clubs:', error);
        const response = {
            success: false,
            error: 'Failed to fetch clubs',
        };
        res.status(500).json(response);
    }
});
router.post('/clubs', auth_1.authenticateToken, (0, validation_1.validateRequest)(shared_1.CreateClubSchema), async (req, res) => {
    try {
        const userId = req.user.id;
        const clubData = req.body;
        const club = await socialService.createClub(userId, clubData);
        const response = {
            success: true,
            message: 'Club created successfully',
            data: club,
        };
        res.status(201).json(response);
    }
    catch (error) {
        logger_1.default.error('Error creating club:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create club',
        };
        res.status(500).json(response);
    }
});
router.get('/clubs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const club = await socialService.getClubById(id);
        if (!club) {
            const response = {
                success: false,
                error: 'Club not found',
            };
            return res.status(404).json(response);
        }
        const response = {
            success: true,
            data: club,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching club:', error);
        const response = {
            success: false,
            error: 'Failed to fetch club',
        };
        res.status(500).json(response);
    }
});
router.post('/clubs/:id/join', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: clubId } = req.params;
        const membership = await socialService.joinClub(userId, clubId);
        const response = {
            success: true,
            message: 'Successfully joined club',
            data: membership,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error joining club:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to join club',
        };
        res.status(500).json(response);
    }
});
router.post('/clubs/:id/leave', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: clubId } = req.params;
        await socialService.leaveClub(userId, clubId);
        const response = {
            success: true,
            message: 'Successfully left club',
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error leaving club:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to leave club',
        };
        res.status(500).json(response);
    }
});
router.get('/clubs/:id/members', (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const { id: clubId } = req.params;
        const { page, limit } = req.query;
        const result = await socialService.getClubMembers(clubId, { page, limit });
        const response = {
            success: true,
            data: result.members,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching club members:', error);
        const response = {
            success: false,
            error: 'Failed to fetch club members',
        };
        res.status(500).json(response);
    }
});
router.get('/clubs/:id/predictions', (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const { id: clubId } = req.params;
        const { page, limit } = req.query;
        const result = await socialService.getClubPredictions(clubId, { page, limit });
        const response = {
            success: true,
            data: result.predictions,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching club predictions:', error);
        const response = {
            success: false,
            error: 'Failed to fetch club predictions',
        };
        res.status(500).json(response);
    }
});
router.get('/predictions/:id/comments', (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const { id: predictionId } = req.params;
        const { page, limit } = req.query;
        const result = await socialService.getPredictionComments(predictionId, { page, limit });
        const response = {
            success: true,
            data: result.data,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching comments:', error);
        const response = {
            success: false,
            error: 'Failed to fetch comments',
        };
        res.status(500).json(response);
    }
});
router.post('/comments', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { prediction_id, content, parent_comment_id } = req.body;
        if (!prediction_id || !content) {
            const response = {
                success: false,
                error: 'prediction_id and content are required',
            };
            return res.status(400).json(response);
        }
        if (content.length > 280) {
            const response = {
                success: false,
                error: 'Comment must be 280 characters or less',
            };
            return res.status(400).json(response);
        }
        const comment = await socialService.createComment(userId, {
            prediction_id,
            content: content.trim(),
            parent_comment_id
        });
        const response = {
            success: true,
            message: 'Comment created successfully',
            data: comment,
        };
        res.status(201).json(response);
    }
    catch (error) {
        logger_1.default.error('Error creating comment:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create comment',
        };
        res.status(500).json(response);
    }
});
router.put('/comments/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: commentId } = req.params;
        const { content } = req.body;
        if (!content || content.trim().length === 0) {
            const response = {
                success: false,
                error: 'Comment content is required',
            };
            return res.status(400).json(response);
        }
        const comment = await socialService.updateComment(commentId, userId, content);
        const response = {
            success: true,
            message: 'Comment updated successfully',
            data: comment,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error updating comment:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update comment',
        };
        res.status(500).json(response);
    }
});
router.delete('/comments/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: commentId } = req.params;
        await socialService.deleteComment(commentId, userId);
        const response = {
            success: true,
            message: 'Comment deleted successfully',
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error deleting comment:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete comment',
        };
        res.status(500).json(response);
    }
});
router.post('/comments/:id/like', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id: commentId } = req.params;
        await socialService.toggleCommentLike(userId, commentId);
        const response = {
            success: true,
            message: 'Comment like toggled successfully',
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error toggling comment like:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle comment like',
        };
        res.status(500).json(response);
    }
});
router.post('/reactions', auth_1.authenticateToken, (0, validation_1.validateRequest)(shared_1.CreateReactionSchema), async (req, res) => {
    try {
        const userId = req.user.id;
        const reactionData = req.body;
        const reaction = await socialService.toggleReaction(userId, reactionData);
        const response = {
            success: true,
            message: reaction ? 'Reaction added' : 'Reaction removed',
            data: reaction,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error toggling reaction:', error);
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle reaction',
        };
        res.status(500).json(response);
    }
});
router.get('/predictions/:id/reactions', async (req, res) => {
    try {
        const { id: predictionId } = req.params;
        const reactions = await socialService.getPredictionReactions(predictionId);
        const response = {
            success: true,
            data: reactions,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching reactions:', error);
        const response = {
            success: false,
            error: 'Failed to fetch reactions',
        };
        res.status(500).json(response);
    }
});
router.get('/user/clubs', auth_1.authenticateToken, (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;
        const result = await socialService.getUserClubs(userId, { page, limit });
        const response = {
            success: true,
            data: result.clubs,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching user clubs:', error);
        const response = {
            success: false,
            error: 'Failed to fetch user clubs',
        };
        res.status(500).json(response);
    }
});
router.get('/user/activity', auth_1.authenticateToken, (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;
        const result = await socialService.getUserActivity(userId, { page, limit });
        const response = {
            success: true,
            data: result.activities,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching user activity:', error);
        const response = {
            success: false,
            error: 'Failed to fetch user activity',
        };
        res.status(500).json(response);
    }
});
router.get('/leaderboards', (0, validation_1.validateRequest)(shared_1.PaginationQuerySchema, 'query'), async (req, res) => {
    try {
        const { page, limit } = req.query;
        const { type = 'global', period = 'all_time', clubId } = req.query;
        const result = await socialService.getLeaderboard({
            type,
            period,
            clubId,
            pagination: { page, limit },
        });
        const response = {
            success: true,
            data: result.leaderboard,
            pagination: result.pagination,
        };
        res.json(response);
    }
    catch (error) {
        logger_1.default.error('Error fetching leaderboard:', error);
        const response = {
            success: false,
            error: 'Failed to fetch leaderboard',
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=social.js.map