import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface Comment {
  id: string;
  prediction_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  likes_count: number;
  is_liked_by_user: boolean;
}

interface CommentState {
  comments: Comment[];
  commentCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
}

interface CommentActions {
  initializeCommentCounts: () => Promise<void>;
  fetchComments: (predictionId: string) => Promise<void>;
  addComment: (predictionId: string, content: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  unlikeComment: (commentId: string) => Promise<void>;
  getCommentCount: (predictionId: string) => number;
  setCommentCount: (predictionId: string, count: number) => void;
  clearError: () => void;
}

export const useCommentStore = create<CommentState & CommentActions>((set, get) => ({
  comments: [],
  commentCounts: {},
  loading: false,
  error: null,

  initializeCommentCounts: async () => {
    try {
      // Initialize with empty state - counts will be loaded per prediction as needed
      set({
        commentCounts: {}
      });
    } catch (error) {
      console.error('Error initializing comment counts:', error);
    }
  },

  fetchComments: async (predictionId: string) => {
    try {
      set({ loading: true, error: null });

      // Use API endpoint instead of direct Supabase
      const response = await apiClient.get(`/v2/predictions/${predictionId}/comments`);
      
      if (response.success === false) {
        throw new Error(response.error || 'Failed to fetch comments');
      }

      // Handle different response formats
      const comments = response.comments || response.data || [];
      const total = response.total || comments.length;

      set(state => ({
        comments: comments,
        commentCounts: {
          ...state.commentCounts,
          [predictionId]: total
        },
        loading: false,
        error: null
      }));

    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ 
        loading: false, 
        error: 'Failed to fetch comments',
        commentCounts: {
          ...get().commentCounts,
          [predictionId]: 0
        }
      });
    }
  },

  addComment: async (predictionId: string, content: string) => {
    try {
      set({ loading: true, error: null });

      // Use API endpoint instead of direct Supabase
      const response = await apiClient.post(`/v2/predictions/${predictionId}/comments`, {
        content
      });
      
      if (response.success === false) {
        throw new Error(response.error || 'Failed to add comment');
      }

      const newComment = response.data || response;

      set(state => ({
        comments: [newComment, ...state.comments],
        commentCounts: {
          ...state.commentCounts,
          [predictionId]: (state.commentCounts[predictionId] || 0) + 1
        },
        loading: false,
        error: null
      }));

    } catch (error) {
      console.error('Error adding comment:', error);
      set({ loading: false, error: 'Failed to add comment' });
      throw error;
    }
  },

  likeComment: async (commentId: string) => {
    try {
      // Use API endpoint instead of direct Supabase
      const response = await apiClient.post(`/v2/comments/${commentId}/like`);
      
      if (response.success === false) {
        throw new Error(response.error || 'Failed to like comment');
      }

      // Update comment in local state
      set(state => ({
        comments: state.comments.map(comment =>
          comment.id === commentId
            ? { 
                ...comment, 
                is_liked_by_user: true,
                likes_count: (response.data?.likes_count || response.likes_count || comment.likes_count + 1)
              }
            : comment
        )
      }));

    } catch (error) {
      console.error('Error liking comment:', error);
      throw error;
    }
  },

  unlikeComment: async (commentId: string) => {
    try {
      // Use API endpoint instead of direct Supabase
      const response = await apiClient.post(`/v2/comments/${commentId}/like`);
      
      if (response.success === false) {
        throw new Error(response.error || 'Failed to unlike comment');
      }

      // Update comment in local state
      set(state => ({
        comments: state.comments.map(comment =>
          comment.id === commentId
            ? { 
                ...comment, 
                is_liked_by_user: false,
                likes_count: Math.max(0, (response.data?.likes_count || response.likes_count || comment.likes_count - 1))
              }
            : comment
        )
      }));

    } catch (error) {
      console.error('Error unliking comment:', error);
      throw error;
    }
  },

  getCommentCount: (predictionId: string) => {
    return get().commentCounts[predictionId] || 0;
  },

  setCommentCount: (predictionId: string, count: number) => {
    set(state => ({
      commentCounts: {
        ...state.commentCounts,
        [predictionId]: count
      }
    }));
  },

  clearError: () => {
    set({ error: null });
  }
}));
