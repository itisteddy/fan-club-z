import express from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Get comments for a prediction
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    logger.info(`Fetching comments for prediction ${predictionId}, page ${page}`);
    
    // Get user ID for like status if authenticated
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
        logger.info(`Authenticated user: ${userId}`);
      } catch (error) {
        logger.info('User not authenticated, continuing without user context');
      }
    }

    // First, check if comments table exists and has required columns
    const { data: tableInfo, error: tableError } = await supabase
      .from('comments')
      .select('id')
      .limit(1);

    if (tableError) {
      logger.error('Comments table error:', tableError);
      // Fallback: return empty comments
      return res.json({
        comments: [],
        hasMore: false,
        total: 0,
        page,
        limit
      });
    }

    // Get top-level comments with user info (simplified query for now)
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          username,
          avatar_url,
          is_verified,
          full_name
        )
      `)
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    // Format comments with user like status (simplified)
    const formattedComments = comments?.map(comment => ({
      ...comment,
      username: comment.users?.username || 'Anonymous',
      avatar_url: comment.users?.avatar_url,
      is_verified: comment.users?.is_verified || false,
      is_liked: false, // Will be implemented with likes system
      is_own: userId ? comment.user_id === userId : false,
      likes_count: comment.likes_count || 0,
      replies_count: comment.replies_count || 0,
      depth: comment.depth || 0,
      replies: []
    })) || [];

    // Check if there are more comments
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('prediction_id', predictionId);

    const hasMore = count ? (offset + limit) < count : false;

    logger.info(`Found ${formattedComments.length} comments for prediction ${predictionId}`);

    res.json({
      comments: formattedComments,
      hasMore,
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    logger.error('Error in get comments route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get replies for a comment thread
router.get('/comments/:threadId/replies', async (req, res) => {
  try {
    const { threadId } = req.params;
    
    // Get user ID if authenticated
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      } catch (error) {
        // Continue without user context
      }
    }

    // For now, return empty replies until thread system is fully implemented
    const replies: any[] = [];

    res.json(replies);
  } catch (error) {
    logger.error('Error in get replies route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new comment
router.post('/predictions/:predictionId/comments', authenticate, async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { content, parent_comment_id } = req.body;
    const userId = req.user?.id;

    logger.info(`Creating comment for prediction ${predictionId} by user ${userId}`);

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    // Check if prediction exists
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('id')
      .eq('id', predictionId)
      .single();

    if (predictionError || !prediction) {
      return res.status(404).json({ error: 'Prediction not found' });
    }

    // Create the comment with basic structure
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content: content.trim(),
        user_id: userId,
        prediction_id: predictionId,
        parent_comment_id: parent_comment_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        users:user_id (
          username,
          avatar_url,
          is_verified,
          full_name
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    // Format response
    const formattedComment = {
      ...comment,
      username: comment.users?.username || 'Anonymous',
      avatar_url: comment.users?.avatar_url,
      is_verified: comment.users?.is_verified || false,
      is_liked: false,
      is_own: true,
      likes_count: 0,
      replies_count: 0,
      depth: 0,
      replies: []
    };

    logger.info(`Comment created successfully: ${comment.id}`);
    res.status(201).json(formattedComment);
  } catch (error) {
    logger.error('Error in create comment route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a comment
router.put('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    // Check if comment exists and user owns it
    const { data: existingComment, error: checkError } = await supabase
      .from('comments')
      .select('user_id, content')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }

    res.json(updatedComment);
  } catch (error) {
    logger.error('Error in update comment route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a comment
router.delete('/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    // Check if comment exists and user owns it
    const { data: existingComment, error: checkError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // Delete the comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      logger.error('Error deleting comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error in delete comment route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle like on a comment (basic implementation)
router.post('/comments/:commentId/like', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // For now, return a simple response
    // The like system will be fully implemented after the enhanced schema is applied
    res.json({ 
      liked: true, 
      likes_count: 1,
      message: 'Like system will be fully functional after database migration' 
    });
  } catch (error) {
    logger.error('Error in toggle like route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
