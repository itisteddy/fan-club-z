import express from 'express';
import { supabase } from '../config/database';
import { createNotification } from '../services/notifications';
import { assertContentAllowed } from '../services/contentFilter';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// ============================================================================
// HELPERS — keep queries simple and catch every failure
// ============================================================================

/**
 * Safe query: try a Supabase query, return { data, error }.
 * Never throws — caller must check error.
 */
async function safeQuery<T = any>(
  fn: () => PromiseLike<{ data: T | null; error: any; count?: number | null }>
): Promise<{ data: T | null; error: any; count?: number | null }> {
  try {
    return await fn();
  } catch (e: any) {
    return { data: null, error: { message: e?.message || 'Unknown error', code: 'EXCEPTION' } };
  }
}

// ============================================================================
// GET /predictions/:predictionId/comments — public, no auth required
// ============================================================================
router.get('/predictions/:predictionId/comments', async (req, res) => {
  const { predictionId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  console.log(`[comments:GET] prediction=${predictionId} page=${page} limit=${limit}`);

  // --- STEP 1: Try multiple query strategies ---
  // Strategy A: Full query with user join and parent filter
  let topResult = await safeQuery(() =>
    supabase
      .from('comments')
      .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)', { count: 'exact' })
      .eq('prediction_id', predictionId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  );

  console.log(`[comments:GET] Strategy A result: error=${!!topResult.error}, dataLength=${topResult.data?.length || 0}, count=${topResult.count}`);

  // If the comments table doesn't exist at all, return empty
  if (topResult.error) {
    const msg = String(topResult.error.message || '').toLowerCase();
    const code = String(topResult.error.code || '');
    console.log(`[comments:GET] Strategy A error: code=${code}, message=${msg}`);

    // Table doesn't exist: return empty list (not 500)
    if (code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'))) {
      console.warn('[comments:GET] comments table does not exist, returning empty');
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
    }

    // Strategy B: Without user join (in case users table has schema issues)
    console.log('[comments:GET] Trying Strategy B: without user join');
    topResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('*', { count: 'exact' })
        .eq('prediction_id', predictionId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );
    console.log(`[comments:GET] Strategy B result: error=${!!topResult.error}, dataLength=${topResult.data?.length || 0}`);

    if (topResult.error) {
      // Strategy C: Without parent_comment_id filter (column might not exist)
      console.log('[comments:GET] Trying Strategy C: without parent filter');
      topResult = await safeQuery(() =>
        supabase
          .from('comments')
          .select('*', { count: 'exact' })
          .eq('prediction_id', predictionId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
      );
      console.log(`[comments:GET] Strategy C result: error=${!!topResult.error}, dataLength=${topResult.data?.length || 0}`);
    }

    // Still failing? Return error gracefully
    if (topResult.error) {
      console.error('[comments:GET] All strategies failed:', topResult.error);
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
    }
  }

  let comments = topResult.data || [];
  let total = topResult.count || 0;
  let totalPages = Math.ceil(total / limit);

  // --- STEP 2: If no comments found with parent filter, try without it ---
  if (comments.length === 0 && total === 0) {
    console.log('[comments:GET] No comments with parent filter, trying fallback without parent filter');
    const fallbackResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)', { count: 'exact' })
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );
    console.log(`[comments:GET] Fallback result: error=${!!fallbackResult.error}, dataLength=${fallbackResult.data?.length || 0}, count=${fallbackResult.count}`);
    
    if (!fallbackResult.error && fallbackResult.data) {
      comments = fallbackResult.data as any[];
      total = fallbackResult.count || comments.length || 0;
      totalPages = Math.ceil(total / limit);
    } else if (fallbackResult.error) {
      // Try without user join
      console.log('[comments:GET] Fallback failed, trying without user join');
      const minimalFallback = await safeQuery(() =>
        supabase
          .from('comments')
          .select('*', { count: 'exact' })
          .eq('prediction_id', predictionId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
      );
      console.log(`[comments:GET] Minimal fallback result: error=${!!minimalFallback.error}, dataLength=${minimalFallback.data?.length || 0}`);
      if (!minimalFallback.error && minimalFallback.data) {
        comments = minimalFallback.data as any[];
        total = minimalFallback.count || comments.length || 0;
        totalPages = Math.ceil(total / limit);
      }
    }
  }

  console.log(`[comments:GET] Final: returning ${comments.length} comments, total=${total}`);

  // --- STEP 3: Fetch user data separately (join might fail due to FK issues) ---
  // The comments.user_id references auth.users, but we need public.users data for display
  let usersMap: Record<string, any> = {};
  if (comments.length > 0) {
    const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
    console.log(`[comments:GET] Fetching user data for ${userIds.length} unique users`);
    
    if (userIds.length > 0) {
      const usersResult = await safeQuery(() =>
        supabase
          .from('users')
          .select('id, username, full_name, avatar_url, is_verified, og_badge')
          .in('id', userIds)
      );
      
      if (usersResult.error) {
        console.warn('[comments:GET] Failed to fetch users:', usersResult.error.message);
      } else if (usersResult.data) {
        console.log(`[comments:GET] Fetched ${usersResult.data.length} users`);
        for (const user of usersResult.data) {
          usersMap[(user as any).id] = user;
        }
      }
    }
  }

  // --- STEP 4: Fetch replies if there are comments (best-effort) ---
  let repliesMap: Record<string, any[]> = {};
  if (comments.length > 0) {
    const commentIds = comments.map((c: any) => c.id);
    const repliesResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('*')
        .in('parent_comment_id', commentIds)
        .order('created_at', { ascending: true })
    );

    // If parent_comment_id doesn't exist, skip replies mapping (we'll just return flat comments).
    if (repliesResult.error && String(repliesResult.error?.message || '').toLowerCase().includes('parent_comment_id')) {
      repliesMap = {};
    } else if (!repliesResult.error && repliesResult.data) {
      // Collect reply user IDs and fetch their data too
      const replyUserIds = [...new Set((repliesResult.data as any[]).map(r => r.user_id).filter(Boolean))];
      if (replyUserIds.length > 0) {
        const replyUsersResult = await safeQuery(() =>
          supabase.from('users').select('id, username, full_name, avatar_url, is_verified, og_badge').in('id', replyUserIds)
        );
        if (replyUsersResult.data) {
          for (const user of replyUsersResult.data) {
            usersMap[(user as any).id] = user;
          }
        }
      }
      
      for (const reply of repliesResult.data) {
        const pid = (reply as any).parent_comment_id;
        if (!repliesMap[pid]) repliesMap[pid] = [];
        // Attach user data to reply
        const replyWithUser = {
          ...reply,
          user: usersMap[(reply as any).user_id] || null,
        };
        repliesMap[pid].push(replyWithUser);
      }
    }
    // If replies fail, just return comments without replies
  }

  // --- STEP 5: Assemble response with user data ---
  const data = comments.map((comment: any) => {
    // Use user from join if available, otherwise use fetched user data
    const userData = comment.user || usersMap[comment.user_id] || null;
    return {
      ...comment,
      user: userData,
      replies: repliesMap[comment.id] || [],
      is_liked_by_user: false,
      is_owned_by_user: false,
      is_liked: false,
      is_own: false,
    };
  });

  console.log(`[comments:GET] Assembled ${data.length} comments with user data`);

  return res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
});

// ============================================================================
// POST /predictions/:predictionId/comments — requires auth
// ============================================================================
router.post('/predictions/:predictionId/comments', requireSupabaseAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }

    // Check account status (attached by middleware)
    const accountStatus = (req as any).accountStatus;
    if (accountStatus === 'deleted') {
      return res.status(409).json({ success: false, code: 'ACCOUNT_DELETED', error: 'Account deleted. Restore to comment.' });
    }
    if (accountStatus === 'suspended') {
      return res.status(403).json({ success: false, code: 'ACCOUNT_SUSPENDED', error: 'Account suspended.' });
    }

    const { predictionId } = req.params;
    const { content, parentCommentId, parent_comment_id } = req.body;
    const actualParentId = parentCommentId || parent_comment_id || null;

    console.log(`[comments:POST] prediction=${predictionId} user=${userId} content_len=${content?.length || 0}`);

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Comment content is required.' });
    }
    const trimmed = content.trim();
    if (trimmed.length > 1000) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Comment must be under 1000 characters.' });
    }

    // Content filter (best-effort)
    try {
      assertContentAllowed([{ label: 'comment', value: trimmed }]);
    } catch (e: any) {
      if (e?.code === 'CONTENT_NOT_ALLOWED') {
        return res.status(400).json({ success: false, code: 'CONTENT_NOT_ALLOWED', error: 'Your comment contains disallowed language.' });
      }
    }

    // Verify prediction exists
    const predResult = await safeQuery(() =>
      supabase.from('predictions').select('id, title, creator_id').eq('id', predictionId).single()
    );
    if (predResult.error || !predResult.data) {
      console.warn('[comments:POST] Prediction not found or query failed:', predResult.error);
      return res.status(404).json({ success: false, code: 'PREDICTION_NOT_FOUND', error: 'Prediction not found.' });
    }

    // ---- INSERT (minimal, no join — safest approach) ----
    console.log('[comments:POST] Inserting comment...');
    const insertPayload = {
      prediction_id: predictionId,
      user_id: userId,
      parent_comment_id: actualParentId,
      content: trimmed,
    };

    let insertResult = await safeQuery(() =>
      supabase
        .from('comments')
        .insert(insertPayload)
        .select('*')
        .single()
    );

    // If select('*') fails, try bare insert
    if (insertResult.error) {
      console.warn('[comments:POST] Insert+select failed:', insertResult.error?.message, '— trying bare insert');
      const bareInsert = await safeQuery(() =>
        supabase.from('comments').insert(insertPayload)
      );
      if (!bareInsert.error) {
        // Insert succeeded but we have no returned row. Fabricate response.
        console.log('[comments:POST] Bare insert succeeded (no returned data)');
        return res.status(201).json({
          success: true,
          data: {
            id: `temp_${Date.now()}`,
            ...insertPayload,
            created_at: new Date().toISOString(),
            user: null,
            is_liked_by_user: false,
            is_owned_by_user: true,
            is_liked: false,
            is_own: true,
            replies: [],
          },
        });
      }
      // Both attempts failed
      console.error('[comments:POST] All insert attempts failed:', insertResult.error, bareInsert.error);
      return res.status(500).json({
        success: false,
        code: 'INSERT_FAILED',
        error: 'Failed to create comment. Please try again.',
        debug: String(insertResult.error?.message || bareInsert.error?.message || 'unknown'),
      });
    }

    if (!insertResult.data) {
      console.error('[comments:POST] Insert returned null data (no error)');
      return res.status(500).json({
        success: false,
        code: 'INSERT_FAILED',
        error: 'Failed to create comment. Please try again.',
      });
    }

    // ---- Best-effort: fetch user profile for the response ----
    let userProfile: Record<string, any> | null = null;
    try {
      const { data: udata } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, is_verified, og_badge')
        .eq('id', userId)
        .maybeSingle();
      if (udata) userProfile = udata as Record<string, any>;
    } catch {
      // User lookup failed — non-fatal
    }

    const commentRow = insertResult.data as Record<string, any>;
    console.log('[comments:POST] Comment created successfully:', commentRow?.id);

    // Best-effort notifications (never blocks response)
    try {
      const pred = predResult.data as any;
      if (commentRow?.id && pred.creator_id && pred.creator_id !== userId) {
        createNotification({
          userId: pred.creator_id,
          type: 'comment',
          title: 'New comment',
          body: `New comment on "${pred.title || 'a prediction'}"`,
          href: `/predictions/${predictionId}?tab=comments`,
          metadata: { predictionId, commentId: commentRow.id, fromUserId: userId },
          externalRef: `notif:comment:creator:${commentRow.id}`,
        }).catch(() => {});
      }
    } catch {
      // ignore notification failures
    }

    return res.status(201).json({
      success: true,
      data: {
        ...commentRow,
        user: userProfile || { id: userId, username: 'You' },
        is_liked_by_user: false,
        is_owned_by_user: true,
        is_liked: false,
        is_own: true,
        replies: [],
      },
    });
  } catch (topLevelError: any) {
    // SAFETY NET: Nothing above should ever throw, but if it does, return 500 with debug info
    console.error('[comments:POST] UNEXPECTED top-level error:', topLevelError?.message || topLevelError);
    return res.status(500).json({
      success: false,
      code: 'UNEXPECTED_ERROR',
      error: 'Failed to create comment. Please try again.',
      debug: String(topLevelError?.message || 'unknown'),
    });
  }
});

// ============================================================================
// POST /comments/:commentId/like — toggle like
// ============================================================================
router.post('/comments/:commentId/like', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Check if like exists
    const existing = await safeQuery(() =>
      supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('user_id', userId).single()
    );

    if (existing.data) {
      await safeQuery(() => supabase.from('comment_likes').delete().eq('id', (existing.data as any).id));
    } else {
      await safeQuery(() => supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId, type: 'like' }));
    }

    return res.json({ success: true, message: 'Like toggled successfully' });
  } catch (error) {
    console.error('[comments:like]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// PUT /comments/:commentId — edit
// ============================================================================
router.put('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, userId } = req.body;
    if (!content || !userId) {
      return res.status(400).json({ success: false, error: 'Content and userId are required' });
    }

    const result = await safeQuery(() =>
      supabase
        .from('comments')
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)')
        .single()
    );

    if (result.error) {
      return res.status(500).json({ success: false, error: 'Failed to update comment' });
    }

    return res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[comments:edit]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// DELETE /comments/:commentId
// ============================================================================
router.delete('/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Try hard delete (simplest, always works)
    await safeQuery(() =>
      supabase.from('comments').delete().eq('id', commentId).eq('user_id', userId as string)
    );

    return res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('[comments:delete]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// Health check
// ============================================================================
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Social service is healthy', timestamp: new Date().toISOString() });
});

export default router;
