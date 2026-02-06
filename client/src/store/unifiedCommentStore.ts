import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient, ApiError } from '../lib/api';
import { useAuthStore } from './authStore';
import { qaLog } from '../utils/devQa';

/** Single canonical comments API (no fallback; do not use /api/v2/comments/predictions/...). */
const COMMENTS_LIST = (predictionId: string, page: number, limit: number) =>
  `/social/predictions/${predictionId}/comments?page=${page}&limit=${limit}`;
const COMMENTS_CREATE = (predictionId: string) => `/social/predictions/${predictionId}/comments`;
const COMMENTS_EDIT = (commentId: string) => `/social/comments/${commentId}`;
const COMMENTS_DELETE = (commentId: string) => `/social/comments/${commentId}`;

// ---------------------------------------------------------------------------
// Comment interface — single canonical shape used everywhere
// ---------------------------------------------------------------------------
export interface CommentUser {
  id: string;
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
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  edited: boolean;
  is_edited?: boolean;
  isDeleted: boolean;
  likeCount?: number;
  likes_count?: number;
  likedByMe?: boolean;
  is_liked?: boolean;
  // Optimistic UI fields
  sendStatus?: CommentSendStatus;
  clientTempId?: string;     // set only for optimistic comments
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
  addComment: (predictionId: string, text: string) => Promise<void>;
  retryComment: (predictionId: string, clientTempId: string) => Promise<void>;
  dismissFailedComment: (predictionId: string, clientTempId: string) => void;
  editComment: (predictionId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (predictionId: string, commentId: string) => Promise<void>;
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
const transformComment = (serverComment: any): Comment => ({
  id: serverComment.id,
  predictionId: serverComment.prediction_id,
  user: {
    id: serverComment.user?.id || serverComment.user_id,
    username: serverComment.user?.username || 'Anonymous',
    full_name: serverComment.user?.full_name,
    avatarUrl: serverComment.user?.avatar_url,
    avatar_url: serverComment.user?.avatar_url,
    is_verified: serverComment.user?.is_verified || false,
    og_badge: serverComment.user?.og_badge || null,
  },
  text: serverComment.content || serverComment.text || '',
  content: serverComment.content,
  createdAt: serverComment.created_at || serverComment.createdAt || new Date().toISOString(),
  created_at: serverComment.created_at,
  updatedAt: serverComment.updated_at || serverComment.updatedAt || new Date().toISOString(),
  updated_at: serverComment.updated_at,
  edited: serverComment.is_edited || serverComment.edited || false,
  is_edited: serverComment.is_edited,
  isDeleted: serverComment.is_deleted || false,
  likeCount: serverComment.likes_count || serverComment.likeCount || 0,
  likes_count: serverComment.likes_count,
  likedByMe: serverComment.is_liked || serverComment.likedByMe || false,
  is_liked: serverComment.is_liked,
  sendStatus: 'sent',
});

/** Build an optimistic placeholder from the current user + content. */
function buildOptimisticComment(predictionId: string, text: string, clientTempId: string): Comment {
  const authUser = useAuthStore.getState().user;
  return {
    id: clientTempId,
    predictionId,
    user: {
      id: authUser?.id || '',
      username: authUser?.username || 'You',
      full_name: authUser?.full_name || (authUser as any)?.fullName,
      avatarUrl: authUser?.avatar_url || (authUser as any)?.avatarUrl,
      avatar_url: authUser?.avatar_url,
      is_verified: false,
      og_badge: (authUser as any)?.og_badge || null,
    },
    text,
    content: text,
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    edited: false,
    isDeleted: false,
    sendStatus: 'sending',
    clientTempId,
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
      getComments: (predictionId: string) => get().byPrediction[predictionId]?.items || [],
      getCommentCount: (predictionId: string) => {
        const items = get().byPrediction[predictionId]?.items;
        if (!items) return 0;
        // Count only non-failed, non-deleted items for the badge
        return items.filter(c => c.sendStatus !== 'failed' && !c.isDeleted).length;
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

          let items: Comment[] = [];
          let nextCursor = null;

          if (response.data && Array.isArray(response.data)) {
            items = response.data.map(transformComment);
            nextCursor = response.pagination?.hasNext ? 'next' : null;
          } else if (response.comments && Array.isArray(response.comments)) {
            items = response.comments.map(transformComment);
            nextCursor = response.hasMore ? 'next' : null;
          } else if (Array.isArray(response)) {
            items = response.map(transformComment);
          }

          // Preserve any local optimistic/failed items that aren't yet confirmed
          const existingItems = get().byPrediction[predictionId]?.items || [];
          const localOnlyItems = existingItems.filter(
            (c) => c.clientTempId && (c.sendStatus === 'sending' || c.sendStatus === 'failed')
          );

          qaLog(`Fetched ${items.length} comments for ${predictionId}, preserving ${localOnlyItems.length} local items`);

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: [...localOnlyItems, ...items],
                nextCursor,
                status: 'loaded',
              },
            },
          }));
        } catch (error: any) {
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
            newItems = response.data.map(transformComment);
            nextCursor = response.pagination?.hasNext ? 'next' : null;
          } else if (response.comments && Array.isArray(response.comments)) {
            newItems = response.comments.map(transformComment);
            nextCursor = response.hasMore ? 'next' : null;
          }

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: [...(state.byPrediction[predictionId]?.items || []), ...newItems],
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
      addComment: async (predictionId: string, text: string) => {
        if (!predictionId?.trim() || !text?.trim()) throw new Error('Invalid input');
        const trimmedText = text.trim();
        if (trimmedText.length > 1000) throw new Error('Comment too long');

        const clientTempId = nextTempId();
        const optimistic = buildOptimisticComment(predictionId, trimmedText, clientTempId);

        qaLog(`Adding comment to ${predictionId}: "${trimmedText.slice(0, 40)}…" (${clientTempId})`);

        // 1) Insert optimistic comment + set posting
        set((state) => {
          const currentItems = state.byPrediction[predictionId]?.items || [];
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
            content: trimmedText,
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
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: currentItems.map((c) =>
                    c.clientTempId === clientTempId ? serverComment : c
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
        const failedComment = items.find((c) => c.clientTempId === clientTempId && c.sendStatus === 'failed');
        if (!failedComment) return;

        const textToSend = failedComment._originalContent || failedComment.text;
        qaLog(`Retrying comment ${clientTempId} for ${predictionId}`);

        // Mark as sending again
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items || []).map((c) =>
                c.clientTempId === clientTempId
                  ? { ...c, sendStatus: 'sending' as const, errorMessage: undefined }
                  : c
              ),
              posting: true,
            },
          },
        }));

        try {
          const response = await apiClient.post(COMMENTS_CREATE(predictionId), {
            content: textToSend,
          });

          let serverComment: Comment;
          if (response.data) {
            serverComment = transformComment(response.data);
          } else {
            serverComment = transformComment(response);
          }
          serverComment.sendStatus = 'sent';

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: (state.byPrediction[predictionId]?.items || []).map((c) =>
                  c.clientTempId === clientTempId ? serverComment : c
                ),
                posting: false,
                draft: '',
              },
            },
          }));

          try { sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`); } catch {}

        } catch (error: any) {
          const msg = friendlyErrorMessage(error);
          set((state) => ({
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
          }));
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
              items: (state.byPrediction[predictionId]?.items || []).filter(
                (c) => c.clientTempId !== clientTempId
              ),
            },
          },
        }));
      },

      // ---- Edit ----
      editComment: async (predictionId: string, commentId: string, text: string) => {
        if (!predictionId?.trim() || !commentId?.trim() || !text?.trim()) throw new Error('Invalid input');
        const trimmedText = text.trim();
        if (trimmedText.length > 1000) throw new Error('Comment too long');

        const originalComment = get().byPrediction[predictionId]?.items?.find((c) => c.id === commentId);
        if (!originalComment) throw new Error('Comment not found');

        // Optimistic
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).map((item) =>
                item.id === commentId
                  ? { ...item, text: trimmedText, content: trimmedText, edited: true, updatedAt: new Date().toISOString() }
                  : item
              ),
            },
          },
        }));

        const userId = useAuthStore.getState().user?.id;
        try {
          const response = await apiClient.put(COMMENTS_EDIT(commentId), {
            content: trimmedText,
            userId: userId ?? '',
          });
          const updated = response.data ? transformComment(response.data) : transformComment(response);
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: (state.byPrediction[predictionId]?.items ?? []).map((item) =>
                  item.id === commentId ? updated : item
                ),
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
                items: (state.byPrediction[predictionId]?.items ?? []).map((item) =>
                  item.id === commentId ? originalComment : item
                ),
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
        const userId = useAuthStore.getState().user?.id;
        if (!userId) throw new Error('Session expired. Please log in again.');

        const originalItems = get().byPrediction[predictionId]?.items ?? [];
        const commentToDelete = originalItems.find((c) => c.id === commentId);
        if (!commentToDelete) throw new Error('Comment not found');

        // Optimistic remove
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).filter((item) => item.id !== commentId),
            },
          },
        }));

        try {
          await apiClient.delete(`${COMMENTS_DELETE(commentId)}?userId=${encodeURIComponent(userId)}`);
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
    addComment: (text: string) => store.addComment(predictionId, text),
    retryComment: (clientTempId: string) => store.retryComment(predictionId, clientTempId),
    dismissFailedComment: (clientTempId: string) => store.dismissFailedComment(predictionId, clientTempId),
    editComment: (commentId: string, text: string) => store.editComment(predictionId, commentId, text),
    deleteComment: (commentId: string) => store.deleteComment(predictionId, commentId),
    setDraft: (draft: string) => store.setDraft(predictionId, draft),
    clearDraft: () => store.clearDraft(predictionId),
    setHighlighted: (commentId: string | undefined) => store.setHighlighted(predictionId, commentId),
  };
};
