import { Router } from 'express';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';

const router = Router();

// GET /api/v2/predictions/:id/activity - Get activity feed for a prediction
router.get('/predictions/:id/activity', async (req, res) => {
  try {
    const { id: predictionId } = req.params;
    const { cursor, limit = '25' } = req.query;
    
    console.log('📊 Activity feed endpoint called:', { predictionId, cursor, limit });

    // Validate prediction ID
    if (!predictionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prediction ID is required',
        version: VERSION
      });
    }

    // Parse limit
    const limitNum = Math.min(parseInt(limit as string) || 25, 100); // Max 100 items

    // Build query
    let query = supabase
      .from('prediction_activity_feed_v1')
      .select(`
        ts, type, ref_id, actor_id, data,
        actor:actor_id (
          id, username, full_name, avatar_url, is_verified
        )
      `)
      .eq('prediction_id', predictionId)
      .order('ts', { ascending: false })
      .limit(limitNum);

    // Add cursor for pagination
    if (cursor) {
      query = query.lt('ts', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching activity feed:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch activity feed',
        version: VERSION
      });
    }

    // Transform data for client
    const transformedData = data?.map(item => ({
      id: item.ref_id,
      timestamp: item.ts,
      type: item.type,
      actor: item.actor ? {
        id: item.actor.id,
        username: item.actor.username,
        full_name: item.actor.full_name,
        avatar_url: item.actor.avatar_url,
        is_verified: item.actor.is_verified
      } : null,
      data: item.data
    })) || [];

    // Determine next cursor
    const nextCursor = transformedData.length === limitNum 
      ? transformedData[transformedData.length - 1]?.timestamp 
      : null;

    res.json({
      items: transformedData,
      nextCursor,
      hasMore: !!nextCursor,
      version: VERSION
    });

  } catch (error) {
    console.error('Activity feed error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity feed',
      version: VERSION
    });
  }
});

// GET /api/v2/activity/user/:userId - Get activity feed for a user across all predictions
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = '25' } = req.query;
    
    console.log('👤 User activity feed endpoint called:', { userId, cursor, limit });

    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User ID is required',
        version: VERSION
      });
    }

    // Parse limit
    const limitNum = Math.min(parseInt(limit as string) || 25, 100);

    // Build query
    let query = supabase
      .from('prediction_activity_feed_v1')
      .select(`
        prediction_id, ts, type, ref_id, actor_id, data,
        actor:actor_id (
          id, username, full_name, avatar_url, is_verified
        ),
        prediction:predictions!inner (
          id, title, status
        )
      `)
      .eq('actor_id', userId)
      .order('ts', { ascending: false })
      .limit(limitNum);

    // Add cursor for pagination
    if (cursor) {
      query = query.lt('ts', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user activity feed:', error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user activity feed',
        version: VERSION
      });
    }

    // Transform data for client
    const transformedData = data?.map(item => ({
      id: item.ref_id,
      predictionId: item.prediction_id,
      predictionTitle: item.prediction?.title,
      predictionStatus: item.prediction?.status,
      timestamp: item.ts,
      type: item.type,
      actor: item.actor ? {
        id: item.actor.id,
        username: item.actor.username,
        full_name: item.actor.full_name,
        avatar_url: item.actor.avatar_url,
        is_verified: item.actor.is_verified
      } : null,
      data: item.data
    })) || [];

    // Determine next cursor
    const nextCursor = transformedData.length === limitNum 
      ? transformedData[transformedData.length - 1]?.timestamp 
      : null;

    res.json({
      items: transformedData,
      nextCursor,
      hasMore: !!nextCursor,
      version: VERSION
    });

  } catch (error) {
    console.error('User activity feed error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user activity feed',
      version: VERSION
    });
  }
});

export default router;
