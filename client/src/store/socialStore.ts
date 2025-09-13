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
  depth?: number;
  thread_id?: string;
  is_edited?: boolean;
  is_flagged?: boolean;
  is_deleted?: boolean;
  user: User;
  is_liked?: boolean;
  is_own?: boolean;
  replies?: Comment[];
}


interface CommentNotification {
  id: string;
  user_id: string;
  comment_id: string;
  type: 'reply' | 'like' | 'mention';
  is_read: boolean;
  created_at: string;
}

interface CommentReport {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: 'spam' | 'harassment' | 'offensive' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

interface SocialStore {
  // Comments
  comments: Record<string, Comment[]>;
  loadingComments: Record<string, boolean>;
  commentThreads: Record<string, Comment[]>; // For nested replies
  
  // Notifications
  notifications: CommentNotification[];
  unreadNotifications: number;
  
  
  // Methods
  getPredictionComments: (predictionId: string) => Promise<Comment[]>;
  getCommentThread: (threadId: string) => Promise<Comment[]>;
  createComment: (data: {
    prediction_id: string;
    content: string;
    parent_comment_id?: string;
  }) => Promise<Comment>;
  updateComment: (commentId: string, content: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  likeComment: (commentId: string) => Promise<void>;
  reportComment: (commentId: string, reason: string, description?: string) => Promise<void>;
  
  // Real-time methods
  subscribeToComments: (predictionId: string) => () => void;
  handleRealTimeUpdate: (update: any) => void;
  
  // Notification methods
  getNotifications: () => Promise<CommentNotification[]>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  

  // Alias methods for compatibility
  addComment: (data: {
    prediction_id: string;
    content: string;
    parent_comment_id?: string;
  }) => Promise<Comment>;
  editComment: (commentId: string, content: string) => Promise<Comment>;
  toggleLike: (commentId: string) => Promise<void>;
  getAllComments: () => Comment[];
}

export const useSocialStore = create<SocialStore>((set, get) => ({
  // Initial state
  comments: {},
  loadingComments: {},
  commentThreads: {},
  notifications: [],
  unreadNotifications: 0,

  // Enhanced comment methods with nested replies support
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

      // Use the new enhanced function for better performance
      const { data, error } = await supabase
        .rpc('get_prediction_comments', {
          prediction_id_param: predictionId,
          user_id_param: currentUserId,
          page_param: 1,
          limit_param: 50
        });

      if (error) throw error;

      // Process comments and get replies
      const processedComments = await Promise.all(
        (data || []).map(async (comment: any) => {
          // Get replies for this comment if it has any
          let replies: Comment[] = [];
          if (comment.replies_count > 0) {
            const { data: repliesData } = await supabase
              .rpc('get_comment_thread', {
                thread_id_param: comment.thread_id || comment.id,
                user_id_param: currentUserId
              });

            replies = (repliesData || [])
              .filter((reply: any) => reply.id !== comment.id) // Exclude the parent comment
              .map((reply: any) => ({
                ...reply,
                is_liked: reply.is_liked || false,
                is_own: reply.is_own || false,
                user: {
                  id: reply.user_id,
                  username: reply.username,
                  avatar_url: reply.avatar_url,
                  is_verified: reply.is_verified
                }
              }));
          }

          return {
            ...comment,
            is_liked: comment.is_liked || false,
            is_own: comment.is_own || false,
            replies,
            user: {
              id: comment.user_id,
              username: comment.username,
              avatar_url: comment.avatar_url,
              is_verified: comment.is_verified
            }
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

  getCommentThread: async (threadId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const { data, error } = await supabase
        .rpc('get_comment_thread', {
          thread_id_param: threadId,
          user_id_param: currentUserId
        });

      if (error) throw error;

      const processedThread = (data || []).map((comment: any) => ({
        ...comment,
        is_liked: comment.is_liked || false,
        is_own: comment.is_own || false,
        user: {
          id: comment.user_id,
          username: comment.username,
          avatar_url: comment.avatar_url,
          is_verified: comment.is_verified
        }
      }));

      // Cache the thread
      set(state => ({
        commentThreads: { ...state.commentThreads, [threadId]: processedThread }
      }));

      return processedThread;
    } catch (error) {
      console.error('Failed to get comment thread:', error);
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

      // Real-time broadcast
      await supabase.channel(`comments:${data.prediction_id}`)
        .send({
          type: 'broadcast',
          event: 'comment_created',
          payload: processedComment
        });

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
          edited_at: new Date().toISOString(),
          is_edited: true
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

      const processedComment = {
        ...comment,
        is_liked: false, // Will be updated by the component
        is_own: true
      };

      // Real-time broadcast
      await supabase.channel(`comments:${comment.prediction_id}`)
        .send({
          type: 'broadcast',
          event: 'comment_updated',
          payload: processedComment
        });

      return processedComment;
    } catch (error) {
      console.error('Failed to update comment:', error);
      throw error;
    }
  },

  deleteComment: async (commentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get comment details first
      const { data: comment } = await supabase
        .from('comments')
        .select('prediction_id, parent_comment_id')
        .eq('id', commentId)
        .single();

      // Soft delete instead of hard delete for moderation purposes
      const { error } = await supabase
        .from('comments')
        .update({ 
          is_deleted: true,
          content: '[deleted]',
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      // Real-time broadcast
      if (comment) {
        await supabase.channel(`comments:${comment.prediction_id}`)
          .send({
            type: 'broadcast',
            event: 'comment_deleted',
            payload: { id: commentId }
          });
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

      let isLiked = false;
      let likesCount = 0;

      if (existingLike) {
        // Unlike - remove the like
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.user.id);
        
        isLiked = false;
      } else {
        // Like - add the like
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.user.id,
            reaction_type: 'like'
          });
        
        isLiked = true;
      }

      // Get updated likes count
      const { data: comment } = await supabase
        .from('comments')
        .select('likes_count, prediction_id')
        .eq('id', commentId)
        .single();

      if (comment) {
        likesCount = comment.likes_count;

        // Real-time broadcast
        await supabase.channel(`comments:${comment.prediction_id}`)
          .send({
            type: 'broadcast',
            event: 'comment_liked',
            payload: {
              comment_id: commentId,
              user_id: user.user.id,
              is_liked: isLiked,
              likes_count: likesCount
            }
          });
      }
    } catch (error) {
      console.error('Failed to like/unlike comment:', error);
      throw error;
    }
  },

  reportComment: async (commentId: string, reason: string, description?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comment_reports')
        .insert({
          comment_id: commentId,
          reporter_id: user.user.id,
          reason,
          description: description || null,
          status: 'pending'
        });

      if (error) throw error;

      // Flag the comment for review if it gets multiple reports
      const { data: reportCount } = await supabase
        .from('comment_reports')
        .select('id')
        .eq('comment_id', commentId);

      if (reportCount && reportCount.length >= 3) {
        await supabase
          .from('comments')
          .update({ is_flagged: true })
          .eq('id', commentId);
      }
    } catch (error) {
      console.error('Failed to report comment:', error);
      throw error;
    }
  },

  // Real-time subscription methods
  subscribeToComments: (predictionId: string) => {
    const channel = supabase.channel(`comments:${predictionId}`)
      .on('broadcast', { event: '*' }, (payload) => {
        get().handleRealTimeUpdate(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  handleRealTimeUpdate: (update: any) => {
    const { event, payload } = update;
    
    switch (event) {
      case 'comment_created':
        set(state => {
          const predictionId = payload.prediction_id;
          const currentComments = state.comments[predictionId] || [];
          
          // Check if comment already exists
          const existingComment = currentComments.find(c => c.id === payload.id);
          if (existingComment) return state;
          
          if (payload.parent_comment_id) {
            // Handle reply
            const updatedComments = currentComments.map(comment => {
              if (comment.id === payload.parent_comment_id) {
                return {
                  ...comment,
                  replies_count: comment.replies_count + 1,
                  replies: [...(comment.replies || []), payload]
                };
              }
              return comment;
            });
            
            return {
              ...state,
              comments: { ...state.comments, [predictionId]: updatedComments }
            };
          } else {
            // Handle top-level comment
            return {
              ...state,
              comments: { 
                ...state.comments, 
                [predictionId]: [payload, ...currentComments] 
              }
            };
          }
        });
        break;

      case 'comment_updated':
        set(state => {
          const predictionId = payload.prediction_id;
          const currentComments = state.comments[predictionId] || [];
          
          const updatedComments = currentComments.map(comment => {
            if (comment.id === payload.id) {
              return { ...comment, ...payload };
            }
            // Update in replies too
            if (comment.replies) {
              comment.replies = comment.replies.map(reply => 
                reply.id === payload.id ? { ...reply, ...payload } : reply
              );
            }
            return comment;
          });

          return {
            ...state,
            comments: { ...state.comments, [predictionId]: updatedComments }
          };
        });
        break;

      case 'comment_deleted':
        set(state => {
          const updatedComments = Object.keys(state.comments).reduce((acc, predictionId) => {
            const comments = state.comments[predictionId];
            
            acc[predictionId] = comments.filter(comment => {
              if (comment.id === payload.id) return false;
              // Remove from replies too
              if (comment.replies) {
                comment.replies = comment.replies.filter(reply => reply.id !== payload.id);
              }
              return true;
            });
            
            return acc;
          }, {} as Record<string, Comment[]>);

          return {
            ...state,
            comments: updatedComments
          };
        });
        break;

      case 'comment_liked':
        set(state => {
          const updatedComments = Object.keys(state.comments).reduce((acc, predictionId) => {
            const comments = state.comments[predictionId];
            
            acc[predictionId] = comments.map(comment => {
              if (comment.id === payload.comment_id) {
                return {
                  ...comment,
                  likes_count: payload.likes_count,
                  is_liked: payload.user_id === state.comments ? payload.is_liked : comment.is_liked
                };
              }
              // Update in replies too
              if (comment.replies) {
                comment.replies = comment.replies.map(reply => 
                  reply.id === payload.comment_id 
                    ? {
                        ...reply,
                        likes_count: payload.likes_count,
                        is_liked: payload.user_id === state.comments ? payload.is_liked : reply.is_liked
                      }
                    : reply
                );
              }
              return comment;
            });
            
            return acc;
          }, {} as Record<string, Comment[]>);

          return {
            ...state,
            comments: updatedComments
          };
        });
        break;

      default:
        console.log('Unknown real-time update:', event);
    }
  },

  // Notification methods
  getNotifications: async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comment_notifications')
        .select(`
          *,
          comment:comments (
            content,
            prediction_id,
            user:users!user_id (username, avatar_url)
          )
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifications = data || [];
      const unreadCount = notifications.filter(n => !n.is_read).length;

      set(state => ({
        notifications,
        unreadNotifications: unreadCount
      }));

      return notifications;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  },

  markNotificationAsRead: async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('comment_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadNotifications: Math.max(0, state.unreadNotifications - 1)
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  },

  markAllNotificationsAsRead: async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comment_notifications')
        .update({ is_read: true })
        .eq('user_id', user.user.id)
        .eq('is_read', false);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadNotifications: 0
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },


  // Alias methods for compatibility
  addComment: async (data: {
    prediction_id: string;
    content: string;
    parent_comment_id?: string;
  }) => {
    return get().createComment(data);
  },

  editComment: async (commentId: string, content: string) => {
    return get().updateComment(commentId, content);
  },

  toggleLike: async (commentId: string) => {
    return get().likeComment(commentId);
  },

  // Get all comments as a flat array for compatibility
  getAllComments: () => {
    const state = get();
    return Object.values(state.comments).flat();
  }
}));