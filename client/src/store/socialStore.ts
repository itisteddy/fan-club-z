import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  prediction_id: string;
  parent_comment_id?: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  likes_count: number;
  replies_count: number;
  user: User;
  is_liked?: boolean;
  is_own?: boolean;
  replies?: Comment[];
}

interface Club {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  visibility: 'public' | 'private' | 'invite_only';
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface SocialStore {
  // Comments
  comments: Record<string, Comment[]>;
  loadingComments: Record<string, boolean>;
  
  // Clubs
  clubs: Club[];
  userClubs: Club[];
  loadingClubs: boolean;
  
  // Methods
  getPredictionComments: (predictionId: string) => Promise<Comment[]>;
  createComment: (data: {
    prediction_id: string;
    content: string;
    parent_comment_id?: string;
  }) => Promise<Comment>;
  updateComment: (commentId: string, content: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  
  // Club methods
  getClubs: () => Promise<Club[]>;
  getUserClubs: () => Promise<Club[]>;
  createClub: (data: {
    name: string;
    description?: string;
    visibility: 'public' | 'private' | 'invite_only';
  }) => Promise<Club>;
  joinClub: (clubId: string) => Promise<void>;
  leaveClub: (clubId: string) => Promise<void>;
}

export const useSocialStore = create<SocialStore>((set, get) => ({
  // Initial state
  comments: {},
  loadingComments: {},
  clubs: [],
  userClubs: [],
  loadingClubs: false,

  // Comment methods
  getPredictionComments: async (predictionId: string) => {
    const state = get();
    
    // Return cached comments if available
    if (state.comments[predictionId] && !state.loadingComments[predictionId]) {
      return state.comments[predictionId];
    }

    // Set loading state
    set(state => ({
      loadingComments: { ...state.loadingComments, [predictionId]: true }
    }));

    try {
      // Get current user once
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users!user_id (
            id,
            username,
            avatar_url,
            is_verified
          ),
          likes:comment_likes(count),
          user_like:comment_likes!user_id(count)
        `)
        .eq('prediction_id', predictionId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process comments and get replies
      const processedComments = await Promise.all(
        (data || []).map(async (comment: any) => {
          // Get replies for this comment
          const { data: repliesData } = await supabase
            .from('comments')
            .select(`
              *,
              user:users!user_id (
                id,
                username,
                avatar_url,
                is_verified
              ),
              likes:comment_likes(count),
              user_like:comment_likes!user_id(count)
            `)
            .eq('parent_comment_id', comment.id)
            .order('created_at', { ascending: true });

          const replies = (repliesData || []).map((reply: any) => ({
            ...reply,
            likes_count: reply.likes?.[0]?.count || 0,
            is_liked: !!reply.user_like?.length,
            is_own: reply.user_id === currentUserId,
            replies_count: 0 // No nested replies for now
          }));

          return {
            ...comment,
            likes_count: comment.likes?.[0]?.count || 0,
            is_liked: !!comment.user_like?.length,
            is_own: comment.user_id === currentUserId,
            replies_count: replies.length,
            replies
          };
        })
      );

      // Update store
      set(state => ({
        comments: { ...state.comments, [predictionId]: processedComments },
        loadingComments: { ...state.loadingComments, [predictionId]: false }
      }));

      return processedComments;
    } catch (error) {
      console.error('Failed to get comments:', error);
      set(state => ({
        loadingComments: { ...state.loadingComments, [predictionId]: false }
      }));
      throw error;
    }
  },

  createComment: async (data) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Insert comment
      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          content: data.content,
          user_id: user.user.id,
          prediction_id: data.prediction_id,
          parent_comment_id: data.parent_comment_id
        })
        .select(`
          *,
          user:users!user_id (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .single();

      if (error) throw error;

      const processedComment = {
        ...comment,
        likes_count: 0,
        replies_count: 0,
        is_liked: false,
        is_own: true,
        replies: []
      };

      // Update comment count in prediction
      await supabase
        .from('predictions')
        .update({ 
          comments_count: supabase.sql`comments_count + 1`
        })
        .eq('id', data.prediction_id);

      return processedComment;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  },

  updateComment: async (commentId: string, content: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: comment, error } = await supabase
        .from('comments')
        .update({ 
          content,
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user.user.id) // Ensure user can only edit their own comments
        .select(`
          *,
          user:users!user_id (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .single();

      if (error) throw error;

      return {
        ...comment,
        likes_count: 0, // Will be updated by the component
        replies_count: 0,
        is_liked: false,
        is_own: true
      };
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get comment details first to update prediction count
      const { data: comment } = await supabase
        .from('comments')
        .select('prediction_id, parent_comment_id')
        .eq('id', commentId)
        .single();

      // Delete comment (this will cascade to delete replies and likes)
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      // Update comment count if it's a top-level comment
      if (comment && !comment.parent_comment_id) {
        await supabase
          .from('predictions')
          .update({ 
            comments_count: supabase.sql`GREATEST(comments_count - 1, 0)`
          })
          .eq('id', comment.prediction_id);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  },

  likeComment: async (commentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Check if already liked
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.user.id)
        .single();

      if (existingLike) {
        // Unlike - remove the like
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.user.id);

        // Decrement likes count
        await supabase
          .from('comments')
          .update({ 
            likes_count: supabase.sql`GREATEST(likes_count - 1, 0)`
          })
          .eq('id', commentId);
      } else {
        // Like - add the like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.user.id
          });

        // Increment likes count
        await supabase
          .from('comments')
          .update({ 
            likes_count: supabase.sql`likes_count + 1`
          })
          .eq('id', commentId);
      }
    } catch (error) {
      console.error('Failed to like/unlike comment:', error);
      throw error;
    }
  },

  // Club methods (placeholder for future implementation)
  getClubs: async () => {
    set({ loadingClubs: true });
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ clubs: data || [], loadingClubs: false });
      return data || [];
    } catch (error) {
      console.error('Failed to get clubs:', error);
      set({ loadingClubs: false });
      throw error;
    }
  },

  getUserClubs: async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('club_members')
        .select(`
          club:clubs (*)
        `)
        .eq('user_id', user.user.id);

      if (error) throw error;

      const clubs = (data || []).map(item => item.club).filter(Boolean);
      set({ userClubs: clubs });
      return clubs;
    } catch (error) {
      console.error('Failed to get user clubs:', error);
      throw error;
    }
  },

  createClub: async (data) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: club, error } = await supabase
        .from('clubs')
        .insert({
          ...data,
          owner_id: user.user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('club_members')
        .insert({
          club_id: club.id,
          user_id: user.user.id,
          role: 'admin'
        });

      set(state => ({
        clubs: [club, ...state.clubs],
        userClubs: [club, ...state.userClubs]
      }));

      return club;
    } catch (error) {
      console.error('Failed to create club:', error);
      throw error;
    }
  },

  joinClub: async (clubId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: user.user.id,
          role: 'member'
        });

      if (error) throw error;

      // Update member count
      await supabase
        .from('clubs')
        .update({ 
          member_count: supabase.sql`member_count + 1`
        })
        .eq('id', clubId);
    } catch (error) {
      console.error('Failed to join club:', error);
      throw error;
    }
  },

  leaveClub: async (clubId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      // Update member count
      await supabase
        .from('clubs')
        .update({ 
          member_count: supabase.sql`GREATEST(member_count - 1, 0)`
        })
        .eq('id', clubId);
    } catch (error) {
      console.error('Failed to leave club:', error);
      throw error;
    }
  }
}));