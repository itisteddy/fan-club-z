import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Unified comment interface that matches the API response
export interface UnifiedComment {
  id: string;
  prediction_id: string;
  user_id: string;
  content: string;
  parent_comment_id?: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    is_verified: boolean;
  };
  likes_count: number;
  is_liked: boolean;
  replies_count: number;
  replies?: UnifiedComment[];
}

interface CommentCounts {
  [predictionId: string]: number;
}

interface CommentState {
  // Comments storage - organized by prediction ID
  commentsByPrediction: Record<string, UnifiedComment[]>;
  
  // Comment counts for quick access (used in UI cards)
  commentCounts: CommentCounts;
  
  // Loading states
  loading: Record<string, boolean>;
  
  // Error states
  errors: Record<string, string | null>;
  
  // Submission states
  submitting: Record<string, boolean>;
  
  // Track which predictions have been fetched to prevent refetching
  fetchedPredictions: Set<string>;
  
  // Last fetch timestamps to enable cache invalidation
  lastFetched: Record<string, number>;
  
  // Initialization state
  initialized: boolean;
}

interface CommentActions {
  // Fetch comments for a prediction
  fetchComments: (predictionId: string) => Promise<void>;
  
  // Add a new comment
  addComment: (predictionId: string, content: string, parentCommentId?: string) => Promise<void>;
  
  // Toggle like on a comment
  toggleCommentLike: (commentId: string, predictionId: string) => Promise<void>;
  
  // Get comment count for a prediction
  getCommentCount: (predictionId: string) => number;
  
  // Get comments for a prediction
  getComments: (predictionId: string) => UnifiedComment[];
  
  // Clear error for a prediction
  clearError: (predictionId: string) => void;
  
  // Initialize comment counts from predictions data
  initializeCommentCounts: (counts: CommentCounts) => void;
  
  // Update comment count for a prediction
  updateCommentCount: (predictionId: string, count: number) => void;
  
  // Initialize the store
  initialize: () => void;
}

import { getEnvironmentConfig } from '../lib/environment';

const API_BASE_URL = getEnvironmentConfig().apiUrl;

export const useUnifiedCommentStore = create<CommentState & CommentActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      commentsByPrediction: {},
      commentCounts: {},
      loading: {},
      errors: {},
      submitting: {},
      fetchedPredictions: new Set(),
      lastFetched: {},
      initialized: false,

      // Initialize the store
      initialize: () => {
        const state = get();
        if (!state.initialized) {
          console.log('🔧 Initializing unified comment store');
          set({ initialized: true });
        }
      },

      // Initialize comment counts from external data (like predictions)
      initializeCommentCounts: (counts: CommentCounts) => {
        console.log('🔧 Initializing comment counts:', counts);
        set((state) => ({
          commentCounts: { ...state.commentCounts, ...counts }
        }));
      },

      // Update comment count for a prediction
      updateCommentCount: (predictionId: string, count: number) => {
        if (!predictionId?.trim()) {
          console.warn('⚠️ Cannot update comment count: invalid predictionId');
          return;
        }
        
        console.log(`📊 Updating comment count for ${predictionId}: ${count}`);
        set((state) => ({
          commentCounts: {
            ...state.commentCounts,
            [predictionId]: count
          }
        }));
      },

      // Get comment count for a prediction (with fallbacks)
      getCommentCount: (predictionId: string) => {
        if (!predictionId?.trim()) {
          return 0;
        }

        const state = get();
        
        // 1. Check actual loaded comments first (most accurate)
        const actualComments = state.commentsByPrediction[predictionId];
        if (actualComments && Array.isArray(actualComments)) {
          return actualComments.length;
        }
        
        // 2. Fall back to stored count
        if (state.commentCounts[predictionId] !== undefined) {
          return state.commentCounts[predictionId];
        }
        
        // 3. Default to 0
        return 0;
      },

      // Get comments for a prediction
      getComments: (predictionId: string) => {
        if (!predictionId?.trim()) {
          return [];
        }

        const state = get();
        return state.commentsByPrediction[predictionId] || [];
      },

      // Clear error for a prediction
      clearError: (predictionId: string) => {
        if (!predictionId?.trim()) {
          return;
        }

        set((state) => ({
          errors: {
            ...state.errors,
            [predictionId]: null
          }
        }));
      },

      // Fetch comments for a prediction
      fetchComments: async (predictionId: string) => {
        if (!predictionId?.trim()) {
          console.warn('⚠️ Cannot fetch comments: invalid predictionId');
          return;
        }

        const state = get();
        
        // Cache policy: allow cache only if it is non-empty and fresh (<= 60s)
        const lastFetch = state.lastFetched[predictionId];
        const sixtySecondsAgo = Date.now() - (60 * 1000);
        const cached = state.commentsByPrediction[predictionId];
        const cachedLength = Array.isArray(cached) ? cached.length : 0;
        if (lastFetch && lastFetch > sixtySecondsAgo && cachedLength > 0) {
          console.log(`⚡ Using cached comments for prediction ${predictionId} (${cachedLength} comments)`);
          return;
        }
        
        // Check if we're already loading this prediction
        if (state.loading[predictionId]) {
          console.log(`⏳ Already loading comments for prediction ${predictionId}`);
          return;
        }

        // Do not block refetches purely because we fetched once before; rely on TTL above

        console.log(`🔍 Fetching comments for prediction ${predictionId}`);
        
        set((state) => ({
          loading: { ...state.loading, [predictionId]: true },
          errors: { ...state.errors, [predictionId]: null }
        }));

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v2/social/predictions/${predictionId}/comments`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
          }

          const data = await response.json();
          const comments: UnifiedComment[] = data.comments || [];

          console.log(`✅ Loaded ${comments.length} comments for prediction ${predictionId}`);

          set((state) => {
            const newFetchedPredictions = new Set(state.fetchedPredictions);
            newFetchedPredictions.add(predictionId);
            
            return {
              commentsByPrediction: {
                ...state.commentsByPrediction,
                [predictionId]: comments
              },
              commentCounts: {
                ...state.commentCounts,
                [predictionId]: comments.length
              },
              fetchedPredictions: newFetchedPredictions,
              lastFetched: {
                ...state.lastFetched,
                [predictionId]: Date.now()
              },
              loading: { ...state.loading, [predictionId]: false }
            };
          });

        } catch (error) {
          console.error('❌ Failed to fetch comments:', error);
          
          set((state) => ({
            commentsByPrediction: {
              ...state.commentsByPrediction,
              [predictionId]: []
            },
            commentCounts: {
              ...state.commentCounts,
              [predictionId]: 0
            },
            loading: { ...state.loading, [predictionId]: false },
            errors: { 
              ...state.errors, 
              [predictionId]: 'Failed to load comments. Please try again later.' 
            }
          }));
        }
      },

      // Add a new comment
      addComment: async (predictionId: string, content: string, parentCommentId?: string, userData?: any) => {
        if (!predictionId?.trim()) {
          throw new Error('Cannot add comment: invalid predictionId');
        }

        if (!content?.trim()) {
          throw new Error('Comment content cannot be empty');
        }

        console.log(`💬 Adding comment to prediction ${predictionId}`);

        set((state) => ({
          submitting: { ...state.submitting, [predictionId]: true },
          errors: { ...state.errors, [predictionId]: null }
        }));

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/v2/social/predictions/${predictionId}/comments`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: content.trim(),
                parent_comment_id: parentCommentId || null,
                user: userData || null,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
          }

          const newComment: UnifiedComment = await response.json();

          set((state) => {
            const existingComments = state.commentsByPrediction[predictionId] || [];
            
            let updatedComments: UnifiedComment[];
            let newCount: number;
            
            if (parentCommentId) {
              // Add as reply to existing comment
              updatedComments = existingComments.map(comment => {
                if (comment.id === parentCommentId) {
                  return {
                    ...comment,
                    replies: [newComment, ...(comment.replies || [])],
                    replies_count: (comment.replies_count || 0) + 1
                  };
                }
                return comment;
              });
              // Don't increment main count for replies
              newCount = state.commentCounts[predictionId] || 0;
            } else {
              // Add as top-level comment
              updatedComments = [newComment, ...existingComments];
              newCount = (state.commentCounts[predictionId] || 0) + 1;
            }

            return {
              commentsByPrediction: {
                ...state.commentsByPrediction,
                [predictionId]: updatedComments
              },
              commentCounts: {
                ...state.commentCounts,
                [predictionId]: newCount
              },
              submitting: { ...state.submitting, [predictionId]: false }
            };
          });

          console.log(`✅ Added comment to prediction ${predictionId}`);

        } catch (error) {
          console.error('❌ Failed to add comment:', error);
          
          set((state) => ({
            submitting: { ...state.submitting, [predictionId]: false },
            errors: { 
              ...state.errors, 
              [predictionId]: 'Failed to post comment. Please try again.' 
            }
          }));
          
          throw error;
        }
      },

      // Toggle like on a comment
      toggleCommentLike: async (commentId: string, predictionId: string) => {
        if (!commentId?.trim() || !predictionId?.trim()) {
          console.warn('⚠️ Cannot toggle comment like: invalid parameters');
          return;
        }

        try {
          // Optimistically update the UI first
          set((state) => {
            const comments = state.commentsByPrediction[predictionId] || [];
            
            const updateCommentLike = (comment: UnifiedComment): UnifiedComment => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  is_liked: !comment.is_liked,
                  likes_count: comment.is_liked ? 
                    Math.max(0, comment.likes_count - 1) : 
                    comment.likes_count + 1
                };
              }
              
              if (comment.replies) {
                return {
                  ...comment,
                  replies: comment.replies.map(updateCommentLike)
                };
              }
              
              return comment;
            };

            return {
              commentsByPrediction: {
                ...state.commentsByPrediction,
                [predictionId]: comments.map(updateCommentLike)
              }
            };
          });

          // Then try to sync with the server
          const response = await fetch(
            `${API_BASE_URL}/api/v2/social/comments/${commentId}/like`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            console.warn('❌ Failed to sync like with server, but UI updated optimistically');
          } else {
            console.log('✅ Like synced with server');
          }

        } catch (error) {
          console.error('❌ Failed to toggle like:', error);
          // Don't revert the optimistic update since it might still work locally
        }
      },
    }),
    {
      name: 'unified-comment-store',
      partialize: (state) => ({
        commentCounts: state.commentCounts, // Persist only comment counts
        initialized: state.initialized,
      }),
    }
  )
);

import { useCallback, useMemo } from 'react';

// Helper hook to get comment data for a specific prediction
export const useCommentsForPrediction = (predictionId: string) => {
  const store = useUnifiedCommentStore();

  // Stabilize the prediction ID to prevent unnecessary re-renders
  const safePredictionId = useMemo(() => predictionId?.trim() || '', [predictionId]);
  
  // Memoize the functions to prevent useEffect dependencies from changing
  const fetchComments = useCallback(() => {
    if (!safePredictionId) {
      console.warn('⚠️ Cannot fetch comments: no prediction ID provided');
      return Promise.resolve();
    }
    return store.fetchComments(safePredictionId);
  }, [store.fetchComments, safePredictionId]);

  const addComment = useCallback((content: string, parentCommentId?: string, userData?: any) => {
    if (!safePredictionId) {
      console.warn('⚠️ Cannot add comment: no prediction ID provided');
      return Promise.resolve();
    }
    return store.addComment(safePredictionId, content, parentCommentId, userData);
  }, [store.addComment, safePredictionId]);

  const toggleCommentLike = useCallback((commentId: string) => {
    if (!safePredictionId) {
      console.warn('⚠️ Cannot toggle like: no prediction ID provided');
      return Promise.resolve();
    }
    return store.toggleCommentLike(commentId, safePredictionId);
  }, [store.toggleCommentLike, safePredictionId]);

  const clearError = useCallback(() => {
    if (!safePredictionId) {
      return;
    }
    store.clearError(safePredictionId);
  }, [store.clearError, safePredictionId]);
  
  // Return memoized object to prevent unnecessary re-renders
  return useMemo(() => {
    if (!safePredictionId) {
      return {
        comments: [],
        commentCount: 0,
        isLoading: false,
        error: null,
        isSubmitting: false,
        fetchComments,
        addComment,
        toggleCommentLike,
        clearError,
      };
    }

    return {
      comments: store.getComments(safePredictionId),
      commentCount: store.getCommentCount(safePredictionId),
      isLoading: store.loading[safePredictionId] || false,
      error: store.errors[safePredictionId] || null,
      isSubmitting: store.submitting[safePredictionId] || false,
      fetchComments,
      addComment,
      toggleCommentLike,
      clearError,
    };
  }, [
    safePredictionId,
    store.commentsByPrediction[safePredictionId],
    store.commentCounts[safePredictionId],
    store.loading[safePredictionId],
    store.errors[safePredictionId],
    store.submitting[safePredictionId],
    fetchComments,
    addComment,
    toggleCommentLike,
    clearError
  ]);
};