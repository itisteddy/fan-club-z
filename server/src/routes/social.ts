import express from 'express';
import { SocialService } from '../services/social';
import { optionalAuth } from '../middleware/auth';

const socialService = new SocialService();

const router = express.Router();

// Apply auth middleware to all routes
router.use(optionalAuth);

// Get comments for a prediction
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    console.log(`🔍 Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);

    const result = await socialService.getPredictionComments(predictionId, { page, limit });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });

  } catch (error) {
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
    const { content, userId, user, parentCommentId, parent_comment_id } = req.body;

    // Get userId from either request body, user object, or auth middleware
    const actualUserId = userId || user?.id || req.user?.id;
    const actualParentId = parentCommentId || parent_comment_id;

    console.log('📝 Comment creation request:', {
      predictionId,
      content: content?.substring(0, 50) + '...',
      userId,
      userObject: user,
      authUser: req.user?.username,
      actualUserId,
      parentCommentId,
      parent_comment_id,
      actualParentId
    });

    if (!content || !actualUserId) {
      console.log('❌ Missing required fields:', { 
        content: !!content, 
        contentLength: content?.length,
        userId: !!userId,
        userObject: !!user,
        authUser: !!req.user,
        actualUserId: !!actualUserId,
        fullBody: req.body 
      });
      return res.status(400).json({
        success: false,
        error: 'Content and userId are required',
        debug: {
          hasContent: !!content,
          hasUserId: !!userId,
          hasUserObject: !!user,
          hasAuthUser: !!req.user,
          extractedUserId: actualUserId
        }
      });
    }

    console.log(`💬 Creating comment for prediction ${predictionId} by user ${actualUserId}`);

    const newComment = await socialService.createComment(actualUserId, {
      prediction_id: predictionId,
      content: content.trim(),
      parent_comment_id: actualParentId || null
    });

    return res.status(201).json({
      success: true,
      data: newComment
    });

  } catch (error) {
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

    // Get userId from request body or auth middleware
    const actualUserId = userId || req.user?.id;

    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required or user not authenticated'
      });
    }

    console.log(`👍 Toggling like for comment ${commentId} by user ${actualUserId}`);

    await socialService.toggleCommentLike(actualUserId, commentId);

    return res.json({
      success: true,
      message: 'Like toggled successfully'
    });

  } catch (error) {
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

    // Get userId from request body or auth middleware
    const actualUserId = userId || req.user?.id;

    if (!content || !actualUserId) {
      return res.status(400).json({
        success: false,
        error: 'Content and userId are required'
      });
    }

    console.log(`✏️ Editing comment ${commentId} by user ${actualUserId}`);

    const updatedComment = await socialService.updateComment(commentId, actualUserId, content);

    return res.json({
      success: true,
      data: updatedComment
    });

  } catch (error) {
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

    // Get userId from query params or auth middleware
    const actualUserId = userId || req.user?.id;

    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required or user not authenticated'
      });
    }

    console.log(`🗑️ Deleting comment ${commentId} by user ${actualUserId}`);

    await socialService.deleteComment(commentId, actualUserId as string);

    return res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
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

export default router;