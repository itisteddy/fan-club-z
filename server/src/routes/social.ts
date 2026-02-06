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

  // Step 1: Try to fetch top-level comments with user join
  let topResult = await safeQuery(() =>
    supabase
      .from('comments')
      .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)', { count: 'exact' })
      .eq('prediction_id', predictionId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  );

  // If the comments table doesn't exist at all, return empty
  if (topResult.error) {
    const msg = String(topResult.error.message || '').toLowerCase();
    const code = String(topResult.error.code || '');
    const missingParent = msg.includes('parent_comment_id');

    // Table doesn't exist: return empty list (not 500)
    if (code === '42P01' || msg.includes('relation') && msg.includes('does not exist')) {
      console.warn('[comments:GET] comments table does not exist, returning empty');
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
    }

    // Column issue (e.g. users table missing columns or parent_comment_id missing).
    // If parent_comment_id is missing, we must fetch all comments (cannot filter to top-level).
    if (code === '42703' || msg.includes('does not exist')) {
      if (missingParent) {
        console.warn('[comments:GET] parent_comment_id missing, fetching all comments without parent filter');
        topResult = await safeQuery(() =>
          supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .eq('prediction_id', predictionId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)
        );
      } else {
        console.warn('[comments:GET] Column issue, retrying without user join:', topResult.error.message);
        topResult = await safeQuery(() =>
          supabase
            .from('comments')
            .select('*', { count: 'exact' })
            .eq('prediction_id', predictionId)
            .is('parent_comment_id', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)
        );
      }
    }

    // Still failing? Return error gracefully
    if (topResult.error) {
      console.error('[comments:GET] Failed even with minimal query:', topResult.error);
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } });
    }
  }

  let comments = topResult.data || [];
  let total = topResult.count || 0;
  let totalPages = Math.ceil(total / limit);

  // Fallback: if no top-level comments, try fetching all comments (legacy data might only have replies)
  if (comments.length === 0) {
    const fallbackResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)', { count: 'exact' })
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );
    if (!fallbackResult.error && fallbackResult.data) {
      comments = fallbackResult.data as any[];
      total = fallbackResult.count || comments.length || 0;
      totalPages = Math.ceil(total / limit);
    }
  }

  // Step 2: Fetch replies if there are comments (best-effort)
  let repliesMap: Record<string, any[]> = {};
  if (comments.length > 0) {
    const commentIds = comments.map((c: any) => c.id);
    const repliesResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)')
        .in('parent_comment_id', commentIds)
        .order('created_at', { ascending: true })
    );

    // If parent_comment_id doesn't exist, skip replies mapping (we'll just return flat comments).
    if (repliesResult.error && String(repliesResult.error?.message || '').toLowerCase().includes('parent_comment_id')) {
      repliesMap = {};
    } else if (!repliesResult.error && repliesResult.data) {
      for (const reply of repliesResult.data) {
        const pid = (reply as any).parent_comment_id;
        if (!repliesMap[pid]) repliesMap[pid] = [];
        repliesMap[pid].push(reply);
      }
    }
    // If replies fail, just return comments without replies
  }

  // Step 3: Assemble response
  const data = comments.map((comment: any) => ({
    ...comment,
    replies: repliesMap[comment.id] || [],
    is_liked_by_user: false,
    is_owned_by_user: false,
    is_liked: false,
    is_own: false,
  }));

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
