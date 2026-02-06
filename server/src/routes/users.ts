import express from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { assertContentAllowed } from '../services/contentFilter';

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

// Phase 5: Current terms version; bump when Terms/Privacy/Community Guidelines change
const TERMS_VERSION = '1.0';

// GET /api/v2/users/me/terms-accepted - Check if current user has accepted current terms (Phase 5)
router.get('/me/terms-accepted', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  try {
    const { data, error } = await supabase
      .from('terms_acceptance')
      .select('id, terms_version, accepted_at')
      .eq('user_id', userId)
      .eq('terms_version', TERMS_VERSION)
      .maybeSingle();
    if (error) {
      return res.status(500).json({ error: 'Database error', message: error.message, version: VERSION });
    }
    return res.json({
      accepted: !!data,
      terms_version: TERMS_VERSION,
      accepted_at: data?.accepted_at ?? null,
      version: VERSION,
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', message: e?.message, version: VERSION });
  }
});

// POST /api/v2/users/me/accept-terms - Record acceptance of Terms/Privacy/Community Guidelines (Phase 5)
router.post('/me/accept-terms', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  try {
    const { error } = await supabase
      .from('terms_acceptance')
      .upsert(
        { user_id: userId, terms_version: TERMS_VERSION, accepted_at: new Date().toISOString() },
        { onConflict: 'user_id,terms_version' }
      );
    if (error) {
      return res.status(500).json({ error: 'Database error', message: error.message, version: VERSION });
    }
    return res.json({ success: true, terms_version: TERMS_VERSION, version: VERSION });
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', message: e?.message, version: VERSION });
  }
});

// POST /api/v2/users/me/delete - Delete current user account (Phase 4). Requires Bearer token.
// Order: anonymize users row first (referential integrity), then delete auth user.
// User-facing messages are generic to avoid leaking internal errors (e.g. "Database error").
router.post('/me/delete', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const userFacingMessage = 'Account deletion failed. Please try again or contact support.';
  try {
    // Idempotency: if already self-deleted, return success.
    // Defensive: if moderation columns aren't present yet, skip this check (do not 500).
    try {
      const { data: existing, error: existingErr } = await supabase
        .from('users')
        .select('id, is_banned, ban_reason')
        .eq('id', userId)
        .maybeSingle();
      if (!existingErr) {
        if ((existing as any)?.is_banned && String((existing as any)?.ban_reason || '').toLowerCase() === 'self_deleted') {
          return res.status(200).json({ success: true, message: 'Account deleted', version: VERSION });
        }
      }
    } catch {
      // ignore
    }

    // 1) Anonymize public.users first so FKs remain valid + mark disabled.
    const fullUpdate = await supabase
      .from('users')
      .update({
        username: `deleted_${userId.slice(0, 8)}`,
        full_name: null,
        email: null,
        avatar_url: null,
        is_banned: true,
        ban_reason: 'self_deleted',
        banned_at: new Date().toISOString(),
        banned_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    let updateError = fullUpdate.error as any;
    if (updateError) {
      const msg = String(updateError?.message || '');
      const missingColumn = msg.toLowerCase().includes('does not exist') && msg.toLowerCase().includes('column');
      if (missingColumn) {
        // Fallback for DBs without moderation columns yet (no 500).
        const minimal = await supabase
          .from('users')
          .update({
            username: `deleted_${userId.slice(0, 8)}`,
            full_name: null,
            avatar_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        updateError = minimal.error as any;
      }
    }

    if (updateError) {
      console.warn('[users/me/delete] users update failed:', updateError.message);
      return res.status(500).json({ error: 'Deletion failed', message: userFacingMessage, version: VERSION });
    }

    // 2) Best-effort: delete auth user. If this fails (e.g. misconfigured service role),
    // we still return success because the account is already disabled server-side.
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn('[users/me/delete] auth.admin.deleteUser failed (non-fatal):', authError.message);
    }

    return res.status(200).json({ success: true, message: 'Account deleted', version: VERSION });
  } catch (e: any) {
    console.error('[users/me/delete]', e);
    return res.status(500).json({
      error: 'Internal server error',
      message: userFacingMessage,
      version: VERSION,
    });
  }
});

// GET /api/v2/users/me/blocked - List blocked user IDs (UGC moderation)
// Defensive: returns empty list if user_blocks table doesn't exist yet
router.get('/me/blocked', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const blockerId = req.user?.id;
  if (!blockerId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_user_id')
      .eq('blocker_id', blockerId);
    if (error) {
      // Table may not exist yet - return empty list instead of 500
      console.warn('[users/me/blocked] Query error (table may not exist):', error.message);
      return res.json({ data: { blockedUserIds: [] }, version: VERSION });
    }
    const blockedUserIds = (data || []).map((r: { blocked_user_id: string }) => r.blocked_user_id);
    return res.json({ data: { blockedUserIds }, version: VERSION });
  } catch (e: any) {
    return res.json({ data: { blockedUserIds: [] }, version: VERSION });
  }
});

// POST /api/v2/users/me/block - Block a user (UGC moderation)
router.post('/me/block', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const blockerId = req.user?.id;
  if (!blockerId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const userId = (req.body?.userId ?? req.body?.blockedUserId) as string | undefined;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Bad request', message: 'userId is required', version: VERSION });
  }
  if (userId === blockerId) {
    return res.status(400).json({ error: 'Bad request', message: 'Cannot block yourself', version: VERSION });
  }
  try {
    const { error: insertError } = await supabase
      .from('user_blocks')
      .upsert(
        { blocker_id: blockerId, blocked_user_id: userId },
        { onConflict: 'blocker_id,blocked_user_id' }
      );
    if (insertError) {
      return res.status(500).json({ error: 'Database error', message: insertError.message, version: VERSION });
    }
    return res.status(201).json({ data: { blockedUserId: userId }, message: 'User blocked', version: VERSION });
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', message: e?.message, version: VERSION });
  }
});

// DELETE /api/v2/users/me/block/:userId - Unblock a user (UGC moderation)
router.delete('/me/block/:userId', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const blockerId = req.user?.id;
  if (!blockerId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'Bad request', message: 'userId is required', version: VERSION });
  }
  try {
    await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_user_id', userId);
    return res.status(200).json({ data: { unblockedUserId: userId }, message: 'User unblocked', version: VERSION });
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', message: e?.message, version: VERSION });
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
// SECURITY: Must be authenticated and self-only.
// Uses service role key to bypass RLS, but authorization is enforced here.
router.patch('/:id/profile', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { full_name, avatar_url } = req.body;
  const actorId = req.user?.id;

  if (!actorId) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Authorization required',
      version: VERSION,
    });
  }

  if (actorId !== id) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'You can only update your own profile',
      version: VERSION,
    });
  }
  
  console.log(`✏️ User profile update for ID: ${id}`, { full_name, avatar_url: avatar_url ? '[provided]' : '[not provided]' });
  
  if (!full_name && !avatar_url) {
    return res.status(400).json({
      error: 'Bad request',
      message: 'At least one of full_name or avatar_url must be provided',
      version: VERSION
    });
  }
  
  try {
    if (full_name !== undefined) {
      try {
        assertContentAllowed([{ label: 'full name', value: full_name }]);
      } catch (err: any) {
        return res.status(400).json({
          error: 'Bad request',
          message: err?.message || 'Objectionable content detected',
          code: err?.code || 'CONTENT_NOT_ALLOWED',
          version: VERSION,
        });
      }
    }
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
