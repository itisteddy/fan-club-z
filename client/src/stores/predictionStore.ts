import { create } from 'zustand';
import { supabase } from '../lib/api';

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
  userCreatedPredictions: Prediction[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
}

interface PredictionActions {
  fetchPredictions: (category?: string) => Promise<void>;
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: () => Promise<void>;
  fetchUserCreatedPredictions: (userId: string) => Promise<void>;
  getUserCreatedPredictions: (userId: string) => Prediction[];
  createPrediction: (data: any) => Promise<Prediction>;
  placePrediction: (predictionId: string, optionId: string, amount: number) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  clearError: () => void;
}

export const usePredictionStore = create<PredictionState & PredictionActions>((set, get) => ({
  predictions: [],
  trendingPredictions: [],
  userPredictions: [],
  userCreatedPredictions: [],
  isLoading: false,
  error: null,
  selectedCategory: null,

  fetchPredictions: async (category?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: predictions, error } = await query;

      if (error) {
        throw error;
      }

      set({ predictions: predictions || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      set({ error: 'Failed to fetch predictions', isLoading: false });
    }
  },

  fetchTrendingPredictions: async () => {
    try {
      const { data: trendingPredictions, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('status', 'open')
        .order('pool_total', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      set({ trendingPredictions: trendingPredictions || [] });
    } catch (error) {
      console.error('Error fetching trending predictions:', error);
      set({ error: 'Failed to fetch trending predictions' });
    }
  },

  fetchUserPredictions: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ userPredictions: [] });
        return;
      }

      const { data: userPredictions, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      set({ userPredictions: userPredictions || [] });
    } catch (error) {
      console.error('Error fetching user predictions:', error);
      set({ error: 'Failed to fetch user predictions' });
    }
  },

  fetchUserCreatedPredictions: async (userId: string) => {
    try {
      const { data: userCreatedPredictions, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Store user created predictions in a separate state
      set((state) => ({
        ...state,
        userCreatedPredictions: userCreatedPredictions || []
      }));
    } catch (error) {
      console.error('Error fetching user created predictions:', error);
      set({ error: 'Failed to fetch user created predictions' });
    }
  },

  getUserCreatedPredictions: (userId: string) => {
    const state = get();
    return state.userCreatedPredictions || [];
  },

  createPrediction: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate entry deadline is in the future
      const deadline = new Date(data.entry_deadline);
      const now = new Date();
      if (deadline <= now) {
        throw new Error('Entry deadline must be in the future');
      }

      // Create prediction in Supabase
      const { data: prediction, error } = await supabase
        .from('predictions')
        .insert({
          creator_id: user.id,
          title: data.title,
          description: data.description,
          category: data.category,
          type: data.type,
          stake_min: parseFloat(data.stake_min),
          stake_max: parseFloat(data.stake_max),
          entry_deadline: data.entry_deadline,
          settlement_method: data.settlement_method,
          is_private: data.is_private,
          status: 'open',
          pool_total: 0,
          creator_fee_percentage: 3.5,
          platform_fee_percentage: 1.5,
          tags: data.tags || []
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Create prediction options
      if (data.options && data.options.length > 0) {
        const optionsData = data.options.map((option: any) => ({
          prediction_id: prediction.id,
          label: option.label,
          total_staked: 0,
          current_odds: 1.0,
          percentage: 0
        }));

        const { error: optionsError } = await supabase
          .from('prediction_options')
          .insert(optionsData);

        if (optionsError) {
          throw optionsError;
        }
      }

      // Refresh predictions
      await get().fetchPredictions();
      await get().fetchUserPredictions();
      await get().fetchUserCreatedPredictions(user.id);

      set({ isLoading: false });
      return prediction;
    } catch (error) {
      console.error('Failed to create prediction:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create prediction', isLoading: false });
      throw error;
    }
  },

  placePrediction: async (predictionId: string, optionId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create prediction entry in Supabase
      const { error } = await supabase
        .from('prediction_entries')
        .insert({
          user_id: user.id,
          prediction_id: predictionId,
          option_id: optionId,
          amount: amount,
          status: 'active'
        });

      if (error) {
        throw error;
      }
      
      // Refresh predictions to get updated data
      await get().fetchPredictions();
      await get().fetchUserPredictions();
      
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to place prediction:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to place prediction', isLoading: false });
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
