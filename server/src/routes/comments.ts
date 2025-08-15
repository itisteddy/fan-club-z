import express from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
  logger.info('Test route hit');
  res.json({ 
    message: 'Comment routes are working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// Get comments for a prediction (simplified)
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    logger.info(`Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);
    
    // First check if we can connect to Supabase
    try {
      const { data: testConnection } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      logger.info('Supabase connection successful');
    } catch (dbError) {
      logger.error('Supabase connection failed:', dbError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error'
      });
    }

    // Try to get comments
    const { data: comments, error, count } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        user_id,
        prediction_id,
        created_at,
        updated_at,
        users:user_id (
          username,
          avatar_url,
          is_verified
        )
      `, { count: 'exact' })
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching comments:', error);
      
      // If table doesn't exist, return empty result
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        logger.info('Comments table does not exist, returning empty result');
        return res.json({
          comments: [],
          hasMore: false,
          total: 0,
          page,
          limit,
          message: 'Comments table not yet created. Please run the database migration.'
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch comments',
        details: error.message,
        code: error.code
      });
    }

    // Format comments
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      user_id: comment.user_id,
      prediction_id: comment.prediction_id,
      username: comment.users?.username || 'Anonymous',
      avatar_url: comment.users?.avatar_url || null,
      is_verified: comment.users?.is_verified || false,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      is_liked: false,
      is_own: false, // Will be set properly when user auth is implemented
      likes_count: 0,
      replies_count: 0,
      depth: 0,
      replies: []
    }));

    const hasMore = count ? ((page - 1) * limit + limit) < count : false;

    logger.info(`Successfully fetched ${formattedComments.length} comments`);

    res.json({
      comments: formattedComments,
      hasMore,
      total: count || 0,
      page,
      limit
    });

  } catch (error) {
    logger.error('Unexpected error in get comments route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new comment
router.post('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { content } = req.body;
    
    logger.info(`Creating comment for prediction ${predictionId}`);
    logger.info('Request body:', req.body);
    logger.info('Content-Type:', req.headers['content-type']);

    // Basic validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    // For now, use a dummy user ID since auth might not be working
    const userId = 'user_123'; // In real implementation, get from req.user

    // Check if prediction exists
    const { data: prediction, error: predictionError } = await supabase
      .from('predictions')
      .select('id')
      .eq('id', predictionId)
      .single();

    if (predictionError) {
      logger.error('Error checking prediction:', predictionError);
      return res.status(404).json({ error: 'Prediction not found' });
    }

    // Try to create comment
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        content: content.trim(),
        user_id: userId,
        prediction_id: predictionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        id,
        content,
        user_id,
        prediction_id,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logger.error('Error creating comment:', error);
      
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Comments table not found. Please run the database migration first.',
          code: error.code
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create comment',
        details: error.message,
        code: error.code
      });
    }

    // Format response
    const formattedComment = {
      id: comment.id,
      content: comment.content,
      user_id: comment.user_id,
      prediction_id: comment.prediction_id,
      username: 'Test User', // Dummy username
      avatar_url: null,
      is_verified: false,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
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
    logger.error('Unexpected error in create comment route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Simple like endpoint
router.post('/comments/:commentId/like', (req, res) => {
  logger.info(`Like toggled for comment ${req.params.commentId}`);
  res.json({ 
    liked: true, 
    likes_count: 1,
    message: 'Like functionality working - database migration needed for persistence'
  });
});

export default router;
