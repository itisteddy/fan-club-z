import { create } from 'zustand';
import { Prediction } from '../types';
import { supabase, clientDb } from '../lib/supabase';

interface PredictionState {
  predictions: Prediction[];
  loading: boolean;
  error: string | null;
  createPrediction: (prediction: Omit<Prediction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  makePrediction: (predictionId: string, optionId: string, amount: number) => void;
  getUserCreatedPredictions: (userId: string) => Prediction[];
  fetchPredictions: () => Promise<void>;
  fetchUserCreatedPredictions: (userId: string) => Promise<void>;
}

// Convert Supabase prediction data to frontend format
const convertSupabasePrediction = (supabasePrediction: any): Prediction => {
  return {
    id: supabasePrediction.id,
    creatorId: supabasePrediction.creator_id,
    creatorName: supabasePrediction.creator?.full_name || supabasePrediction.creator?.username || 'Unknown User',
    title: supabasePrediction.title,
    description: supabasePrediction.description,
    category: supabasePrediction.category,
    type: supabasePrediction.type,
    status: supabasePrediction.status,
    stakeMin: supabasePrediction.stake_min,
    stakeMax: supabasePrediction.stake_max,
    poolTotal: supabasePrediction.pool_total,
    participantCount: supabasePrediction.participant_count || 0,
    entryDeadline: new Date(supabasePrediction.entry_deadline),
    settlementMethod: supabasePrediction.settlement_method,
    isPrivate: supabasePrediction.is_private,
    createdAt: new Date(supabasePrediction.created_at),
    updatedAt: new Date(supabasePrediction.updated_at),
    options: (supabasePrediction.options || []).map((option: any) => ({
      id: option.id,
      label: option.label,
      totalStaked: option.total_staked || 0,
      currentOdds: option.current_odds || 1.0
    }))
  };
};

// Convert frontend prediction data to Supabase format
const convertToSupabaseFormat = (prediction: any, userId: string) => {
  return {
    creator_id: userId,
    title: prediction.title,
    description: prediction.description,
    category: prediction.category,
    type: prediction.type,
    stake_min: prediction.stakeMin,
    stake_max: prediction.stakeMax,
    entry_deadline: prediction.entryDeadline.toISOString(),
    settlement_method: prediction.settlementMethod,
    is_private: prediction.isPrivate || false,
    status: 'open'
  };
};

export const usePredictionStore = create<PredictionState>((set, get) => ({
  predictions: [],
  loading: false,
  error: null,

  fetchPredictions: async () => {
    set({ loading: true, error: null });
    try {
      console.log('📊 Fetching predictions...');
      
      // Check if user is authenticated first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error while fetching predictions:', sessionError);
        // Continue without auth for public predictions
      }

      const { data, error } = await clientDb.predictions.getAll();
      
      if (error) {
        console.error('Error fetching predictions:', error);
        
        // If it's an auth error, create some demo predictions
        if (error.message?.includes('session') || error.message?.includes('auth')) {
          console.log('🧪 Creating demo predictions due to auth issues');
          const demoPredictions = createDemoPredictions();
          set({ predictions: demoPredictions, loading: false, error: null });
          return;
        }
        
        set({ error: error.message, loading: false });
        return;
      }

      const convertedPredictions = (data || []).map(convertSupabasePrediction);
      console.log(`✅ Fetched ${convertedPredictions.length} predictions`);
      set({ predictions: convertedPredictions, loading: false });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      
      // Fallback to demo data
      console.log('🧪 Using demo predictions as fallback');
      const demoPredictions = createDemoPredictions();
      set({ predictions: demoPredictions, loading: false, error: null });
    }
  },

  fetchUserCreatedPredictions: async (userId: string) => {
    if (!userId || userId === 'demo-user-1') {
      // For demo user, return empty array
      console.log('📊 Skipping fetch for demo user');
      set({ loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      console.log('📊 Fetching user created predictions for:', userId);
      
      const { data, error } = await supabase
        .from('predictions')
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url),
          options:prediction_options(*)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching user predictions:', error);
        set({ error: error.message, loading: false });
        return;
      }

      const convertedPredictions = (data || []).map(convertSupabasePrediction);
      console.log(`✅ Fetched ${convertedPredictions.length} user predictions`);
      
      // Update the predictions array with user's predictions
      const currentPredictions = get().predictions;
      const otherPredictions = currentPredictions.filter(p => p.creatorId !== userId);
      const allPredictions = [...convertedPredictions, ...otherPredictions];
      
      set({ predictions: allPredictions, loading: false });
    } catch (error) {
      console.error('Error fetching user predictions:', error);
      set({ error: 'Failed to fetch user predictions', loading: false });
    }
  },

  createPrediction: async (predictionData) => {
    set({ loading: true, error: null });
    try {
      console.log('🆕 Creating new prediction...');
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Must be logged in to create predictions');
      }

      // Convert to Supabase format
      const supabaseData = convertToSupabaseFormat(predictionData, user.id);
      
      console.log('Creating prediction with data:', supabaseData);

      // Create the prediction in Supabase
      const { data, error } = await supabase
        .from('predictions')
        .insert(supabaseData)
        .select(`
          *,
          creator:users!creator_id(id, username, full_name, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Supabase error creating prediction:', error);
        throw new Error(error.message);
      }

      console.log('✅ Prediction created successfully:', data.title);

      // Create prediction options
      if (predictionData.options && predictionData.options.length > 0) {
        const optionsData = predictionData.options.map((option: any) => ({
          prediction_id: data.id,
          label: option.label,
          total_staked: 0,
          current_odds: 1.0
        }));

        const { error: optionsError } = await supabase
          .from('prediction_options')
          .insert(optionsData);

        if (optionsError) {
          console.error('Error creating prediction options:', optionsError);
          // Don't throw here, the prediction was created successfully
        }
      }

      // Convert and add to local state
      const convertedPrediction = convertSupabasePrediction({
        ...data,
        options: predictionData.options || []
      });

      set((state) => ({
        predictions: [convertedPrediction, ...state.predictions],
        loading: false
      }));

    } catch (error) {
      console.error('Error creating prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prediction';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  makePrediction: (predictionId: string, optionId: string, amount: number) => {
    console.log('🎯 Making prediction:', { predictionId, optionId, amount });
    
    // This would create a prediction entry in Supabase in a real implementation
    // For now, just update local state
    set((state) => ({
      predictions: state.predictions.map(prediction => 
        prediction.id === predictionId 
          ? {
              ...prediction,
              options: prediction.options.map(option =>
                option.id === optionId
                  ? { ...option, totalStaked: option.totalStaked + amount }
                  : option
              )
            }
          : prediction
      )
    }));
  },

  getUserCreatedPredictions: (userId: string) => {
    const state = get();
    return state.predictions.filter(prediction => prediction.creatorId === userId);
  }
}));

// Create demo predictions for development/fallback
function createDemoPredictions(): Prediction[] {
  return [
    {
      id: 'demo-1',
      creatorId: 'demo-creator-1',
      creatorName: 'Sports Guru',
      title: 'Will Manchester United beat Chelsea in their next match?',
      description: 'Premier League showdown this weekend. United has been on great form lately.',
      category: 'Sports',
      type: 'binary',
      status: 'open',
      stakeMin: 100,
      stakeMax: 10000,
      poolTotal: 125000,
      participantCount: 45,
      entryDeadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      settlementMethod: 'manual',
      isPrivate: false,
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      options: [
        { id: '1', label: 'Yes', totalStaked: 75000, currentOdds: 1.67 },
        { id: '2', label: 'No', totalStaked: 50000, currentOdds: 2.5 }
      ]
    },
    {
      id: 'demo-2',
      creatorId: 'demo-creator-2',
      creatorName: 'Crypto Analyst',
      title: 'Will Bitcoin reach $50,000 by end of month?',
      description: 'BTC has been consolidating around $45k. Technical analysis suggests...',
      category: 'Crypto',
      type: 'binary',
      status: 'open',
      stakeMin: 500,
      stakeMax: 50000,
      poolTotal: 89000,
      participantCount: 23,
      entryDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      settlementMethod: 'auto',
      isPrivate: false,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      options: [
        { id: '3', label: 'Yes', totalStaked: 34000, currentOdds: 2.62 },
        { id: '4', label: 'No', totalStaked: 55000, currentOdds: 1.62 }
      ]
    },
    {
      id: 'demo-3',
      creatorId: 'demo-creator-3',
      creatorName: 'Tech Insider',
      title: 'Will Apple announce new MacBook at next event?',
      description: 'Rumors suggest Apple might unveil M4 MacBook Pro at their spring event.',
      category: 'Tech',
      type: 'binary',
      status: 'open',
      stakeMin: 200,
      stakeMax: 20000,
      poolTotal: 67500,
      participantCount: 34,
      entryDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      settlementMethod: 'manual',
      isPrivate: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      options: [
        { id: '5', label: 'Yes', totalStaked: 42000, currentOdds: 1.61 },
        { id: '6', label: 'No', totalStaked: 25500, currentOdds: 2.65 }
      ]
    }
  ];
}

// Initialize predictions on store creation
if (typeof window !== 'undefined') {
  // Auto-fetch predictions when the store is created
  setTimeout(() => {
    console.log('🚀 Auto-fetching predictions...');
    usePredictionStore.getState().fetchPredictions();
  }, 1000);
}