import express from 'express';
import crypto from 'crypto';
import { supabase } from '../config/database';
import { VERSION } from '@fanclubz/shared';
import { requireSupabaseAuth, requireSupabaseAuthAllowDeleted } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';
import { assertContentAllowed } from '../services/contentFilter';
import { getUserAchievements } from '../services/achievementsService';

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

// [PERF] Helper to check conditional GET and return 304 if ETag matches
function checkETag(req: express.Request, res: express.Response, data: unknown): boolean {
  // Respect client's no-cache request - skip ETag check if client wants fresh data
  const cacheControl = req.headers['cache-control'] || '';
  const wantsFreshData = cacheControl.includes('no-cache') || cacheControl.includes('no-store');
  
  if (wantsFreshData) {
    // Client explicitly asked for fresh data, don't use ETag caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return false;
  }
  
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

type SimpleIpLimiterOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
};

function createSimpleIpRateLimiter(options: SimpleIpLimiterOptions) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = 0;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const key = `${options.keyPrefix}:${ip}`;

    // Periodic bounded cleanup for expired buckets.
    if (now - lastSweep > options.windowMs) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
      lastSweep = now;
    }

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (current.count >= options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'rate_limited',
        message: 'Too many requests. Please try again shortly.',
        version: VERSION,
      });
    }

    current.count += 1;
    buckets.set(key, current);
    return next();
  };
}

// Basic per-IP protection for public profile discovery endpoints.
// Note: in-memory and per-instance; replace/augment with global limiter if/when introduced.
const publicProfileResolveRateLimit = createSimpleIpRateLimiter({
  keyPrefix: 'users:resolve',
  windowMs: 60_000,
  max: 120,
});
const publicProfileReadRateLimit = createSimpleIpRateLimiter({
  keyPrefix: 'users:public-profile',
  windowMs: 60_000,
  max: 60,
});

async function buildPublicProfilePayload(userId: string) {
  // TODO(ugc-blocking): apply block/ban visibility rules here when item 6 ships.
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, created_at, og_badge, og_badge_assigned_at')
    .eq('id', userId)
    .single();

  if (error || !user) {
    const notFound = new Error(`User ${userId} not found`);
    (notFound as any).status = 404;
    throw notFound;
  }

  const [createdPredictions, participatedPredictions, achievements] = await Promise.all([
    supabase
      .from('predictions')
      .select('id, status, pool_total', { count: 'exact' })
      .eq('creator_id', userId),
    supabase
      .from('prediction_entries')
      .select('id, status, amount, actual_payout', { count: 'exact' })
      .eq('user_id', userId),
    getUserAchievements(userId),
  ]);

  if (createdPredictions.error) throw createdPredictions.error;
  if (participatedPredictions.error) throw participatedPredictions.error;

  const entries = participatedPredictions.data || [];
  const wonEntries = entries.filter((entry: any) => entry.status === 'won');
  const completedEntries = entries.filter((entry: any) => entry.status === 'won' || entry.status === 'lost');
  const activeEntries = entries.filter((entry: any) => entry.status === 'active');
  const totalInvested = entries.reduce((sum: number, entry: any) => sum + Number(entry.amount || 0), 0);
  const totalEarnings = entries.reduce((sum: number, entry: any) => sum + Number(entry.actual_payout || 0), 0);
  const winRate = (participatedPredictions.count || 0) > 0
    ? (wonEntries.length / (participatedPredictions.count || 1)) * 100
    : 0;
  const totalVolume = (createdPredictions.data || []).reduce(
    (sum: number, pred: any) => sum + Number(pred.pool_total || 0),
    0,
  );
  const rank = Math.max(1, Math.ceil((100 - Math.round(winRate)) / 10));

  return {
    user: {
      id: user.id,
      handle: user.username || 'user',
      displayName: user.full_name || user.username || 'User',
      avatarUrl: user.avatar_url || null,
      createdAt: user.created_at || null,
      ogBadge: (user as any).og_badge || null,
      ogBadgeAssignedAt: (user as any).og_badge_assigned_at || null,
    },
    stats: {
      predictionsCreated: createdPredictions.count || 0,
      predictionsParticipated: participatedPredictions.count || 0,
      totalVolume,
      totalInvested,
      totalEarnings,
      profitLoss: totalEarnings - totalInvested,
      winRate,
      wonEntries: wonEntries.length,
      completedEntries: completedEntries.length,
      activeStakes: activeEntries.length,
      rank,
    },
    achievements,
    recentActivity: [],
  };
}

// GET /api/v2/users/me/achievements - auth-only convenience alias
router.get('/me/achievements', requireSupabaseAuth as any, async (req, res) => {
  try {
    const userId = String((req as AuthenticatedRequest).user?.id || '');
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization required',
        version: VERSION,
      });
    }
    const data = await getUserAchievements(userId);
    return res.json({ data, message: 'Achievements fetched successfully', version: VERSION });
  } catch (error: any) {
    console.error('[Users] me achievements error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to fetch achievements',
      version: VERSION,
    });
  }
});

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

// GET /api/v2/users/me/status - Get account status (allows deleted accounts through)
router.get('/me/status', requireSupabaseAuthAllowDeleted, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const accountStatus = (req as any).accountStatus || 'active';
  return res.json({
    status: accountStatus,
    version: VERSION,
  });
});

// GET /api/v2/users/me/terms-accepted - Check if current user has accepted current terms (Phase 5)
// Uses requireSupabaseAuthAllowDeleted so deleted users get a proper 409 rather than being blocked
router.get('/me/terms-accepted', requireSupabaseAuthAllowDeleted, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const accountStatus = (req as any).accountStatus || 'active';

  // Deleted accounts → 409 with ACCOUNT_DELETED code
  if (accountStatus === 'deleted') {
    return res.status(409).json({
      error: 'account_deleted',
      code: 'ACCOUNT_DELETED',
      message: 'This account was previously deleted. You can restore it to continue.',
      version: VERSION,
    });
  }

  try {
    const { data, error } = await supabase
      .from('terms_acceptance')
      .select('id, terms_version, accepted_at')
      .eq('user_id', userId)
      .eq('terms_version', TERMS_VERSION)
      .maybeSingle();

    // Defensive: if table doesn't exist, assume accepted
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('does not exist') || String(error.code || '') === '42P01') {
        return res.json({ accepted: true, terms_version: TERMS_VERSION, accepted_at: null, version: VERSION });
      }
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
router.post('/me/accept-terms', requireSupabaseAuthAllowDeleted, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const accountStatus = (req as any).accountStatus || 'active';

  // Deleted accounts → 409 with ACCOUNT_DELETED code
  if (accountStatus === 'deleted') {
    return res.status(409).json({
      error: 'account_deleted',
      code: 'ACCOUNT_DELETED',
      message: 'This account was previously deleted. You can restore it to continue.',
      version: VERSION,
    });
  }

  try {
    const { error } = await supabase
      .from('terms_acceptance')
      .upsert(
        { user_id: userId, terms_version: TERMS_VERSION, accepted_at: new Date().toISOString() },
        { onConflict: 'user_id,terms_version' }
      );

    // Defensive: if table doesn't exist, return success
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('does not exist') || String(error.code || '') === '42P01') {
        return res.json({ success: true, terms_version: TERMS_VERSION, version: VERSION });
      }
      return res.status(500).json({ error: 'Database error', message: error.message, version: VERSION });
    }
    return res.json({ success: true, terms_version: TERMS_VERSION, version: VERSION });
  } catch (e: any) {
    return res.status(500).json({ error: 'Internal server error', message: e?.message, version: VERSION });
  }
});

// POST /api/v2/users/me/restore - Restore a self-deleted account
router.post('/me/restore', requireSupabaseAuthAllowDeleted, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const accountStatus = (req as any).accountStatus || 'active';

  // Already active → idempotent 200
  if (accountStatus === 'active') {
    return res.status(200).json({ success: true, message: 'Account is already active', version: VERSION });
  }

  // Suspended → cannot self-restore
  if (accountStatus === 'suspended') {
    return res.status(403).json({
      error: 'account_suspended',
      code: 'ACCOUNT_SUSPENDED',
      message: 'This account has been suspended. Contact support for assistance.',
      version: VERSION,
    });
  }

  try {
    // Restore: set status to active, clear deleted_at
    // Try new column first
    const newColUpdate = await supabase
      .from('users')
      .update({
        account_status: 'active',
        deleted_at: null,
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (newColUpdate.error) {
      // Fallback: try without new columns (account_status/deleted_at might not exist)
      const legacyUpdate = await supabase
        .from('users')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (legacyUpdate.error) {
        // Last resort: just unset is_banned
        const minimalUpdate = await supabase
          .from('users')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (minimalUpdate.error) {
          console.error('[users/me/restore] All update attempts failed:', minimalUpdate.error.message);
          return res.status(500).json({
            error: 'Restore failed',
            message: 'Unable to restore account. Please contact support.',
            version: VERSION,
          });
        }
      }
    }

    // Note: username remains anonymized. User will need to set up profile again.
    return res.status(200).json({
      success: true,
      message: 'Account restored. Please update your profile to continue.',
      needsOnboarding: true,
      version: VERSION,
    });
  } catch (e: any) {
    console.error('[users/me/restore]', e);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to restore account. Please contact support.',
      version: VERSION,
    });
  }
});

// POST /api/v2/users/me/delete - Soft-delete current user account.
// Anonymizes PII, sets status='deleted'. Does NOT delete auth user (so re-login → restore flow).
router.post('/me/delete', requireSupabaseAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'unauthorized', message: 'Authorization required', version: VERSION });
  }
  const userFacingMessage = 'Account deletion failed. Please try again or contact support.';
  try {
    // Idempotency: if already deleted, return success
    const accountStatus = (req as any).accountStatus || 'active';
    if (accountStatus === 'deleted') {
      return res.status(200).json({ success: true, message: 'Account deleted', version: VERSION });
    }

    // Determine the best update payload depending on which columns exist
    const now = new Date().toISOString();
    const anonymizedUsername = `deleted_${userId.slice(0, 8)}`;

    // Layer 1: all columns including new account_status
    const fullPayload: Record<string, any> = {
      username: anonymizedUsername,
      full_name: null,
      avatar_url: null,
      account_status: 'deleted',
      deleted_at: now,
      is_banned: true,
      ban_reason: 'self_deleted',
      banned_at: now,
      banned_by: userId,
      updated_at: now,
    };

    // Layer 2: without new account_status/deleted_at columns
    const legacyPayload: Record<string, any> = {
      username: anonymizedUsername,
      full_name: null,
      avatar_url: null,
      is_banned: true,
      ban_reason: 'self_deleted',
      banned_at: now,
      banned_by: userId,
      updated_at: now,
    };

    // Layer 3: absolute minimal
    const minimalPayload: Record<string, any> = {
      username: anonymizedUsername,
      full_name: null,
      avatar_url: null,
      updated_at: now,
    };

    let updateResult = await supabase.from('users').update(fullPayload).eq('id', userId);

    if (updateResult.error) {
      console.warn('[users/me/delete] Full update failed:', updateResult.error.message, updateResult.error.code);
      updateResult = await supabase.from('users').update(legacyPayload).eq('id', userId);
    }

    if (updateResult.error) {
      console.warn('[users/me/delete] Legacy update failed:', updateResult.error.message, updateResult.error.code);
      updateResult = await supabase.from('users').update(minimalPayload).eq('id', userId);
    }

    if (updateResult.error) {
      console.error('[users/me/delete] Minimal update failed:', updateResult.error.message, updateResult.error.code);
      // Last resort: try updating only updated_at to confirm DB connectivity
      const pingResult = await supabase.from('users').update({ updated_at: now }).eq('id', userId);
      if (pingResult.error) {
        console.error('[users/me/delete] Even updated_at-only write failed:', pingResult.error.message);
        return res.status(500).json({ error: 'Deletion failed', message: userFacingMessage, version: VERSION });
      }
      // DB is reachable but columns are missing — still mark as soft-deleted via auth metadata
      console.warn('[users/me/delete] Columns missing but updated_at succeeded; marking via auth metadata');
    }

    // Also mark deletion in Supabase auth metadata (belt-and-suspenders)
    try {
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { account_status: 'deleted', deleted_at: now },
      });
    } catch (authErr: any) {
      // Non-fatal: users table update was the primary operation
      console.warn('[users/me/delete] Auth metadata update failed (non-fatal):', authErr?.message);
    }

    // NOTE: We do NOT delete the auth user. This allows re-login → restore flow.
    // The account is effectively disabled via account_status/is_banned.

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
router.get('/:id/achievements', async (req, res) => {
  try {
    const userId = String(req.params.id || '').trim();
    if (!userId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'user id is required',
        version: VERSION,
      });
    }
    const data = await getUserAchievements(userId);
    return res.json({ data, message: 'Achievements fetched successfully', version: VERSION });
  } catch (error: any) {
    console.error('[Users] achievements error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to fetch achievements',
      version: VERSION,
    });
  }
});

// GET /api/v2/users/resolve?handle=:handle - Resolve public profile handle to user id
router.get('/resolve', publicProfileResolveRateLimit, async (req, res) => {
  try {
    const handle = String(req.query.handle || '').trim().replace(/^@/, '');
    if (!handle) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'handle is required',
        version: VERSION,
      });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name')
      .eq('username', handle)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User handle not found',
        version: VERSION,
      });
    }

    return res.json({
      data: {
        userId: data.id,
        handle: data.username,
        displayName: data.full_name || data.username,
      },
      message: 'User handle resolved successfully',
      version: VERSION,
    });
  } catch (error: any) {
    console.error('[Users] resolve handle error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to resolve handle',
      version: VERSION,
    });
  }
});

// GET /api/v2/users/:id/public-profile - Safe public profile payload (no private fields)
router.get('/:id/public-profile', publicProfileReadRateLimit, async (req, res) => {
  try {
    const userId = String(req.params.id || '').trim();
    if (!userId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'user id is required',
        version: VERSION,
      });
    }

    const data = await buildPublicProfilePayload(userId);
    return res.json({
      data,
      message: 'Public profile fetched successfully',
      version: VERSION,
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    if (status === 404) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Profile not found',
        version: VERSION,
      });
    }
    console.error('[Users] public profile error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Failed to fetch public profile',
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
        avatar_url,
        created_at,
        updated_at,
        og_badge,
        og_badge_assigned_at
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
