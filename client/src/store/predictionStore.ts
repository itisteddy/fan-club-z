import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../config';
import { useAuthStore } from './authStore';
import { apiClient } from '../lib/apiUtils';

export interface Prediction {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  category: 'sports' | 'pop_culture' | 'custom' | 'esports' | 'celebrity_gossip' | 'politics';
  type: 'binary' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled';
  stake_min: number;
  stake_max?: number;
  pool_total: number;
  entry_deadline: string;
  settlement_method: 'auto' | 'manual';
  is_private: boolean;
  creator_fee_percentage: number;
  platform_fee_percentage: number;
  club_id?: string;
  image_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  options: PredictionOption[];
  creator: {
    id: string;
    username: string;
    avatar_url?: string;
    is_verified: boolean;
    full_name?: string;
  };
  participant_count: number;
  likes_count: number;
  comments_count: number;
  user_entry?: {
    option_id: string;
    amount: number;
    potential_payout: number;
  };
  // Additional properties for compatibility
  poolTotal?: number;
  entryDeadline?: string;
  entries?: any[];
  likes?: number;
  comments?: number;
}

export interface PredictionOption {
  id: string;
  prediction_id: string;
  label: string;
  total_staked: number;
  current_odds: number;
  percentage: number;
  totalStaked?: number; // Compatibility alias
}

export interface PredictionEntry {
  id: string;
  prediction_id: string;
  user_id: string;
  option_id: string;
  amount: number;
  potential_payout: number;
  actual_payout?: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'participant_joined' | 'prediction_placed' | 'multiple_participants';
  description: string;
  amount?: number;
  participantCount?: number;
  timestamp: string;
  timeAgo: string;
}

export interface Participant {
  id: string;
  username: string;
  avatar_url?: string;
  amount: number;
  option: string;
  joinedAt: string;
  timeAgo: string;
}

export interface PlatformStats {
  totalVolume: string;
  activePredictions: number;
  totalUsers: string;
  rawVolume: number;
  rawUsers: number;
}

interface PredictionState {
  predictions: Prediction[];
  trendingPredictions: Prediction[];
  userPredictions: Prediction[];
  createdPredictions: Prediction[];
  completedPredictions: Prediction[];
  userPredictionEntries: PredictionEntry[];
  userCreatedPredictions: Prediction[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  lastFetchTime: number;
  platformStats: PlatformStats | null;
  statsLoading: boolean;
}

interface PredictionActions {
  // Core prediction actions
  fetchPredictions: () => Promise<void>;
  refreshPredictions: (force?: boolean) => Promise<void>; // Added this method
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: (userId: string) => Promise<void>;
  fetchCreatedPredictions: (userId: string) => Promise<void>;
  createPrediction: (predictionData: any) => Promise<Prediction>;
  placePrediction: (predictionId: string, optionId: string, amount: number, userId?: string) => Promise<void>;
  
  // User-specific data fetching
  fetchUserPredictionEntries: (userId: string) => Promise<void>;
  fetchUserCreatedPredictions: (userId: string) => Promise<void>;
  
  // Utility methods for accessing user data
  getUserPredictionEntries: (userId: string) => PredictionEntry[];
  getUserCreatedPredictions: (userId: string) => Prediction[];
  

  
  // Prediction management methods
  updatePrediction: (predictionId: string, updates: any) => Promise<void>;
  deletePrediction: (predictionId: string) => Promise<void>;
  closePrediction: (predictionId: string) => Promise<void>;
  fetchPredictionActivity: (predictionId: string) => Promise<ActivityItem[]>;
  fetchPredictionParticipants: (predictionId: string) => Promise<Participant[]>;
  
  // Platform stats
  fetchPlatformStats: () => Promise<void>;
  
  // Utility methods - REMOVED MOCK DATA
  getActivityForPrediction: (predictionId: string) => ActivityItem[];
  getParticipantsForPrediction: (predictionId: string) => Participant[];
  
  // State management
  clearError: () => void;
  reset: () => void;
}

const initialState: PredictionState = {
  predictions: [],
  trendingPredictions: [],
  userPredictions: [],
  createdPredictions: [],
  completedPredictions: [],
  userPredictionEntries: [],
  userCreatedPredictions: [],
  loading: false,
  error: null,
  initialized: false,
  lastFetchTime: 0,
  platformStats: null,
  statsLoading: false,
};

export const usePredictionStore = create<PredictionState & PredictionActions>((set, get) => ({
  ...initialState,

  fetchPredictions: async () => {
    const currentTime = Date.now();
    const { lastFetchTime, predictions } = get();
    
    // Cache for 30 seconds to prevent excessive API calls
    if (currentTime - lastFetchTime < 30000 && predictions.length > 0) {
      console.log('📋 Using cached predictions');
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      console.log('📡 Fetching predictions from API with retry logic...');
      
      const data = await apiClient.get('/api/v2/predictions', {
        timeout: 10000,
        retryOptions: { maxRetries: 3 }
      });

      const predictions = data.data || [];
      
      console.log('✅ Predictions fetched successfully:', predictions.length);

      set({ 
        predictions,
        loading: false,
        error: null,
        initialized: true,
        lastFetchTime: currentTime
      });

    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch predictions',
        // Don't clear predictions on error, keep existing data
      });
    }
  },

  // NEW: refreshPredictions method that was missing
  refreshPredictions: async (force = false) => {
    const { lastFetchTime } = get();
    const currentTime = Date.now();
    
    // If not forced and we've fetched recently, use cache
    if (!force && currentTime - lastFetchTime < 10000) {
      console.log('📋 Using cached predictions (refresh)');
      return;
    }

    // Reset cache time to force fetch
    set({ lastFetchTime: 0 });
    
    try {
      await get().fetchPredictions();
      console.log('🔄 Predictions refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing predictions:', error);
      throw error;
    }
  },

  fetchTrendingPredictions: async () => {
    set({ loading: true });
    
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/trending`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch trending predictions: ${response.statusText}`);
      }

      const data = await response.json();
      const trendingPredictions = data.data || [];
      
      set({ 
        trendingPredictions,
        loading: false,
        error: null
      });
      
      console.log('✅ Trending predictions fetched:', trendingPredictions.length);

    } catch (error) {
      console.error('❌ Error fetching trending predictions:', error);
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trending predictions'
      });
    }
  },

  fetchUserPredictions: async (userId: string) => {
    set({ loading: true });
    
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user predictions: ${response.statusText}`);
      }

      const data = await response.json();
      const userPredictions = data.data || [];

      set({
        userPredictions,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('❌ Error fetching user predictions:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user predictions'
      });
    }
  },

  fetchCreatedPredictions: async (userId: string) => {
    set({ loading: true });
    
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/created/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch created predictions: ${response.statusText}`);
      }

      const data = await response.json();
      const createdPredictions = data.data || [];

      set({
        createdPredictions,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('❌ Error fetching created predictions:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch created predictions'
      });
    }
  },

  createPrediction: async (predictionData: any) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictionData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create prediction: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data) {
        throw new Error('Invalid response: no prediction data returned');
      }
      
      const newPrediction = data.data;

      // Validate the prediction has required fields
      if (!newPrediction || !newPrediction.id) {
        throw new Error('Invalid prediction data: missing required fields');
      }

      // Add to predictions list
      set(state => ({
        predictions: [newPrediction, ...state.predictions],
        loading: false,
        error: null
      }));

      // Force refresh predictions to ensure options are displayed correctly (fast refresh)
      setTimeout(() => {
        get().fetchPredictions();
      }, 100);

      // Add to user created predictions immediately for instant UI update
      set(state => ({
        userCreatedPredictions: [newPrediction, ...state.userCreatedPredictions]
      }));

      // Also refresh user's created predictions from server after a delay
      try {
        const { user } = useAuthStore.getState();
        if (user?.id) {
          // Wait a bit for database to be consistent, then refresh
          setTimeout(() => {
            get().fetchUserCreatedPredictions(user.id);
          }, 1000);
        }
      } catch (error) {
        console.warn('⚠️ Failed to refresh user created predictions:', error);
      }

      console.log('✅ Prediction created successfully:', newPrediction.id);
      return newPrediction;

    } catch (error) {
      console.error('❌ Error creating prediction:', error);
      set({ 
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create prediction'
      });
      throw error;
    }
  },

  placePrediction: async (predictionId: string, optionId: string, amount: number, userId?: string) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${predictionId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option_id: optionId,
          amount,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to place prediction: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update prediction in store with new pool total and participant count
      set(state => ({
        predictions: state.predictions.map(pred => 
          pred.id === predictionId 
            ? { 
                ...pred, 
                pool_total: data.prediction?.pool_total || pred.pool_total,
                participant_count: data.prediction?.participant_count || pred.participant_count,
                user_entry: data.entry
              }
            : pred
        ),
        loading: false,
        error: null
      }));

      console.log('✅ Prediction placed successfully');

    } catch (error) {
      console.error('❌ Error placing prediction:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to place prediction'
      });
      throw error;
    }
  },

  fetchPlatformStats: async () => {
    set({ statsLoading: true });
    
    try {
      console.log('📊 Fetching platform stats with retry logic...');
      
      const data = await apiClient.get('/api/v2/predictions/stats/platform', {
        timeout: 8000,
        retryOptions: { maxRetries: 3 }
      });
      
      if (data.success && data.data) {
        set({
          platformStats: data.data,
          statsLoading: false
        });
        
        console.log('✅ Platform stats fetched:', data.data);
      } else {
        throw new Error('Invalid stats response format');
      }

    } catch (error) {
      console.error('❌ Error fetching platform stats:', error);
      
      // Set fallback stats based on current predictions
      const { predictions } = get();
      const fallbackStats: PlatformStats = {
        totalVolume: predictions.reduce((sum, pred) => sum + (pred.pool_total || 0), 0).toFixed(2),
        activePredictions: predictions.filter(pred => pred.status === 'open').length,
        totalUsers: predictions.length > 0 ? '5' : '0', // Fallback user count
        rawVolume: predictions.reduce((sum, pred) => sum + (pred.pool_total || 0), 0),
        rawUsers: predictions.length > 0 ? 5 : 0
      };
      
      set({
        platformStats: fallbackStats,
        statsLoading: false
      });
      
      console.log('📊 Using fallback stats:', fallbackStats);
    }
  },

  // REMOVED MOCK DATA - Returns empty arrays if no real data
  getActivityForPrediction: (predictionId: string) => {
    // Real implementation would fetch from database
    // For now, return empty array until real activity tracking is implemented
    return [];
  },

  getParticipantsForPrediction: (predictionId: string) => {
    // Real implementation would fetch from database
    // For now, return empty array until real participant tracking is implemented
    return [];
  },

  clearError: () => {
    set({ error: null });
  },

  // User-specific data fetching methods
  fetchUserPredictionEntries: async (userId: string) => {
    try {
      console.log('📋 Fetching user prediction entries with retry logic for:', userId);
      
      const data = await apiClient.get(`/api/v2/prediction-entries/user/${userId}`, {
        timeout: 10000,
        retryOptions: { maxRetries: 3 }
      });

      const userPredictionEntries = data.data || [];

      set({ userPredictionEntries });
      console.log('✅ User prediction entries fetched:', userPredictionEntries.length);

    } catch (error) {
      console.error('❌ Error fetching user prediction entries:', error);
      // Don't set error state for this, just log it
    }
  },

  fetchUserCreatedPredictions: async (userId: string) => {
    try {
      console.log('📋 Fetching user created predictions with retry logic for:', userId);
      
      const data = await apiClient.get(`/api/v2/predictions/created/${userId}`, {
        timeout: 10000,
        retryOptions: { maxRetries: 3 }
      });

      const userCreatedPredictions = data.data || [];

      set({ userCreatedPredictions });
      console.log('✅ User created predictions fetched:', userCreatedPredictions.length);
      
    } catch (error) {
      console.error('❌ Error fetching user created predictions:', error);
      // Don't set error state for this, just log it
    }
  },

  // Utility methods for accessing user data
  getUserPredictionEntries: (userId: string) => {
    const { userPredictionEntries } = get();
    return userPredictionEntries.filter(entry => entry.user_id === userId);
  },

  getUserCreatedPredictions: (userId: string) => {
    const { userCreatedPredictions } = get();
    return userCreatedPredictions.filter(prediction => prediction.creator_id === userId);
  },



  // Prediction management methods
  updatePrediction: async (predictionId: string, updates: any) => {
    try {
      console.log('🔄 Updating prediction:', predictionId, updates);
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${predictionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update prediction: ${response.statusText}`);
      }

      const data = await response.json();
      const updatedPrediction = data.data;

      // Update prediction in all relevant state arrays
      set(state => ({
        predictions: state.predictions.map(pred => 
          pred.id === predictionId ? { ...pred, ...updatedPrediction } : pred
        ),
        userCreatedPredictions: state.userCreatedPredictions.map(pred => 
          pred.id === predictionId ? { ...pred, ...updatedPrediction } : pred
        )
      }));

      console.log('✅ Prediction updated successfully');

    } catch (error) {
      console.error('❌ Error updating prediction:', error);
      throw error;
    }
  },

  deletePrediction: async (predictionId: string) => {
    try {
      console.log('🗑️ Deleting prediction:', predictionId);
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${predictionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete prediction: ${response.statusText}`);
      }

      // Optimistically remove prediction from all relevant state arrays
      set(state => ({
        predictions: state.predictions.filter(pred => pred.id !== predictionId),
        createdPredictions: state.createdPredictions.filter(pred => pred.id !== predictionId),
        userCreatedPredictions: state.userCreatedPredictions.filter(pred => pred.id !== predictionId),
        trendingPredictions: state.trendingPredictions.filter(pred => pred.id !== predictionId),
        completedPredictions: state.completedPredictions.filter(pred => pred.id !== predictionId),
      }));

      // Proactively refresh lists to avoid any stale interactions
      try {
        const { user } = useAuthStore.getState();
        // Force-refresh main feeds (bypass cache)
        await get().refreshPredictions(true);
        await get().fetchTrendingPredictions();
        if (user?.id) {
          await get().fetchUserCreatedPredictions(user.id);
          await get().fetchUserPredictionEntries(user.id);
        }
      } catch (refreshError) {
        console.warn('⚠️ Post-delete refresh had an issue:', refreshError);
      }

      console.log('✅ Prediction deleted successfully');

    } catch (error) {
      console.error('❌ Error deleting prediction:', error);
      throw error;
    }
  },

  closePrediction: async (predictionId: string) => {
    try {
      console.log('🔒 Closing prediction:', predictionId);
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${predictionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to close prediction: ${response.statusText}`);
      }

      const data = await response.json();
      const updatedPrediction = data.data;

      // Update prediction status in state
      set(state => ({
        predictions: state.predictions.map(pred => 
          pred.id === predictionId ? { ...pred, status: 'closed', ...updatedPrediction } : pred
        ),
        userCreatedPredictions: state.userCreatedPredictions.map(pred => 
          pred.id === predictionId ? { ...pred, status: 'closed', ...updatedPrediction } : pred
        )
      }));

      console.log('✅ Prediction closed successfully');

    } catch (error) {
      console.error('❌ Error closing prediction:', error);
      throw error;
    }
  },

  fetchPredictionActivity: async (predictionId: string) => {
    try {
      console.log('📋 Fetching prediction activity:', predictionId);
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${predictionId}/activity`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Activity endpoint not available: ${response.statusText}`);
        return []; // Return empty array if endpoint doesn't exist yet
      }

      const data = await response.json();
      return data.data || [];

    } catch (error) {
      console.warn('Activity endpoint not implemented yet:', error);
      return []; // Return empty array for now
    }
  },

  fetchPredictionParticipants: async (predictionId: string) => {
    try {
      console.log('📋 Fetching prediction participants:', predictionId);
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${predictionId}/participants`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`Participants endpoint not available: ${response.statusText}`);
        return []; // Return empty array if endpoint doesn't exist yet
      }

      const data = await response.json();
      return data.data || [];
      
    } catch (error) {
      console.warn('Participants endpoint not implemented yet:', error);
      return []; // Return empty array for now
    }
  },

  reset: () => {
    set(initialState);
  }
}));