import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useLikeStore } from './likeStore';
import { useAuthStore } from './authStore';

// Utility function to get API URL
const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'https://fan-club-z.onrender.com';
};

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

interface PredictionState {
  predictions: Prediction[];
  trendingPredictions: Prediction[];
  userPredictions: Prediction[];
  userCreatedPredictions: Prediction[];
  predictionEntries: PredictionEntry[];
  loading: boolean;
  error: string | null;
  // No pagination - keep it simple
  selectedCategory: string | null;
  lastFetch: number;
  initialized: boolean;
}

interface PredictionActions {
  fetchPredictions: (category?: string, force?: boolean) => Promise<void>;
  refreshPredictions: (force?: boolean) => Promise<void>;
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: () => Promise<void>;
  fetchUserCreatedPredictions: (userId: string) => Promise<void>;
  fetchUserPredictionEntries: (userId: string) => Promise<void>;
  fetchPredictionActivity: (predictionId: string) => Promise<ActivityItem[]>;
  fetchPredictionParticipants: (predictionId: string) => Promise<Participant[]>;
  getUserCreatedPredictions: (userId: string) => Prediction[];
  getUserPredictionEntries: (userId: string) => PredictionEntry[];
  createPrediction: (data: any) => Promise<Prediction>;
  updatePrediction: (id: string, data: any) => Promise<Prediction>;
  closePrediction: (id: string) => Promise<Prediction>;
  deletePrediction: (id: string) => Promise<void>;
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
  predictionEntries: [],
  loading: false,
  error: null,
  // No pagination state
  selectedCategory: null,
  lastFetch: 0,
  initialized: false,

  getPredictionById: (id: string) => {
    const state = get();
    // Try to find in current predictions first
    let prediction = state.predictions.find(p => p.id === id);
    

    
    return prediction || null;
  },

  // Added refreshPredictions method
  refreshPredictions: async (force = false) => {
    console.log('🔄 refreshPredictions called with force:', force);
    const state = get();
    console.log('📊 Current state before refresh:', {
      predictionsCount: state.predictions?.length || 0,
      loading: state.loading,
      initialized: state.initialized,
      lastFetch: state.lastFetch,
      selectedCategory: state.selectedCategory
    });
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
    
    // Initialize like store if not already done
    try {
      const likeStore = useLikeStore.getState();
      if (!likeStore.likeCounts || Object.keys(likeStore.likeCounts).length === 0) {
        console.log('🔄 Initializing like store before fetching predictions...');
        await likeStore.initializeLikes();
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize like store:', error);
    }
    
    try {
      console.log('📡 Fetching predictions from server API...');
      const apiUrl = getApiUrl();
      console.log('🔧 API URL:', apiUrl);
      
      // Import comment store to sync counts
      let commentStore: any = null;
      try {
        commentStore = await import('./unifiedCommentStore').then(m => m.useUnifiedCommentStore.getState());
      } catch (error) {
        console.warn('⚠️ Could not import comment store:', error);
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      if (category && category !== 'all') {
        params.append('category', category);
      }
      
      const url = `${apiUrl}/api/v2/predictions?${params.toString()}`;
      console.log('🔍 Fetching from:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('🔍 Response received');
      console.log('🔍 Response structure:', responseData);
      
      // Extract predictions from the response structure
      const data = responseData.data || [];
      console.log('🔍 Data length:', data?.length || 0);
      console.log('🔍 Raw API predictions:', data);

      // If no predictions found in API, set empty array
      if (!data || data.length === 0) {
        console.log('📝 No predictions found in API');
        set({ 
          predictions: [], 
          loading: false,
          lastFetch: now,
          initialized: true,
          error: null
        });
        return;
      }

      // Transform data to match our interface with compatibility properties
      const transformedPredictions = (data || []).map((pred: any) => {
        // Get real-time like count from like store
        const likeStore = useLikeStore.getState();
        const currentLikeCount = likeStore.getLikeCount(pred.id) || pred.likes_count || 0;
        
        // Get comment count from comment store if available
        const currentCommentCount = commentStore ? 
          commentStore.getCommentCount(pred.id) : 
          (pred.comments_count || 0);
        
        return {
          id: pred.id,
          creator_id: pred.creator_id,
          title: pred.title,
          description: pred.description,
          category: pred.category,
          type: pred.type,
          status: pred.status as 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled',
          stake_min: pred.stake_min,
          stake_max: pred.stake_max,
          pool_total: pred.pool_total,
          entry_deadline: pred.entry_deadline,
          settlement_method: pred.settlement_method,
          is_private: pred.is_private,
          creator_fee_percentage: pred.creator_fee_percentage,
          platform_fee_percentage: pred.platform_fee_percentage,
          club_id: pred.club_id,
          image_url: pred.image_url,
          tags: pred.tags || [],
          created_at: pred.created_at,
          updated_at: pred.updated_at,
          participant_count: pred.participant_count || 0,
          likes_count: currentLikeCount,
          comments_count: currentCommentCount,
          user_entry: pred.user_entry,
          // Compatibility aliases
          poolTotal: pred.pool_total,
          entryDeadline: pred.entry_deadline,
          entries: [], // Mock data for now
          likes: currentLikeCount,
          comments: currentCommentCount,
          
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
            id: opt.id,
            prediction_id: opt.prediction_id,
            label: opt.label,
            total_staked: opt.total_staked,
            current_odds: opt.current_odds,
            percentage: opt.percentage,
            totalStaked: opt.total_staked, // Compatibility alias
          }))
        } as Prediction;
      });

      console.log('✅ Successfully transformed and set predictions:', transformedPredictions.length);
      
      set({ 
        predictions: transformedPredictions as Prediction[], 
        loading: false,
        lastFetch: now,
        initialized: true,
        error: null
      });
      
      // Initialize comment counts in comment store
      if (commentStore && transformedPredictions.length > 0) {
        const commentCounts: Record<string, number> = {};
        transformedPredictions.forEach(pred => {
          commentCounts[pred.id] = pred.comments_count;
        });
        console.log('🔄 Syncing comment counts to comment store:', commentCounts);
        commentStore.initializeCommentCounts(commentCounts);
      }
      
      // Verify state was set correctly
      const newState = get();
      console.log('📊 State after setting predictions:', {
        predictionsCount: newState.predictions?.length || 0,
        loading: newState.loading,
        initialized: newState.initialized
      });

    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      
      // On error, set empty array (no mock data fallback)
      console.log('📝 Error fetching predictions, setting empty array');
      
      set({ 
        predictions: [],
        error: 'Failed to fetch predictions', 
        loading: false,
        lastFetch: now,
        initialized: true
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

      // If no data, set empty array
      if (!trendingPredictions || trendingPredictions.length === 0) {
        set({ trendingPredictions: [] });
        return;
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
      set({ trendingPredictions: [], error: 'Failed to fetch trending predictions' });
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
    set({ loading: true, error: null });
    
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

      // Transform data to match our interface
      const transformedPredictions = (userCreatedPredictions || []).map((pred: any) => ({
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

      set({
        userCreatedPredictions: transformedPredictions,
        loading: false,
        error: null
      });

      console.log('✅ Successfully fetched user created predictions:', transformedPredictions.length);

    } catch (error) {
      console.error('❌ Error fetching user created predictions:', error);
      set({ 
        loading: false,
        error: 'Failed to fetch user created predictions',
        userCreatedPredictions: [] // Set empty array on error
      });
    }
  },

  fetchUserPredictionEntries: async (userId: string) => {
    try {
      console.log('📡 Fetching user prediction entries for:', userId);

      const { data: entries, error } = await supabase
        .from('prediction_entries')
        .select(`
          *,
          prediction:predictions(
            id,
            title,
            status,
            entry_deadline,
            creator:users!creator_id(username, avatar_url)
          ),
          option:prediction_options(id, label)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      set({ predictionEntries: entries || [] });

    } catch (error) {
      console.error('❌ Error fetching user prediction entries:', error);
      set({ predictionEntries: [] });
    }
  },

  fetchPredictionActivity: async (predictionId: string): Promise<ActivityItem[]> => {
    try {
      const apiUrl = getApiUrl();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${apiUrl}/api/predictions/${predictionId}/activity`, {
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }

      const result = await response.json();
      return result.data?.data || [];
    } catch (error) {
      console.error('❌ Error fetching prediction activity:', error);
      // Return mock activity data
      return [
        {
          id: '1',
          type: 'participant_joined',
          description: 'New participant joined',
          amount: 75,
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          timeAgo: '2 minutes ago'
        },
        {
          id: '2',
          type: 'prediction_placed',
          description: 'Large prediction placed',
          amount: 200,
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          timeAgo: '15 minutes ago'
        }
      ];
    }
  },

  fetchPredictionParticipants: async (predictionId: string): Promise<Participant[]> => {
    try {
      const apiUrl = getApiUrl();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${apiUrl}/api/predictions/${predictionId}/entries`, {
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }

      const result = await response.json();
      return result.data?.data || [];
    } catch (error) {
      console.error('❌ Error fetching prediction participants:', error);
      // Return mock participants data
      return [
        {
          id: '1',
          username: 'alice_trader',
          avatar_url: undefined,
          amount: 150,
          option: 'Yes',
          joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2 hours ago'
        },
        {
          id: '2',
          username: 'bet_master',
          avatar_url: undefined,
          amount: 200,
          option: 'No',
          joinedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          timeAgo: '4 hours ago'
        }
      ];
    }
  },

  getUserCreatedPredictions: (userId: string) => {
    const state = get();
    return state.userCreatedPredictions || [];
  },

  getUserPredictionEntries: (userId: string) => {
    const state = get();
    return state.predictionEntries || [];
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

      console.log('🎯 Creating prediction with validated data:', data);

      // Ensure stake values are properly converted to USD
      const stakeMin = Number(data.stakeMin) || 1;
      const stakeMax = data.stakeMax ? Number(data.stakeMax) : null;

      if (stakeMin < 1) {
        throw new Error('Minimum stake must be at least $1');
      }

      if (stakeMax && stakeMax < stakeMin) {
        throw new Error('Maximum stake must be greater than minimum stake');
      }

      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Prepare prediction payload for API
      const predictionPayload = {
        title: data.title,
        description: data.description || null,
        category: data.category,
        type: data.type === 'multiple' ? 'multi_outcome' : 'binary',
        stake_min: stakeMin,
        stake_max: stakeMax,
        entry_deadline: deadline.toISOString(),
        settlement_method: data.settlementMethod,
        is_private: data.isPrivate || false,
        options: data.options
          .filter((opt: any) => opt.label && opt.label.trim())
          .map((option: any) => ({
            label: option.label.trim()
          }))
      };

      console.log('📡 Sending prediction to API:', predictionPayload);

      // Use the server API endpoint instead of direct Supabase calls
      // In development, this will be proxied by Vite to the server on port 3001
      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions`;
      
      console.log('🌐 Making request to:', requestUrl);
      console.log('📦 Request payload:', JSON.stringify(predictionPayload, null, 2));
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(predictionPayload)
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      let result;
      const responseText = await response.text();
      console.log('📄 Raw response:', responseText.substring(0, 500));
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        console.error('📄 Raw response text:', responseText);
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('❌ API error creating prediction:', result);
        throw new Error(result.error || result.message || 'Failed to create prediction');
      }

      console.log('✅ Prediction created successfully via API:', result);

      // Force refresh predictions
      await get().fetchPredictions(undefined, true);
      await get().fetchUserPredictions();
      await get().fetchUserCreatedPredictions(user.id);

      set({ loading: false });
      return result.data || result;
      
    } catch (error) {
      console.error('❌ Failed to create prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prediction';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  updatePrediction: async (id: string, data: any) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/predictions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update prediction');
      }

      const result = await response.json();
      
      // Update local state
      const state = get();
      const updatedPredictions = state.predictions.map(p => 
        p.id === id ? { ...p, ...result.data } : p
      );
      const updatedUserCreated = state.userCreatedPredictions.map(p => 
        p.id === id ? { ...p, ...result.data } : p
      );
      
      set({ 
        predictions: updatedPredictions,
        userCreatedPredictions: updatedUserCreated,
        loading: false 
      });

      return result.data;
    } catch (error) {
      console.error('❌ Failed to update prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update prediction';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  closePrediction: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/predictions/${id}/close`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to close prediction');
      }

      const result = await response.json();
      
      // Update local state
      const state = get();
      const updatedPredictions = state.predictions.map(p => 
        p.id === id ? { ...p, status: 'closed' as const } : p
      );
      const updatedUserCreated = state.userCreatedPredictions.map(p => 
        p.id === id ? { ...p, status: 'closed' as const } : p
      );
      
      set({ 
        predictions: updatedPredictions,
        userCreatedPredictions: updatedUserCreated,
        loading: false 
      });

      return result.data;
    } catch (error) {
      console.error('❌ Failed to close prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to close prediction';
      set({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    }
  },

  deletePrediction: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/predictions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete prediction');
      }
      
      // Remove from local state
      const state = get();
      const updatedPredictions = state.predictions.filter(p => p.id !== id);
      const updatedUserCreated = state.userCreatedPredictions.filter(p => p.id !== id);
      
      set({ 
        predictions: updatedPredictions,
        userCreatedPredictions: updatedUserCreated,
        loading: false 
      });

    } catch (error) {
      console.error('❌ Failed to delete prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete prediction';
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
      // In development, this will be proxied by Vite to the server on port 3001
      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/${data.predictionId}/entries`;
      const requestPayload = {
        option_id: data.optionId,
        amount: data.amount
      };
      
      console.log('🌐 Making request to:', requestUrl);
      console.log('📦 Request payload:', JSON.stringify(requestPayload, null, 2));
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      let result;
      const responseText = await response.text();
      console.log('📄 Raw response:', responseText.substring(0, 500));
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        console.error('📄 Raw response text:', responseText);
        throw new Error(`Invalid response from server: ${responseText.substring(0, 200)}`);
      }

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
