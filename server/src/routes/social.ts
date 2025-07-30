import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  CreateClubSchema, 
  CreateCommentSchema, 
  CreateReactionSchema,
  PaginationQuerySchema 
} from '../../../shared/src/schemas';
import { SocialService } from '../services/social';
import { logger } from '../utils/logger';
import type { AuthenticatedRequest } from '../types/auth';
import type { ApiResponse, PaginatedResponse, Club, Comment, Reaction } from '../../../shared/src/types';

const router = Router();
const socialService = new SocialService();

// ============================================================================
// CLUBS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/social/clubs
 * Get all public clubs with pagination
 */
router.get('/clubs', validateRequest(PaginationQuerySchema, 'query'), async (req, res) => {
  try {
    const { page, limit } = req.query as any;
    const { search, category } = req.query as any;
    
    const result = await socialService.getPublicClubs({ page, limit }, { search, category });
    
    const response: PaginatedResponse<Club> = {
      success: true,
      data: result.clubs,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching clubs:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch clubs',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/v2/social/clubs
 * Create a new club
 */
router.post('/clubs', authenticateToken, validateRequest(CreateClubSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const clubData = req.body;
    
    const club = await socialService.createClub(userId, clubData);
    
    const response: ApiResponse<Club> = {
      success: true,
      message: 'Club created successfully',
      data: club,
    };
    
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating club:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create club',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/social/clubs/:id
 * Get club details
 */
router.get('/clubs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const club = await socialService.getClubById(id);
    
    if (!club) {
      const response: ApiResponse = {
        success: false,
        error: 'Club not found',
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse<Club> = {
      success: true,
      data: club,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching club:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch club',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/v2/social/clubs/:id/join
 * Join a club
 */
router.post('/clubs/:id/join', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id: clubId } = req.params;
    
    const membership = await socialService.joinClub(userId, clubId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Successfully joined club',
      data: membership,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error joining club:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join club',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/v2/social/clubs/:id/leave
 * Leave a club
 */
router.post('/clubs/:id/leave', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id: clubId } = req.params;
    
    await socialService.leaveClub(userId, clubId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Successfully left club',
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error leaving club:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to leave club',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/social/clubs/:id/members
 * Get club members
 */
router.get('/clubs/:id/members', validateRequest(PaginationQuerySchema, 'query'), async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const { page, limit } = req.query as any;
    
    const result = await socialService.getClubMembers(clubId, { page, limit });
    
    const response: PaginatedResponse = {
      success: true,
      data: result.members,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching club members:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch club members',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/social/clubs/:id/predictions
 * Get club predictions
 */
router.get('/clubs/:id/predictions', validateRequest(PaginationQuerySchema, 'query'), async (req, res) => {
  try {
    const { id: clubId } = req.params;
    const { page, limit } = req.query as any;
    
    const result = await socialService.getClubPredictions(clubId, { page, limit });
    
    const response: PaginatedResponse = {
      success: true,
      data: result.predictions,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching club predictions:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch club predictions',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// COMMENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/social/predictions/:id/comments
 * Get comments for a prediction
 */
router.get('/predictions/:id/comments', validateRequest(PaginationQuerySchema, 'query'), async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    const { page, limit } = req.query as any;
    
    const result = await socialService.getPredictionComments(predictionId, { page, limit });
    
    const response: PaginatedResponse<Comment> = {
      success: true,
      data: result.comments,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching comments:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch comments',
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/v2/social/comments
 * Create a new comment
 */
router.post('/comments', authenticateToken, validateRequest(CreateCommentSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const commentData = req.body;
    
    const comment = await socialService.createComment(userId, commentData);
    
    const response: ApiResponse<Comment> = {
      success: true,
      message: 'Comment created successfully',
      data: comment,
    };
    
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating comment:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create comment',
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/v2/social/comments/:id
 * Update a comment
 */
router.put('/comments/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id: commentId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Comment content is required',
      };
      return res.status(400).json(response);
    }
    
    const comment = await socialService.updateComment(commentId, userId, content);
    
    const response: ApiResponse<Comment> = {
      success: true,
      message: 'Comment updated successfully',
      data: comment,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error updating comment:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update comment',
    };
    res.status(500).json(response);
  }
});

/**
 * DELETE /api/v2/social/comments/:id
 * Delete a comment
 */
router.delete('/comments/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id: commentId } = req.params;
    
    await socialService.deleteComment(commentId, userId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Comment deleted successfully',
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error deleting comment:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete comment',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// REACTIONS ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/social/reactions
 * Add a reaction to a prediction
 */
router.post('/reactions', authenticateToken, validateRequest(CreateReactionSchema), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const reactionData = req.body;
    
    const reaction = await socialService.toggleReaction(userId, reactionData);
    
    const response: ApiResponse<Reaction | null> = {
      success: true,
      message: reaction ? 'Reaction added' : 'Reaction removed',
      data: reaction,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error toggling reaction:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle reaction',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/social/predictions/:id/reactions
 * Get reactions for a prediction
 */
router.get('/predictions/:id/reactions', async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    const reactions = await socialService.getPredictionReactions(predictionId);
    
    const response: ApiResponse = {
      success: true,
      data: reactions,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching reactions:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch reactions',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// USER SOCIAL DATA ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/social/user/clubs
 * Get clubs that the authenticated user is a member of
 */
router.get('/user/clubs', authenticateToken, validateRequest(PaginationQuerySchema, 'query'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page, limit } = req.query as any;
    
    const result = await socialService.getUserClubs(userId, { page, limit });
    
    const response: PaginatedResponse<Club> = {
      success: true,
      data: result.clubs,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching user clubs:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch user clubs',
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/v2/social/user/activity
 * Get user's social activity (comments, reactions, etc.)
 */
router.get('/user/activity', authenticateToken, validateRequest(PaginationQuerySchema, 'query'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { page, limit } = req.query as any;
    
    const result = await socialService.getUserActivity(userId, { page, limit });
    
    const response: PaginatedResponse = {
      success: true,
      data: result.activities,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching user activity:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch user activity',
    };
    res.status(500).json(response);
  }
});

// ============================================================================
// LEADERBOARDS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/social/leaderboards
 * Get leaderboards (global or club-specific)
 */
router.get('/leaderboards', validateRequest(PaginationQuerySchema, 'query'), async (req, res) => {
  try {
    const { page, limit } = req.query as any;
    const { type = 'global', period = 'all_time', clubId } = req.query as any;
    
    const result = await socialService.getLeaderboard({
      type,
      period,
      clubId,
      pagination: { page, limit },
    });
    
    const response: PaginatedResponse = {
      success: true,
      data: result.leaderboard,
      pagination: result.pagination,
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch leaderboard',
    };
    res.status(500).json(response);
  }
});

export default router;
