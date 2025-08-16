import { create } from 'zustand';
import { supabase } from '../lib/supabase';
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

export interface ActivityItem {
  id: string;
  type: 'participant_joined' | 'prediction_placed' | 'multiple_participants';
  description: string;
  amount?: number;
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
  userPredictionEntries: any[];
  loading: boolean;
  error: string | null;
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
  getUserCreatedPredictions: (userId: string) => Prediction[];
  getUserPredictionEntries: (userId: string) => any[];
  createPrediction: (data: any) => Promise<Prediction>;
  placePrediction: (data: { predictionId: string; optionId: string; amount: number; userId: string }) => Promise<void>;
  updatePrediction: (predictionId: string, updates: any) => Promise<void>;
  deletePrediction: (predictionId: string) => Promise<void>;
  closePrediction: (predictionId: string) => Promise<void>;
  fetchPredictionActivity: (predictionId: string) => Promise<ActivityItem[]>;
  fetchPredictionParticipants: (predictionId: string) => Promise<Participant[]>;
  setSelectedCategory: (category: string | null) => void;
  clearError: () => void;
  getPredictionById: (id: string) => Prediction | null;
}

// Mock data for when database is empty
const mockPredictions: Prediction[] = [
  {
    id: '4b6592c9-e811-409d-8bbf-4da4f71fe261',
    creator_id: 'sample-user-1',
    title: 'Will Bitcoin reach $100,000 by end of 2025?',
    description: 'With Bitcoin\'s recent surge and institutional adoption, many experts predict it could hit the six-figure mark. What do you think?',
    category: 'custom',
    type: 'binary',
    status: 'open',
    stake_min: 1.00,
    stake_max: 1000.00,
    pool_total: 2547.50,
    entry_deadline: '2025-12-31T23:59:59Z',
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 3.5,
    platform_fee_percentage: 1.5,
    tags: ['crypto', 'bitcoin', 'investment'],
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      {
        id: 'opt-btc-yes',
        prediction_id: '4b6592c9-e811-409d-8bbf-4da4f71fe261',
        label: 'Yes, Bitcoin will reach $100K',
        total_staked: 1547.50,
        current_odds: 1.65,
        percentage: 60.8,
        totalStaked: 1547.50
      },
      {
        id: 'opt-btc-no',
        prediction_id: '4b6592c9-e811-409d-8bbf-4da4f71fe261',
        label: 'No, Bitcoin will stay below $100K',
        total_staked: 1000.00,
        current_odds: 2.55,
        percentage: 39.2,
        totalStaked: 1000.00
      }
    ],
    creator: {
      id: 'sample-user-1',
      username: 'fanclubz_creator',
      avatar_url: null,
      is_verified: true
    },
    participant_count: 42,
    likes_count: 67,
    comments_count: 23,
    // Compatibility aliases
    poolTotal: 2547.50,
    entryDeadline: '2025-12-31T23:59:59Z',
    entries: [],
    likes: 67,
    comments: 23
  },
  {
    id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
    creator_id: 'sample-user-1',
    title: 'Will Taylor Swift announce a new album in 2025?',
    description: 'Following her recent Eras Tour success, fans are speculating about her next musical project. Will she surprise us with a new album announcement this year?',
    category: 'pop_culture',
    type: 'binary',
    status: 'open',
    stake_min: 5.00,
    stake_max: 500.00,
    pool_total: 1823.25,
    entry_deadline: '2025-12-15T23:59:59Z',
    settlement_method: 'manual',
    is_private: false,
    creator_fee_percentage: 3.5,
    platform_fee_percentage: 1.5,
    tags: ['music', 'taylor-swift', 'entertainment'],
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      {
        id: 'opt-ts-yes',
        prediction_id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
        label: 'Yes, she will announce a new album',
        total_staked: 823.25,
        current_odds: 2.21,
        percentage: 45.2,
        totalStaked: 823.25
      },
      {
        id: 'opt-ts-no',
        prediction_id: 'a1b2c3d4-e5f6-7g8h-9i0j-1k2l3m4n5o6p',
        label: 'No, no new album announcement',
        total_staked: 1000.00,
        current_odds: 1.82,
        percentage: 54.8,
        totalStaked: 1000.00
      }
    ],
    creator: {
      id: 'sample-user-1',
      username: 'fanclubz_creator',
      avatar_url: null,
      is_verified: true
    },
    participant_count: 29,
    likes_count: 43,
    comments_count: 15,
    poolTotal: 1823.25,
    entryDeadline: '2025-12-15T23:59:59Z',
    entries: [],
    likes: 43,
    comments: 15
  },
  {
    id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
    creator_id: 'sample-user-1',
    title: 'Will the Lakers make the NBA playoffs this season?',
    description: 'With LeBron and AD leading the team, the Lakers are fighting for a playoff spot. Can they secure their position?',
    category: 'sports',
    type: 'binary',
    status: 'open',
    stake_min: 2.50,
    stake_max: 750.00,
    pool_total: 3241.75,
    entry_deadline: '2025-04-15T23:59:59Z',
    settlement_method: 'auto',
    is_private: false,
    creator_fee_percentage: 3.5,
    platform_fee_percentage: 1.5,
    tags: ['nba', 'lakers', 'basketball'],
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    options: [
      {
        id: 'opt-lakers-yes',
        prediction_id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
        label: 'Yes, Lakers will make playoffs',
        total_staked: 2041.75,
        current_odds: 1.59,
        percentage: 63.0,
        totalStaked: 2041.75
      },
      {
        id: 'opt-lakers-no',
        prediction_id: 'p1q2r3s4-t5u6-v7w8-x9y0-z1a2b3c4d5e6',
        label: 'No, Lakers will miss playoffs',
        total_staked: 1200.00,
        current_odds: 2.70,
        percentage: 37.0,
        totalStaked: 1200.00
      }
    ],
    creator: {
      id: 'sample-user-1',
      username: 'fanclubz_creator',
      avatar_url: null,
      is_verified: true
    },
    participant_count: 67,
    likes_count: 89,
    comments_count: 34,
    poolTotal: 3241.75,
    entryDeadline: '2025-04-15T23:59:59Z',
    entries: [],
    likes: 89,
    comments: 34
  }
];

// Mock activity data
const mockActivityData: ActivityItem[] = [
  {
    id: 'activity-1',
    type: 'prediction_placed',
    description: 'Large prediction placed by @crypto_trader',
    amount: 500,
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    timeAgo: '2 minutes ago'
  },
  {
    id: 'activity-2',
    type: 'multiple_participants',
    description: '3 new participants joined',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    timeAgo: '10 minutes ago'
  },
  {
    id: 'activity-3',
    type: 'participant_joined',
    description: '@sports_fan placed their first prediction',
    amount: 25,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    timeAgo: '30 minutes ago'
  },
  {
    id: 'activity-4',
    type: 'prediction_placed',
    description: 'Medium prediction placed by @taylor_superfan',
    amount: 150,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    timeAgo: '1 hour ago'
  }
];

// Mock participant data
const mockParticipantData: Participant[] = [
  {
    id: 'participant-1',
    username: 'alice_crypto',
    avatar_url: undefined,
    amount: 250,
    option: 'Yes',
    joinedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    timeAgo: '2 hours ago'
  },
  {
    id: 'participant-2',
    username: 'bob_trader',
    avatar_url: undefined,
    amount: 100,
    option: 'No',
    joinedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    timeAgo: '4 hours ago'
  },
  {
    id: 'participant-3',
    username: 'charlie_bet',
    avatar_url: undefined,
    amount: 75,
    option: 'Yes',
    joinedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    timeAgo: '6 hours ago'
  },
  {
    id: 'participant-4',
    username: 'diana_sports',
    avatar_url: undefined,
    amount: 200,
    option: 'No',
    joinedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    timeAgo: '8 hours ago'
  },
  {
    id: 'participant-5',
    username: 'eve_predictor',
    avatar_url: undefined,
    amount: 50,
    option: 'Yes',
    joinedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    timeAgo: '12 hours ago'
  }
];

// Cache duration: 2 minutes for better performance
const CACHE_DURATION = 2 * 60 * 1000;

export const usePredictionStore = create<PredictionState & PredictionActions>((set, get) => ({
  predictions: [],
  trendingPredictions: [],
  userPredictions: [],
  userCreatedPredictions: [],
  userPredictionEntries: [],
  loading: false,
  error: null,
  selectedCategory: null,
  lastFetch: 0,
  initialized: false,

  getPredictionById: (id: string) => {
    const state = get();
    // Try to find in current predictions first
    let prediction = state.predictions.find(p => p.id === id);
    
    // If not found and we don't have any predictions, try mock data
    if (!prediction && state.predictions.length === 0) {
      prediction = mockPredictions.find(p => p.id === id);
    }
    
    return prediction || null;
  },

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

      // If no predictions found in database, use mock data as fallback
      if (!predictions || predictions.length === 0) {
        console.log('📝 No predictions in database, using mock data as fallback');
        let fallbackPredictions = mockPredictions;
        
        // Filter by category if specified
        if (category && category !== 'all') {
          fallbackPredictions = mockPredictions.filter(p => p.category === category);
        }
        
        console.log('📋 Using mock fallback predictions:', fallbackPredictions.length);
        
        set({ 
          predictions: fallbackPredictions, 
          loading: false,
          lastFetch: now,
          initialized: true,
          error: null
        });
        
        return;
      }

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

      console.log('✅ Successfully transformed and set predictions:', transformedPredictions.length);
      
      set({ 
        predictions: transformedPredictions, 
        loading: false,
        lastFetch: now,
        initialized: true,
        error: null
      });

    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      
      // On error, try to use mock data as fallback
      console.log('📝 Using mock data as fallback due to fetch error');
      let fallbackPredictions = mockPredictions;
      
      if (category && category !== 'all') {
        fallbackPredictions = mockPredictions.filter(p => p.category === category);
      }
      
      set({ 
        predictions: fallbackPredictions,
        error: 'Using offline data', 
        loading: false,
        lastFetch: now,
        initialized: true
      });
    }
  },

  updatePrediction: async (predictionId: string, updates: any) => {
    try {
      console.log('🔄 Updating prediction:', predictionId, updates);
      
      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/${predictionId}`;
      
      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update prediction');
      }

      console.log('✅ Prediction updated successfully');
      
      // Refresh predictions
      await get().fetchPredictions(undefined, true);
      
    } catch (error) {
      console.error('❌ Error updating prediction:', error);
      throw error;
    }
  },

  deletePrediction: async (predictionId: string) => {
    try {
      console.log('🗑️ Deleting prediction:', predictionId);
      
      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/${predictionId}`;
      
      const response = await fetch(requestUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete prediction');
      }

      console.log('✅ Prediction deleted successfully');
      
      // Refresh predictions
      await get().fetchPredictions(undefined, true);
      
    } catch (error) {
      console.error('❌ Error deleting prediction:', error);
      throw error;
    }
  },

  closePrediction: async (predictionId: string) => {
    try {
      console.log('🔒 Closing prediction early:', predictionId);
      
      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/${predictionId}/close`;
      
      const response = await fetch(requestUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to close prediction');
      }

      console.log('✅ Prediction closed successfully');
      
      // Refresh predictions
      await get().fetchPredictions(undefined, true);
      
    } catch (error) {
      console.error('❌ Error closing prediction:', error);
      throw error;
    }
  },

  fetchPredictionActivity: async (predictionId: string): Promise<ActivityItem[]> => {
    try {
      console.log('📊 Fetching prediction activity for:', predictionId);
      
      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('⚠️ No auth session, using mock activity data');
        return mockActivityData;
      }

      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/${predictionId}/activity`;
      
      console.log('🌐 Making request to:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        console.log(`⚠️ API request failed with status ${response.status}, using mock data`);
        return mockActivityData;
      }

      const result = await response.json();
      const activities = result.data?.data || result.data || [];
      
      console.log('✅ Fetched prediction activity from API:', activities.length);
      return activities.length > 0 ? activities : mockActivityData;
      
    } catch (error) {
      console.error('❌ Error fetching prediction activity:', error);
      console.log('📝 Returning mock activity data as fallback');
      return mockActivityData;
    }
  },

  fetchPredictionParticipants: async (predictionId: string): Promise<Participant[]> => {
    try {
      console.log('👥 Fetching prediction participants for:', predictionId);
      
      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('⚠️ No auth session, using mock participant data');
        return mockParticipantData;
      }

      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/${predictionId}/entries`;
      
      console.log('🌐 Making request to:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        console.log(`⚠️ API request failed with status ${response.status}, using mock data`);
        return mockParticipantData;
      }

      const result = await response.json();
      const participants = result.data?.data || result.data || [];
      
      console.log('✅ Fetched prediction participants from API:', participants.length);
      return participants.length > 0 ? participants : mockParticipantData;
      
    } catch (error) {
      console.error('❌ Error fetching prediction participants:', error);
      console.log('📝 Returning mock participant data as fallback');
      return mockParticipantData;
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

      // If no data, use mock trending data
      if (!trendingPredictions || trendingPredictions.length === 0) {
        const mockTrending = mockPredictions.slice(0, 3);
        set({ trendingPredictions: mockTrending });
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
      // Fallback to mock data
      const mockTrending = mockPredictions.slice(0, 3);
      set({ trendingPredictions: mockTrending });
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

      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Use the server API endpoint to get real data from database
      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/created/me`;
      
      console.log('🌐 Making request to:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const userCreatedPredictions = result.data || [];

      // Transform data to match our interface
      const transformedPredictions = userCreatedPredictions.map((pred: any) => ({
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

      console.log('✅ Successfully fetched user created predictions from API:', transformedPredictions.length);

    } catch (error) {
      console.error('❌ Error fetching user created predictions from API:', error);
      
      // Fallback to Supabase query if API fails
      try {
        console.log('🔄 Falling back to Supabase query...');
        
        const { data: userCreatedPredictions, error: supabaseError } = await supabase
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

        if (supabaseError) {
          throw supabaseError;
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

        console.log('✅ Successfully fetched user created predictions from Supabase fallback:', transformedPredictions.length);
        
      } catch (fallbackError) {
        console.error('❌ Error in Supabase fallback:', fallbackError);
        set({ 
          loading: false,
          error: 'Failed to fetch user created predictions',
          userCreatedPredictions: [] // Set empty array on error
        });
      }
    }
  },

  getUserCreatedPredictions: (userId: string) => {
    const state = get();
    return state.userCreatedPredictions || [];
  },

  getUserPredictionEntries: (userId: string) => {
    const state = get();
    return state.userPredictionEntries || [];
  },

  fetchUserPredictionEntries: async (userId: string) => {
    try {
      console.log('📡 Fetching user prediction entries for:', userId);

      // Get the auth session for API calls
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Use the server API endpoint to get real data
      const apiUrl = getApiUrl();
      const requestUrl = `${apiUrl}/api/predictions/entries/me`;
      
      console.log('🌐 Making request to:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const userPredictionEntries = result.data || [];

      set({
        userPredictionEntries,
        error: null
      });

      console.log('✅ Successfully fetched user prediction entries from API:', userPredictionEntries.length);

    } catch (error) {
      console.error('❌ Error fetching user prediction entries:', error);
      
      // Fallback to empty array on error
      set({ 
        userPredictionEntries: [],
        error: 'Failed to fetch user prediction entries'
      });
    }
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

      // Force refresh predictions - important: fetch user created predictions first
      await get().fetchUserCreatedPredictions(user.id);
      await get().fetchPredictions(undefined, true);
      await get().fetchUserPredictions();

      set({ loading: false });
      return result.data || result;
      
    } catch (error) {
      console.error('❌ Failed to create prediction:', error);
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
