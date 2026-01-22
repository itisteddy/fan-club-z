import express from 'express';
import { SocialService } from '../services/social';
import { supabase } from '../config/database';
import { createNotification } from '../services/notifications';

const socialService = new SocialService();

const router = express.Router();

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

    // Get userId from either userId field or user object
    const actualUserId = userId || user?.id;
    const actualParentId = parentCommentId || parent_comment_id;

    console.log('📝 Comment creation request:', {
      predictionId,
      content: content?.substring(0, 50) + '...',
      userId,
      userObject: user,
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

    // Phase 4: In-app notifications for comments (best-effort, idempotent)
    // Do NOT notify the author of their own comment.
    try {
      const { data: pred } = await supabase
        .from('predictions')
        .select('id,title,creator_id')
        .eq('id', predictionId)
        .maybeSingle();

      const predictionTitle = (pred as any)?.title || 'a prediction';
      const creatorId = (pred as any)?.creator_id as string | null;
      const commentId = (newComment as any)?.id as string | undefined;

      if (commentId && creatorId && creatorId !== actualUserId) {
        await createNotification({
          userId: creatorId,
          type: 'comment',
          title: 'New comment',
          body: `New comment on "${predictionTitle}"`,
          href: `/predictions/${predictionId}?tab=comments`,
          metadata: { predictionId, predictionTitle, commentId, fromUserId: actualUserId },
          externalRef: `notif:comment:creator:${commentId}`,
        }).catch(() => {});
      }

      // Notify participants (distinct user_ids) excluding author and creator
      if (commentId) {
        const { data: participants } = await supabase
          .from('prediction_entries')
          .select('user_id')
          .eq('prediction_id', predictionId);

        const uniq = new Set<string>();
        for (const row of participants || []) {
          const uid = (row as any)?.user_id as string | undefined;
          if (!uid) continue;
          if (uid === actualUserId) continue;
          if (creatorId && uid === creatorId) continue;
          uniq.add(uid);
          if (uniq.size >= 50) break;
        }

        for (const uid of uniq) {
          await createNotification({
            userId: uid,
            type: 'comment',
            title: 'New comment',
            body: `New comment on a prediction you joined: "${predictionTitle}"`,
            href: `/predictions/${predictionId}?tab=comments`,
            metadata: { predictionId, predictionTitle, commentId, fromUserId: actualUserId },
            externalRef: `notif:comment:participant:${commentId}:${uid}`,
          }).catch(() => {});
        }
      }
    } catch (e) {
      // Best-effort: never block comment creation
      console.warn('[social] comment notification error (non-fatal):', e);
    }

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

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    console.log(`🗑️ Deleting comment ${commentId} by user ${userId}`);

    await socialService.deleteComment(commentId, userId as string);

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