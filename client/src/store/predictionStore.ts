import { create } from 'zustand';
import { supabase } from '../lib/api';
import { useAuthStore } from './authStore';

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

interface PredictionState {
  predictions: Prediction[];
  trendingPredictions: Prediction[];
  userPredictions: Prediction[];
  userCreatedPredictions: Prediction[];
  loading: boolean;
  error: string | null;
  selectedCategory: string | null;
  lastFetch: number;
  initialized: boolean;
}

interface PredictionActions {
  fetchPredictions: (category?: string, force?: boolean) => Promise<void>;
  refreshPredictions: (force?: boolean) => Promise<void>; // Added this method
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: () => Promise<void>;
  fetchUserCreatedPredictions: (userId: string) => Promise<void>;
  getUserCreatedPredictions: (userId: string) => Prediction[];
  createPrediction: (data: any) => Promise<Prediction>;
  placePrediction: (data: { predictionId: string; optionId: string; amount: number; userId: string }) => Promise<void>;
  setSelectedCategory: (category: string | null) => void;
  clearError: () => void;
  getPredictionById: (id: string) => Prediction | null;
}

// Cache duration: 2 minutes for better performance
const CACHE_DURATION = 2 * 60 * 1000;

export const usePredictionStore = create<PredictionState & PredictionActions>((set, get) => ({
  predictions: [],
  trendingPredictions: [],
  userPredictions: [],
  userCreatedPredictions: [],
  loading: false,
  error: null,
  selectedCategory: null,
  lastFetch: 0,
  initialized: false,

  getPredictionById: (id: string) => {
    const state = get();
    return state.predictions.find(p => p.id === id) || null;
  },

  // Added refreshPredictions method
  refreshPredictions: async (force = false) => {
    const state = get();
    return await get().fetchPredictions(state.selectedCategory || undefined, force);
  },

  fetchPredictions: async (category?: string, force = false) => {
    const state = get();
    const now = Date.now();
    
    // Skip fetch if we have recent data and not forcing refresh
    if (!force && state.predictions.length > 0 && (now - state.lastFetch) < CACHE_DURATION) {
      console.log('📋 Using cached predictions data');
      return;
    }
    
    // Don't start multiple fetch operations
    if (state.loading && !force) {
      console.log('🔄 Predictions fetch already in progress');
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      console.log('📡 Fetching predictions from Supabase...');
      
      let query = supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data: predictions, error } = await query;

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log(`✅ Fetched ${predictions?.length || 0} predictions`);

      // Transform data to match our interface with compatibility properties
      const transformedPredictions = (predictions || []).map((pred: any) => ({
        ...pred,
        // Compatibility aliases
        poolTotal: pred.pool_total,
        entryDeadline: pred.entry_deadline,
        entries: [], // Mock data for now
        likes: pred.likes_count || 0,
        comments: pred.comments_count || 0,
        
        creator: pred.creator ? {
          id: pred.creator.id,
          username: pred.creator.username || pred.creator.full_name || 'Unknown',
          avatar_url: pred.creator.avatar_url,
          is_verified: false
        } : {
          id: pred.creator_id,
          username: 'Fan Club Z',
          avatar_url: null,
          is_verified: true
        },
        options: (pred.options || []).map((opt: any) => ({
          ...opt,
          totalStaked: opt.total_staked, // Compatibility alias
          percentage: pred.pool_total > 0 ? (opt.total_staked / pred.pool_total) * 100 : 0
        })),
        likes_count: pred.likes_count || 0,
        comments_count: pred.comments_count || 0
      }));

      set({ 
        predictions: transformedPredictions, 
        loading: false,
        lastFetch: now,
        initialized: true,
        error: null
      });

    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch predictions', 
        loading: false 
      });
    }
  },

  fetchTrendingPredictions: async () => {
    try {
      console.log('📡 Fetching trending predictions...');
      
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
        .limit(6);

      if (error) {
        throw error;
      }

      // Transform data
      const transformedTrending = (trendingPredictions || []).map((pred: any) => ({
        ...pred,
        poolTotal: pred.pool_total,
        entryDeadline: pred.entry_deadline,
        entries: [],
        likes: pred.likes_count || 0,
        comments: pred.comments_count || 0,
        
        creator: pred.creator ? {
          id: pred.creator.id,
          username: pred.creator.username || pred.creator.full_name || 'Unknown',
          avatar_url: pred.creator.avatar_url,
          is_verified: false
        } : {
          id: pred.creator_id,
          username: 'Fan Club Z',
          avatar_url: null,
          is_verified: true
        },
        options: (pred.options || []).map((opt: any) => ({
          ...opt,
          totalStaked: opt.total_staked,
          percentage: pred.pool_total > 0 ? (opt.total_staked / pred.pool_total) * 100 : 0
        }))
      }));

      set({ trendingPredictions: transformedTrending });

    } catch (error) {
      console.error('❌ Error fetching trending predictions:', error);
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

      console.log('📡 Fetching user predictions...');

      const { data: userPredictions, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      set({ userPredictions: userPredictions || [] });

    } catch (error) {
      console.error('❌ Error fetching user predictions:', error);
      set({ error: 'Failed to fetch user predictions' });
    }
  },

  fetchUserCreatedPredictions: async (userId: string) => {
    try {
      console.log('📡 Fetching user created predictions for:', userId);

      const { data: userCreatedPredictions, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*),
          club:clubs(id, name, avatar_url)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      set((state) => ({
        ...state,
        userCreatedPredictions: userCreatedPredictions || []
      }));

    } catch (error) {
      console.error('❌ Error fetching user created predictions:', error);
      set({ error: 'Failed to fetch user created predictions' });
    }
  },

  getUserCreatedPredictions: (userId: string) => {
    const state = get();
    return state.userCreatedPredictions || [];
  },

  createPrediction: async (data: any) => {
    set({ loading: true, error: null });
    
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.isAuthenticated || !authStore.user) {
        throw new Error('User not authenticated');
      }
      
      const user = authStore.user;

      // Validate entry deadline is in the future
      const deadline = new Date(data.entryDeadline);
      const now = new Date();
      if (deadline <= now) {
        throw new Error('Entry deadline must be in the future');
      }

      console.log('Creating prediction with validated data:', data);

      // Ensure stake values are properly converted to USD
      const stakeMin = Number(data.stakeMin) || 1;
      const stakeMax = data.stakeMax ? Number(data.stakeMax) : null;

      if (stakeMin < 1) {
        throw new Error('Minimum stake must be at least $1');
      }

      if (stakeMax && stakeMax < stakeMin) {
        throw new Error('Maximum stake must be greater than minimum stake');
      }

      // Create prediction in Supabase
      const predictionPayload = {
        creator_id: user.id,
        title: data.title,
        description: data.description || null,
        category: data.category,
        type: data.type === 'multiple' ? 'multi_outcome' : data.type,
        stake_min: stakeMin,
        stake_max: stakeMax,
        entry_deadline: deadline.toISOString(),
        settlement_method: data.settlementMethod,
        is_private: data.isPrivate || false,
        status: 'open',
        pool_total: 0,
        participant_count: 0,
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5
      };

      console.log('Final prediction payload:', predictionPayload);

      const { data: prediction, error } = await supabase
        .from('predictions')
        .insert(predictionPayload)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating prediction:', error);
        throw new Error(error.message || 'Failed to create prediction');
      }

      console.log('Prediction created successfully:', prediction);

      // Create prediction options
      if (data.options && data.options.length > 0) {
        const optionsData = data.options
          .filter((opt: any) => opt.label && opt.label.trim())
          .map((option: any) => ({
            prediction_id: prediction.id,
            label: option.label.trim(),
            total_staked: 0,
            current_odds: 1.0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        if (optionsData.length < 2) {
          throw new Error('At least 2 valid prediction options are required');
        }

        const { error: optionsError } = await supabase
          .from('prediction_options')
          .insert(optionsData);

        if (optionsError) {
          console.error('Error creating prediction options:', optionsError);
        } else {
          console.log('Prediction options created successfully');
        }
      }

      // Force refresh predictions
      await get().fetchPredictions(undefined, true);
      await get().fetchUserPredictions();
      await get().fetchUserCreatedPredictions(user.id);

      set({ loading: false });
      return prediction;
      
    } catch (error) {
      console.error('Failed to create prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prediction';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  placePrediction: async (data: { predictionId: string; optionId: string; amount: number; userId: string }) => {
    set({ loading: true, error: null });
    
    try {
      const authStore = useAuthStore.getState();
      
      if (!authStore.isAuthenticated || !authStore.user) {
        throw new Error('User not authenticated');
      }
      
      const user = authStore.user;

      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      console.log('🎲 Placing prediction:', data);

      // Use the API endpoint instead of direct database insert
      const response = await fetch(`/api/predictions/${data.predictionId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          option_id: data.optionId,
          amount: data.amount
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place prediction');
      }

      console.log('✅ Prediction placed successfully:', result);
      
      // Update wallet store to reflect the prediction
      const { useWalletStore } = await import('./walletStore');
      const walletStore = useWalletStore.getState();
      await walletStore.makePrediction(data.amount, `Prediction: ${result.prediction?.title || 'Unknown'}`, data.predictionId, 'USD');
      
      // Force refresh predictions to get updated data
      await get().fetchPredictions(undefined, true);
      await get().fetchUserPredictions();
      
      set({ loading: false });
      
    } catch (error) {
      console.error('❌ Failed to place prediction:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to place prediction', loading: false });
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
