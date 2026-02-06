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

// Comment interface matching API response
export interface Comment {
  id: string;
  predictionId: string;
  user: { 
    id: string; 
    username: string; 
    full_name?: string;
    avatarUrl?: string; 
    avatar_url?: string;
    is_verified?: boolean;
  };
  text: string;
  content?: string; // Server uses 'content' field
  createdAt: string;
  created_at?: string; // Server uses 'created_at'
  updatedAt: string;
  updated_at?: string; // Server uses 'updated_at'
  edited: boolean;
  is_edited?: boolean; // Server uses 'is_edited'
  isDeleted: boolean;
  likeCount?: number;
  likes_count?: number; // Server uses 'likes_count'
  likedByMe?: boolean;
  is_liked?: boolean; // Server uses 'is_liked'
}

export type Status = 'idle' | 'loading' | 'loaded' | 'paginating' | 
                     'network_error' | 'server_error' | 'client_error' | 'parse_error';

interface PredictionCommentsState {
  items?: Comment[];          // last good data only
  nextCursor?: string | null;
  status?: Status;
  posting?: boolean;
  draft?: string;           // session-persisted
  highlightedId?: string;   // #comment-id
}

interface CommentsState {
  byPrediction: {
    [predictionId: string]: PredictionCommentsState;
  };
}

interface CommentsActions {
  // Main actions
  fetchComments: (predictionId: string) => Promise<void>;
  addComment: (predictionId: string, text: string) => Promise<void>;
  editComment: (predictionId: string, commentId: string, text: string) => Promise<void>;
  deleteComment: (predictionId: string, commentId: string) => Promise<void>;
  loadMore: (predictionId: string) => Promise<void>;
  
  // UI state
  setDraft: (predictionId: string, draft: string) => void;
  clearDraft: (predictionId: string) => void;
  setHighlighted: (predictionId: string, commentId: string | undefined) => void;
  
  // Getters
  getComments: (predictionId: string) => Comment[];
  getCommentCount: (predictionId: string) => number;
  getStatus: (predictionId: string) => Status;
  getDraft: (predictionId: string) => string;
  isPosting: (predictionId: string) => boolean;
  hasMore: (predictionId: string) => boolean;
}

// Transform server comment to client format
const transformComment = (serverComment: any): Comment => {
  return {
    id: serverComment.id,
    predictionId: serverComment.prediction_id,
    user: {
      id: serverComment.user?.id || serverComment.user_id,
      username: serverComment.user?.username || 'Anonymous',
      full_name: serverComment.user?.full_name,
      avatarUrl: serverComment.user?.avatar_url,
      avatar_url: serverComment.user?.avatar_url,
      is_verified: serverComment.user?.is_verified || false,
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
  };
};

// Classify errors based on response (supports ApiError with .status)
function classifyError(error: any): Status {
  if (!error) return 'network_error';
  const status = error.status ?? (error instanceof ApiError ? error.status : undefined);
  if (error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
    return 'network_error';
  }
  if (typeof status === 'number' && status >= 500) return 'server_error';
  if (typeof status === 'number' && status >= 400 && status < 500) return 'client_error';
  if (error.name === 'SyntaxError' || error.message?.includes('JSON')) return 'parse_error';
  return 'network_error';
}

export const useUnifiedCommentStore = create<CommentsState & CommentsActions>()(
  devtools(
    (set, get) => ({
      byPrediction: {},

      // Getters
      getComments: (predictionId: string) => {
        const state = get().byPrediction[predictionId];
        return state?.items || [];
      },

      getCommentCount: (predictionId: string) => {
        const state = get().byPrediction[predictionId];
        return state?.items?.length || 0;
      },

      getStatus: (predictionId: string) => {
        const state = get().byPrediction[predictionId];
        return state?.status || 'idle';
      },

      getDraft: (predictionId: string) => {
        const state = get().byPrediction[predictionId];
        return state?.draft || '';
      },

      isPosting: (predictionId: string) => {
        const state = get().byPrediction[predictionId];
        return state?.posting || false;
      },

      hasMore: (predictionId: string) => {
        const state = get().byPrediction[predictionId];
        return state?.nextCursor !== null;
      },

      // Fetch initial comments
      fetchComments: async (predictionId: string) => {
        if (!predictionId?.trim()) {
          qaLog('fetchComments: invalid predictionId');
          return;
        }

        const currentState = get().byPrediction[predictionId];
        if (currentState?.status === 'loading') {
          return; // Already loading
        }

        qaLog(`Fetching comments for ${predictionId}`);

        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              status: 'loading',
            },
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

          qaLog(`Fetched ${items.length} comments for ${predictionId}`);

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items,
                nextCursor,
                status: 'loaded',
              },
            },
          }));

        } catch (error: any) {
          // Handle 404 as empty comments (no error state)
          if (error.status === 404) {
            qaLog(`No comments found for ${predictionId} (404)`);
            set((state) => ({
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: [],
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
                items: state.byPrediction[predictionId]?.items || [], // Keep last good data
                status: errorStatus,
              },
            },
          }));
        }
      },

      // Load more comments (pagination)
      loadMore: async (predictionId: string) => {
        if (!predictionId?.trim()) {
          return;
        }

        const currentState = get().byPrediction[predictionId];
        if (!currentState?.nextCursor || currentState?.status === 'paginating') {
          return; // No more data or already loading
        }

        qaLog(`Loading more comments for ${predictionId}`);

        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              status: 'paginating',
            },
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

          qaLog(`Loaded ${newItems.length} more comments for ${predictionId}`);

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
          const errorStatus = classifyError(error);
          qaLog(`Failed to load more comments for ${predictionId}:`, error);

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                status: errorStatus,
              },
            },
          }));
        }
      },

      // Add new comment — no optimistic insert to avoid flicker on error
      addComment: async (predictionId: string, text: string) => {
        if (!predictionId?.trim() || !text?.trim()) {
          throw new Error('Invalid input');
        }

        const trimmedText = text.trim();
        if (trimmedText.length > 1000) {
          throw new Error('Comment too long');
        }

        qaLog(`Adding comment to ${predictionId}:`, trimmedText);

        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              posting: true,
            },
          },
        }));

        try {
          // Post to server first — no optimistic insert
          const response = await apiClient.post(COMMENTS_CREATE(predictionId), {
            content: trimmedText,
          });

          // Handle different response formats
          let serverComment: Comment;
          if (response.data) {
            serverComment = transformComment(response.data);
          } else if (response.success && response.data) {
            serverComment = transformComment(response.data);
          } else {
            serverComment = transformComment(response);
          }

          qaLog(`Comment added successfully for ${predictionId}`);

          // Insert the confirmed comment at the top of the list
          set((state) => {
            const currentItems = state.byPrediction[predictionId]?.items || [];
            return {
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  items: [serverComment, ...currentItems],
                  posting: false,
                  draft: '', // Clear draft on success
                },
              },
            };
          });

          // Clear draft from session storage
          try {
            sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`);
          } catch (e) {
            // Ignore storage errors
          }

        } catch (error: any) {
          qaLog(`Failed to add comment for ${predictionId}:`, error);

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                posting: false,
              },
            },
          }));

          if (error instanceof ApiError) {
            if (error.status === 401) {
              void useAuthStore.getState().logout();
              throw new Error('Session expired. Please log in again.');
            }
            if (error.status === 409) {
              // Account deleted or terms required
              const data = error.responseData as any;
              throw new Error(data?.error || 'Account deleted. Restore to comment.');
            }
            if (error.status === 403) {
              throw new Error('Account suspended.');
            }
            if (error.status === 404) {
              console.error(`[unifiedCommentStore] 404 – Server endpoint not found. URL used: ${error.url ?? 'unknown'}`);
              throw new Error('Server endpoint not found.');
            }
            if (error.status === 422) {
              const data = error.responseData as any;
              throw new Error(data?.error || 'Invalid comment.');
            }
          }
          throw error;
        }
      },

      // Edit comment
      editComment: async (predictionId: string, commentId: string, text: string) => {
        if (!predictionId?.trim() || !commentId?.trim() || !text?.trim()) {
          throw new Error('Invalid input');
        }

        const trimmedText = text.trim();
        if (trimmedText.length > 280) {
          throw new Error('Comment too long');
        }

        qaLog(`Editing comment ${commentId} in ${predictionId}`);

        // Store original for rollback
        const originalComment = get().byPrediction[predictionId]?.items?.find(c => c.id === commentId);
        if (!originalComment) {
          throw new Error('Comment not found');
        }

        // Optimistic update
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).map(item =>
                item.id === commentId
                  ? { ...item, text: trimmedText, edited: true, updatedAt: new Date().toISOString() }
                  : item
              ) || [],
            },
          },
        }));

        const userId = useAuthStore.getState().user?.id;
        try {
          // Single canonical endpoint: PUT /api/v2/social/comments/:commentId (no fallback)
          const response = await apiClient.put(COMMENTS_EDIT(commentId), {
            content: trimmedText,
            userId: userId ?? '',
          });

          let updatedComment: Comment;
          if (response.data) {
            updatedComment = transformComment(response.data);
          } else {
            updatedComment = transformComment(response);
          }

          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: (state.byPrediction[predictionId]?.items ?? []).map(item =>
                  item.id === commentId ? updatedComment : item
                ) || [],
              },
            },
          }));

        } catch (error: any) {
          qaLog(`Failed to edit comment ${commentId}:`, error);
          if (error instanceof ApiError) {
            if (error.status === 401) {
              void useAuthStore.getState().logout();
              throw new Error('Session expired. Please log in again.');
            }
            if (error.status === 404) {
              console.error(`[unifiedCommentStore] 404 – Server endpoint not found. URL used: ${error.url ?? 'unknown'}`);
              throw new Error('Server endpoint not found.');
            }
          }
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: (state.byPrediction[predictionId]?.items ?? []).map(item =>
                  item.id === commentId ? originalComment : item
                ) || [],
              },
            },
          }));

          throw error;
        }
      },

      // Delete comment
      deleteComment: async (predictionId: string, commentId: string) => {
        if (!predictionId?.trim() || !commentId?.trim()) {
          throw new Error('Invalid input');
        }

        qaLog(`Deleting comment ${commentId} from ${predictionId}`);

        const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          throw new Error('Session expired. Please log in again.');
        }

        // Store original for rollback
        const originalItems = get().byPrediction[predictionId]?.items ?? [];
        const commentToDelete = originalItems.find(c => c.id === commentId);
        if (!commentToDelete) {
          throw new Error('Comment not found');
        }

        // Optimistic delete
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              items: (state.byPrediction[predictionId]?.items ?? []).filter(item => item.id !== commentId),
            },
          },
        }));

        try {
          // Single canonical endpoint: DELETE /api/v2/social/comments/:commentId (no fallback)
          await apiClient.delete(`${COMMENTS_DELETE(commentId)}?userId=${encodeURIComponent(userId)}`);

          qaLog(`Comment ${commentId} deleted successfully`);

        } catch (error: any) {
          qaLog(`Failed to delete comment ${commentId}:`, error);
          if (error instanceof ApiError) {
            if (error.status === 401) {
              void useAuthStore.getState().logout();
              throw new Error('Session expired. Please log in again.');
            }
            if (error.status === 404) {
              console.error(`[unifiedCommentStore] 404 – Server endpoint not found. URL used: ${error.url ?? 'unknown'}`);
              throw new Error('Server endpoint not found.');
            }
          }
          set((state) => ({
            byPrediction: {
              ...state.byPrediction,
              [predictionId]: {
                ...state.byPrediction[predictionId],
                items: originalItems,
              },
            },
          }));

          throw error;
        }
      },

      // Set draft with session persistence
      setDraft: (predictionId: string, draft: string) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              draft,
            },
          },
        }));

        // Persist to session storage with debouncing
        try {
          if (draft.trim()) {
            sessionStorage.setItem(`fcz_comment_draft_${predictionId}`, draft);
          } else {
            sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`);
          }
        } catch (e) {
          // Ignore storage errors
        }
      },

      clearDraft: (predictionId: string) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              draft: '',
            },
          },
        }));

        try {
          sessionStorage.removeItem(`fcz_comment_draft_${predictionId}`);
        } catch (e) {
          // Ignore storage errors
        }
      },

      setHighlighted: (predictionId: string, commentId: string | undefined) => {
        set((state) => ({
          byPrediction: {
            ...state.byPrediction,
            [predictionId]: {
              ...state.byPrediction[predictionId],
              highlightedId: commentId,
            },
          },
        }));

        // Auto-clear highlight after 1.5s
        if (commentId) {
          setTimeout(() => {
            set((state) => ({
              byPrediction: {
                ...state.byPrediction,
                [predictionId]: {
                  ...state.byPrediction[predictionId],
                  highlightedId: undefined,
                },
              },
            }));
          }, 1500);
        }
      },
    }),
    {
      name: 'fcz-unified-comments',
      partialize: (_state: CommentsState & CommentsActions) => ({}), // Don't persist to localStorage - using sessionStorage for drafts
    }
  )
);

// Hook for convenient access to a specific prediction's comments
export const useCommentsForPrediction = (predictionId: string) => {
  const store = useUnifiedCommentStore();
  
  return {
    comments: store.getComments(predictionId),
    commentCount: store.getCommentCount(predictionId),
    status: store.getStatus(predictionId),
    draft: store.getDraft(predictionId),
    isPosting: store.isPosting(predictionId),
    hasMore: store.hasMore(predictionId),
    
    // Actions
    fetchComments: () => store.fetchComments(predictionId),
    loadMore: () => store.loadMore(predictionId),
    addComment: (text: string) => store.addComment(predictionId, text),
    editComment: (commentId: string, text: string) => store.editComment(predictionId, commentId, text),
    deleteComment: (commentId: string) => store.deleteComment(predictionId, commentId),
    setDraft: (draft: string) => store.setDraft(predictionId, draft),
    clearDraft: () => store.clearDraft(predictionId),
    setHighlighted: (commentId: string | undefined) => store.setHighlighted(predictionId, commentId),
  };
};
