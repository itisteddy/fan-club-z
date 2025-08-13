import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Comment {
  id: string;
  predictionId: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  liked: boolean;
  replies: Comment[];
  parentId?: string;
  isEdited: boolean;
}

export interface Like {
  id: string;
  predictionId: string;
  userId: string;
  createdAt: string;
}

export interface Share {
  id: string;
  predictionId: string;
  userId: string;
  platform: 'twitter' | 'whatsapp' | 'telegram' | 'copy_link' | 'native_share' | 'download_image';
  createdAt: string;
}

interface SocialStore {
  comments: Comment[];
  likes: Like[];
  shares: Share[];
  
  // Comment actions
  addComment: (data: { predictionId: string; content: string; parentId?: string }) => Promise<void>;
  editComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleLike: (commentId: string) => Promise<void>;
  
  // Prediction actions
  togglePredictionLike: (predictionId: string) => Promise<void>;
  sharePrediction: (predictionId: string, platform: Share['platform']) => Promise<void>;
  
  // Get functions
  getComments: (predictionId: string) => Comment[];
  getCommentCount: (predictionId: string) => number;
  getLikeCount: (predictionId: string) => number;
  getShareCount: (predictionId: string) => number;
  isPredictionLiked: (predictionId: string) => boolean;
}

export const useSocialStore = create<SocialStore>()(
  persist(
    (set, get) => ({
      comments: [],
      likes: [],
      shares: [],

      addComment: async (data) => {
        const newComment: Comment = {
          id: crypto.randomUUID(),
          predictionId: data.predictionId,
          userId: 'current-user', // Replace with actual user ID
          username: 'Current User', // Replace with actual username
          content: data.content,
          createdAt: new Date().toISOString(),
          likes: 0,
          liked: false,
          replies: [],
          parentId: data.parentId,
          isEdited: false,
        };

        set((state) => ({
          comments: [...state.comments, newComment],
        }));

        // TODO: Send to API
        try {
          // const response = await fetch('/api/comments', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify(data),
          // });
          // const savedComment = await response.json();
          // Update local state with server response if needed
        } catch (error) {
          console.error('Failed to save comment:', error);
          // Optionally revert optimistic update
        }
      },

      editComment: async (commentId, content) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  content,
                  updatedAt: new Date().toISOString(),
                  isEdited: true,
                }
              : comment
          ),
        }));

        // TODO: Send to API
        try {
          // await fetch(`/api/comments/${commentId}`, {
          //   method: 'PUT',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ content }),
          // });
        } catch (error) {
          console.error('Failed to edit comment:', error);
        }
      },

      deleteComment: async (commentId) => {
        set((state) => ({
          comments: state.comments.filter((comment) => comment.id !== commentId),
        }));

        // TODO: Send to API
        try {
          // await fetch(`/api/comments/${commentId}`, {
          //   method: 'DELETE',
          // });
        } catch (error) {
          console.error('Failed to delete comment:', error);
        }
      },

      toggleLike: async (commentId) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  liked: !comment.liked,
                  likes: comment.liked ? comment.likes - 1 : comment.likes + 1,
                }
              : comment
          ),
        }));

        // TODO: Send to API
        try {
          // await fetch(`/api/comments/${commentId}/toggle-like`, {
          //   method: 'POST',
          // });
        } catch (error) {
          console.error('Failed to toggle like:', error);
        }
      },

      togglePredictionLike: async (predictionId) => {
        const currentUserId = 'current-user'; // Replace with actual user ID
        const existingLike = get().likes.find(
          (like) => like.predictionId === predictionId && like.userId === currentUserId
        );

        if (existingLike) {
          // Remove like
          set((state) => ({
            likes: state.likes.filter((like) => like.id !== existingLike.id),
          }));
        } else {
          // Add like
          const newLike: Like = {
            id: crypto.randomUUID(),
            predictionId,
            userId: currentUserId,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            likes: [...state.likes, newLike],
          }));
        }

        // TODO: Send to API
        try {
          // await fetch(`/api/predictions/${predictionId}/toggle-like`, {
          //   method: 'POST',
          // });
        } catch (error) {
          console.error('Failed to toggle prediction like:', error);
        }
      },

      sharePrediction: async (predictionId, platform) => {
        const newShare: Share = {
          id: crypto.randomUUID(),
          predictionId,
          userId: 'current-user', // Replace with actual user ID
          platform,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          shares: [...state.shares, newShare],
        }));

        // TODO: Send to API for analytics
        try {
          // await fetch('/api/shares', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({ predictionId, platform }),
          // });
        } catch (error) {
          console.error('Failed to track share:', error);
        }
      },

      getComments: (predictionId) => {
        return get().comments.filter((comment) => comment.predictionId === predictionId);
      },

      getCommentCount: (predictionId) => {
        return get().comments.filter((comment) => comment.predictionId === predictionId).length;
      },

      getLikeCount: (predictionId) => {
        return get().likes.filter((like) => like.predictionId === predictionId).length;
      },

      getShareCount: (predictionId) => {
        return get().shares.filter((share) => share.predictionId === predictionId).length;
      },

      isPredictionLiked: (predictionId) => {
        const currentUserId = 'current-user'; // Replace with actual user ID
        return get().likes.some(
          (like) => like.predictionId === predictionId && like.userId === currentUserId
        );
      },
    }),
    {
      name: 'fanclubz-social',
      partialize: (state) => ({
        comments: state.comments,
        likes: state.likes,
        shares: state.shares,
      }),
    }
  )
);

// Helper functions for easy access
export const socialHelpers = {
  getEngagementData: (predictionId: string) => {
    const store = useSocialStore.getState();
    return {
      comments: store.getCommentCount(predictionId),
      likes: store.getLikeCount(predictionId),
      shares: store.getShareCount(predictionId),
      isLiked: store.isPredictionLiked(predictionId),
    };
  },

  // Seed some initial data for development
  seedSocialData: () => {
    const store = useSocialStore.getState();
    
    // Add some sample comments
    const sampleComments: Comment[] = [
      {
        id: '1',
        predictionId: 'pred-1',
        userId: 'user-1',
        username: 'SportsFan123',
        content: 'This is going to be an exciting match! I think Team A has a strong chance.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        likes: 5,
        liked: false,
        replies: [],
        isEdited: false,
      },
      {
        id: '2',
        predictionId: 'pred-1',
        userId: 'user-2',
        username: 'AnalystPro',
        content: 'Based on recent performance stats, I disagree. Team B has been more consistent.',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        likes: 3,
        liked: true,
        replies: [],
        isEdited: false,
      },
      {
        id: '3',
        predictionId: 'pred-1',
        userId: 'user-3',
        username: 'CasualBettor',
        content: 'Great analysis! What do you think about the weather conditions?',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        likes: 1,
        liked: false,
        replies: [],
        parentId: '2', // Reply to AnalystPro
        isEdited: false,
      },
    ];

    // Add sample likes
    const sampleLikes: Like[] = [
      {
        id: 'like-1',
        predictionId: 'pred-1',
        userId: 'user-1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'like-2',
        predictionId: 'pred-1',
        userId: 'user-4',
        createdAt: new Date().toISOString(),
      },
    ];

    useSocialStore.setState({
      comments: sampleComments,
      likes: sampleLikes,
      shares: [],
    });
  },
};
