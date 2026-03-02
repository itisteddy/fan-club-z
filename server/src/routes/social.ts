import express from 'express';
import { supabase } from '../config/database';
import { createNotification, createNotifications } from '../services/notifications';
import { assertContentAllowed } from '../services/contentFilter';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import { requireTermsAccepted } from '../middleware/requireTermsAccepted';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

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

function isMissingColumn(error: any, column: string): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return code === '42703' || message.includes(`column "${column.toLowerCase()}"`) || message.includes(`column ${column.toLowerCase()}`);
}

function isNotNullViolation(error: any, column: string): boolean {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '');
  return code === '23502' && message.includes(column.toLowerCase());
}

type PublicUserRow = {
  id: string;
  auth_user_id?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  og_badge?: string | null;
};

async function fetchUsersByIdentityIds(identityIds: string[]): Promise<Record<string, PublicUserRow>> {
  const ids = Array.from(new Set(identityIds.filter(Boolean)));
  const usersMap: Record<string, PublicUserRow> = {};
  if (ids.length === 0) return usersMap;

  const rowsById: any[] = [];
  const byId = await safeQuery(() =>
    supabase
      .from('users')
      .select('id, auth_user_id, username, full_name, avatar_url, is_verified, og_badge')
      .in('id', ids)
  );
  if (!byId.error && Array.isArray(byId.data)) {
    rowsById.push(...(byId.data as any[]));
  } else if (isMissingColumn(byId.error, 'auth_user_id')) {
    const fallbackById = await safeQuery(() =>
      supabase
        .from('users')
        .select('id, username, full_name, avatar_url, is_verified, og_badge')
        .in('id', ids)
    );
    if (!fallbackById.error && Array.isArray(fallbackById.data)) {
      rowsById.push(...(fallbackById.data as any[]));
    }
  }

  const rowsByAuth: any[] = [];
  const byAuth = await safeQuery(() =>
    supabase
      .from('users')
      .select('id, auth_user_id, username, full_name, avatar_url, is_verified, og_badge')
      .in('auth_user_id', ids)
  );
  if (!byAuth.error && Array.isArray(byAuth.data)) {
    rowsByAuth.push(...(byAuth.data as any[]));
  }

  for (const row of [...rowsById, ...rowsByAuth]) {
    if (!row?.id) continue;
    const normalized: PublicUserRow = {
      id: row.id,
      auth_user_id: row.auth_user_id || null,
      username: row.username || null,
      full_name: row.full_name || null,
      avatar_url: row.avatar_url || null,
      is_verified: Boolean(row.is_verified),
      og_badge: row.og_badge || null,
    };
    usersMap[row.id] = normalized;
    if (row.auth_user_id) usersMap[row.auth_user_id] = normalized;
  }
  return usersMap;
}

async function resolveViewerIdentitySet(viewerId: string | null): Promise<Set<string>> {
  const result = new Set<string>();
  if (!viewerId) return result;
  result.add(viewerId);
  const users = await fetchUsersByIdentityIds([viewerId]);
  const row = users[viewerId];
  if (row?.id) result.add(row.id);
  if (row?.auth_user_id) result.add(row.auth_user_id);
  return result;
}

const MENTION_REGEX = /(^|[\s.,;:!?()\[\]{}])@([a-zA-Z0-9_]{2,32})/g;

function extractMentions(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const normalized = String(text || '');
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(normalized)) !== null) {
    const username = match[2];
    if (!username) continue;
    const key = username.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      found.push(username);
    }
  }
  return found;
}

async function resolveMentionUsers(mentionUsernames: string[]): Promise<any[]> {
  if (!mentionUsernames.length) return [];
  const normalized = Array.from(new Set(mentionUsernames.map((u) => String(u).trim()).filter(Boolean)));
  const lower = Array.from(new Set(normalized.map((u) => u.toLowerCase())));

  const exactResult = await safeQuery(() =>
    supabase
      .from('users')
      .select('id, username')
      .in('username', normalized)
  );
  const exactRows = (exactResult.data as any[] | null) || [];

  // Fallback for case-mismatched mentions (e.g. @UserName vs stored lowercase).
  let lowerRows: any[] = [];
  if (lower.length > 0) {
    const lowerResult = await safeQuery(() =>
      supabase
        .from('users')
        .select('id, username')
        .in('username', lower)
    );
    lowerRows = (lowerResult.data as any[] | null) || [];
  }

  const merged = new Map<string, any>();
  for (const row of [...exactRows, ...lowerRows]) {
    if (row?.id && !merged.has(row.id)) merged.set(row.id, row);
  }
  return Array.from(merged.values());
}

async function syncPredictionCommentsCount(predictionId: string): Promise<void> {
  if (!predictionId) return;

  let countResult = await safeQuery(() =>
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('prediction_id', predictionId)
      .or('is_deleted.is.null,is_deleted.eq.false')
      .is('deleted_at', null)
      .neq('content', 'Comment deleted')
  );

  if (countResult.error && isMissingColumn(countResult.error, 'is_deleted')) {
    countResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('prediction_id', predictionId)
        .is('deleted_at', null)
        .neq('content', 'Comment deleted')
    );
  }

  if (countResult.error && isMissingColumn(countResult.error, 'deleted_at')) {
    countResult = await safeQuery(() =>
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('prediction_id', predictionId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .neq('content', 'Comment deleted')
    );
  }

  if (countResult.error) {
    return;
  }

  const count = Math.max(0, Number(countResult.count || 0));
  await safeQuery(() =>
    supabase
      .from('predictions')
      .update({ comments_count: count })
      .eq('id', predictionId)
  );
}

function asObject(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      // ignore JSON parse errors and fall through
    }
  }
  return {};
}

function pickFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return undefined;
}

function pickFirstDefined<T = unknown>(...values: T[]): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

async function getOptionalUserId(req: express.Request): Promise<string | null> {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

async function isAdminUser(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (ADMIN_USER_IDS.includes(userId)) return true;
  const { data } = await safeQuery(() =>
    supabase.from('users').select('is_admin').eq('id', userId).maybeSingle()
  );
  return Boolean((data as any)?.is_admin);
}

// ============================================================================
// GET /predictions/:predictionId/comments — public, no auth required
// ============================================================================
router.get('/predictions/:predictionId/comments', async (req, res) => {
  const { predictionId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;
  const viewerId = await getOptionalUserId(req);
  const viewerIdentitySet = await resolveViewerIdentitySet(viewerId);

  console.log(`[comments:GET] prediction=${predictionId} page=${page} limit=${limit}`);

  // --- STEP 1: Try multiple query strategies ---
  // Strategy A: Full query with user join
  let topResult = await safeQuery(() =>
    supabase
      .from('comments')
      .select('*, user:users(id, username, full_name, avatar_url, is_verified, og_badge)', { count: 'exact' })
      .eq('prediction_id', predictionId)
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
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );
    console.log(`[comments:GET] Strategy B result: error=${!!topResult.error}, dataLength=${topResult.data?.length || 0}`);

    if (topResult.error) {
      // Strategy C: Minimal fallback
      console.log('[comments:GET] Trying Strategy C: minimal fallback');
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

  // --- Optional viewer-specific filtering (blocked/reported) ---
  let blockedUserIds: string[] = [];
  let hiddenCommentIds: string[] = [];
  let hiddenUserIds: string[] = [];
  if (viewerId) {
    const blockedResult = await safeQuery(() =>
      supabase.from('user_blocks').select('blocked_user_id').eq('blocker_id', viewerId)
    );
    if (!blockedResult.error && blockedResult.data) {
      blockedUserIds = (blockedResult.data as any[])
        .map((r: any) => r.blocked_user_id)
        .filter(Boolean);
    }

    const hidesResult = await safeQuery(() =>
      supabase
        .from('content_hides')
        .select('target_type, target_id')
        .eq('user_id', viewerId)
    );
    if (!hidesResult.error && hidesResult.data) {
      const rows = hidesResult.data as any[];
      hiddenCommentIds = rows.filter((r) => r.target_type === 'comment').map((r) => r.target_id).filter(Boolean);
      hiddenUserIds = rows.filter((r) => r.target_type === 'user').map((r) => r.target_id).filter(Boolean);
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
      usersMap = await fetchUsersByIdentityIds(userIds);
      console.log(`[comments:GET] Fetched user map entries: ${Object.keys(usersMap).length}`);
    }
  }

  // --- STEP 4: Assemble response with user data (flat list) ---
  const data = comments
    .filter((comment: any) => {
      if (blockedUserIds.length > 0 && blockedUserIds.includes(comment.user_id)) return false;
      if (hiddenUserIds.length > 0 && hiddenUserIds.includes(comment.user_id)) return false;
      if (hiddenCommentIds.length > 0 && hiddenCommentIds.includes(comment.id)) return false;
      return true;
    })
    .map((comment: any) => {
      const userData = comment.user || usersMap[comment.user_id] || null;
      const isDeleted = Boolean(
        comment.is_deleted ||
        comment.deleted_at ||
        String(comment.content || '').trim().toLowerCase() === 'comment deleted'
      );
      const isEdited = Boolean(comment.edited_at) || ((comment.edit_count || 0) > 0);
      const cleaned = isDeleted ? { ...comment, content: null } : comment;
      const viewerMatchesAuthor = Boolean(
        viewerId &&
        (comment.user_id === viewerId ||
          viewerIdentitySet.has(comment.user_id) ||
          (userData?.auth_user_id && String(userData.auth_user_id) === viewerId))
      );
      const isOwnedByViewer = Boolean(
        viewerId && viewerMatchesAuthor
      );
      return {
        ...cleaned,
        user: userData,
        is_edited: isEdited,
        is_liked_by_user: false,
        is_owned_by_user: isOwnedByViewer,
        is_liked: false,
        is_own: isOwnedByViewer,
      };
    });

  // --- STEP 5: Viewer like status (best-effort) ---
  if (viewerId && data.length > 0) {
    const allIds = data.map((c: any) => c.id);
    const likesResult = await safeQuery(() =>
      supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', viewerId)
        .in('comment_id', allIds)
    );
    if (!likesResult.error && likesResult.data) {
      const likedSet = new Set((likesResult.data as any[]).map((l) => l.comment_id));
      for (const comment of data as any[]) {
        comment.is_liked = likedSet.has(comment.id);
        comment.is_liked_by_user = comment.is_liked;
      }
    }
  }

  console.log(`[comments:GET] Assembled ${data.length} comments with user data`);

  return res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  });
});

// ============================================================================
// GET /predictions/:predictionId/comments/:commentId — public, no auth required
// ============================================================================
router.get('/predictions/:predictionId/comments/:commentId', async (req, res) => {
  try {
    const { predictionId, commentId } = req.params;
    const viewerId = await getOptionalUserId(req);
    const viewerIdentitySet = await resolveViewerIdentitySet(viewerId);

    const commentResult = await safeQuery(() =>
      supabase.from('comments').select('*').eq('id', commentId).maybeSingle()
    );
    const comment = commentResult.data as any;
    if (commentResult.error || !comment?.id) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }
    if (String(comment.prediction_id || '') !== String(predictionId)) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    const isDeleted = Boolean(
      comment.is_deleted ||
      comment.deleted_at ||
      String(comment.content || '').trim().toLowerCase() === 'comment deleted'
    );
    if (isDeleted) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    let blockedUserIds: string[] = [];
    let hiddenCommentIds: string[] = [];
    let hiddenUserIds: string[] = [];
    if (viewerId) {
      const blockedResult = await safeQuery(() =>
        supabase.from('user_blocks').select('blocked_user_id').eq('blocker_id', viewerId)
      );
      if (!blockedResult.error && blockedResult.data) {
        blockedUserIds = (blockedResult.data as any[]).map((r) => r.blocked_user_id).filter(Boolean);
      }
      const hidesResult = await safeQuery(() =>
        supabase.from('content_hides').select('target_type, target_id').eq('user_id', viewerId)
      );
      if (!hidesResult.error && hidesResult.data) {
        const rows = hidesResult.data as any[];
        hiddenCommentIds = rows.filter((r) => r.target_type === 'comment').map((r) => r.target_id).filter(Boolean);
        hiddenUserIds = rows.filter((r) => r.target_type === 'user').map((r) => r.target_id).filter(Boolean);
      }
    }

    if (blockedUserIds.includes(comment.user_id) || hiddenUserIds.includes(comment.user_id) || hiddenCommentIds.includes(comment.id)) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    const userLookup = await fetchUsersByIdentityIds([String(comment.user_id || '')]);
    const userData = userLookup[String(comment.user_id || '')] || null;
    const isOwn = Boolean(
      viewerId &&
      (comment.user_id === viewerId ||
        viewerIdentitySet.has(comment.user_id) ||
        (userData?.auth_user_id && String(userData.auth_user_id) === viewerId))
    );

    const likeStatus = viewerId
      ? await safeQuery(() => supabase.from('comment_likes').select('comment_id').eq('user_id', viewerId).eq('comment_id', comment.id))
      : { data: null, error: null };
    const isLiked = Boolean(viewerId && !likeStatus.error && (likeStatus.data as any[])?.length);

    let threadParent: any | null = null;
    let threadReplies: any[] = [];
    const parentId = comment.parent_comment_id || null;
    if (parentId) {
      const parentResult = await safeQuery(() =>
        supabase.from('comments').select('*').eq('id', parentId).maybeSingle()
      );
      const parent = parentResult.data as any;
      const parentDeleted = parent && Boolean(
        parent.is_deleted ||
        parent.deleted_at ||
        String(parent.content || '').trim().toLowerCase() === 'comment deleted'
      );
      if (parent && !parentDeleted) {
        const parentUsers = await fetchUsersByIdentityIds([String(parent.user_id || '')]);
        threadParent = {
          ...parent,
          user: parentUsers[String(parent.user_id || '')] || null,
        };
      }
      const repliesResult = await safeQuery(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('parent_comment_id', parentId)
          .order('created_at', { ascending: true })
          .limit(20)
      );
      const replies = (repliesResult.data as any[]) || [];
      const replyUsers = await fetchUsersByIdentityIds(replies.map((r) => r.user_id).filter(Boolean));
      threadReplies = replies
        .filter((r) => !Boolean(r.is_deleted || r.deleted_at || String(r.content || '').trim().toLowerCase() === 'comment deleted'))
        .map((r) => ({ ...r, user: replyUsers[String(r.user_id || '')] || null }));
    } else {
      const repliesResult = await safeQuery(() =>
        supabase
          .from('comments')
          .select('*')
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true })
          .limit(20)
      );
      const replies = (repliesResult.data as any[]) || [];
      const replyUsers = await fetchUsersByIdentityIds(replies.map((r) => r.user_id).filter(Boolean));
      threadReplies = replies
        .filter((r) => !Boolean(r.is_deleted || r.deleted_at || String(r.content || '').trim().toLowerCase() === 'comment deleted'))
        .map((r) => ({ ...r, user: replyUsers[String(r.user_id || '')] || null }));
    }

    return res.json({
      success: true,
      comment: {
        ...comment,
        user: userData,
        is_own: isOwn,
        is_liked: isLiked,
      },
      thread: {
        parent: threadParent,
        replies: threadReplies,
      },
    });
  } catch (error) {
    console.error('[comments:GET:single]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// GET /users/search — mention autocomplete (auth required)
// ============================================================================
router.get('/users/search', requireSupabaseAuth, async (req, res) => {
  const q = String(req.query.q || req.query.query || '').trim();
  if (!q || q.length < 2) {
    return res.json({ success: true, data: [] });
  }
  const limit = Math.min(parseInt(String(req.query.limit || '10'), 10) || 10, 25);
  const search = `%${q}%`;
  const result = await safeQuery(() =>
    supabase
      .from('users')
      .select('id, username, full_name, avatar_url')
      .or(`username.ilike.${search},full_name.ilike.${search}`)
      .limit(limit)
  );
  if (result.error) {
    return res.status(503).json({ success: false, code: 'SEARCH_FAILED', error: 'Failed to search users.' });
  }
  return res.json({ success: true, data: result.data || [] });
});

// ============================================================================
// POST /predictions/:predictionId/comments — requires auth
// ============================================================================
router.post('/predictions/:predictionId/comments', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
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
    const rawBody = asObject(req.body);
    const nestedData = asObject(rawBody.data);
    const actualBody = pickFirstString(
      rawBody.body,
      rawBody.content,
      rawBody.text,
      nestedData.body,
      nestedData.content,
      nestedData.text
    );
    const actualParentId = (pickFirstDefined(
      rawBody.parentId,
      rawBody.parentCommentId,
      rawBody.parent_comment_id,
      nestedData.parentId,
      nestedData.parentCommentId,
      nestedData.parent_comment_id
    ) as string | undefined) || null;
    const requestId = pickFirstString(
      rawBody.clientRequestId,
      rawBody.client_request_id,
      nestedData.clientRequestId,
      nestedData.client_request_id
    );

    console.log(`[comments:POST] prediction=${predictionId} user=${userId} content_len=${actualBody?.length || 0}`);

    // Validate content
    if (!actualBody || typeof actualBody !== 'string' || actualBody.trim().length === 0) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Comment content is required.' });
    }
    const trimmed = actualBody.trim();
    if (trimmed.length > 1000) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Comment must be under 1000 characters.' });
    }
    const mentionUsernames = extractMentions(trimmed);
    if (mentionUsernames.length > 5) {
      return res.status(422).json({ success: false, code: 'TOO_MANY_MENTIONS', error: 'Too many mentions (max 5).' });
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

    // Validate parent comment (one-level nesting)
    if (actualParentId) {
      const parentResult = await safeQuery(() =>
        supabase
          .from('comments')
          .select('id, prediction_id, parent_comment_id')
          .eq('id', actualParentId)
          .maybeSingle()
      );
      const parent = parentResult.data as any;
      if (parentResult.error || !parent?.id) {
        return res.status(404).json({ success: false, code: 'PARENT_NOT_FOUND', error: 'Parent comment not found.' });
      }
      if (parent.prediction_id !== predictionId) {
        return res.status(422).json({ success: false, code: 'INVALID_PARENT', error: 'Parent comment does not belong to this prediction.' });
      }
      if (parent.parent_comment_id) {
        return res.status(422).json({ success: false, code: 'DEPTH_EXCEEDED', error: 'Replies can only be one level deep.' });
      }
    }

    // ---- Idempotency (clientRequestId) ----
    if (requestId) {
      const existing = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .select('id, prediction_id, user_id, parent_comment_id, content, created_at, updated_at, edited_at, is_deleted, deleted_at, deleted_by, likes_count, is_edited')
          .eq('user_id', userId)
          .eq('client_request_id', requestId)
          .maybeSingle()
      );
      if (!existing.error && existing.data?.id) {
        const commentRow = existing.data as Record<string, any>;
        const userLookup = await fetchUsersByIdentityIds([userId]);
        const udata = userLookup[userId] || null;
        return res.status(200).json({
          success: true,
          data: {
            ...commentRow,
            user: udata || { id: userId, username: 'You' },
            is_liked_by_user: false,
            is_owned_by_user: true,
            is_liked: false,
            is_own: true,
          },
        });
      }
    }

    // ---- INSERT (minimal, no join — safest approach) ----
    console.log('[comments:POST] Inserting comment...');
    const insertPayload = {
      prediction_id: predictionId,
      user_id: userId,
      parent_comment_id: actualParentId,
      content: trimmed,
      client_request_id: requestId || null,
    };

    let insertResult = await safeQuery<Record<string, any> | null>(() =>
      supabase
        .from('comments')
        .insert(insertPayload)
        .select('id, prediction_id, user_id, parent_comment_id, content, created_at, updated_at, edited_at, is_deleted, deleted_at, deleted_by, likes_count, is_edited')
        .single()
    );

    if (insertResult.error) {
      // If unique constraint on (user_id, client_request_id) fired, fetch existing
      if (requestId) {
        const existing = await safeQuery<Record<string, any> | null>(() =>
          supabase
            .from('comments')
            .select('id, prediction_id, user_id, parent_comment_id, content, created_at, updated_at, edited_at, is_deleted, deleted_at, deleted_by, likes_count, is_edited')
            .eq('user_id', userId)
            .eq('client_request_id', requestId)
            .maybeSingle()
        );
        if (!existing.error && existing.data?.id) {
          insertResult = existing as any;
        } else {
          console.error('[comments:POST] Insert failed:', insertResult.error);
          return res.status(503).json({
            success: false,
            code: 'COMMENTS_UNAVAILABLE',
            error: 'Comments are temporarily unavailable. Please try again.',
            debug: String(insertResult.error?.message || 'unknown'),
          });
        }
      } else {
        console.error('[comments:POST] Insert failed:', insertResult.error);
        return res.status(503).json({
          success: false,
          code: 'COMMENTS_UNAVAILABLE',
          error: 'Comments are temporarily unavailable. Please try again.',
          debug: String(insertResult.error?.message || 'unknown'),
        });
      }
    }

    if (!insertResult.data) {
      console.error('[comments:POST] Insert returned null data (no error)');
      return res.status(503).json({
        success: false,
        code: 'COMMENTS_UNAVAILABLE',
        error: 'Comments are temporarily unavailable. Please try again.',
      });
    }

    // ---- Best-effort: fetch user profile for the response ----
    let userProfile: Record<string, any> | null = null;
    try {
      const userLookup = await fetchUsersByIdentityIds([userId]);
      if (userLookup[userId]) userProfile = userLookup[userId] as Record<string, any>;
    } catch {
      // User lookup failed — non-fatal
    }

    const commentRow = insertResult.data as Record<string, any>;
    console.log('[comments:POST] Comment created successfully:', commentRow?.id);

    // ---- Mentions: best-effort resolution + notifications ----
    if (mentionUsernames.length > 0 && commentRow?.id) {
      const mentionedUsers = await resolveMentionUsers(mentionUsernames);
      const mentionedIds = mentionedUsers
        .map((u) => u.id)
        .filter((id) => id && id !== userId);

      // Filter out blocked relationships (either direction)
      let blockedSet = new Set<string>();
      if (mentionedIds.length > 0) {
        const blockedByAuthor = await safeQuery(() =>
          supabase
            .from('user_blocks')
            .select('blocked_user_id')
            .eq('blocker_id', userId)
            .in('blocked_user_id', mentionedIds)
        );
        if (!blockedByAuthor.error && blockedByAuthor.data) {
          for (const r of blockedByAuthor.data as any[]) blockedSet.add(r.blocked_user_id);
        }
        const blockedAuthor = await safeQuery(() =>
          supabase
            .from('user_blocks')
            .select('blocker_id')
            .in('blocker_id', mentionedIds)
            .eq('blocked_user_id', userId)
        );
        if (!blockedAuthor.error && blockedAuthor.data) {
          for (const r of blockedAuthor.data as any[]) blockedSet.add(r.blocker_id);
        }
      }

      const finalMentionIds = mentionedIds.filter((id) => !blockedSet.has(id));
      if (finalMentionIds.length > 0) {
        await safeQuery(() =>
          supabase
            .from('comment_mentions')
            .insert(finalMentionIds.map((uid) => ({ comment_id: commentRow.id, mentioned_user_id: uid })))
        );

        const pred = predResult.data as any;
        const previewText = trimmed.slice(0, 120);
        try {
          const mentionNotif = await createNotifications(
            finalMentionIds.map((uid) => ({
              userId: uid,
              type: 'comment',
              title: 'You were mentioned',
              body: previewText ? `"${previewText}"` : 'A comment mentioned you.',
              href: `/p/${predictionId}/comments/${commentRow.id}`,
              metadata: { predictionId, commentId: commentRow.id, authorId: userId, subtype: 'mention.comment' },
              externalRef: `notif:comment:mention:${commentRow.id}:${uid}`,
            }))
          );
          console.log('[comments:POST] mention notifications:', { commentId: commentRow.id, ...mentionNotif });
        } catch (notifyError) {
          console.warn('[comments:POST] mention notifications failed:', notifyError);
        }
      }
    }

    // Best-effort notifications (never blocks response)
    try {
      const pred = predResult.data as any;
      if (commentRow?.id && pred.creator_id && pred.creator_id !== userId) {
        createNotification({
          userId: pred.creator_id,
          type: 'comment',
          title: 'New comment',
          body: `New comment on "${pred.title || 'a prediction'}"`,
          href: `/p/${predictionId}/comments/${commentRow.id}`,
          metadata: { predictionId, commentId: commentRow.id, fromUserId: userId },
          externalRef: `notif:comment:creator:${commentRow.id}`,
        }).catch(() => {});
      }
    } catch {
      // ignore notification failures
    }

    await syncPredictionCommentsCount(String(predictionId || ''));

    return res.status(201).json({
      success: true,
      data: {
        ...commentRow,
        user: userProfile || { id: userId, username: 'You' },
        is_edited: false,
        edited_at: null,
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
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
// POST /comments/:commentId/like — toggle like (auth required)
// ============================================================================
router.post('/comments/:commentId/like', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { commentId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }

    // Ensure comment exists
    const commentResult = await safeQuery<Record<string, any> | null>(() =>
      supabase.from('comments').select('id, likes_count').eq('id', commentId).maybeSingle()
    );
    if (commentResult.error || !commentResult.data) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    // Insert like if not exists
    const existing = await safeQuery<Record<string, any> | null>(() =>
      supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
    );
    if (!existing.error && existing.data?.id) {
      return res.json({ success: true, data: { liked: true, likes_count: (commentResult.data as any).likes_count ?? null } });
    }

    const insert = await safeQuery(() =>
      supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId })
    );
    if (insert.error) {
      return res.status(503).json({ success: false, code: 'LIKE_FAILED', error: 'Failed to like comment.' });
    }

    let likesCount: number | null = null;
    if (typeof (commentResult.data as any).likes_count === 'number') {
      likesCount = Math.max(0, (commentResult.data as any).likes_count + 1);
      await safeQuery(() => supabase.from('comments').update({ likes_count: likesCount }).eq('id', commentId));
    }

    return res.json({ success: true, data: { liked: true, likes_count: likesCount } });
  } catch (error) {
    console.error('[comments:like]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// DELETE /comments/:commentId/like — unlike
// ============================================================================
router.delete('/comments/:commentId/like', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { commentId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }

    const existing = await safeQuery<Record<string, any> | null>(() =>
      supabase.from('comment_likes').select('id').eq('comment_id', commentId).eq('user_id', userId).maybeSingle()
    );
    if (!existing.error && existing.data?.id) {
      await safeQuery(() => supabase.from('comment_likes').delete().eq('id', (existing.data as any).id));
    }

    let likesCount: number | null = null;
    const countResult = await safeQuery(() =>
      supabase.from('comments').select('likes_count').eq('id', commentId).maybeSingle()
    );
    if (!countResult.error && countResult.data && typeof (countResult.data as any).likes_count === 'number') {
      likesCount = Math.max(0, (countResult.data as any).likes_count - 1);
      await safeQuery(() => supabase.from('comments').update({ likes_count: likesCount }).eq('id', commentId));
    }

    return res.json({ success: true, data: { liked: false, likes_count: likesCount } });
  } catch (error) {
    console.error('[comments:unlike]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// PATCH /comments/:commentId — edit
// ============================================================================
router.patch('/comments/:commentId', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { commentId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    const rawBody = asObject(req.body);
    const nestedData = asObject(rawBody.data);

    if (!userId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }
    const actualBody = pickFirstString(
      rawBody.body,
      rawBody.content,
      rawBody.text,
      nestedData.body,
      nestedData.content,
      nestedData.text
    );
    if (!actualBody || typeof actualBody !== 'string' || !actualBody.trim()) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Comment content is required.' });
    }
    const trimmed = actualBody.trim();
    if (trimmed.length > 1000) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Comment must be under 1000 characters.' });
    }
    const mentionUsernames = extractMentions(trimmed);
    if (mentionUsernames.length > 5) {
      return res.status(422).json({ success: false, code: 'TOO_MANY_MENTIONS', error: 'Too many mentions (max 5).' });
    }

    const existingResult = await safeQuery(() =>
      supabase.from('comments').select('*').eq('id', commentId).maybeSingle()
    );
    const existing = existingResult.data as any;
    if (!existing?.id) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    const adminKey = req.headers['x-admin-key'] as string | undefined;
    const isAdmin = (ADMIN_API_KEY && adminKey === ADMIN_API_KEY) || (await isAdminUser(userId));
    if (!isAdmin && existing.user_id !== userId) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have permission to edit this comment.' });
    }

    const now = new Date().toISOString();
    const updatePayloads: Record<string, any>[] = [
      {
        content: trimmed,
        updated_at: now,
        edited_at: now,
        edit_count: (existing.edit_count || 0) + 1,
        is_edited: true,
      },
      {
        content: trimmed,
        updated_at: now,
        edited_at: now,
        edit_count: (existing.edit_count || 0) + 1,
      },
      {
        content: trimmed,
        updated_at: now,
        edited_at: now,
      },
      {
        content: trimmed,
        updated_at: now,
      },
    ];

    let updatedResult = await safeQuery<Record<string, any> | null>(() =>
      supabase
        .from('comments')
        .update(updatePayloads[0])
        .eq('id', commentId)
        .select('*')
        .single()
    );

    if (updatedResult.error && isMissingColumn(updatedResult.error, 'is_edited')) {
      updatedResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(updatePayloads[1])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }
    if (updatedResult.error && isMissingColumn(updatedResult.error, 'edit_count')) {
      updatedResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(updatePayloads[2])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }
    if (updatedResult.error && isMissingColumn(updatedResult.error, 'edited_at')) {
      updatedResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(updatePayloads[3])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }

    if (updatedResult.error || !updatedResult.data) {
      return res.status(503).json({ success: false, code: 'UPDATE_FAILED', error: 'Failed to update comment.' });
    }

    // Mentions: update mention rows + notify new mentions
    if (mentionUsernames.length > 0) {
      const mentionedUsers = await resolveMentionUsers(mentionUsernames);
      const mentionedIds = mentionedUsers.map((u) => u.id).filter((id) => id && id !== userId);

      let blockedSet = new Set<string>();
      if (mentionedIds.length > 0) {
        const blockedByAuthor = await safeQuery(() =>
          supabase
            .from('user_blocks')
            .select('blocked_user_id')
            .eq('blocker_id', userId)
            .in('blocked_user_id', mentionedIds)
        );
        if (!blockedByAuthor.error && blockedByAuthor.data) {
          for (const r of blockedByAuthor.data as any[]) blockedSet.add(r.blocked_user_id);
        }
        const blockedAuthor = await safeQuery(() =>
          supabase
            .from('user_blocks')
            .select('blocker_id')
            .in('blocker_id', mentionedIds)
            .eq('blocked_user_id', userId)
        );
        if (!blockedAuthor.error && blockedAuthor.data) {
          for (const r of blockedAuthor.data as any[]) blockedSet.add(r.blocker_id);
        }
      }
      const filteredMentionIds = mentionedIds.filter((id) => !blockedSet.has(id));

      const existingMentions = await safeQuery(() =>
        supabase.from('comment_mentions').select('mentioned_user_id').eq('comment_id', commentId)
      );
      const existingIds = new Set(
        ((existingMentions.data as any[]) || []).map((r) => r.mentioned_user_id)
      );

      await safeQuery(() => supabase.from('comment_mentions').delete().eq('comment_id', commentId));
      if (filteredMentionIds.length > 0) {
        await safeQuery(() =>
          supabase
            .from('comment_mentions')
            .insert(filteredMentionIds.map((uid) => ({ comment_id: commentId, mentioned_user_id: uid })))
        );
      }

      const newMentionIds = filteredMentionIds.filter((id) => !existingIds.has(id));
      if (newMentionIds.length > 0) {
        try {
          const mentionNotif = await createNotifications(
            newMentionIds.map((uid) => ({
              userId: uid,
              type: 'comment',
              title: 'You were mentioned',
              body: `"${trimmed.slice(0, 120)}"`,
              href: `/p/${existing.prediction_id}/comments/${commentId}`,
              metadata: { predictionId: existing.prediction_id, commentId, authorId: userId, subtype: 'mention.comment' },
              externalRef: `notif:comment:mention:${commentId}:${uid}`,
            }))
          );
          console.log('[comments:edit] mention notifications:', { commentId, ...mentionNotif });
        } catch (notifyError) {
          console.warn('[comments:edit] mention notifications failed:', notifyError);
        }
      }
    }

    const updatedRow = updatedResult.data as Record<string, any>;
    const updatedUserLookup = await fetchUsersByIdentityIds([String(updatedRow.user_id || userId), userId]);
    const updatedUser = updatedUserLookup[String(updatedRow.user_id || userId)] || updatedUserLookup[userId] || null;
    const isOwn = Boolean(String(updatedRow.user_id || '') === userId || (updatedUser?.auth_user_id && String(updatedUser.auth_user_id) === userId));
    return res.json({
      success: true,
      data: {
        ...updatedRow,
        user: updatedUser || null,
        is_edited: true,
        is_own: isOwn,
      },
    });
  } catch (error) {
    console.error('[comments:edit]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// DELETE /comments/:commentId — soft delete
// ============================================================================
router.delete('/comments/:commentId', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { commentId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }

    const existingResult = await safeQuery(() =>
      supabase.from('comments').select('*').eq('id', commentId).maybeSingle()
    );
    const existing = existingResult.data as any;
    if (!existing?.id) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    const adminKey = req.headers['x-admin-key'] as string | undefined;
    const isAdmin = (ADMIN_API_KEY && adminKey === ADMIN_API_KEY) || (await isAdminUser(userId));
    if (!isAdmin && existing.user_id !== userId) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have permission to delete this comment.' });
    }

    const now = new Date().toISOString();
    const deletePayloads: Record<string, any>[] = [
      {
        is_deleted: true,
        deleted_at: now,
        deleted_by: userId,
        content: null,
        updated_at: now,
      },
      {
        is_deleted: true,
        deleted_at: now,
        deleted_by: userId,
        content: 'Comment deleted',
        updated_at: now,
      },
      {
        is_deleted: true,
        deleted_at: now,
        content: 'Comment deleted',
        updated_at: now,
      },
      {
        deleted_at: now,
        content: 'Comment deleted',
        updated_at: now,
      },
      {
        content: 'Comment deleted',
        updated_at: now,
      },
    ];

    let softResult = await safeQuery<Record<string, any> | null>(() =>
      supabase
        .from('comments')
        .update(deletePayloads[0])
        .eq('id', commentId)
        .select('*')
        .single()
    );

    if (softResult.error && isNotNullViolation(softResult.error, 'content')) {
      softResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(deletePayloads[1])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }
    if (softResult.error && isMissingColumn(softResult.error, 'deleted_by')) {
      softResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(deletePayloads[2])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }
    if (softResult.error && isMissingColumn(softResult.error, 'is_deleted')) {
      softResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(deletePayloads[3])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }
    if (softResult.error && isMissingColumn(softResult.error, 'deleted_at')) {
      softResult = await safeQuery<Record<string, any> | null>(() =>
        supabase
          .from('comments')
          .update(deletePayloads[4])
          .eq('id', commentId)
          .select('*')
          .single()
      );
    }

    if (softResult.error || !softResult.data) {
      return res.status(503).json({ success: false, code: 'DELETE_FAILED', error: 'Failed to delete comment.' });
    }

    const deletedRow = softResult.data as Record<string, any>;
    await syncPredictionCommentsCount(String(deletedRow.prediction_id || existing.prediction_id || ''));
    const deletedUserLookup = await fetchUsersByIdentityIds([String(deletedRow.user_id || userId), userId]);
    const deletedUser = deletedUserLookup[String(deletedRow.user_id || userId)] || deletedUserLookup[userId] || null;
    const isOwn = Boolean(String(deletedRow.user_id || '') === userId || (deletedUser?.auth_user_id && String(deletedUser.auth_user_id) === userId));

    return res.json({
      success: true,
      data: {
        ...deletedRow,
        user: deletedUser || null,
        is_own: isOwn,
      },
    });
  } catch (error) {
    console.error('[comments:delete]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// POST /comments/:commentId/report — report comment (UGC)
// ============================================================================
router.post('/comments/:commentId/report', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const { commentId } = req.params;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }
    const { reason, reasonCategory } = req.body || {};
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmed || trimmed.length < 3) {
      return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', error: 'Report reason is required.' });
    }

    // Basic anti-spam limit: 5 reports / 10 minutes per user
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const recentReports = await safeQuery(() =>
      supabase
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', userId)
        .gte('created_at', windowStart)
    );
    if (!recentReports.error && (recentReports.count || 0) >= 5) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: 'Too many reports. Please try again later.',
      });
    }

    const commentResult = await safeQuery(() =>
      supabase.from('comments').select('id').eq('id', commentId).maybeSingle()
    );
    if (commentResult.error || !commentResult.data) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', error: 'Comment not found.' });
    }

    const insert = await safeQuery(() =>
      supabase.from('content_reports').insert({
        reporter_id: userId,
        target_type: 'comment',
        target_id: commentId,
        reason_category: reasonCategory || null,
        reason: trimmed,
        status: 'open',
      })
    );
    if (insert.error) {
      // Unique constraint -> treat as already reported
      if (String(insert.error?.code || '') === '23505') {
        return res.status(200).json({ success: true, data: { status: 'open' } });
      }
      return res.status(503).json({ success: false, code: 'REPORT_FAILED', error: 'Failed to submit report.' });
    }

    // Hide for reporter immediately
    await safeQuery(() =>
      supabase.from('content_hides').insert({
        user_id: userId,
        target_type: 'comment',
        target_id: commentId,
      })
    );

    return res.status(201).json({ success: true, data: { status: 'open' } });
  } catch (error) {
    console.error('[comments:report]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// POST /users/:userId/block — compatibility alias for in-context block actions
// DELETE /users/:userId/block — unblock alias
// ============================================================================
router.post('/users/:userId/block', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const blockerId = authReq.user?.id;
    const blockedUserId = req.params.userId;
    if (!blockerId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }
    if (!blockedUserId) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'User id is required.' });
    }
    if (blockedUserId === blockerId) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'You cannot block yourself.' });
    }

    const blockInsert = await safeQuery(() =>
      supabase
        .from('user_blocks')
        .upsert({ blocker_id: blockerId, blocked_user_id: blockedUserId }, { onConflict: 'blocker_id,blocked_user_id' })
    );
    if (blockInsert.error && String(blockInsert.error?.code || '') !== '23505') {
      return res.status(503).json({ success: false, code: 'BLOCK_FAILED', error: 'Failed to block user.' });
    }

    await safeQuery(() =>
      supabase
        .from('content_hides')
        .upsert({ user_id: blockerId, target_type: 'user', target_id: blockedUserId }, { onConflict: 'user_id,target_type,target_id' })
    );

    return res.status(201).json({ success: true, data: { blockedUserId } });
  } catch (error) {
    console.error('[users:block]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.delete('/users/:userId/block', requireSupabaseAuth, requireTermsAccepted, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const blockerId = authReq.user?.id;
    const blockedUserId = req.params.userId;
    if (!blockerId) {
      return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', error: 'Authorization required' });
    }
    if (!blockedUserId) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'User id is required.' });
    }

    await safeQuery(() =>
      supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_user_id', blockedUserId)
    );
    await safeQuery(() =>
      supabase
        .from('content_hides')
        .delete()
        .eq('user_id', blockerId)
        .eq('target_type', 'user')
        .eq('target_id', blockedUserId)
    );

    return res.status(200).json({ success: true, data: { unblockedUserId: blockedUserId } });
  } catch (error) {
    console.error('[users:unblock]', error);
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
