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
  // Helper for debugging
  debugLikeState: (predictionId: string) => void;
  
  // Real-time update methods
  addLikeFromRealtime: (predictionId: string, userId: string) => void;
  removeLikeFromRealtime: (predictionId: string, userId: string) => void;
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
        console.log('❌ No authenticated user, skipping like initialization');
        return;
      }

      console.log('🔄 Initializing like store for user:', user.id);

      // Fetch user's likes with better error handling
      const { data: userLikes, error: likesError } = await supabase
        .from('prediction_likes')
        .select('prediction_id')
        .eq('user_id', user.id);

      if (likesError) {
        console.error('❌ Error fetching user likes:', likesError);
        // Continue with empty likes rather than failing completely
      }

      // Fetch like counts for all predictions with better error handling
      const { data: likeCounts, error: countsError } = await supabase
        .from('predictions')
        .select('id, likes_count');

      if (countsError) {
        console.error('❌ Error fetching like counts:', countsError);
        // Continue with empty counts rather than failing completely
      }

      const likedSet = new Set(userLikes?.map(like => like.prediction_id) || []);
      const countsMap = Object.fromEntries(
        likeCounts?.map(pred => [pred.id, pred.likes_count || 0]) || []
      );

      set({
        likedPredictions: likedSet,
        likeCounts: countsMap,
        error: null
      });

      console.log('✅ Like store initialized successfully:', {
        likedCount: likedSet.size,
        totalPredictions: Object.keys(countsMap).length,
        userLikes: Array.from(likedSet)
      });

    } catch (error) {
      console.error('❌ Error initializing likes:', error);
      set({ error: 'Failed to load likes' });
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

      // Don't refresh all counts immediately - trust the optimistic update
      // The counts will be refreshed naturally when the component re-fetches data

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
    const state = get();
    const count = state.likeCounts[predictionId];
    return count !== undefined ? count : 0;
  },

  clearError: () => {
    set({ error: null });
  },

  debugLikeState: (predictionId: string) => {
    const state = get();
    console.log(`🔍 Debug like state for prediction ${predictionId}:`, {
      isLiked: state.likedPredictions.has(predictionId),
      likeCount: state.likeCounts[predictionId] || 0,
      allLikedPredictions: Array.from(state.likedPredictions),
      allLikeCounts: state.likeCounts,
      loading: state.loading,
      error: state.error
    });
  },

  // Real-time update methods
  addLikeFromRealtime: (predictionId: string, userId: string) => {
    console.log('❤️ Adding like from real-time:', predictionId, 'user:', userId);
    
    // Get current user synchronously to avoid async issues
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.id !== userId) {
        // Only update local state if it's not the current user
        set(state => ({
          likeCounts: {
            ...state.likeCounts,
            [predictionId]: (state.likeCounts[predictionId] || 0) + 1
          }
        }));
      }
    }).catch(error => {
      console.error('Error getting user in addLikeFromRealtime:', error);
    });
  },

  removeLikeFromRealtime: (predictionId: string, userId: string) => {
    console.log('💔 Removing like from real-time:', predictionId, 'user:', userId);
    
    // Get current user synchronously to avoid async issues
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.id !== userId) {
        // Only update local state if it's not the current user
        set(state => ({
          likeCounts: {
            ...state.likeCounts,
            [predictionId]: Math.max(0, (state.likeCounts[predictionId] || 0) - 1)
          }
        }));
      }
    }).catch(error => {
      console.error('Error getting user in removeLikeFromRealtime:', error);
    });
  }
}));
