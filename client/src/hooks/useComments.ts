import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Comment, CreateComment, ApiResponse, PaginatedResponse } from '@fanclubz/shared';

// Fetch comments for a prediction - FIXED API ENDPOINT
export const useComments = (predictionId: string, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['comments', predictionId, page, limit],
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      try {
        // Fixed endpoint to match server routes
        const response = await apiClient.get(
          `/social/predictions/${predictionId}/comments?page=${page}&limit=${limit}`
        );
        
        // Handle different response formats
        if (response.comments) {
          // Server returns { comments, hasMore, total, page, limit }
          return {
            data: response.comments.map((comment: any) => ({
              id: comment.id,
              prediction_id: comment.prediction_id,
              user_id: comment.user_id,
              content: comment.content,
              parent_comment_id: comment.parent_comment_id,
              is_edited: comment.is_edited || false,
              created_at: comment.created_at,
              updated_at: comment.updated_at,
              user: {
                id: comment.user_id,
                username: comment.username || 'Anonymous',
                full_name: comment.username || 'Anonymous User',
                avatar_url: comment.avatar_url,
                is_verified: comment.is_verified || false,
              },
              likes_count: comment.likes_count || 0,
              is_liked: comment.is_liked || false,
              replies_count: comment.replies_count || 0,
              replies: comment.replies || [],
            })),
            pagination: {
              page: response.page || 1,
              limit: response.limit || 20,
              total: response.total || 0,
              totalPages: Math.ceil((response.total || 0) / (response.limit || 20)),
              hasNext: response.hasMore || false,
              hasPrev: (response.page || 1) > 1,
            },
          };
        }
        
        return response;
      } catch (error) {
        console.error('Comments API error:', error);
        
        // Return empty data instead of mock data
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Create a new comment - FIXED API ENDPOINT
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (commentData: CreateComment): Promise<Comment> => {
      try {
        // Fixed endpoint to match server routes
        const response = await apiClient.post(`/social/comments`, {
          content: commentData.content,
          parent_comment_id: commentData.parent_comment_id,
        });
        
        // Handle different response formats
        if (response.success === false) {
          throw new Error(response.error || 'Failed to create comment');
        }
        
        // If server returns the comment directly or in a wrapper
        const commentResult = response.data || response;
        
        return {
          id: commentResult.id,
          prediction_id: commentResult.prediction_id,
          user_id: commentResult.user_id,
          content: commentResult.content,
          parent_comment_id: commentResult.parent_comment_id,
          is_edited: commentResult.is_edited || false,
          created_at: commentResult.created_at,
          updated_at: commentResult.updated_at,
          user: {
            id: commentResult.user_id,
            username: commentResult.username || user?.username || 'You',
            full_name: commentResult.username || user?.full_name || 'Your Name',
            avatar_url: commentResult.avatar_url || user?.avatar_url,
            is_verified: commentResult.is_verified || false,
          },
          likes_count: commentResult.likes_count || 0,
          is_liked: commentResult.is_liked || false,
          replies_count: commentResult.replies_count || 0,
          replies: commentResult.replies || [],
        };
      } catch (error) {
        // Create mock comment for demo purposes
        console.warn('Comment API not available, creating mock comment:', error);
        
        const mockComment: Comment = {
          id: Date.now().toString(),
          prediction_id: commentData.prediction_id,
          user_id: user?.id || 'current-user',
          content: commentData.content,
          parent_comment_id: commentData.parent_comment_id,
          is_edited: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user: {
            id: user?.id || 'current-user',
            username: user?.username || 'You',
            full_name: user?.full_name || 'Your Name',
            avatar_url: user?.avatar_url,
            is_verified: false,
          },
          likes_count: 0,
          is_liked: false,
          replies_count: 0,
          replies: [],
        };
        
        return mockComment;
      }
    },
    onSuccess: (newComment) => {
      // Update the comments cache with the new comment
      queryClient.setQueryData(
        ['comments', newComment.prediction_id, 1, 50],
        (oldData: PaginatedResponse<Comment> | undefined) => {
          if (!oldData) return oldData;
          
          // If it's a reply, add it to the parent comment's replies
          if (newComment.parent_comment_id) {
            const updatedData = {
              ...oldData,
              data: oldData.data.map(comment => {
                if (comment.id === newComment.parent_comment_id) {
                  return {
                    ...comment,
                    replies: [newComment, ...(comment.replies || [])],
                    replies_count: (comment.replies_count || 0) + 1,
                  };
                }
                return comment;
              }),
            };
            return updatedData;
          }
          
          // If it's a top-level comment, add it to the beginning
          return {
            ...oldData,
            data: [newComment, ...oldData.data],
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total + 1,
            },
          };
        }
      );
      
      // Invalidate to refetch latest data
      queryClient.invalidateQueries({
        queryKey: ['comments', newComment.prediction_id],
      });
    },
  });
};

// Update an existing comment
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }): Promise<Comment> => {
      try {
        const response = await apiClient.put(`/comments/${commentId}`, { content });
        
        if (response.success === false) {
          throw new Error(response.error || 'Failed to update comment');
        }
        
        return response.data || response;
      } catch (error) {
        console.error('Failed to update comment:', error);
        throw error;
      }
    },
    onSuccess: (updatedComment) => {
      // Update the comments cache
      queryClient.setQueryData(
        ['comments', updatedComment.prediction_id],
        (oldData: PaginatedResponse<Comment> | undefined) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: oldData.data.map(comment =>
              comment.id === updatedComment.id ? { ...comment, ...updatedComment } : comment
            ),
          };
        }
      );
    },
  });
};

// Delete a comment
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string): Promise<void> => {
      try {
        const response = await apiClient.delete(`/comments/${commentId}`);
        
        if (response.success === false) {
          throw new Error(response.error || 'Failed to delete comment');
        }
      } catch (error) {
        console.error('Failed to delete comment:', error);
        throw error;
      }
    },
    onSuccess: (_, commentId) => {
      // Remove the comment from all comment caches
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};

// Like or unlike a comment
export const useToggleCommentLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string): Promise<{ liked: boolean; likes_count: number }> => {
      try {
        const response = await apiClient.post(`/comments/${commentId}/like`);
        
        if (response.success === false) {
          throw new Error(response.error || 'Failed to toggle like');
        }
        
        return {
          liked: response.liked || true,
          likes_count: response.likes_count || 1,
        };
      } catch (error) {
        console.error('Comment like API error:', error);
        throw error;
      }
    },
    onSuccess: (result, commentId) => {
      // Update the comment in cache with new like status
      queryClient.setQueriesData(
        { queryKey: ['comments'] },
        (oldData: PaginatedResponse<Comment> | undefined) => {
          if (!oldData) return oldData;
          
          const updateComment = (comment: Comment): Comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                is_liked: result.liked,
                likes_count: result.likes_count,
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: comment.replies.map(updateComment),
              };
            }
            return comment;
          };
          
          return {
            ...oldData,
            data: oldData.data.map(updateComment),
          };
        }
      );
    },
  });
};

// Get comment replies (for lazy loading)
export const useCommentReplies = (commentId: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['comment-replies', commentId, page, limit],
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      try {
        const response = await apiClient.get(
          `/comments/${commentId}/replies?page=${page}&limit=${limit}`
        );
        return response;
      } catch (error) {
        console.warn('Comment replies API not available');
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    },
    enabled: !!commentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};