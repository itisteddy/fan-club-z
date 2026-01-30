import express from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

// [PERF] Helper to check conditional GET and return 304 if ETag matches
function checkETag(req: express.Request, res: express.Response, data: unknown): boolean {
  const etag = generateETag(data);
  const ifNoneMatch = req.headers['if-none-match'];
  
  if (ifNoneMatch && ifNoneMatch === etag) {
    res.status(304).end();
    return true;
  }
  
  // [PERF] Set caching headers
  res.setHeader('Cache-Control', 'private, max-age=30');
  res.setHeader('ETag', etag);
  return false;
}

const router = express.Router();

// GET /api/v2/users/leaderboard - Get leaderboard data (must be before /:id route)
router.get('/leaderboard', async (req, res) => {
  try {
    const type = (req.query.type as string) || 'predictions';
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    // Fetch all entries (recent window can be added later if needed)
    const { data: entries, error: entriesError } = await supabase
      .from('prediction_entries')
      .select('user_id, amount, actual_payout, status');

    if (entriesError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch prediction entries for leaderboard',
        version: VERSION,
        details: entriesError.message
      });
    }

    // Fetch created predictions
    const { data: created, error: createdError } = await supabase
      .from('predictions')
      .select('id, creator_id');

    if (createdError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch predictions for leaderboard',
        version: VERSION,
        details: createdError.message
      });
    }

    // Aggregate by user
    const byUser: Record<string, any> = {};
    
    // Process entries
    for (const entry of entries || []) {
      const uid = entry.user_id;
      if (!byUser[uid]) {
        byUser[uid] = { total_invested: 0, total_profit: 0, total_entries: 0, won_entries: 0, predictions_count: 0 };
      }
      byUser[uid].total_invested += entry.amount || 0;
      byUser[uid].total_profit += (entry.actual_payout || 0) - (entry.amount || 0);
      byUser[uid].total_entries += 1;
      
      // Track won entries
      if (entry.status === 'won' || (entry.actual_payout && entry.actual_payout > entry.amount)) {
        byUser[uid].won_entries += 1;
      }
    }

    // Process created predictions
    for (const pred of created || []) {
      const uid = pred.creator_id;
      if (!byUser[uid]) {
        byUser[uid] = { total_invested: 0, total_profit: 0, total_entries: 0, won_entries: 0, predictions_count: 0 };
      }
      byUser[uid].predictions_count = (byUser[uid].predictions_count || 0) + 1;
    }

    const userIds = Object.keys(byUser);
    if (userIds.length === 0) {
      return res.json({ data: [], message: 'No leaderboard data', version: VERSION });
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, og_badge')
      .in('id', userIds);

    if (usersError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch users for leaderboard',
        version: VERSION,
        details: usersError.message
      });
    }

    // Combine and sort
    const leaderboard = (users || []).map(user => {
      const stats = byUser[user.id];
      // Calculate actual win rate: (won entries / total entries) * 100
      const winRate = stats.total_entries > 0 ? Math.round((stats.won_entries / stats.total_entries) * 100) : 0;
      
      return {
        ...user,
        ...stats,
        win_rate: Math.max(0, Math.min(100, winRate)) // Ensure 0-100 range
      };
    });

    // Sort based on type
    if (type === 'profit') {
      leaderboard.sort((a, b) => b.total_profit - a.total_profit);
    } else if (type === 'accuracy') {
      leaderboard.sort((a, b) => b.win_rate - a.win_rate);
    } else {
      leaderboard.sort((a, b) => b.predictions_count - a.predictions_count);
    }

    // [PERF] Prepare response and check ETag for conditional GET
    const response = {
      data: leaderboard.slice(0, limit),
      message: 'Leaderboard fetched successfully',
      version: VERSION
    };
    
    // [PERF] Check ETag - returns true if 304 was sent
    if (checkETag(req, res, response)) return;
    
    return res.json(response);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to compute leaderboard',
      version: VERSION
    });
  }
});

// POST /api/v2/users/me/delete - Delete current user account (Phase 4). Requires Bearer token.
router.post('/me/delete', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  try {
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('[users/me/delete] auth.admin.deleteUser failed:', authError.message);
      return res.status(500).json({
        error: 'Deletion failed',
        message: authError.message,
        version: VERSION,
      });
    }
    // Anonymize public.users row for referential integrity (predictions, entries reference user_id)
    await supabase
      .from('users')
      .update({
        username: `deleted_${userId.slice(0, 8)}`,
        full_name: null,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    return res.status(200).json({ success: true, message: 'Account deleted', version: VERSION });
  } catch (e: any) {
    console.error('[users/me/delete]', e);
    return res.status(500).json({
      error: 'Internal server error',
      message: e?.message || 'Account deletion failed',
      version: VERSION,
    });
  }
});

// GET /api/v2/users/:id - Get user profile by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`👤 User profile endpoint called for ID: ${id} - origin:`, req.headers.origin);
  
  try {
    // Fetch user profile from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        email,
        avatar_url,
        created_at,
        updated_at,
        og_badge,
        og_badge_assigned_at,
        referral_code,
        referred_by,
        first_login_at,
        last_login_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching user ${id}:`, error);
      return res.status(404).json({
        error: 'Not found',
        message: `User ${id} not found`,
        version: VERSION,
        details: error.message
      });
    }

    // Get user's prediction statistics
    const [createdPredictions, participatedPredictions] = await Promise.all([
      supabase
        .from('predictions')
        .select('id, status, pool_total', { count: 'exact' })
        .eq('creator_id', id),
      supabase
        .from('prediction_entries')
        .select('id, status, amount, actual_payout', { count: 'exact' })
        .eq('user_id', id)
    ]);

    // Calculate user statistics
    const stats = {
      predictionsCreated: createdPredictions.count || 0,
      predictionsParticipated: participatedPredictions.count || 0,
      totalVolume: createdPredictions.data?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 0,
      totalInvested: participatedPredictions.data?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0,
      totalEarnings: participatedPredictions.data?.reduce((sum, entry) => sum + (entry.actual_payout || 0), 0) || 0,
      winRate: 0 // Will calculate based on won vs total predictions
    };

    // Calculate win rate
    const wonPredictions = participatedPredictions.data?.filter(entry => entry.status === 'won').length || 0;
    stats.winRate = stats.predictionsParticipated > 0 ? (wonPredictions / stats.predictionsParticipated) * 100 : 0;

    return res.json({
      data: {
        ...user,
        bio: null, // Add default bio since column doesn't exist
        reputation_score: 0, // Add default reputation score
        is_verified: false, // Add default verification status
        stats
      },
      message: 'User profile fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error(`Error in user profile endpoint for ${id}:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user profile',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/v2/users/:id/profile - Update user profile (name, avatar)
// Uses service role key to bypass RLS
router.patch('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { full_name, avatar_url } = req.body;
  
  console.log(`✏️ User profile update for ID: ${id}`, { full_name, avatar_url: avatar_url ? '[provided]' : '[not provided]' });
  
  if (!full_name && !avatar_url) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'At least one of full_name or avatar_url must be provided',
      version: VERSION
    });
  }
  
  try {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (full_name !== undefined) {
      updates.full_name = full_name;
    }
    if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, username, full_name, avatar_url')
      .single();
    
    if (error) {
      console.error(`Error updating user profile ${id}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to update user profile',
        version: VERSION,
        details: error.message
      });
    }
    
    console.log(`✅ User profile updated for ${id}:`, data);
    
    return res.json({
      data,
      message: 'Profile updated successfully',
      version: VERSION
    });
  } catch (error) {
    console.error(`Error in user profile update for ${id}:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user profile',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v2/users/:id/predictions - Get user's created predictions
router.get('/:id/predictions', async (req, res) => {
  const { id } = req.params;
  console.log(`📊 User predictions endpoint called for ID: ${id} - origin:`, req.headers.origin);
  
  try {
    const { data: predictions, error } = await supabase
      .from('predictions')
      .select(`
        *,
        creator:users!creator_id(id, username, full_name, avatar_url),
        options:prediction_options!prediction_options_prediction_id_fkey(*)
      `)
      .eq('creator_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`Error fetching user predictions for ${id}:`, error);
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to fetch user predictions',
        version: VERSION,
        details: error.message
      });
    }

    return res.json({
      data: predictions || [],
      message: 'User predictions fetched successfully',
      version: VERSION
    });
  } catch (error) {
    console.error(`Error in user predictions endpoint for ${id}:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch user predictions',
      version: VERSION,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
