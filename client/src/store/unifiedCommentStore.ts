import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient, ApiError } from '../lib/api';
import { useAuthStore } from './authStore';
import { qaLog } from '../utils/devQa';
import { v4 as uuidv4 } from 'uuid';

/** Single canonical comments API (no fallback; do not use /api/v2/comments/predictions/...). */
const COMMENTS_LIST = (predictionId: string, page: number, limit: number) =>
  `/social/predictions/${predictionId}/comments?page=${page}&limit=${limit}`;
const COMMENTS_CREATE = (predictionId: string) => `/social/predictions/${predictionId}/comments`;
const COMMENTS_EDIT = (commentId: string) => `/social/comments/${commentId}`;
const COMMENTS_DELETE = (commentId: string) => `/social/comments/${commentId}`;
const COMMENTS_GET_ONE = (predictionId: string, commentId: string) =>
  `/social/predictions/${predictionId}/comments/${commentId}`;

// ---------------------------------------------------------------------------
// Comment interface — single canonical shape used everywhere
// ---------------------------------------------------------------------------
export interface CommentUser {
  id: string;
  auth_user_id?: string | null;
  username: string;
  full_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  is_verified?: boolean;
  og_badge?: string | null;
}

export type CommentSendStatus = 'sent' | 'sending' | 'failed';

export interface Comment {
  id: string;
  predictionId: string;
  user: CommentUser;
  text: string;
  content?: string;
  parentCommentId?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  edited: boolean;
  is_edited?: boolean;
  edited_at?: string | null;
  isDeleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  replies?: Comment[];
  likeCount?: number;
  likes_count?: number;
  likedByMe?: boolean;
  is_liked?: boolean;
  is_own?: boolean;
  // Optimistic UI fields
  sendStatus?: CommentSendStatus;
  clientTempId?: string;     // set only for optimistic comments
  clientRequestId?: string;  // idempotency key for server
  errorMessage?: string;     // human-readable error (when sendStatus='failed')
  _originalContent?: string; // content to resend on retry
}

export type Status = 'idle' | 'loading' | 'loaded' | 'paginating' |
                     'network_error' | 'server_error' | 'client_error' | 'parse_error';

interface PredictionCommentsState {
  items?: Comment[];
  nextCursor?: string | null;
  status?: Status;
  posting?: boolean;
  draft?: string;
  highlightedId?: string;
}

interface CommentsState {
  byPrediction: {
    [predictionId: string]: PredictionCommentsState;
  };
}

interface CommentsActions {
  fetchComments: (predictionId: string) => Promise<void>;
  addComment: (predictionId: string, text: string, parentCommentId?: string | null) => Promise<void>;
  retryComment: (predictionId: string, clientTempId: string) => Promise<void>;
  dismissFailedComment: (predictionId: string, clientTempId: string) => void;
  editComment: (predictionId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (predictionId: string, commentId: string) => Promise<void>;
  toggleLike: (predictionId: string, commentId: string) => Promise<void>;
  fetchCommentById: (predictionId: string, commentId: string) => Promise<{ ok: boolean; status?: number }>;
  loadMore: (predictionId: string) => Promise<void>;
  setDraft: (predictionId: string, draft: string) => void;
  clearDraft: (predictionId: string) => void;
  setHighlighted: (predictionId: string, commentId: string | undefined) => void;
  getComments: (predictionId: string) => Comment[];
  getCommentCount: (predictionId: string) => number;
  getStatus: (predictionId: string) => Status;
  getDraft: (predictionId: string) => string;
  isPosting: (predictionId: string) => boolean;
  hasMore: (predictionId: string) => boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Comment from the server's raw row. */
const transformComment = (serverComment: any): Comment => {
  const userNode = serverComment.user || serverComment.author || serverComment.profile || {};
  const userId =
    userNode.id ||
    serverComment.user_id ||
    serverComment.userId ||
    serverComment.author_id ||
    serverComment.authorId ||
    '';
  const username =
    userNode.username ||
    userNode.handle ||
    serverComment.username ||
    serverComment.handle ||
    'Anonymous';
  const fullName =
    userNode.full_name ||
    userNode.fullName ||
    userNode.display_name ||
    userNode.displayName ||
    undefined;
  const avatar =
    userNode.avatar_url ||
    userNode.avatarUrl ||
    userNode.avatar ||
    serverComment.avatar_url ||
    serverComment.avatarUrl ||
    undefined;
  const likesCount =
    serverComment.likes_count ??
    serverComment.like_count ??
    serverComment.likeCount ??
    0;
  const isLiked =
    Boolean(serverComment.is_liked) ||
    Boolean(serverComment.is_liked_by_user) ||
    Boolean(serverComment.likedByMe);
  const isOwn =
    typeof serverComment.is_own === 'boolean'
      ? serverComment.is_own
      : (typeof serverComment.is_owned_by_user === 'boolean'
          ? serverComment.is_owned_by_user
          : undefined);
  const rawContent = serverComment.content ?? serverComment.text ?? '';
  const looksDeletedByContent =
    typeof rawContent === 'string' &&
    rawContent.trim().toLowerCase() === 'comment deleted';

  return {
    id: serverComment.id,
    predictionId: serverComment.prediction_id || serverComment.predictionId || '',
    user: {
      id: userId,
      auth_user_id: userNode.auth_user_id || userNode.authUserId || null,
      username,
      full_name: fullName,
      avatarUrl: avatar,
      avatar_url: avatar,
      is_verified: Boolean(userNode.is_verified ?? userNode.verified ?? serverComment.is_verified),
      og_badge: userNode.og_badge || userNode.ogBadge || null,
    },
    text: rawContent || '',
    content: rawContent,
    parentCommentId:
      serverComment.parent_comment_id ||
      serverComment.parentId ||
      serverComment.parent_commentId ||
      null,
    createdAt: serverComment.created_at || serverComment.createdAt || new Date().toISOString(),
    created_at: serverComment.created_at,
    updatedAt: serverComment.updated_at || serverComment.updatedAt || new Date().toISOString(),
    updated_at: serverComment.updated_at,
    edited:
      Boolean(serverComment.is_edited) ||
      Boolean(serverComment.edited) ||
      Boolean(serverComment.edited_at) ||
      (serverComment.edit_count || 0) > 0,
    is_edited: serverComment.is_edited,
    edited_at: serverComment.edited_at,
    isDeleted:
      Boolean(serverComment.is_deleted) ||
      Boolean(serverComment.deleted_at) ||
      looksDeletedByContent,
    deleted_at: serverComment.deleted_at || null,
    deleted_by: serverComment.deleted_by || null,
    likeCount: likesCount,
    likes_count: likesCount,
    likedByMe: isLiked,
    is_liked: isLiked,
    is_own: isOwn,
    replies: Array.isArray(serverComment.replies) ? serverComment.replies.map(transformComment) : [],
    sendStatus: 'sent',
  };
};

/** Merge a partial server update onto an existing comment without losing identity/ownership fields. */
const mergeCommentUpdate = (existing: Comment, incoming: Comment): Comment => {
  const hasValue = (value?: string | null) =>
    typeof value === 'string' && value.trim().length > 0;
  const isPlaceholderName = (value?: string | null) =>
    (value || '').trim().toLowerCase() === 'anonymous';

  const mergedUser = {
    id: hasValue(incoming.user?.id) ? incoming.user!.id : (existing.user?.id || ''),
    username:
      hasValue(incoming.user?.username) && !isPlaceholderName(incoming.user?.username)
        ? incoming.user!.username
        : (existing.user?.username || 'Anonymous'),
    full_name:
      hasValue(incoming.user?.full_name) && !isPlaceholderName(incoming.user?.full_name)
        ? incoming.user!.full_name
        : existing.user?.full_name,
    avatarUrl: hasValue(incoming.user?.avatarUrl) || hasValue(incoming.user?.avatar_url)
      ? (incoming.user?.avatarUrl || incoming.user?.avatar_url)
      : (existing.user?.avatarUrl || existing.user?.avatar_url),
    avatar_url: hasValue(incoming.user?.avatar_url) || hasValue(incoming.user?.avatarUrl)
      ? (incoming.user?.avatar_url || incoming.user?.avatarUrl)
      : (existing.user?.avatar_url || existing.user?.avatarUrl),
    is_verified: typeof incoming.user?.is_verified === 'boolean'
      ? incoming.user.is_verified
      : existing.user?.is_verified,
    og_badge: incoming.user?.og_badge ?? existing.user?.og_badge ?? null,
  };

  return {
    ...existing,
    ...incoming,
    user: mergedUser,
    is_own: typeof incoming.is_own === 'boolean' ? incoming.is_own : existing.is_own,
  };
};

const upsertList = (items: Comment[], incoming: Comment[], options?: { prependNew?: boolean }) => {
  const incomingById = new Map(incoming.map((c) => [c.id, c]));
  const merged = items.map((item) => {
    const next = incomingById.get(item.id);
    return next ? mergeCommentUpdate(item, next) : item;
  });
  const existingIds = new Set(items.map((c) => c.id));
  const newOnes = incoming.filter((c) => !existingIds.has(c.id));
  return options?.prependNew ? [...newOnes, ...merged] : [...merged, ...newOnes];
};

/** De-duplicate by stable id; later items replace earlier ones but keep order. */
const dedupeById = (items: Comment[]): Comment[] => {
  const seen = new Map<string, number>();
  const result: Comment[] = [];
  for (const item of items) {
    const id = item.id;
    if (!id) {
      result.push(item);
      continue;
    }
    const existingIndex = seen.get(id);
    if (existingIndex === undefined) {
      seen.set(id, result.length);
      result.push(item);
    } else {
      const existingItem = result[existingIndex];
      result[existingIndex] = existingItem
        ? mergeCommentUpdate(existingItem, item)
        : item;
    }
  }
  return result;
};

const isDeletedComment = (comment: Comment): boolean =>
  Boolean(
    comment.isDeleted ||
    comment.deleted_at ||
    String(comment.content || comment.text || '').trim().toLowerCase() === 'comment deleted'
  );

const flattenComments = (items: Comment[]): Comment[] => {
  const flat: Comment[] = [];
  for (const item of items) {
    flat.push(item);
    if (item.replies && item.replies.length > 0) {
      flat.push(...item.replies);
    }
  }
  return flat;
};

const groupByParent = (items: Comment[]): Comment[] => {
  const byId = new Map<string, Comment>();
  const topLevel: Comment[] = [];
  for (const item of items) {
    byId.set(item.id, { ...item, replies: [] });
  }
  for (const item of items) {
    const parentId = item.parentCommentId || null;
    if (!parentId) {
      topLevel.push(byId.get(item.id)!);
      continue;
    }
    const parent = byId.get(parentId);
    if (!parent || parent.parentCommentId) {
      // Invalid nesting: treat as top-level
      topLevel.push(byId.get(item.id)!);
      continue;
    }
    parent.replies = [...(parent.replies || []), byId.get(item.id)!];
  }
  return topLevel;
};

/** Build an optimistic placeholder from the current user + content. */
function buildOptimisticComment(
  predictionId: string,
  text: string,
  clientTempId: string,
  parentCommentId?: string | null,
  clientRequestId?: string
): Comment {
  const authUser = useAuthStore.getState().user;
  
  // Compute full_name with robust fallback (same logic as CommentInput)
  let computedFullName = authUser?.full_name;
  if (!computedFullName || typeof computedFullName !== 'string' || !computedFullName.trim()) {
    const firstName = authUser?.firstName || (authUser as any)?.first_name || '';
    const lastName = authUser?.lastName || (authUser as any)?.last_name || '';
    const combined = `${firstName} ${lastName}`.trim();
    computedFullName = combined || authUser?.username || 'You';
  }
  
  return {
    id: clientTempId,
    predictionId,
    user: {
      id: authUser?.id || '',
      username: authUser?.username || 'You',
      full_name: computedFullName,
      avatarUrl: authUser?.avatar_url || (authUser as any)?.avatarUrl || authUser?.avatar,
      avatar_url: authUser?.avatar_url || authUser?.avatar,
      is_verified: authUser?.is_verified || false,
      og_badge: (authUser as any)?.og_badge || null,
    },
    text,
    content: text,
    parentCommentId: parentCommentId || null,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    edited: false,
    isDeleted: false,
    replies: [],
    is_own: true,
    sendStatus: 'sending',
    clientTempId,
    clientRequestId,
    _originalContent: text,
  };
}

/** Classify API errors into Status types. */
function classifyError(error: any): Status {
  if (!error) return 'network_error';
  const status = error.status ?? (error instanceof ApiError ? error.status : undefined);
  if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) return 'network_error';
  if (typeof status === 'number' && status >= 500) return 'server_error';
  if (typeof status === 'number' && status >= 400 && status < 500) return 'client_error';
  if (error.name === 'SyntaxError' || error.message?.includes('JSON')) return 'parse_error';
  return 'network_error';
}

/** Human-readable message from an API error. */
function friendlyErrorMessage(error: any): string {
  if (error instanceof ApiError) {
    const data = error.responseData as any;
    if (error.status === 401) return 'Session expired. Please log in again.';
    if (error.status === 403) return data?.error || 'Account suspended.';
    if (error.status === 409) return data?.error || 'Account issue. Restore to comment.';
    if (error.status === 422) return data?.error || 'Invalid comment.';
    if (error.status === 404) return 'Server endpoint not found.';
    return data?.error || error.message || 'Failed to post comment.';
  }
  if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
    return 'Network error. Check your connection.';
  }
  return error?.message || 'Failed to post comment. Tap to retry.';
}

let _tempIdCounter = 0;
function nextTempId(): string {
  return `tmp_${Date.now()}_${++_tempIdCounter}`;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useUnifiedCommentStore = create<CommentsState & CommentsActions>()(
  devtools(
    (set, get) => ({
      byPrediction: {},

      // ---- Getters ----
      getComments: (predictionId: string) => {
        const items = get().byPrediction[predictionId]?.items || [];
        return items
          .filter((c) => !isDeletedComment(c))
          .map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => !isDeletedComment(r)),
          }));
      },
      getCommentCount: (predictionId: string) => {
        const items = get().byPrediction[predictionId]?.items;
        if (!items) return 0;
        // Count only non-failed, non-deleted items for the badge
        let count = 0;
        for (const c of items) {
          if (c.sendStatus !== 'failed' && !isDeletedComment(c)) count += 1;
          const replies = c.replies || [];
          for (const r of replies) {
            if (r.sendStatus !== 'failed' && !isDeletedComment(r)) count += 1;
          }
        }
        return count;
      },
      getStatus: (predictionId: string) => get().byPrediction[predictionId]?.status || 'idle',
      getDraft: (predictionId: string) => get().byPrediction[predictionId]?.draft || '',
      isPosting: (predictionId: string) => get().byPrediction[predictionId]?.posting || false,
      hasMore: (predictionId: string) => get().byPrediction[predictionId]?.nextCursor !== null,

      // ---- Fetch ----
      fetchComments: async (predictionId: string) => {
        if (!predictionId?.trim()) return;
        const currentState = get().byPrediction[predictionId];
        if (currentState?.status === 'loading') return;

        qaLog(`Fetching comments for ${predictionId}`);

        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: { ...state.byPrediction[predictionId], status: 'loading' },
          },
        }));

        try {
          const response = await apiClient.get(COMMENTS_LIST(predictionId, 1, 20));

          // DEBUG: Log raw response to diagnose issues
          console.log(`[unifiedCommentStore] Raw response for ${predictionId}:`, {
            hasData: !!response?.data,
            dataIsArray: Array.isArray(response?.data),
            dataLength: Array.isArray(response?.data) ? response.data.length : 'N/A',
            hasComments: !!response?.comments,
            responseIsArray: Array.isArray(response),
            keys: response ? Object.keys(response) : [],
          });

          let items: Comment[] = [];
          let nextCursor = null;

          // Parse response - handle multiple formats
          if (response?.data && Array.isArray(response.data)) {
            items = response.data.map(transformComment).filter((c: Comment) => !isDeletedComment(c));
            nextCursor = response.pagination?.hasNext ? 'next' : null;
          } else if (response?.comments && Array.isArray(response.comments)) {
            items = response.comments.map(transformComment).filter((c: Comment) => !isDeletedComment(c));
            nextCursor = response.hasMore ? 'next' : null;
          } else if (Array.isArray(response)) {
            items = response.map(transformComment).filter((c: Comment) => !isDeletedComment(c));
          } else if (response?.data === null && response?.success === true) {
            // Empty result from server
            items = [];
          }

          // Preserve any local optimistic/failed items that aren't yet confirmed
          const existingItems = get().byPrediction[predictionId]?.items || [];
          const localOnlyItems = existingItems.filter(
            (c) => c.clientTempId && (c.sendStatus === 'sending' || c.sendStatus === 'failed')
          );
          const existingFlat = flattenComments(existingItems);
          const localReplies = existingFlat.filter(
            (c) => c.clientTempId && (c.sendStatus === 'sending' || c.sendStatus === 'failed')
          );
          const mergedFlat = dedupeById([...items, ...localReplies, ...localOnlyItems]);
          const mergedItems = groupByParent(mergedFlat);

          console.log(`[unifiedCommentStore] Fetched ${items.length} comments for ${predictionId}, preserving ${localOnlyItems.length} local items`);

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: dedupeById(mergedItems),
                nextCursor,
                status: 'loaded',
              },
            },
          }));
        } catch (error: any) {
          console.error(`[unifiedCommentStore] Error fetching comments for ${predictionId}:`, error);
          if (error.status === 404) {
            set((state) => ({
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: state.byPrediction[predictionId]?.items || [],
                  nextCursor: null,
                  status: 'loaded',
                },
              },
            }));
            return;
          }
          const errorStatus = classifyError(error);
          qaLog(`Failed to fetch comments for ${predictionId}:`, error);
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: state.byPrediction[predictionId]?.items || [],
                status: errorStatus,
              },
            },
          }));
        }
      },

      // ---- Paginate ----
      loadMore: async (predictionId: string) => {
        if (!predictionId?.trim()) return;
        const currentState = get().byPrediction[predictionId];
        if (!currentState?.nextCursor || currentState?.status === 'paginating') return;

        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: { ...state.byPrediction[predictionId], status: 'paginating' },
          },
        }));

        try {
          const currentPage = Math.ceil((currentState.items?.length || 0) / 20) + 1;
          const response = await apiClient.get(COMMENTS_LIST(predictionId, currentPage, 20));

          let newItems: Comment[] = [];
          let nextCursor = null;
          if (response.data && Array.isArray(response.data)) {
            newItems = response.data.map(transformComment).filter((c: Comment) => !isDeletedComment(c));
            nextCursor = response.pagination?.hasNext ? 'next' : null;
          } else if (response.comments && Array.isArray(response.comments)) {
            newItems = response.comments.map(transformComment).filter((c: Comment) => !isDeletedComment(c));
            nextCursor = response.hasMore ? 'next' : null;
          }

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: groupByParent(
                  dedupeById([
                    ...flattenComments(state.byPrediction[predictionId]?.items || []),
                    ...newItems,
                  ])
                ),
                nextCursor,
                status: 'loaded',
              },
            },
          }));
        } catch (error: any) {
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: { ...state.byPrediction[predictionId], status: classifyError(error) },
            },
          }));
        }
      },

      // ---- Add (optimistic insert → confirm or mark failed) ----
      addComment: async (predictionId: string, text: string, parentCommentId?: string | null) => {
        if (!predictionId?.trim() || !text?.trim()) throw new Error('Invalid input');
        const trimmedText = text.trim();
        if (trimmedText.length > 1000) throw new Error('Comment too long');

        const clientTempId = nextTempId();
        const clientRequestId = uuidv4();
        const optimistic = buildOptimisticComment(
          predictionId,
          trimmedText,
          clientTempId,
          parentCommentId,
          clientRequestId
        );

        qaLog(`Adding comment to ${predictionId}: "${trimmedText.slice(0, 40)}…" (${clientTempId})`);

        // 1) Insert optimistic comment + set posting
        set((state) => {
          const currentItems = state.byPrediction[predictionId]?.items || [];
          if (parentCommentId) {
            const nextItems = currentItems.map((item) =>
              item.id === parentCommentId
                ? { ...item, replies: [optimistic, ...(item.replies || [])] }
                : item
            );
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: nextItems,
                  posting: true,
                },
              },
            };
          }
          return {
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: [optimistic, ...currentItems],
                posting: true,
              },
            },
          };
        });

        try {
          const response = await apiClient.post(COMMENTS_CREATE(predictionId), {
            body: trimmedText,
            parentId: parentCommentId || null,
            clientRequestId,
          });

          // Parse server comment
          let serverComment: Comment;
          if (response.data) {
            serverComment = transformComment(response.data);
          } else {
            serverComment = transformComment(response);
          }
          serverComment.sendStatus = 'sent';

          qaLog(`Comment confirmed for ${predictionId}: ${serverComment.id}`);

          // 2) Replace optimistic with confirmed
          set((state) => {
            const currentItems = state.byPrediction[predictionId]?.items || [];
            if (parentCommentId) {
              const nextItems = currentItems.map((item) =>
                item.id === parentCommentId
                  ? {
                      ...item,
                      replies: (item.replies || []).map((c) =>
                        c.clientTempId === clientTempId ? serverComment : c
                      ),
                    }
                  : item
              );
              return {
                byPrediction: {
                  ...state.byPrediction,
                  [predictionId]: {
                    ...state.byPrediction[predictionId],
                    items: dedupeById(nextItems),
                    posting: false,
                    draft: '',
                  },
                },
              };
            }
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: dedupeById(
                    currentItems.map((c) =>
                      c.clientTempId === clientTempId ? serverComment : c
                    )
                  ),
                  posting: false,
                  draft: '',
                },
              },
            };
          });

          // Clear draft storage
          try { sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`); } catch {}

        } catch (error: any) {
          qaLog(`Failed to add comment for ${predictionId}:`, error);

          const msg = friendlyErrorMessage(error);

          // 3) Mark optimistic as failed (keep it visible!)
          set((state) => {
            const currentItems = state.byPrediction[predictionId]?.items || [];
            if (parentCommentId) {
              const nextItems = currentItems.map((item) =>
                item.id === parentCommentId
                  ? {
                      ...item,
                      replies: (item.replies || []).map((c) =>
                        c.clientTempId === clientTempId
                          ? { ...c, sendStatus: 'failed' as const, errorMessage: msg }
                          : c
                      ),
                    }
                  : item
              );
              return {
                byPrediction: {
                  ...state.byPrediction,
                  [predictionId]: {
                    ...state.byPrediction[predictionId],
                    items: nextItems,
                    posting: false,
                  },
                },
              };
            }
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: currentItems.map((c) =>
                    c.clientTempId === clientTempId
                      ? { ...c, sendStatus: 'failed' as const, errorMessage: msg }
                      : c
                  ),
                  posting: false,
                  // Keep draft so user can edit before retrying
                },
              },
            };
          });

          // Handle auth-specific errors
          if (error instanceof ApiError && error.status === 401) {
            void useAuthStore.getState().logout();
          }

          throw error;
        }
      },

      // ---- Retry a failed optimistic comment ----
      retryComment: async (predictionId: string, clientTempId: string) => {
        const items = get().byPrediction[predictionId]?.items || [];
        let failedComment: Comment | undefined;
        let parentId: string | null = null;
        for (const item of items) {
          if (item.clientTempId === clientTempId && item.sendStatus === 'failed') {
            failedComment = item;
            break;
          }
          const reply = (item.replies || []).find(
            (r) => r.clientTempId === clientTempId && r.sendStatus === 'failed'
          );
          if (reply) {
            failedComment = reply;
            parentId = item.id;
            break;
          }
        }
        if (!failedComment) return;

        const textToSend = failedComment._originalContent || failedComment.text;
        const requestId = failedComment.clientRequestId || uuidv4();
        qaLog(`Retrying comment ${clientTempId} for ${predictionId}`);

        // Mark as sending again
        set((state) => {
          const currentItems = state.byPrediction[predictionId]?.items || [];
          if (parentId) {
            const nextItems = currentItems.map((item) =>
              item.id === parentId
                ? {
                    ...item,
                    replies: (item.replies || []).map((c) =>
                      c.clientTempId === clientTempId
                        ? { ...c, sendStatus: 'sending' as const, errorMessage: undefined }
                        : c
                    ),
                  }
                : item
            );
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: nextItems,
                  posting: true,
                },
              },
            };
          }
          return {
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: currentItems.map((c) =>
                  c.clientTempId === clientTempId
                    ? { ...c, sendStatus: 'sending' as const, errorMessage: undefined }
                    : c
                ),
                posting: true,
              },
            },
          };
        });

        try {
          const response = await apiClient.post(COMMENTS_CREATE(predictionId), {
            body: textToSend,
            parentId: failedComment.parentCommentId || null,
            clientRequestId: requestId,
          });

          let serverComment: Comment;
          if (response.data) {
            serverComment = transformComment(response.data);
          } else {
            serverComment = transformComment(response);
          }
          serverComment.sendStatus = 'sent';

          set((state) => {
            const currentItems = state.byPrediction[predictionId]?.items || [];
            if (parentId) {
              const nextItems = currentItems.map((item) =>
                item.id === parentId
                  ? {
                      ...item,
                      replies: (item.replies || []).map((c) =>
                        c.clientTempId === clientTempId ? serverComment : c
                      ),
                    }
                  : item
              );
              return {
                byPrediction: {
                  ...state.byPrediction,
                  [predictionId]: {
                    ...state.byPrediction[predictionId],
                    items: dedupeById(nextItems),
                    posting: false,
                    draft: '',
                  },
                },
              };
            }
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: dedupeById(
                    (state.byPrediction[predictionId]?.items || []).map((c) =>
                      c.clientTempId === clientTempId ? serverComment : c
                    )
                  ),
                  posting: false,
                  draft: '',
                },
              },
            };
          });

          try { sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`); } catch {}

        } catch (error: any) {
          const msg = friendlyErrorMessage(error);
          set((state) => {
            const currentItems = state.byPrediction[predictionId]?.items || [];
            if (parentId) {
              const nextItems = currentItems.map((item) =>
                item.id === parentId
                  ? {
                      ...item,
                      replies: (item.replies || []).map((c) =>
                        c.clientTempId === clientTempId
                          ? { ...c, sendStatus: 'failed' as const, errorMessage: msg }
                          : c
                      ),
                    }
                  : item
              );
              return {
                byPrediction: {
                  ...state.byPrediction,
                  [predictionId]: {
                    ...state.byPrediction[predictionId],
                    items: nextItems,
                    posting: false,
                  },
                },
              };
            }
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: (state.byPrediction[predictionId]?.items || []).map((c) =>
                    c.clientTempId === clientTempId
                      ? { ...c, sendStatus: 'failed' as const, errorMessage: msg }
                      : c
                  ),
                  posting: false,
                },
              },
            };
          });
          throw error;
        }
      },

      // ---- Dismiss (remove) a failed comment ----
      dismissFailedComment: (predictionId: string, clientTempId: string) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items || [])
                .filter((c) => c.clientTempId !== clientTempId)
                .map((c) => ({
                  ...c,
                  replies: (c.replies || []).filter((r) => r.clientTempId !== clientTempId),
                })),
            },
          },
        }));
      },

      // ---- Edit ----
      editComment: async (predictionId: string, commentId: string, text: string) => {
        if (!predictionId?.trim() || !commentId?.trim() || !text?.trim()) throw new Error('Invalid input');
        const trimmedText = text.trim();
        if (trimmedText.length > 1000) throw new Error('Comment too long');

        const originalComment = (() => {
          const items = get().byPrediction[predictionId]?.items || [];
          for (const item of items) {
            if (item.id === commentId) return item;
            const reply = (item.replies || []).find((r) => r.id === commentId);
            if (reply) return reply;
          }
          return undefined;
        })();
        if (!originalComment) throw new Error('Comment not found');

        // Optimistic
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).map((item) => {
                if (item.id === commentId) {
                  return { ...item, text: trimmedText, content: trimmedText, edited: true, updatedAt: new Date().toISOString() };
                }
                if (item.replies && item.replies.length > 0) {
                  return {
                    ...item,
                    replies: item.replies.map((reply) =>
                      reply.id === commentId
                        ? { ...reply, text: trimmedText, content: trimmedText, edited: true, updatedAt: new Date().toISOString() }
                        : reply
                    ),
                  };
                }
                return item;
              }),
            },
          },
        }));

        const userId = useAuthStore.getState().user?.id;
        try {
          const response = await apiClient.patch(COMMENTS_EDIT(commentId), { body: trimmedText });
          const updated = response.data ? transformComment(response.data) : transformComment(response);
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: (state.byPrediction[predictionId]?.items ?? []).map((item) => {
                  if (item.id === commentId) return mergeCommentUpdate(item, updated);
                  if (item.replies && item.replies.length > 0) {
                    return {
                      ...item,
                      replies: item.replies.map((reply) =>
                        reply.id === commentId ? mergeCommentUpdate(reply, updated) : reply
                      ),
                    };
                  }
                  return item;
                }),
              },
            },
          }));
        } catch (error: any) {
          // Rollback
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: (state.byPrediction[predictionId]?.items ?? []).map((item) => {
                  if (item.id === commentId) return originalComment;
                  if (item.replies && item.replies.length > 0) {
                    return {
                      ...item,
                      replies: item.replies.map((reply) => (reply.id === commentId ? originalComment : reply)),
                    };
                  }
                  return item;
                }),
              },
            },
          }));
          if (error instanceof ApiError && error.status === 401) void useAuthStore.getState().logout();
          throw error;
        }
      },

      // ---- Delete ----
      deleteComment: async (predictionId: string, commentId: string) => {
        if (!predictionId?.trim() || !commentId?.trim()) throw new Error('Invalid input');
        const originalItems = get().byPrediction[predictionId]?.items ?? [];
        const commentToDelete = (() => {
          for (const item of originalItems) {
            if (item.id === commentId) return item;
            const reply = (item.replies || []).find((r) => r.id === commentId);
            if (reply) return reply;
          }
          return undefined;
        })();
        if (!commentToDelete) throw new Error('Comment not found');

        // Optimistic delete:
        // - remove top-level comment row from list
        // - remove reply from parent replies
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).flatMap((item) => {
                if (item.id === commentId) {
                  return [];
                }
                if (item.replies && item.replies.length > 0) {
                  return {
                    ...item,
                    replies: item.replies.filter((reply) => reply.id !== commentId),
                  };
                }
                return [item];
              }),
            },
          },
        }));

        try {
          await apiClient.delete(COMMENTS_DELETE(commentId));
        } catch (error: any) {
          // Rollback
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: { ...state.byPrediction[predictionId], items: originalItems },
            },
          }));
          if (error instanceof ApiError && error.status === 401) void useAuthStore.getState().logout();
          throw error;
        }
      },

      // ---- Fetch single comment (deep link) ----
      fetchCommentById: async (predictionId: string, commentId: string) => {
        if (!predictionId?.trim() || !commentId?.trim()) return { ok: false, status: 400 };
        try {
          console.log('[DEEPLINK][Store] fetchCommentById request', { predictionId, commentId });
          const response = await apiClient.get(COMMENTS_GET_ONE(predictionId, commentId));
          const payload = response?.data ?? response;
          const commentRow = payload?.comment || payload?.data?.comment;
          if (!commentRow) {
            console.log('[DEEPLINK][Store] fetchCommentById empty payload', { predictionId, commentId, payload });
            return { ok: false, status: 404 };
          }
          const thread = payload?.thread || payload?.data?.thread || {};
          const comment = transformComment(commentRow);
          const parent = thread.parent ? transformComment(thread.parent) : null;
          const replies = Array.isArray(thread.replies) ? thread.replies.map(transformComment) : [];

          set((state) => {
            const items = state.byPrediction[predictionId]?.items ?? [];
            let nextItems = items;

            if (comment.parentCommentId) {
              const parentId = comment.parentCommentId;
              const existingParent = items.find((item) => item.id === parentId);
              const baseParent = existingParent
                ? mergeCommentUpdate(existingParent, parent || existingParent)
                : (parent || null);
              if (baseParent) {
                const mergedReplies = upsertList(baseParent.replies || [], [comment, ...replies]);
                const updatedParent = { ...baseParent, replies: mergedReplies };
                nextItems = existingParent
                  ? items.map((item) => (item.id === parentId ? updatedParent : item))
                  : upsertList(items, [updatedParent], { prependNew: true });
              }
            } else {
              const mergedTop = upsertList(items, [comment], { prependNew: true });
              const mergedReplies = replies.length > 0 ? upsertList(comment.replies || [], replies) : comment.replies;
              nextItems = mergedTop.map((item) => {
                if (item.id !== comment.id) return item;
                return mergedReplies ? { ...item, replies: mergedReplies } : item;
              });
            }

            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: nextItems,
                },
              },
            };
          });
          console.log('[DEEPLINK][Store] fetchCommentById success', {
            requested: commentId,
            returned: comment.id,
            parentCommentId: comment.parentCommentId,
          });
          return { ok: true, status: 200 };
        } catch (error: any) {
          console.log('[DEEPLINK][Store] fetchCommentById error', {
            predictionId,
            commentId,
            status: error instanceof ApiError ? error.status : 500,
            message: error?.message,
          });
          if (error instanceof ApiError) {
            return { ok: false, status: error.status };
          }
          return { ok: false, status: 500 };
        }
      },

      // ---- Like toggle ----
      toggleLike: async (predictionId: string, commentId: string) => {
        if (!predictionId?.trim() || !commentId?.trim()) throw new Error('Invalid input');
        const originalItems = get().byPrediction[predictionId]?.items ?? [];

        // Optimistic toggle
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).map((item) => {
                const toggle = (c: Comment) => {
                  const liked = !(c.is_liked || c.likedByMe);
                  const count = c.likes_count ?? c.likeCount ?? 0;
                  const nextCount = Math.max(0, count + (liked ? 1 : -1));
                  return { ...c, is_liked: liked, likedByMe: liked, likes_count: nextCount, likeCount: nextCount };
                };
                if (item.id === commentId) return toggle(item);
                if (item.replies && item.replies.length > 0) {
                  return {
                    ...item,
                    replies: item.replies.map((reply) => (reply.id === commentId ? toggle(reply) : reply)),
                  };
                }
                return item;
              }),
            },
          },
        }));

        try {
          const current = (() => {
            for (const item of originalItems) {
              if (item.id === commentId) return item;
              const reply = (item.replies || []).find((r) => r.id === commentId);
              if (reply) return reply;
            }
            return undefined;
          })();
          const willLike = !(current?.is_liked || current?.likedByMe);
          const response = willLike
            ? await apiClient.post(`/social/comments/${commentId}/like`)
            : await apiClient.delete(`/social/comments/${commentId}/like`);
          const liked = response?.data?.liked ?? response?.liked;
          const likesCount = response?.data?.likes_count ?? response?.likes_count;
          if (typeof liked === 'boolean' || typeof likesCount === 'number') {
            set((state) => ({
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: (state.byPrediction[predictionId]?.items ?? []).map((item) => {
                    const apply = (c: Comment) => {
                      const nextCount = typeof likesCount === 'number'
                        ? likesCount
                        : (c.likes_count ?? c.likeCount ?? 0);
                      return {
                        ...c,
                        is_liked: typeof liked === 'boolean' ? liked : c.is_liked,
                        likedByMe: typeof liked === 'boolean' ? liked : c.likedByMe,
                        likes_count: nextCount,
                        likeCount: nextCount,
                      };
                    };
                    if (item.id === commentId) return apply(item);
                    if (item.replies && item.replies.length > 0) {
                      return {
                        ...item,
                        replies: item.replies.map((reply) => (reply.id === commentId ? apply(reply) : reply)),
                      };
                    }
                    return item;
                  }),
                },
              },
            }));
          }
        } catch (error: any) {
          // Rollback
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: { ...state.byPrediction[predictionId], items: originalItems },
            },
          }));
          if (error instanceof ApiError && error.status === 401) void useAuthStore.getState().logout();
          throw error;
        }
      },

      // ---- Draft ----
      setDraft: (predictionId: string, draft: string) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: { ...state.byPrediction[predictionId], draft },
          },
        }));
        try {
          if (draft.trim()) sessionStorage.setItem(`fcz_comment_draft_${predictionId}`, draft);
          else sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`);
        } catch {}
      },
      clearDraft: (predictionId: string) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: { ...state.byPrediction[predictionId], draft: '' },
          },
        }));
        try { sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`); } catch {}
      },
      setHighlighted: (predictionId: string, commentId: string | undefined) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: { ...state.byPrediction[predictionId], highlightedId: commentId },
          },
        }));
        if (commentId) {
          setTimeout(() => {
            set((state) => ({
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: { ...state.byPrediction[predictionId], highlightedId: undefined },
              },
            }));
          }, 1500);
        }
      },
    }),
    {
      name: 'fcz-unified-comments',
      partialize: () => ({}),
    }
  )
);

// ---------------------------------------------------------------------------
// Convenience hook for a single prediction's comments
// ---------------------------------------------------------------------------
export const useCommentsForPrediction = (predictionId: string) => {
  const store = useUnifiedCommentStore();
  return {
    comments: store.getComments(predictionId),
    commentCount: store.getCommentCount(predictionId),
    status: store.getStatus(predictionId),
    draft: store.getDraft(predictionId),
    isPosting: store.isPosting(predictionId),
    hasMore: store.hasMore(predictionId),
    fetchComments: () => store.fetchComments(predictionId),
    loadMore: () => store.loadMore(predictionId),
    addComment: (text: string, parentCommentId?: string | null) => store.addComment(predictionId, text, parentCommentId),
    retryComment: (clientTempId: string) => store.retryComment(predictionId, clientTempId),
    dismissFailedComment: (clientTempId: string) => store.dismissFailedComment(predictionId, clientTempId),
    editComment: (commentId: string, text: string) => store.editComment(predictionId, commentId, text),
    deleteComment: (commentId: string) => store.deleteComment(predictionId, commentId),
    toggleLike: (commentId: string) => store.toggleLike(predictionId, commentId),
    setDraft: (draft: string) => store.setDraft(predictionId, draft),
    clearDraft: () => store.clearDraft(predictionId),
    setHighlighted: (commentId: string | undefined) => store.setHighlighted(predictionId, commentId),
  };
};
