import express from 'express';
import { supabase } from '../config/database';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(optionalAuth);

// Simple logger function
const log = (message: string, ...args: any[]) => {
  console.log(`[COMMENTS] ${new Date().toISOString()} - ${message}`, ...args);
};

// Test route to verify the router is working
router.get('/test', (req, res) => {
  log('Comment test route hit by user:', req.user?.username);
  res.json({ 
    message: 'Comment routes are working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    user: req.user
  });
});

// Simple health check for comments
router.get('/health', (req, res) => {
  res.json({
    status: 'Comment service is running',
    timestamp: new Date().toISOString(),
    user: req.user,
    routes: [
      'GET /test',
      'GET /health', 
      'GET /predictions/:predictionId/comments',
      'POST /predictions/:predictionId/comments',
      'POST /:commentId/like',
      'PUT /:commentId',
      'DELETE /:commentId'
    ]
  });
});

// Get comments for a prediction
router.get('/predictions/:predictionId/comments', async (req, res) => {
  try {
    const { predictionId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    log(`Fetching comments for prediction ${predictionId}, page ${page}, limit ${limit}`);
    
    // Get comments from database
    const { data: comments, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `, { count: 'exact' })
      .eq('prediction_id', predictionId)
      .eq('is_deleted', false)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      log('Database error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Database error',
        details: error.message
      });
    }
    
    log(`Successfully returning ${comments?.length || 0} comments from database`);

    res.json({
      comments: comments || [],
      hasMore: count ? (offset + limit) < count : false,
      total: count || 0,
      page,
      limit,
      success: true,
      message: 'Comments fetched from database'
    });

  } catch (error) {
    log('Error in get comments route:', error);
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
    
    log(`Creating comment for prediction ${predictionId} by user ${req.user?.id}`);
    log('Request body:', JSON.stringify(req.body));

    // Basic validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      log('Invalid content provided:', content);
      return res.status(400).json({ 
        success: false,
        error: 'Comment content is required and must be a non-empty string' 
      });
    }

    if (content.length > 500) {
      log('Content too long:', content.length);
      return res.status(400).json({ 
        success: false,
        error: 'Comment too long (max 500 characters)' 
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Insert comment into database
    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        content: content.trim(),
        user_id: req.user.id,
        prediction_id: predictionId,
        parent_comment_id: parent_comment_id || null,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `)
      .single();

    if (error) {
      log('Database error creating comment:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create comment',
        details: error.message
      });
    }

    log(`Comment persisted in database: ${newComment.id}`);

    res.status(201).json({
      success: true,
      data: newComment
    });

  } catch (error) {
    log('Error in create comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Like/unlike a comment
router.post('/:commentId/like', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    log(`Like toggled for comment ${commentId} by user ${req.user.id}`);

    // Check if like already exists
    const { data: existingLike, error: fetchError } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('comment_id', commentId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      log('Error checking existing like:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Database error checking like'
      });
    }

    let liked = false;
    
    if (existingLike) {
      // Remove existing like
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (deleteError) {
        log('Error removing like:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove like'
        });
      }
      liked = false;
    } else {
      // Add new like
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: req.user.id,
          type: 'like'
        });

      if (insertError) {
        log('Error creating like:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create like'
        });
      }
      liked = true;
    }

    // Get updated like count
    const { data: likeCount, error: countError } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    const likes_count = likeCount?.length || 0;

    log(`Like result: liked=${liked}, likes_count=${likes_count}`);

    res.json({ 
      success: true,
      liked, 
      likes_count,
      message: 'Like toggled successfully'
    });

  } catch (error) {
    log('Error in like comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Edit comment endpoint
router.put('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    log(`Editing comment ${commentId} with content: ${content}`);
    
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

    // Update in database
    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', req.user.id)
      .eq('is_deleted', false)
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `)
      .single();

    if (error) {
      log('Database error updating comment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update comment',
        details: error.message
      });
    }

    if (!updatedComment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found or not authorized to edit'
      });
    }

    res.json({
      success: true,
      data: updatedComment
    });

  } catch (error) {
    log('Error in edit comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete comment endpoint
router.delete('/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    log(`Deleting comment ${commentId} by user ${req.user.id}`);

    // Soft delete in database
    const { error } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: '[deleted]'
      })
      .eq('id', commentId)
      .eq('user_id', req.user.id);

    if (error) {
      log('Database error deleting comment:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete comment',
        details: error.message
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });

  } catch (error) {
    log('Error in delete comment route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get comment replies (for lazy loading)
router.get('/:commentId/replies', async (req, res) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    
    log(`Fetching replies for comment ${commentId}, page ${page}, limit ${limit}`);

    const { data: replies, error, count } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, full_name, avatar_url, is_verified)
      `, { count: 'exact' })
      .eq('parent_comment_id', commentId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      log('Database error fetching replies:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch replies'
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: replies || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    log('Error in get replies route:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Debug endpoint to view database schema
router.get('/debug/schema', async (req, res) => {
  try {
    // Test comment insertion to see what columns are available
    const { error } = await supabase
      .from('comments')
      .select('*')
      .limit(1);
    
    if (error) {
      res.json({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      res.json({ message: 'Comments table is accessible' });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Catch-all for debugging - IMPORTANT: This should be LAST
router.all('*', (req, res) => {
  log(`❌ UNHANDLED ROUTE: ${req.method} ${req.originalUrl}`);
  log('Request details:');
  log('- Base URL:', req.baseUrl);
  log('- Path:', req.path);
  log('- Original URL:', req.originalUrl);
  log('- Method:', req.method);
  log('- Params:', req.params);
  log('- Query:', req.query);
  log('- User:', req.user?.username);
  log('Available routes:');
  log('- GET /test');
  log('- GET /health');
  log('- GET /predictions/:predictionId/comments');
  log('- POST /predictions/:predictionId/comments');
  log('- POST /:commentId/like');
  log('- PUT /:commentId');
  log('- DELETE /:commentId');
  log('- GET /:commentId/replies');
  log('- GET /debug/schema');
  
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    baseUrl: req.baseUrl,
    path: req.path,
    method: req.method,
    user: req.user,
    availableRoutes: [
      'GET /test',
      'GET /health',
      'GET /predictions/:predictionId/comments',
      'POST /predictions/:predictionId/comments',
      'POST /:commentId/like',
      'PUT /:commentId',
      'DELETE /:commentId',
      'GET /:commentId/replies',
      'GET /debug/schema'
    ]
  });
});

export default router;
