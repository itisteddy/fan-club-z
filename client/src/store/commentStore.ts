import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  clearError: () => void;
}

export const useCommentStore = create<CommentState & CommentActions>((set, get) => ({
  comments: [],
  commentCounts: {},
  loading: false,
  error: null,

  initializeCommentCounts: async () => {
    try {
      // Fetch comment counts for all predictions
      const { data: commentCounts, error } = await supabase
        .from('predictions')
        .select('id, comments_count');

      if (error) {
        console.error('Error fetching comment counts:', error);
        return;
      }

      const countsMap = Object.fromEntries(
        commentCounts?.map(pred => [pred.id, pred.comments_count || 0]) || []
      );

      set({ commentCounts: countsMap });

    } catch (error) {
      console.error('Error initializing comment counts:', error);
    }
  },

  fetchComments: async (predictionId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users!user_id(id, username, full_name, avatar_url)
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
        user: {
          id: comment.user.id,
          username: comment.user.username || comment.user.full_name || 'Anonymous',
          avatar_url: comment.user.avatar_url
        },
        likes_count: 0, // TODO: Implement comment likes count
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

      // Add comment to database
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          prediction_id: predictionId,
          user_id: user.id,
          content: content.trim(),
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          user:users!user_id(id, username, full_name, avatar_url)
        `)
        .single();

      if (commentError) {
        throw commentError;
      }

      // Update prediction comments count
      const currentCount = get().commentCounts[predictionId] || 0;
      const { error: updateError } = await supabase
        .from('predictions')
        .update({ 
          comments_count: currentCount + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', predictionId);

      if (updateError) {
        console.error('Error updating prediction comments count:', updateError);
      }

      const newComment: Comment = {
        ...comment,
        user: {
          id: comment.user.id,
          username: comment.user.username || comment.user.full_name || 'Anonymous',
          avatar_url: comment.user.avatar_url
        },
        likes_count: 0,
        is_liked_by_user: false
      };

      // Update local state
      set(state => ({
        comments: [...state.comments, newComment],
        commentCounts: {
          ...state.commentCounts,
          [predictionId]: currentCount + 1
        }
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
          user_id: user.id,
          created_at: new Date().toISOString()
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

  getCommentCount: (predictionId: string) => {
    return get().commentCounts[predictionId] || 0;
  },

  clearError: () => {
    set({ error: null });
  }
}));
