import React from 'react';
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
  
  // Sync comment counts with prediction store
  syncWithPredictionStore: () => void;
  
  // Initialize the store
  initialize: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://fan-club-z.onrender.com';

export const useUnifiedCommentStore = create<CommentState & CommentActions>()(
  devtools(
    (set, get) => ({
      // Initial state
      commentsByPrediction: {},
      commentCounts: {},
      loading: {},
      errors: {},
      submitting: {},
      initialized: false,

      // Initialize the store
      initialize: () => {
        const state = get();
        if (!state.initialized) {
          console.log('🔧 Initializing unified comment store');
          set({ initialized: true });
          // Sync with prediction store if available
          state.syncWithPredictionStore();
        }
      },

      // Sync comment counts with prediction store
      syncWithPredictionStore: () => {
        try {
          // Dynamic import to avoid circular dependencies
          import('./predictionStore').then(({ usePredictionStore }) => {
            const predictionStore = usePredictionStore.getState();
            const predictionCommentCounts: CommentCounts = {};
            
            // Extract comment counts from predictions
            predictionStore.predictions?.forEach(prediction => {
              if (prediction.comments_count !== undefined) {
                predictionCommentCounts[prediction.id] = prediction.comments_count;
              }
            });
            
            // Sync trending predictions too
            predictionStore.trendingPredictions?.forEach(prediction => {
              if (prediction.comments_count !== undefined) {
                predictionCommentCounts[prediction.id] = prediction.comments_count;
              }
            });
            
            if (Object.keys(predictionCommentCounts).length > 0) {
              console.log('🔄 Syncing comment counts from prediction store:', predictionCommentCounts);
              set((state) => ({
                commentCounts: { ...state.commentCounts, ...predictionCommentCounts }
              }));
            }
          });
        } catch (error) {
          console.warn('⚠️ Could not sync with prediction store:', error);
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
        console.log(`📊 Updating comment count for ${predictionId}: ${count}`);
        set((state) => ({
          commentCounts: {
            ...state.commentCounts,
            [predictionId]: count
          }
        }));
        
        // Also sync back to prediction store
        try {
          import('./predictionStore').then(({ usePredictionStore }) => {
            const predictionStore = usePredictionStore.getState();
            const predictions = predictionStore.predictions.map(p => 
              p.id === predictionId ? { ...p, comments_count: count } : p
            );
            predictionStore.predictions = predictions;
          });
        } catch (error) {
          console.warn('⚠️ Could not sync comment count back to prediction store:', error);
        }
      },

      // Get comment count for a prediction (with fallbacks)
      getCommentCount: (predictionId: string) => {
        const state = get();
        
        // 1. Check actual loaded comments first (most accurate)
        const actualComments = state.commentsByPrediction[predictionId];
        if (actualComments) {
          return actualComments.length;
        }
        
        // 2. Fall back to stored count
        if (state.commentCounts[predictionId] !== undefined) {
          return state.commentCounts[predictionId];
        }
        
        // 3. Try to get from prediction store as last resort
        try {
          const predictionStore = require('./predictionStore').usePredictionStore.getState();
          const prediction = predictionStore.predictions?.find((p: any) => p.id === predictionId) ||
                            predictionStore.trendingPredictions?.find((p: any) => p.id === predictionId);
          if (prediction?.comments_count !== undefined) {
            // Cache it for next time
            state.updateCommentCount(predictionId, prediction.comments_count);
            return prediction.comments_count;
          }
        } catch (error) {
          // Ignore - prediction store might not be available yet
        }
        
        // 4. Default to 0
        return 0;
      },

      // Get comments for a prediction
      getComments: (predictionId: string) => {
        const state = get();
        return state.commentsByPrediction[predictionId] || [];
      },

      // Clear error for a prediction
      clearError: (predictionId: string) => {
        set((state) => ({
          errors: {
            ...state.errors,
            [predictionId]: null
          }
        }));
      },

      // Fetch comments for a prediction
      fetchComments: async (predictionId: string) => {
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

          set((state) => ({
            commentsByPrediction: {
              ...state.commentsByPrediction,
              [predictionId]: comments
            },
            commentCounts: {
              ...state.commentCounts,
              [predictionId]: comments.length
            },
            loading: { ...state.loading, [predictionId]: false }
          }));

          // Update the prediction store count as well
          get().updateCommentCount(predictionId, comments.length);

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
      addComment: async (predictionId: string, content: string, parentCommentId?: string) => {
        if (!content.trim()) {
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

          // Update prediction store count
          const currentCount = get().commentCounts[predictionId] || 0;
          get().updateCommentCount(predictionId, currentCount);

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

// Helper hook to get comment data for a specific prediction
export const useCommentsForPrediction = (predictionId: string) => {
  const {
    getComments,
    getCommentCount,
    fetchComments,
    addComment,
    toggleCommentLike,
    loading,
    errors,
    submitting,
    clearError,
    initialize,
    syncWithPredictionStore
  } = useUnifiedCommentStore();

  // Initialize store on first use
  React.useEffect(() => {
    initialize();
    // Sync with prediction store after a short delay to ensure it's loaded
    const timer = setTimeout(() => {
      syncWithPredictionStore();
    }, 100);
    return () => clearTimeout(timer);
  }, [initialize, syncWithPredictionStore]);

  // Handle empty prediction ID gracefully
  const safePredictionId = predictionId?.trim() || '';
  
  const comments = safePredictionId ? getComments(safePredictionId) : [];
  const commentCount = safePredictionId ? getCommentCount(safePredictionId) : 0;
  const isLoading = safePredictionId ? (loading[safePredictionId] || false) : false;
  const error = safePredictionId ? (errors[safePredictionId] || null) : null;
  const isSubmitting = safePredictionId ? (submitting[safePredictionId] || false) : false;

  return {
    comments,
    commentCount,
    isLoading,
    error,
    isSubmitting,
    fetchComments: () => safePredictionId ? fetchComments(safePredictionId) : Promise.resolve(),
    addComment: (content: string, parentCommentId?: string) => 
      safePredictionId ? addComment(safePredictionId, content, parentCommentId) : Promise.resolve(),
    toggleCommentLike: (commentId: string) => 
      safePredictionId ? toggleCommentLike(commentId, safePredictionId) : Promise.resolve(),
    clearError: () => safePredictionId ? clearError(safePredictionId) : undefined,
  };
};
