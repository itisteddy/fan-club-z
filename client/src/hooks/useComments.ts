import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import type { Comment, CreateComment, ApiResponse, PaginatedResponse } from '@fanclubz/shared';

// Fetch comments for a prediction
export const useComments = (predictionId: string, page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['comments', predictionId, page, limit],
    queryFn: async (): Promise<PaginatedResponse<Comment>> => {
      try {
        const response = await apiClient.get(
          `/social/predictions/${predictionId}/comments?page=${page}&limit=${limit}`
        );
        return response;
      } catch (error) {
        // Return mock data if API fails
        console.warn('Comments API not available, using mock data');
        
        const mockComments: Comment[] = [
          {
            id: '1',
            prediction_id: predictionId,
            user_id: 'user1',
            content: 'I think Bitcoin will definitely hit $100K! The fundamentals are strong.',
            is_edited: false,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 'user1',
              username: 'sarah_crypto',
              full_name: 'Sarah Johnson',
              avatar_url: undefined,
            },
          },
          {
            id: '2',
            prediction_id: predictionId,
            user_id: 'user2',
            content: 'Not so sure... the market is very volatile. Could go either way.',
            is_edited: false,
            created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
            updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            user: {
              id: 'user2',
              username: 'mike_trader',
              full_name: 'Mike Chen',
              avatar_url: undefined,
            },
          },
        ];

        return {
          data: mockComments,
          pagination: {
            page: 1,
            limit: 20,
            total: mockComments.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Create a new comment
export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (commentData: CreateComment): Promise<Comment> => {
      try {
        const response: ApiResponse<Comment> = await apiClient.post('/social/comments', commentData);
        
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to create comment');
        }
        
        return response.data;
      } catch (error) {
        // Create mock comment for demo purposes
        console.warn('Comment API not available, creating mock comment');
        
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
          },
        };
        
        return mockComment;
      }
    },
    onSuccess: (newComment) => {
      // Update the comments cache with the new comment
      queryClient.setQueryData(
        ['comments', newComment.prediction_id],
        (oldData: PaginatedResponse<Comment> | undefined) => {
          if (!oldData) return oldData;
          
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
        const response: ApiResponse<Comment> = await apiClient.put(`/social/comments/${commentId}`, { content });
        
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to update comment');
        }
        
        return response.data;
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
              comment.id === updatedComment.id ? updatedComment : comment
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
        const response: ApiResponse = await apiClient.delete(`/social/comments/${commentId}`);
        
        if (!response.success) {
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
    mutationFn: async (commentId: string): Promise<void> => {
      try {
        const response: ApiResponse = await apiClient.post(`/social/comments/${commentId}/like`);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to toggle like');
        }
      } catch (error) {
        console.warn('Comment like API not available:', error);
        // For demo purposes, we'll just succeed silently
      }
    },
    onSuccess: () => {
      // Invalidate comments to refetch with updated like counts
      queryClient.invalidateQueries({
        queryKey: ['comments'],
      });
    },
  });
};
