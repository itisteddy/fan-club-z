import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  clearError: () => void;
  refreshLikeCounts: () => Promise<void>;
}

export const useLikeStore = create<LikeState & LikeActions>((set, get) => ({
  likedPredictions: new Set(),
  likeCounts: {},
  loading: false,
  error: null,

  initializeLikes: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }

      // Fetch user's likes
      const { data: userLikes, error: likesError } = await supabase
        .from('prediction_likes')
        .select('prediction_id')
        .eq('user_id', user.id);

      if (likesError) {
        console.error('Error fetching user likes:', likesError);
        return;
      }

      // Fetch like counts for all predictions
      const { data: likeCounts, error: countsError } = await supabase
        .from('predictions')
        .select('id, likes_count');

      if (countsError) {
        console.error('Error fetching like counts:', countsError);
        return;
      }

      const likedSet = new Set(userLikes?.map(like => like.prediction_id) || []);
      const countsMap = Object.fromEntries(
        likeCounts?.map(pred => [pred.id, pred.likes_count || 0]) || []
      );

      set({
        likedPredictions: likedSet,
        likeCounts: countsMap
      });

      console.log('✅ Like store initialized:', {
        likedCount: likedSet.size,
        totalPredictions: Object.keys(countsMap).length
      });

    } catch (error) {
      console.error('Error initializing likes:', error);
    }
  },

  refreshLikeCounts: async () => {
    try {
      // Fetch updated like counts for all predictions
      const { data: likeCounts, error: countsError } = await supabase
        .from('predictions')
        .select('id, likes_count');

      if (countsError) {
        console.error('Error refreshing like counts:', countsError);
        return;
      }

      const countsMap = Object.fromEntries(
        likeCounts?.map(pred => [pred.id, pred.likes_count || 0]) || []
      );

      set({ likeCounts: countsMap });

      console.log('✅ Like counts refreshed:', Object.keys(countsMap).length, 'predictions');

    } catch (error) {
      console.error('Error refreshing like counts:', error);
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (wasLiked) {
        // Unlike - remove from prediction_likes table
        const { error: deleteError } = await supabase
          .from('prediction_likes')
          .delete()
          .eq('prediction_id', predictionId)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        // Update prediction likes count
        const { error: updateError } = await supabase
          .from('predictions')
          .update({ 
            likes_count: Math.max(0, currentCount - 1),
            updated_at: new Date().toISOString()
          })
          .eq('id', predictionId);

        if (updateError) {
          console.error('Error updating prediction likes count:', updateError);
        }

      } else {
        // Like - add to prediction_likes table
        const { error: insertError } = await supabase
          .from('prediction_likes')
          .insert({
            prediction_id: predictionId,
            user_id: user.id,
            created_at: new Date().toISOString()
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          throw insertError;
        }

        // Update prediction likes count
        const { error: updateError } = await supabase
          .from('predictions')
          .update({ 
            likes_count: currentCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', predictionId);

        if (updateError) {
          console.error('Error updating prediction likes count:', updateError);
        }
      }

      // Refresh like counts from database to ensure consistency
      await get().refreshLikeCounts();

      set({ loading: false, error: null });
      console.log('✅ Like toggled successfully:', { predictionId, wasLiked: !wasLiked });

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

  clearError: () => {
    set({ error: null });
  }
}));
