import { create } from 'zustand';
import { apiClient } from '../lib/api';

interface LikeState {
  likedPredictions: Set<string>;
  likeCounts: Record<string, number>;
  loading: boolean;
  error: string | null;
}

interface LikeActions {
  initializeLikes: () => Promise<void>;
  toggleLike: (predictionId: string) => Promise<void>;
  checkIfLiked: (predictionId: string) => boolean;
  getLikeCount: (predictionId: string) => number;
  setLikeData: (predictionId: string, liked: boolean, count: number) => void;
  clearError: () => void;
}

export const useLikeStore = create<LikeState & LikeActions>((set, get) => ({
  likedPredictions: new Set(),
  likeCounts: {},
  loading: false,
  error: null,

  initializeLikes: async () => {
    try {
      // Initialize with empty state - likes will be loaded per prediction as needed
      set({
        likedPredictions: new Set(),
        likeCounts: {}
      });
    } catch (error) {
      console.error('Error initializing likes:', error);
    }
  },

  toggleLike: async (predictionId: string) => {
    const { likedPredictions, likeCounts } = get();
    const wasLiked = likedPredictions.has(predictionId);
    const currentCount = likeCounts[predictionId] || 0;

    // Optimistic update
    const newLikedPredictions = new Set(likedPredictions);
    const newLikeCounts = { ...likeCounts };

    if (wasLiked) {
      newLikedPredictions.delete(predictionId);
      newLikeCounts[predictionId] = Math.max(0, currentCount - 1);
    } else {
      newLikedPredictions.add(predictionId);
      newLikeCounts[predictionId] = currentCount + 1;
    }

    set({
      likedPredictions: newLikedPredictions,
      likeCounts: newLikeCounts,
      loading: true
    });

    try {
      // Use API endpoint instead of direct Supabase
      const response = await apiClient.post(`/v2/predictions/${predictionId}/like`);
      
      if (response.success === false) {
        throw new Error(response.error || 'Failed to toggle like');
      }

      // Update state with server response
      const serverLiked = response.data?.liked || response.liked || false;
      const serverCount = response.data?.likes_count || response.likes_count || 0;

      const finalLikedPredictions = new Set(likedPredictions);
      const finalLikeCounts = { ...likeCounts };

      if (serverLiked) {
        finalLikedPredictions.add(predictionId);
      } else {
        finalLikedPredictions.delete(predictionId);
      }
      finalLikeCounts[predictionId] = serverCount;

      set({
        likedPredictions: finalLikedPredictions,
        likeCounts: finalLikeCounts,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Revert optimistic update on error
      set({
        likedPredictions,
        likeCounts,
        loading: false,
        error: 'Failed to update like'
      });
      
      throw error;
    }
  },

  checkIfLiked: (predictionId: string) => {
    return get().likedPredictions.has(predictionId);
  },

  getLikeCount: (predictionId: string) => {
    return get().likeCounts[predictionId] || 0;
  },

  setLikeData: (predictionId: string, liked: boolean, count: number) => {
    const { likedPredictions, likeCounts } = get();
    const newLikedPredictions = new Set(likedPredictions);
    const newLikeCounts = { ...likeCounts };

    if (liked) {
      newLikedPredictions.add(predictionId);
    } else {
      newLikedPredictions.delete(predictionId);
    }
    newLikeCounts[predictionId] = count;

    set({
      likedPredictions: newLikedPredictions,
      likeCounts: newLikeCounts
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
