import { create } from 'zustand';
import { supabase } from '../lib/api';

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
  loading: boolean;
  error: string | null;
}

interface CommentActions {
  fetchComments: (predictionId: string) => Promise<void>;
  addComment: (predictionId: string, content: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  unlikeComment: (commentId: string) => Promise<void>;
  clearError: () => void;
}

export const useCommentStore = create<CommentState & CommentActions>((set, get) => ({
  comments: [],
  loading: false,
  error: null,

  fetchComments: async (predictionId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('prediction_id', predictionId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Get current user to check if they liked comments
      const { data: { user } } = await supabase.auth.getUser();
      
      const commentsWithLikes = comments?.map(comment => ({
        ...comment,
        is_liked_by_user: false // TODO: Implement user likes check
      })) || [];

      set({ comments: commentsWithLikes, loading: false });
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ error: 'Failed to fetch comments', loading: false });
    }
  },

  addComment: async (predictionId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          prediction_id: predictionId,
          user_id: user.id,
          content: content.trim()
        })
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .single();

      if (error) {
        throw error;
      }

      const newComment: Comment = {
        ...comment,
        likes_count: 0,
        is_liked_by_user: false
      };

      set(state => ({
        comments: [...state.comments, newComment]
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      set({ error: 'Failed to add comment' });
      throw error;
    }
  },

  likeComment: async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add like to comment_likes table
      const { error } = await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id
        });

      if (error && !error.message.includes('duplicate')) {
        throw error;
      }

      // Update local state
      set(state => ({
        comments: state.comments.map(comment =>
          comment.id === commentId
            ? { ...comment, likes_count: comment.likes_count + 1, is_liked_by_user: true }
            : comment
        )
      }));
    } catch (error) {
      console.error('Error liking comment:', error);
      set({ error: 'Failed to like comment' });
    }
  },

  unlikeComment: async (commentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Remove like from comment_likes table
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      set(state => ({
        comments: state.comments.map(comment =>
          comment.id === commentId
            ? { ...comment, likes_count: Math.max(0, comment.likes_count - 1), is_liked_by_user: false }
            : comment
        )
      }));
    } catch (error) {
      console.error('Error unliking comment:', error);
      set({ error: 'Failed to unlike comment' });
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));
