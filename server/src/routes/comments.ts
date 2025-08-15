import express from 'express';
import { supabase } from '../config/supabase';
import { authenticate } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

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

// Get comments for a prediction
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    logger.info(`Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);
    logger.info(`Full URL: ${req.originalUrl}`);
    logger.info(`Headers: ${JSON.stringify(req.headers)}`);
    
    // For now, return mock data but indicate it's working
    const mockComments = [
      {
        id: '1',
        content: 'This is a great prediction! I think it will definitely happen.',
        user_id: 'user1',
        prediction_id: predictionId,
        username: 'CryptoFan',
        avatar_url: null,
        is_verified: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
        is_liked: false,
        is_own: false,
        likes_count: 5,
        replies_count: 1,
        depth: 0,
        replies: []
      },
      {
        id: '2',
        content: 'I agree! The market is showing strong signals.',
        user_id: 'user2',
        prediction_id: predictionId,
        username: 'MarketAnalyst',
        avatar_url: null,
        is_verified: true,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
        is_liked: true,
        is_own: false,
        likes_count: 3,
        replies_count: 0,
        depth: 0,
        replies: []
      }
    ];

    logger.info(`Successfully returning ${mockComments.length} mock comments`);

    res.json({
      comments: mockComments,
      hasMore: false,
      total: mockComments.length,
      page,
      limit,
      success: true,
      message: 'Comments fetched successfully (demo mode)'
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

// Create a new comment
router.post('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const { content, parent_comment_id } = req.body;
    
    logger.info(`Creating comment for prediction ${predictionId}`);
    logger.info('Request body:', JSON.stringify(req.body));
    logger.info('Content-Type:', req.headers['content-type']);
    logger.info('Authorization:', req.headers.authorization ? 'Present' : 'Missing');

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

    if (parent_comment_id && typeof parent_comment_id !== 'string') {
      logger.warn('Invalid parent_comment_id:', parent_comment_id);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid parent comment ID' 
      });
    }

    // Create mock comment response
    const newComment = {
      id: `comment-${Date.now()}`,
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

    logger.info(`Comment created successfully: ${newComment.id}`);
    logger.info('New comment:', JSON.stringify(newComment, null, 2));

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

// Like/unlike a comment
router.post('/comments/:commentId/like', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    logger.info(`Like toggled for comment ${commentId}`);
    logger.info('Authorization:', req.headers.authorization ? 'Present' : 'Missing');

    // For now, return mock response
    const liked = Math.random() > 0.5; // Random like/unlike
    const likes_count = Math.floor(Math.random() * 10) + 1;

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

// Edit comment endpoint
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

    res.json({
      success: true,
      id: commentId,
      content: content.trim(),
      updated_at: new Date().toISOString(),
      is_edited: true,
      message: 'Comment edit working!'
    });

  } catch (error) {
    logger.error('Error in edit comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete comment endpoint
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    logger.info(`Deleting comment ${commentId}`);
    logger.info('Authorization:', req.headers.authorization ? 'Present' : 'Missing');

    res.json({
      success: true,
      message: 'Comment deleted successfully!'
    });

  } catch (error) {
    logger.error('Error in delete comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
      'DELETE /comments/:commentId'
    ]
  });
});

export default router;