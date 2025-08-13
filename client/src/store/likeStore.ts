import { create } from 'zustand';
import { supabase } from '../lib/api';

interface LikeState {
  likedPredictions: Set<string>;
  loading: boolean;
  error: string | null;
}

interface LikeActions {
  toggleLike: (predictionId: string) => Promise<void>;
  checkIfLiked: (predictionId: string) => boolean;
  clearError: () => void;
}

export const useLikeStore = create<LikeState & LikeActions>((set, get) => ({
  likedPredictions: new Set(),
  loading: false,
  error: null,

  toggleLike: async (predictionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const isLiked = get().checkIfLiked(predictionId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('prediction_likes')
          .delete()
          .eq('prediction_id', predictionId)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        set(state => ({
          likedPredictions: new Set([...state.likedPredictions].filter(id => id !== predictionId))
        }));
      } else {
        // Like
        const { error } = await supabase
          .from('prediction_likes')
          .insert({
            prediction_id: predictionId,
            user_id: user.id
          });

        if (error && !error.message.includes('duplicate')) {
          throw error;
        }

        set(state => ({
          likedPredictions: new Set([...state.likedPredictions, predictionId])
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      set({ error: 'Failed to update like' });
      throw error;
    }
  },

  checkIfLiked: (predictionId: string) => {
    return get().likedPredictions.has(predictionId);
  },

  clearError: () => {
    set({ error: null });
  }
}));
