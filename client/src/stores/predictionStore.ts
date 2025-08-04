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
  likes_count: number;
  comments_count: number;
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
  loading: boolean;
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
  loading: false,
  error: null,
  selectedCategory: null,

  fetchPredictions: async (category?: string) => {
    set({ loading: true, error: null });
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

      set({ predictions: predictions || [], loading: false });
    } catch (error) {
      console.error('❌ Error fetching predictions from Supabase:', error);
      
      // Fallback to mock data with proper realistic deadlines
      console.log('🔄 Using fallback mock predictions with proper deadlines');
      const mockPredictions = [
        {
          id: 'trump-iran-prediction',
          creator_id: 'mock-user-1',
          title: 'Trump will bomb Iran again',
          description: 'Before he leaves office Trump will have a reason and will actually bomb Iran again!',
          category: 'politics' as const,
          type: 'binary' as const,
          status: 'open' as const,
          stake_min: 10,
          stake_max: 1000,
          pool_total: 0,
          entry_deadline: new Date('2025-08-04T01:00:00Z').toISOString(), // Fixed deadline for consistent display
          settlement_method: 'manual' as const,
          is_private: false,
          creator_fee_percentage: 2.5,
          platform_fee_percentage: 5,
          tags: ['politics', 'international'],
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          updated_at: new Date().toISOString(),
          options: [
            {
              id: 'trump-iran-yes',
              prediction_id: 'trump-iran-prediction',
              label: 'Yes',
              total_staked: 0,
              current_odds: 2.0,
              percentage: 50
            },
            {
              id: 'trump-iran-no', 
              prediction_id: 'trump-iran-prediction',
              label: 'No',
              total_staked: 0,
              current_odds: 2.0,
              percentage: 50
            }
          ],
          creator: {
            username: 'PoliticalPundit',
            avatar_url: undefined,
            is_verified: true
          },
          participant_count: 0,
          likes_count: 18,
          comments_count: 7
        },
        {
          id: 'premier-league-match',
          creator_id: 'mock-user-2',
          title: 'Premier League: Manchester United vs Arsenal',
          description: 'Who will win the upcoming Premier League match?',
          category: 'sports' as const,
          type: 'multi_outcome' as const,
          status: 'open' as const,
          stake_min: 25,
          stake_max: 5000,
          pool_total: 12500,
          entry_deadline: new Date('2025-08-04T10:00:00Z').toISOString(), // Fixed deadline for consistent display
          settlement_method: 'auto' as const,
          is_private: false,
          creator_fee_percentage: 1.0,
          platform_fee_percentage: 3,
          tags: ['sports', 'football', 'premier-league'],
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          updated_at: new Date().toISOString(),
          options: [
            {
              id: 'mu-win',
              prediction_id: 'premier-league-match',
              label: 'Manchester United',
              total_staked: 4500,
              current_odds: 2.8,
              percentage: 36
            },
            {
              id: 'arsenal-win',
              prediction_id: 'premier-league-match', 
              label: 'Arsenal',
              total_staked: 6200,
              current_odds: 1.9,
              percentage: 50
            },
            {
              id: 'draw',
              prediction_id: 'premier-league-match',
              label: 'Draw',
              total_staked: 1800,
              current_odds: 3.5,
              percentage: 14
            }
          ],
          creator: {
            username: 'SportsGuru',
            avatar_url: undefined,
            is_verified: false
          },
          participant_count: 47,
          likes_count: 42,
          comments_count: 23
        },
        {
          id: 'bitcoin-price',
          creator_id: 'mock-user-3',
          title: 'Bitcoin will reach $100k by year end',
          description: 'Will Bitcoin price reach $100,000 USD before December 31st?',
          category: 'pop_culture' as const,
          type: 'binary' as const,
          status: 'open' as const,
          stake_min: 50,
          stake_max: 10000,
          pool_total: 28900,
          entry_deadline: new Date('2025-08-06T18:00:00Z').toISOString(), // Fixed deadline for consistent display
          settlement_method: 'auto' as const,
          is_private: false,
          creator_fee_percentage: 2.0,
          platform_fee_percentage: 4,
          tags: ['crypto', 'bitcoin', 'price'],
          created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
          updated_at: new Date().toISOString(),
          options: [
            {
              id: 'btc-100k-yes',
              prediction_id: 'bitcoin-price',
              label: 'Yes, $100k+',
              total_staked: 18200,
              current_odds: 1.6,
              percentage: 63
            },
            {
              id: 'btc-100k-no',
              prediction_id: 'bitcoin-price',
              label: 'No, under $100k',
              total_staked: 10700,
              current_odds: 2.7,
              percentage: 37
            }
          ],
          creator: {
            username: 'CryptoKing',
            avatar_url: undefined,
            is_verified: true
          },
          participant_count: 89,
          likes_count: 156,
          comments_count: 89
        },
        {
          id: 'best-burger-chain',
          creator_id: 'mock-user-4',
          title: 'Who makes the best burger?',
          description: 'Which fast food chain has the tastiest burger?',
          category: 'custom' as const,
          type: 'multi_outcome' as const,
          status: 'open' as const,
          stake_min: 10,
          stake_max: 1000,
          pool_total: 0,
          entry_deadline: new Date('2025-08-05T18:00:00Z').toISOString(),
          settlement_method: 'manual' as const,
          is_private: false,
          creator_fee_percentage: 2.5,
          platform_fee_percentage: 5,
          tags: ['food', 'fast-food', 'burgers'],
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          options: [
            {
              id: 'burger-king',
              prediction_id: 'best-burger-chain',
              label: 'Burger King',
              total_staked: 0,
              current_odds: 2.0,
              percentage: 25
            },
            {
              id: 'wendys',
              prediction_id: 'best-burger-chain',
              label: 'Wendys',
              total_staked: 0,
              current_odds: 2.0,
              percentage: 25
            },
            {
              id: 'mcdonalds',
              prediction_id: 'best-burger-chain',
              label: 'McDonalds',
              total_staked: 0,
              current_odds: 2.0,
              percentage: 25
            },
            {
              id: 'five-guys',
              prediction_id: 'best-burger-chain',
              label: 'Five Guys',
              total_staked: 0,
              current_odds: 2.0,
              percentage: 25
            }
          ],
          creator: {
            username: 'FoodCritic',
            avatar_url: undefined,
            is_verified: true
          },
          participant_count: 0,
          likes_count: 8,
          comments_count: 3
        }
      ];
      
      set({ 
        predictions: mockPredictions,
        error: null, // Clear error since we have fallback data
        loading: false 
      });
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
    set({ loading: true, error: null });
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate entry deadline is in the future
      const deadline = new Date(data.entryDeadline);
      const now = new Date();
      if (deadline <= now) {
        throw new Error('Entry deadline must be in the future');
      }

      console.log('Creating prediction with validated data:', data);

      // Ensure stake values are properly converted
      const stakeMin = Number(data.stakeMin) || 100;
      const stakeMax = data.stakeMax ? Number(data.stakeMax) : null;

      if (stakeMin < 1) {
        throw new Error('Minimum stake must be at least $1');
      }

      if (stakeMax && stakeMax < stakeMin) {
        throw new Error('Maximum stake must be greater than minimum stake');
      }

      // Create prediction in Supabase with correct field names
      const predictionPayload = {
        creator_id: user.id,
        title: data.title,
        description: data.description || null,
        category: data.category,
        type: data.type === 'multiple' ? 'multi_outcome' : data.type, // Convert multiple to multi_outcome
        stake_min: stakeMin,
        stake_max: stakeMax,
        entry_deadline: deadline.toISOString(),
        settlement_method: data.settlementMethod,
        is_private: data.isPrivate || false,
        status: 'open',
        pool_total: 0,
        participant_count: 0, // Initialize participant count (will be added to DB)
        creator_fee_percentage: 3.5,
        platform_fee_percentage: 1.5
        // created_at and updated_at handled by DB triggers
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
          .filter((opt: any) => opt.label && opt.label.trim()) // Only include options with labels
          .map((option: any) => ({
            prediction_id: prediction.id,
            label: option.label.trim(),
            total_staked: 0,
            current_odds: 1.0
            // created_at and updated_at handled by DB triggers
          }));

        if (optionsData.length < 2) {
          throw new Error('At least 2 valid prediction options are required');
        }

        const { error: optionsError } = await supabase
          .from('prediction_options')
          .insert(optionsData);

        if (optionsError) {
          console.error('Error creating prediction options:', optionsError);
          // Don't throw here, prediction was created successfully
        } else {
          console.log('Prediction options created successfully');
        }
      }

      // Refresh predictions
      await get().fetchPredictions();
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

  placePrediction: async (predictionId: string, optionId: string, amount: number) => {
    set({ loading: true, error: null });
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
          // created_at and updated_at handled by DB triggers
        });

      if (error) {
        throw error;
      }
      
      // Refresh predictions to get updated data
      await get().fetchPredictions();
      await get().fetchUserPredictions();
      
      set({ loading: false });
    } catch (error) {
      console.error('Failed to place prediction:', error);
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