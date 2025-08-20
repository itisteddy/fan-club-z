import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../config';

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
  totalUsers: number;
}

interface PredictionState {
  predictions: Prediction[];
  trendingPredictions: Prediction[];
  userPredictions: Prediction[];
  createdPredictions: Prediction[];
  completedPredictions: Prediction[];
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
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: (userId: string) => Promise<void>;
  fetchCreatedPredictions: (userId: string) => Promise<void>;
  createPrediction: (predictionData: any) => Promise<Prediction>;
  placePrediction: (entry: { predictionId: string; optionId: string; amount: number; userId: string }) => Promise<void>;
  
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
      console.log('📡 Fetching predictions from API...');
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
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
      const newPrediction = data.data;

      // Add to predictions list
      set(state => ({
        predictions: [newPrediction, ...state.predictions],
        loading: false,
        error: null
      }));

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

  placePrediction: async ({ predictionId, optionId, amount, userId }) => {
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
      console.log('📊 Fetching platform stats...');
      
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/stats/platform`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Stats API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
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
        totalUsers: predictions.length > 0 ? 5 : 0 // Fallback user count
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

  reset: () => {
    set(initialState);
  }
}));