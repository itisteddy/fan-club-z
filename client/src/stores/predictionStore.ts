import { create } from 'zustand';
import { apiClient } from '../lib/api';

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
    username: string;
    avatar_url?: string;
    is_verified: boolean;
  };
  participant_count: number;
  user_entry?: {
    option_id: string;
    amount: number;
    potential_payout: number;
  };
}

export interface PredictionOption {
  id: string;
  prediction_id: string;
  label: string;
  total_staked: number;
  current_odds: number;
  percentage: number;
}

interface PredictionState {
  predictions: Prediction[];
  trendingPredictions: Prediction[];
  userPredictions: Prediction[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
}

interface PredictionActions {
  fetchPredictions: (category?: string) => Promise<void>;
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: () => Promise<void>;
  createPrediction: (data: any) => Promise<Prediction>;
  placePrediction: (predictionId: string, optionId: string, amount: number) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  clearError: () => void;
}

export const usePredictionStore = create<PredictionState & PredictionActions>((set, get) => ({
  predictions: [],
  trendingPredictions: [],
  userPredictions: [],
  isLoading: false,
  error: null,
  selectedCategory: null,

  fetchPredictions: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      
      const predictions = await apiClient.get(`/predictions?${params.toString()}`);
      set({ predictions, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch predictions', isLoading: false });
    }
  },

  fetchTrendingPredictions: async () => {
    try {
      const trendingPredictions = await apiClient.get('/predictions/trending');
      set({ trendingPredictions });
    } catch (error) {
      set({ error: 'Failed to fetch trending predictions' });
    }
  },

  fetchUserPredictions: async () => {
    try {
      const userPredictions = await apiClient.get('/predictions/user');
      set({ userPredictions });
    } catch (error) {
      set({ error: 'Failed to fetch user predictions' });
    }
  },

  createPrediction: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const prediction = await apiClient.post('/predictions', data);
      const { predictions } = get();
      set({ 
        predictions: [prediction, ...predictions],
        isLoading: false 
      });
      return prediction;
    } catch (error) {
      set({ error: 'Failed to create prediction', isLoading: false });
      throw error;
    }
  },

  placePrediction: async (predictionId: string, optionId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/prediction-entries', {
        prediction_id: predictionId,
        option_id: optionId,
        amount
      });
      
      // Refresh predictions to get updated data
      await get().fetchPredictions();
      await get().fetchUserPredictions();
      
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to place prediction', isLoading: false });
      throw error;
    }
  },

  setSelectedCategory: (category: string | null) => {
    set({ selectedCategory: category });
  },

  clearError: () => {
    set({ error: null });
  },
}));
