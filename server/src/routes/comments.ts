import express from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get comments for a prediction
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get user ID for like status if authenticated
    let userId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id;
      } catch (error) {
        // User not authenticated, continue without user context
      }
    }

    // Get top-level comments with user info
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          username,
          avatar_url,
          is_verified,
          full_name
        ),
        comment_likes!inner (
          user_id,
          reaction_type
        )
      `)
      .eq('prediction_id', predictionId)
      .is('parent_comment_id', null)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }

    // Format comments with user like status
    const formattedComments = comments?.map(comment => ({
      ...comment,
      username: comment.users?.username,
      avatar_url: comment.users?.avatar_url,
      is_verified: comment.users?.is_verified || false,
      is_liked: userId ? comment.comment_likes?.some(like => like.user_id === userId) : false,
      is_own: userId ? comment.user_id === userId : false,
      replies: []
    })) || [];

    // Check if there are more comments
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('prediction_id', predictionId)
      .is('parent_comment_id', null)
      .eq('is_deleted', false);

    const hasMore = count ? (offset + limit) < count : false;

    res.json({
      comments: formattedComments,
      hasMore,
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Error in get comments route:', error);
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

    const { data: replies, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          username,
          avatar_url,
          is_verified,
          full_name
        ),
        comment_likes (
          user_id,
          reaction_type
        )
      `)
      .eq('thread_id', threadId)
      .gt('depth', 0)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
      return res.status(500).json({ error: 'Failed to fetch replies' });
    }

    // Format replies with user like status
    const formattedReplies = replies?.map(reply => ({
      ...reply,
      username: reply.users?.username,
      avatar_url: reply.users?.avatar_url,
      is_verified: reply.users?.is_verified || false,
      is_liked: userId ? reply.comment_likes?.some(like => like.user_id === userId) : false,
      is_own: userId ? reply.user_id === userId : false
    })) || [];

    res.json(formattedReplies);
  } catch (error) {
    console.error('Error in get replies route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new comment
router.post('/predictions/:predictionId/comments', authenticate, async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { content, parent_comment_id } = req.body;
    const userId = req.user?.id;

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

    // If it's a reply, check if parent comment exists
    if (parent_comment_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, depth')
        .eq('id', parent_comment_id)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }

      // Check depth limit
      if (parentComment.depth >= 3) {
        return res.status(400).json({ error: 'Maximum nesting depth exceeded' });
      }
    }

    // Create the comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content: content.trim(),
        user_id: userId,
        prediction_id: predictionId,
        parent_comment_id: parent_comment_id || null
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
      console.error('Error creating comment:', error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }

    // Format response
    const formattedComment = {
      ...comment,
      username: comment.users?.username,
      avatar_url: comment.users?.avatar_url,
      is_verified: comment.users?.is_verified || false,
      is_liked: false,
      is_own: true,
      replies: []
    };

    res.status(201).json(formattedComment);
  } catch (error) {
    console.error('Error in create comment route:', error);
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
        is_edited: existingComment.content !== content.trim(),
        edited_at: existingComment.content !== content.trim() ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }

    res.json(updatedComment);
  } catch (error) {
    console.error('Error in update comment route:', error);
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
      .select('user_id, replies_count')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // If comment has replies, soft delete it
    if (existingComment.replies_count > 0) {
      const { error } = await supabase
        .from('comments')
        .update({
          content: '[deleted]',
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) {
        console.error('Error soft deleting comment:', error);
        return res.status(500).json({ error: 'Failed to delete comment' });
      }
    } else {
      // Hard delete if no replies
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        return res.status(500).json({ error: 'Failed to delete comment' });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in delete comment route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle like on a comment
router.post('/comments/:commentId/like', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;
    const { reaction_type = 'like' } = req.body;

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already liked this comment
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .eq('reaction_type', reaction_type)
      .single();

    let liked = false;
    let likes_count = 0;

    if (existingLike) {
      // Remove like
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        return res.status(500).json({ error: 'Failed to remove like' });
      }
      liked = false;
    } else {
      // Add like
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: userId,
          reaction_type
        });

      if (insertError) {
        console.error('Error adding like:', insertError);
        return res.status(500).json({ error: 'Failed to add like' });
      }
      liked = true;
    }

    // Get updated likes count
    const { data: updatedComment, error: countError } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    if (!countError && updatedComment) {
      likes_count = updatedComment.likes_count;
    }

    res.json({ liked, likes_count });
  } catch (error) {
    console.error('Error in toggle like route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Report a comment
router.post('/comments/:commentId/report', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user?.id;

    // Validate input
    const validReasons = ['spam', 'harassment', 'offensive', 'misinformation', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid report reason' });
    }

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user already reported this comment
    const { data: existingReport, error: reportCheckError } = await supabase
      .from('comment_reports')
      .select('id')
      .eq('comment_id', commentId)
      .eq('reporter_id', userId)
      .single();

    if (existingReport) {
      return res.status(400).json({ error: 'You have already reported this comment' });
    }

    // Create report
    const { data: report, error } = await supabase
      .from('comment_reports')
      .insert({
        comment_id: commentId,
        reporter_id: userId,
        reason,
        description: description || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return res.status(500).json({ error: 'Failed to create report' });
    }

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Error in report comment route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's comment notifications
router.get('/comments/notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: notifications, error } = await supabase
      .from('comment_notifications')
      .select(`
        *,
        comments (
          id,
          content,
          prediction_id,
          users:user_id (
            username,
            avatar_url
          ),
          predictions (
            title
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json(notifications || []);
  } catch (error) {
    console.error('Error in get notifications route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notifications as read
router.put('/comments/notifications/read', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { notification_ids } = req.body;

    const { error } = await supabase
      .from('comment_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', notification_ids || []);

    if (error) {
      console.error('Error marking notifications as read:', error);
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in mark notifications read route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
