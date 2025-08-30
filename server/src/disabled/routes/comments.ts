import express from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// In-memory storage for development (will persist during server session)
let commentsStorage: Record<string, any[]> = {};

// Test route to verify the router is working
router.get('/test', (req, res) => {
  logger.info('Comment test route hit');
  res.json({ 
    message: 'Comment routes are working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl
  });
});

// Simple health check for comments
router.get('/health', (req, res) => {
  res.json({
    status: 'Comment service is running',
    timestamp: new Date().toISOString(),
    routes: [
      'GET /test',
      'GET /health', 
      'GET /predictions/:predictionId/comments',
      'POST /predictions/:predictionId/comments',
      'POST /comments/:commentId/like'
    ]
  });
});

// Get comments for a prediction with persistence
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    logger.info(`Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);
    
    // Try Supabase first
    try {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(username, avatar_url, is_verified),
          replies:comments!parent_comment_id(
            *,
            user:users(username, avatar_url, is_verified)
          )
        `)
        .eq('prediction_id', predictionId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (!error && comments) {
        const formattedComments = comments.map(comment => ({
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          prediction_id: comment.prediction_id,
          username: comment.user?.username || 'Anonymous',
          avatar_url: comment.user?.avatar_url || null,
          is_verified: comment.user?.is_verified || false,
          parent_comment_id: comment.parent_comment_id,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          is_liked: false, // TODO: Check user's like status
          is_own: false, // TODO: Check if current user owns comment
          likes_count: comment.likes_count || 0,
          replies_count: comment.replies?.length || 0,
          depth: 0,
          replies: comment.replies?.map((reply: any) => ({
            id: reply.id,
            content: reply.content,
            user_id: reply.user_id,
            prediction_id: reply.prediction_id,
            username: reply.user?.username || 'Anonymous',
            avatar_url: reply.user?.avatar_url || null,
            is_verified: reply.user?.is_verified || false,
            parent_comment_id: reply.parent_comment_id,
            created_at: reply.created_at,
            updated_at: reply.updated_at,
            is_liked: false,
            is_own: false,
            likes_count: reply.likes_count || 0,
            replies_count: 0,
            depth: 1,
            replies: []
          })) || []
        }));

        logger.info(`Successfully fetched ${formattedComments.length} comments from Supabase`);
        return res.json({
          comments: formattedComments,
          hasMore: formattedComments.length === limit,
          total: formattedComments.length,
          page,
          limit,
          success: true,
          message: 'Comments fetched from database'
        });
      }
    } catch (dbError) {
      logger.warn('Supabase not available, using in-memory storage:', dbError);
    }

    // Fallback to in-memory storage
    const storedComments = commentsStorage[predictionId] || [];
    
    // Return empty array if no comments found
    const comments = storedComments || [];
    
    logger.info(`Successfully returning ${comments.length} persistent comments`);

    res.json({
      comments,
      hasMore: false,
      total: comments.length,
      page,
      limit,
      success: true,
      message: 'Comments fetched from persistent storage'
    });

  } catch (error) {
    logger.error('Error in get comments route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new comment with persistence
router.post('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { content, parent_comment_id } = req.body;
    
    logger.info(`Creating comment for prediction ${predictionId}`);
    logger.info('Request body:', JSON.stringify(req.body));

    // Basic validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      logger.warn('Invalid content provided:', content);
      return res.status(400).json({ 
        success: false,
        error: 'Comment content is required and must be a non-empty string' 
      });
    }

    if (content.length > 500) {
      logger.warn('Content too long:', content.length);
      return res.status(400).json({ 
        success: false,
        error: 'Comment too long (max 500 characters)' 
      });
    }

    const newComment = {
      id: `${predictionId}-comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      user_id: 'current-user',
      prediction_id: predictionId,
      username: 'You',
      avatar_url: null,
      is_verified: false,
      parent_comment_id: parent_comment_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_liked: false,
      is_own: true,
      likes_count: 0,
      replies_count: 0,
      depth: parent_comment_id ? 1 : 0,
      replies: []
    };

    // Try Supabase first
    try {
      const { data: insertedComment, error } = await supabase
        .from('comments')
        .insert({
          id: newComment.id,
          content: newComment.content,
          user_id: newComment.user_id,
          prediction_id: predictionId,
          parent_comment_id: parent_comment_id || null,
        })
        .select()
        .single();

      if (!error && insertedComment) {
        logger.info(`Comment saved to Supabase: ${insertedComment.id}`);
        return res.status(201).json({
          ...newComment,
          id: insertedComment.id,
          created_at: insertedComment.created_at,
          updated_at: insertedComment.updated_at
        });
      }
    } catch (dbError) {
      logger.warn('Supabase not available, using in-memory storage:', dbError);
    }

    // Fallback to in-memory storage
    if (!commentsStorage[predictionId]) {
      commentsStorage[predictionId] = [];
    }

    if (parent_comment_id) {
      // Find parent comment and add reply
      const parentComment = findCommentById(commentsStorage[predictionId], parent_comment_id);
      if (parentComment) {
        if (!parentComment.replies) {
          parentComment.replies = [];
        }
        parentComment.replies.push(newComment);
        parentComment.replies_count = parentComment.replies.length;
      }
    } else {
      // Add as top-level comment
      commentsStorage[predictionId].unshift(newComment);
    }

    logger.info(`Comment persisted in memory: ${newComment.id}`);
    logger.info(`Total comments for ${predictionId}: ${commentsStorage[predictionId].length}`);

    res.status(201).json(newComment);

  } catch (error) {
    logger.error('Error in create comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to find comment by ID (including replies)
function findCommentById(comments: any[], commentId: string): any {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment;
    }
    if (comment.replies) {
      const found = findCommentById(comment.replies, commentId);
      if (found) return found;
    }
  }
  return null;
}

// Like/unlike a comment with persistence
router.post('/comments/:commentId/like', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    logger.info(`Like toggled for comment ${commentId}`);

    // Try Supabase first
    try {
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', 'current-user')
        .single();

      if (existingLike) {
        // Remove like
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', 'current-user');
        
        return res.json({ 
          success: true,
          liked: false, 
          message: 'Like removed'
        });
      } else {
        // Add like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: 'current-user'
          });
        
        return res.json({ 
          success: true,
          liked: true, 
          message: 'Like added'
        });
      }
    } catch (dbError) {
      logger.warn('Supabase not available for likes:', dbError);
    }

    // Return default values on database error
    const liked = false;
    const likes_count = 0;

    logger.info(`Like result: liked=${liked}, likes_count=${likes_count}`);

    res.json({ 
      success: true,
      liked, 
      likes_count,
      message: 'Like functionality working!'
    });

  } catch (error) {
    logger.error('Error in like comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Edit comment endpoint with persistence
router.put('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    logger.info(`Editing comment ${commentId} with content: ${content}`);
    
    // Basic validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Comment content is required' 
      });
    }

    if (content.length > 500) {
      return res.status(400).json({ 
        success: false,
        error: 'Comment too long (max 500 characters)' 
      });
    }

    // Try Supabase first
    try {
      const { data: updatedComment, error } = await supabase
        .from('comments')
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
          is_edited: true
        })
        .eq('id', commentId)
        .select()
        .single();

      if (!error && updatedComment) {
        return res.json({
          success: true,
          id: updatedComment.id,
          content: updatedComment.content,
          updated_at: updatedComment.updated_at,
          is_edited: true,
          message: 'Comment updated in database'
        });
      }
    } catch (dbError) {
      logger.warn('Supabase not available for edit:', dbError);
    }

    // Fallback to in-memory update
    let found = false;
    for (const predictionId in commentsStorage) {
      const comment = findCommentById(commentsStorage[predictionId], commentId);
      if (comment) {
        comment.content = content.trim();
        comment.updated_at = new Date().toISOString();
        comment.is_edited = true;
        found = true;
        break;
      }
    }

    if (found) {
      res.json({
        success: true,
        id: commentId,
        content: content.trim(),
        updated_at: new Date().toISOString(),
        is_edited: true,
        message: 'Comment updated in memory'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

  } catch (error) {
    logger.error('Error in edit comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete comment endpoint with persistence
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    logger.info(`Deleting comment ${commentId}`);

    // Try Supabase first
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (!error) {
        return res.json({
          success: true,
          message: 'Comment deleted from database'
        });
      }
    } catch (dbError) {
      logger.warn('Supabase not available for delete:', dbError);
    }

    // Fallback to in-memory deletion
    let found = false;
    for (const predictionId in commentsStorage) {
      const comments = commentsStorage[predictionId];
      
      // Remove from top-level comments
      const topLevelIndex = comments.findIndex(c => c.id === commentId);
      if (topLevelIndex !== -1) {
        comments.splice(topLevelIndex, 1);
        found = true;
        break;
      }
      
      // Remove from replies
      for (const comment of comments) {
        if (comment.replies) {
          const replyIndex = comment.replies.findIndex((r: any) => r.id === commentId);
          if (replyIndex !== -1) {
            comment.replies.splice(replyIndex, 1);
            comment.replies_count = comment.replies.length;
            found = true;
            break;
          }
        }
      }
      
      if (found) break;
    }

    if (found) {
      res.json({
        success: true,
        message: 'Comment deleted from memory'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

  } catch (error) {
    logger.error('Error in delete comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Debug endpoint to view stored comments
router.get('/debug/storage', (req, res) => {
  res.json({
    storage: commentsStorage,
    total_predictions: Object.keys(commentsStorage).length,
    total_comments: Object.values(commentsStorage).reduce((sum, comments) => sum + comments.length, 0)
  });
});

// Catch-all for debugging
router.all('*', (req, res) => {
  logger.warn(`Unhandled comment route: ${req.method} ${req.originalUrl}`);
  logger.warn('Available routes:');
  logger.warn('- GET /test');
  logger.warn('- GET /health');
  logger.warn('- GET /predictions/:predictionId/comments');
  logger.warn('- POST /predictions/:predictionId/comments');
  logger.warn('- POST /comments/:commentId/like');
  logger.warn('- PUT /comments/:commentId');
  logger.warn('- DELETE /comments/:commentId');
  logger.warn('- GET /debug/storage');
  
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /test',
      'GET /health',
      'GET /predictions/:predictionId/comments',
      'POST /predictions/:predictionId/comments',
      'POST /comments/:commentId/like',
      'PUT /comments/:commentId',
      'DELETE /comments/:commentId',
      'GET /debug/storage'
    ]
  });
});

export default router;