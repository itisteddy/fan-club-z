import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { getApiUrl } from '../config';
import { useAuthStore } from './authStore';
import { apiClient } from '../lib/apiUtils';
import { getAuthHeaders } from '../lib/api';
import { useFundingModeStore } from './fundingModeStore';
import type { CategorySlug } from '@/constants/categories';

/** User-facing error messages for place-bet responses (no generic "Failed to create entry"). */
function placeBetErrorFromResponse(status: number, errorData: Record<string, unknown>): string {
  if (status === 401 || (errorData as any).code === 'FCZ_AUTH_REQUIRED') {
    return 'Session expired. Sign in again.';
  }
  if (status === 409 || (errorData as any).code === 'FCZ_DUPLICATE_BET') {
    return 'You already placed a stake on this prediction.';
  }
  if (status === 403 || (errorData as any).code === 'FCZ_FORBIDDEN') {
    // Prefer server message for gated flows (e.g., crypto disabled for this client)
    const err = (errorData as any)?.error;
    const msg = typeof (errorData as any)?.message === 'string' ? String((errorData as any).message) : '';
    if (err === 'crypto_disabled_for_client' || msg.toLowerCase().includes('crypto is not available')) {
      return 'Crypto staking isn’t available on this device right now. Switch to Demo Credits.';
    }
    if (err === 'BETTING_DISABLED') {
      return 'Betting is temporarily unavailable. Please try again later.';
    }
    return msg || "You don't have permission to place this bet.";
  }
  if (status === 400) {
    return typeof (errorData as any).message === 'string' ? (errorData as any).message : 'Invalid stake or option.';
  }
  if (status >= 500) {
    return 'Something went wrong. Try again.';
  }
  return typeof (errorData as any).message === 'string' ? (errorData as any).message : 'Unable to place bet. Please try again.';
}

// ---- Idempotency helpers for bet placement ----
function computeBetKey(userId: string | undefined, predictionId: string, optionId: string, amount: number) {
  return `bet:${userId || 'anon'}:${predictionId}:${optionId}:${amount}`;
}

function getOrCreateRequestId(compositeKey: string, ttlMs = 2 * 60 * 1000): string {
  try {
    const raw = sessionStorage.getItem(compositeKey);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; ts: number };
      if (parsed && parsed.id && now - parsed.ts < ttlMs) {
        return parsed.id;
      }
    }
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : `${now}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(compositeKey, JSON.stringify({ id, ts: now }));
    return id;
  } catch {
    // Fallback if storage fails
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export interface Prediction {
  id: string;
  creator_id: string;
  title: string;
  question?: string;
  description?: string;
  category: CategorySlug | string;
  type: 'binary' | 'multi_outcome' | 'pool';
  status: 'pending' | 'open' | 'closed' | 'settled' | 'disputed' | 'cancelled' | 'awaiting_settlement' | 'ended' | 'refunded';
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
  stakeMin: number;
  settlementMethod: 'auto' | 'manual';
  participantCount: number;
  likeCount: number;
  commentCount: number;
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
  settledAt?: string;
  settled_at?: string;
  participants?: number;
  settlement_criteria?: string;
  total_volume?: number;
}

export interface PredictionOption {
  id: string;
  prediction_id: string;
  label: string;
  total_staked: number;
  current_odds: number;
  percentage: number;
  totalStaked?: number; // Compatibility alias
  currentOdds?: number; // Compatibility alias
  title?: string;
  text?: string;
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
  selected_option?: string;
  odds?: number;
  prediction?: Partial<Prediction> & { question?: string; title?: string };
  option?: { id?: string; label?: string };
  metadata?: Record<string, unknown>;
}

export interface ActivityItem {
  id: string;
  type: 'participant_joined' | 'prediction_placed' | 'multiple_participants';
  description: string;
  amount?: number;
  participantCount?: number;
  timestamp: string;
  timeAgo: string;
  kind?: 'deposit' | 'withdraw' | 'lock' | 'unlock' | 'bet_refund' | 'payout' | 'creator_fee' | 'platform_fee' | 'entry' | 'release' | 'claim';
  createdAt?: string;
  txHash?: string;
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

type OptionLike = Partial<PredictionOption> & Record<string, any>;
type PredictionLike = Partial<Prediction> & Record<string, any>;

const normalizePredictionOption = (option: OptionLike = {}): PredictionOption => {
  const totalStaked = option.totalStaked ?? option.total_staked ?? 0;
  const currentOdds = option.currentOdds ?? option.current_odds ?? option.odds ?? 1;

  return {
    id: option.id ?? '',
    prediction_id: option.prediction_id ?? option.predictionId ?? '',
    label: option.label ?? option.text ?? 'Option',
    total_staked: option.total_staked ?? totalStaked,
    current_odds: option.current_odds ?? currentOdds,
    percentage: option.percentage ?? option.share ?? 0,
    totalStaked,
    currentOdds,
  };
};

const normalizePrediction = (prediction: PredictionLike = {}): Prediction => {
  const options = Array.isArray(prediction.options)
    ? prediction.options.map(normalizePredictionOption)
    : [];

  const poolTotal = prediction.pool_total ?? prediction.poolTotal ?? prediction.totalPool ?? 0;
  const stakeMin = prediction.stake_min ?? prediction.stakeMin ?? prediction.minimum_stake ?? 0;
  const entryDeadline = prediction.entry_deadline ?? prediction.entryDeadline ?? prediction.deadline;
  const settlementMethod = prediction.settlement_method ?? prediction.settlementMethod ?? 'manual';
  const participantCount =
    prediction.participant_count ??
    prediction.participantCount ??
    prediction.participants ??
    0;
  const likeCount =
    prediction.likes_count ??
    prediction.likeCount ??
    (Array.isArray((prediction as any).likes) ? (prediction as any).likes.length : Number((prediction as any).likes ?? 0));
  const commentCount =
    prediction.comments_count ??
    prediction.commentCount ??
    (Array.isArray((prediction as any).comments)
      ? (prediction as any).comments.length
      : Number((prediction as any).comments ?? 0));

  return {
    ...prediction,
    options,
    pool_total: prediction.pool_total ?? poolTotal,
    poolTotal,
    stake_min: prediction.stake_min ?? stakeMin,
    stakeMin,
    entry_deadline: prediction.entry_deadline ?? entryDeadline,
    entryDeadline,
    settlement_method: prediction.settlement_method ?? settlementMethod,
    settlementMethod,
    participant_count: prediction.participant_count ?? participantCount,
    participantCount,
    likes_count: prediction.likes_count ?? likeCount,
    likeCount,
    comments_count: prediction.comments_count ?? commentCount,
    commentCount,
  } as Prediction;
};

const normalizePredictions = (items: PredictionLike[] = []): Prediction[] =>
  items.map(normalizePrediction);

interface PredictionState {
  predictions: Prediction[];
  trendingPredictions: Prediction[];
  userPredictions: Prediction[];
  createdPredictions: Prediction[];
  completedPredictions: Prediction[];
  userPredictionEntries: PredictionEntry[];
  userCreatedPredictions: Prediction[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  initialized: boolean;
  lastFetchTime: number;
  platformStats: PlatformStats | null;
  statsLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    category: string;
    search: string;
  };
  // Prevent duplicate concurrent bet submissions per composite key
  inFlightBets?: Record<string, boolean>;
}

interface PredictionActions {
  // Core prediction actions
  fetchPredictions: (params?: { page?: number; category?: string; search?: string; append?: boolean }) => Promise<void>;
  loadMorePredictions: () => Promise<void>;
  refreshPredictions: (force?: boolean) => Promise<void>; // Added this method
  setFilters: (filters: Partial<{ category: string; search: string }>) => void;
  resetPagination: () => void;
  fetchTrendingPredictions: () => Promise<void>;
  fetchUserPredictions: (userId: string) => Promise<void>;
  fetchCreatedPredictions: (userId: string) => Promise<void>;
  fetchPredictionById: (id: string) => Promise<Prediction | null>;
  createPrediction: (predictionData: any) => Promise<Prediction>;
  placePrediction: (predictionId: string, optionId: string, amount: number, userId?: string, walletAddress?: string | null) => Promise<void>;
  placeFiatPrediction: (predictionId: string, optionId: string, amountNgn: number, userId: string) => Promise<void>;
  
  // User-specific data fetching
  fetchUserPredictionEntries: (userId: string) => Promise<void>;
  fetchUserCreatedPredictions: (userId: string) => Promise<void>;
  fetchCompletedPredictions: (userId: string) => Promise<void>;

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
  loadingMore: false,
  error: null,
  initialized: false,
  lastFetchTime: 0,
  platformStats: null,
  statsLoading: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasNext: false,
    hasPrev: false,
  },
  filters: {
    category: 'all',
    search: '',
  },
  inFlightBets: {},
};

export const usePredictionStore = create<PredictionState & PredictionActions>((set, get) => ({
  ...initialState,

  fetchPredictions: async (params = {}) => {
    const { 
      page = 1, 
      category = get().filters.category, 
      search = get().filters.search, 
      append = false 
    } = params;
    
    const currentTime = Date.now();
    const { lastFetchTime, predictions: currentPredictions } = get();
    
    // Cache for 30 seconds for first page only
    if (!append && page === 1 && currentTime - lastFetchTime < 30000 && currentPredictions.length > 0) {
      console.log('📋 Using cached predictions');
      return;
    }
    
    const isLoadingMore = append && page > 1;
    set({ 
      [isLoadingMore ? 'loadingMore' : 'loading']: true, 
      error: null 
    });
    
    try {
      console.log(`📡 Fetching predictions: page=${page}, category=${category}, search=${search}, append=${append}`);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(category !== 'all' && { category }),
        ...(search.trim() && { search: search.trim() })
      });
      
      const data = await apiClient.get(`/api/v2/predictions?${queryParams}`, {
        timeout: 10000,
        retryOptions: { maxRetries: 3 }
      });

      const newPredictions = normalizePredictions(data.data || []);
      const pagination = data.pagination || {};
      
      console.log(`✅ Predictions fetched successfully: ${newPredictions.length} items (${pagination.total} total)`);

      set(state => ({ 
        predictions: append ? [...state.predictions, ...newPredictions] : newPredictions,
        loading: false,
        loadingMore: false,
        error: null,
        initialized: true,
        lastFetchTime: currentTime,
        pagination: {
          page: pagination.page || page,
          limit: pagination.limit || 20,
          total: pagination.total || 0,
          hasNext: pagination.hasNext || false,
          hasPrev: pagination.hasPrev || false,
        },
        filters: { category, search }
      }));

    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      set({
        loading: false,
        loadingMore: false,
        error: error instanceof Error ? error.message : 'Failed to fetch predictions',
        // Don't clear predictions on error, keep existing data
      });
    }
  },

  // Load more predictions for infinite scroll
  loadMorePredictions: async () => {
    const { pagination, loadingMore } = get();
    
    if (loadingMore || !pagination.hasNext) {
      console.log('📋 Load more skipped:', { loadingMore, hasNext: pagination.hasNext });
      return;
    }
    
    console.log(`📋 Loading more predictions: page ${pagination.page + 1}`);
    await get().fetchPredictions({ 
      page: pagination.page + 1, 
      append: true 
    });
  },

  // Set filters and reset pagination
  setFilters: (newFilters) => {
    const currentFilters = get().filters;
    const updatedFilters = { ...currentFilters, ...newFilters };
    
    console.log('🔍 Setting filters:', updatedFilters);
    
    set(state => ({
      filters: updatedFilters,
      pagination: { ...state.pagination, page: 1 },
      predictions: [] // Clear current predictions
    }));
    
    // Fetch with new filters
    get().fetchPredictions({ 
      category: updatedFilters.category, 
      search: updatedFilters.search 
    });
  },

  // Reset pagination to initial state
  resetPagination: () => {
    console.log('🔄 Resetting pagination');
    set(state => ({
      pagination: { ...initialState.pagination },
      filters: { ...initialState.filters },
      predictions: []
    }));
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
    
    // Reset to first page and fetch
    set(state => ({
      lastFetchTime: 0,
      pagination: { ...state.pagination, page: 1 },
      predictions: []
    }));
    
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
      const trendingPredictions = normalizePredictions(data.data || []);
      
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
      const userPredictions = normalizePredictions(data.data || []);
      
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
      const createdPredictions = normalizePredictions(data.data || []);

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

  fetchPredictionById: async (id: string) => {
    try {
      console.log(`🔍 Fetching prediction by ID: ${id}`);
      const { predictions } = get();
      const existing = predictions.find(p => p.id === id) || null;

      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${id}`);

      if (!response.ok) {
        // Suppress 404 errors for archived/deleted predictions
        if (response.status === 404) {
          console.log(`ℹ️ Prediction ${id} not found (archived or deleted)`);
        } else {
          console.error(`❌ Failed to fetch prediction ${id}:`, response.status);
        }
        return existing;
      }

      const data = await response.json();
      const freshPrediction = normalizePrediction(data.data);

      if (!freshPrediction) {
        return existing;
      }

      console.log('✅ Fetched prediction from API:', freshPrediction.title);
      console.log('🔍 Prediction options:', freshPrediction.options?.length || 0);

      set(state => {
        const merge = (pred: any) =>
          pred.id === id ? { ...pred, ...freshPrediction } : pred;

        const ensurePredictionList = (list: any[]) =>
          list.some(pred => pred.id === id)
            ? list.map(merge)
            : [...list, freshPrediction];

        return {
          predictions: ensurePredictionList(state.predictions),
          userPredictions: state.userPredictions.map(merge),
          createdPredictions: state.createdPredictions.map(merge),
          userCreatedPredictions: state.userCreatedPredictions.map(merge),
          trendingPredictions: state.trendingPredictions.map(merge),
          completedPredictions: state.completedPredictions.map(merge),
        };
      });

      return freshPrediction;
    } catch (error) {
      // Suppress console errors for network issues (likely 404s for archived predictions)
      console.log(`ℹ️ Could not fetch prediction ${id}`);
      const { predictions } = get();
      return predictions.find(p => p.id === id) || null;
    }
  },

  createPrediction: async (predictionData: any) => {
    set({ loading: true, error: null });
    
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${getApiUrl()}/api/v2/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(predictionData),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (response.status === 401 || (errorData as any).code === 'FCZ_AUTH_REQUIRED') {
          // Keep auth state consistent: force logout on auth-required responses.
          void useAuthStore.getState().logout();
        }
        throw new Error((errorData as any)?.message || `Failed to create prediction: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data) {
        throw new Error('Invalid response: no prediction data returned');
      }
      
      const newPrediction = normalizePrediction(data.data);

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

  placePrediction: async (predictionId: string, optionId: string, amount: number, userId?: string, walletAddress?: string | null) => {
    set({ loading: true, error: null });
    
    try {
      const FLAG_BASE_BETS = import.meta.env.VITE_FCZ_BASE_BETS === '1' || 
                              import.meta.env.ENABLE_BASE_BETS === '1' ||
                              import.meta.env.FCZ_ENABLE_BASE_BETS === '1' ||
                              import.meta.env.VITE_FCZ_BASE_ENABLE === '1';
      const funding = useFundingModeStore.getState();
      const selectedMode = funding.mode;
      const isCryptoMode = selectedMode === 'crypto';
      const isFiatMode = selectedMode === 'fiat' && funding.isFiatEnabled;

      console.log('[FCZ-BET] mode detection', { FLAG_BASE_BETS, selectedMode, isCryptoMode, predictionId, optionId, amount, userId });

      // FIAT MODE: Use unified endpoint with fundingMode='fiat' and amountNgn
      if (isFiatMode) {
        console.log('[FCZ-BET] Placing bet via unified endpoint (fiat)...', { predictionId, optionId, amountNgn: amount, userId });

        const compositeKey = computeBetKey(userId, predictionId, optionId, amount);
        const inFlight = get().inFlightBets || {};
        if (inFlight[compositeKey]) {
          console.log('[FCZ-BET] Duplicate click prevented (in-flight):', compositeKey);
          set({ loading: false });
          return;
        }
        set(state => ({ inFlightBets: { ...(state.inFlightBets || {}), [compositeKey]: true } }));
        const requestId = getOrCreateRequestId(compositeKey);

        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${getApiUrl()}/api/predictions/${predictionId}/place-bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            optionId,
            amountNgn: amount,
            userId,
            fundingMode: 'fiat',
            requestId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
          if (response.status === 401 || (errorData as any).code === 'FCZ_AUTH_REQUIRED') {
            void useAuthStore.getState().logout();
          }
          if (errorData.error === 'INSUFFICIENT_FUNDS') {
            throw new Error('Insufficient fiat balance. Please deposit more NGN.');
          }
          if (errorData.error === 'FIAT_DISABLED') {
            throw new Error('Fiat betting is currently disabled.');
          }
          if (errorData.error === 'BETTING_DISABLED') {
            throw new Error('Betting is temporarily unavailable. Please try again later.');
          }
          throw new Error(placeBetErrorFromResponse(response.status, errorData));
        }

        const result = await response.json();
        console.log('[FCZ-BET] Fiat bet placed successfully:', result);

        const updatedPrediction = result?.data?.prediction;
        const newEntry = result?.data?.entry;

        set(state => {
          const mergePrediction = (pred: any) => {
            if (!pred || pred.id !== predictionId) return pred;
            return updatedPrediction ? { ...pred, ...updatedPrediction } : pred;
          };

          return {
            predictions: state.predictions.map(mergePrediction),
            userPredictions: state.userPredictions.map(mergePrediction),
            createdPredictions: state.createdPredictions.map(mergePrediction),
            userCreatedPredictions: state.userCreatedPredictions.map(mergePrediction),
            userPredictionEntries: newEntry
              ? [
                  ...state.userPredictionEntries.filter(entry => entry.id !== newEntry.id),
                  newEntry
                ]
              : state.userPredictionEntries,
            loading: false,
            error: null
          };
        });

        // clear in-flight
        set(state => {
          const next = { ...(state.inFlightBets || {}) };
          delete next[compositeKey];
          return { inFlightBets: next } as any;
        });

        return result;
      }

      // Use new unified place-bet endpoint if crypto mode is enabled
      if (isCryptoMode) {
        console.log('[FCZ-BET] Placing bet via unified endpoint...', { predictionId, optionId, amount, userId });
        
        // Generate stable idempotency key + requestId (reused within TTL)
        const compositeKey = computeBetKey(userId, predictionId, optionId, amount);
        const inFlight = get().inFlightBets || {};
        if (inFlight[compositeKey]) {
          console.log('[FCZ-BET] Duplicate click prevented (in-flight):', compositeKey);
          set({ loading: false });
          return; // Ignore duplicate concurrent submissions
        }
        // mark in-flight
        set(state => ({ inFlightBets: { ...(state.inFlightBets || {}), [compositeKey]: true } }));
        const requestId = getOrCreateRequestId(compositeKey);

        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${getApiUrl()}/api/predictions/${predictionId}/place-bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            optionId,
            amountUSD: amount,
            userId,
            walletAddress: walletAddress || undefined,
            fundingMode: 'crypto',
            requestId
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
          if (response.status === 401 || (errorData as any).code === 'FCZ_AUTH_REQUIRED') {
            void useAuthStore.getState().logout();
          }
          if ((errorData as any).error === 'INSUFFICIENT_ESCROW') {
            throw new Error('INSUFFICIENT_ESCROW');
          }
          if ((errorData as any).error === 'BETTING_DISABLED') {
            throw new Error('Betting is temporarily unavailable. Please try again later.');
          }
          throw new Error(placeBetErrorFromResponse(response.status, errorData));
        }

        const result = await response.json();
        console.log('[FCZ-BET] Bet placed successfully:', result);

        const updatedPrediction = result?.data?.prediction;
        const newEntry = result?.data?.entry;

        set(state => {
          const mergePrediction = (pred: any) => {
            if (!pred || pred.id !== predictionId) return pred;
            return updatedPrediction
              ? { ...pred, ...updatedPrediction }
              : { 
                  ...pred, 
                  pool_total: (pred.pool_total || 0) + amount,
                  participant_count: (pred.participant_count || 0) + 1
                };
          };

          return {
            predictions: state.predictions.map(mergePrediction),
            userPredictions: state.userPredictions.map(mergePrediction),
            createdPredictions: state.createdPredictions.map(mergePrediction),
            userCreatedPredictions: state.userCreatedPredictions.map(mergePrediction),
            userPredictionEntries: newEntry
              ? [
                  ...state.userPredictionEntries.filter(entry => entry.id !== newEntry.id),
                  newEntry
                ]
              : state.userPredictionEntries,
            loading: false,
            error: null
          };
        });

        // Ensure derived lists (like created predictions) stay fresh
        try {
          const { user } = useAuthStore.getState();
          if (user?.id) {
            await Promise.all([
              get().fetchUserCreatedPredictions(user.id),
              get().fetchUserPredictionEntries(user.id)
            ]);
          }
        } catch (refreshErr) {
          console.warn('[FCZ-BET] Post-bet refresh encountered an issue:', refreshErr);
        }
        // clear in-flight
        set(state => {
          const next = { ...(state.inFlightBets || {}) };
          delete next[compositeKey];
          return { inFlightBets: next } as any;
        });

        return result;
      } else {
        // DEMO MODE: Use the SAME unified endpoint with fundingMode='demo'
        console.log('[FCZ-BET] Placing bet via unified endpoint (demo)...', { predictionId, optionId, amount, userId });

        const compositeKey = computeBetKey(userId, predictionId, optionId, amount);
        const inFlight = get().inFlightBets || {};
        if (inFlight[compositeKey]) {
          console.log('[FCZ-BET] Duplicate click prevented (in-flight):', compositeKey);
          set({ loading: false });
          return;
        }
        set(state => ({ inFlightBets: { ...(state.inFlightBets || {}), [compositeKey]: true } }));
        const requestId = getOrCreateRequestId(compositeKey);

        const authHeaders = await getAuthHeaders();
        const response = await fetch(`${getApiUrl()}/api/predictions/${predictionId}/place-bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            optionId,
            amountUSD: amount,
            userId,
            fundingMode: 'demo',
            requestId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
          if (response.status === 401 || (errorData as any).code === 'FCZ_AUTH_REQUIRED') {
            void useAuthStore.getState().logout();
          }
          if (errorData.error === 'INSUFFICIENT_FUNDS') {
            throw new Error('Insufficient demo credits.');
          }
          if (errorData.error === 'BETTING_DISABLED') {
            throw new Error('Betting is temporarily unavailable. Please try again later.');
          }
          throw new Error(placeBetErrorFromResponse(response.status, errorData));
        }

        const result = await response.json();
        console.log('[FCZ-BET] Demo bet placed successfully:', result);

        const updatedPrediction = result?.data?.prediction;
        const newEntry = result?.data?.entry;

        set(state => {
          const mergePrediction = (pred: any) => {
            if (!pred || pred.id !== predictionId) return pred;
            return updatedPrediction ? { ...pred, ...updatedPrediction } : pred;
          };

          return {
            predictions: state.predictions.map(mergePrediction),
            userPredictions: state.userPredictions.map(mergePrediction),
            createdPredictions: state.createdPredictions.map(mergePrediction),
            userCreatedPredictions: state.userCreatedPredictions.map(mergePrediction),
            userPredictionEntries: newEntry
              ? [
                  ...state.userPredictionEntries.filter(entry => entry.id !== newEntry.id),
                  newEntry
                ]
              : state.userPredictionEntries,
            loading: false,
            error: null
          };
        });

        try {
          const { user } = useAuthStore.getState();
          if (user?.id) {
            await Promise.all([
              get().fetchUserCreatedPredictions(user.id),
              get().fetchUserPredictionEntries(user.id)
            ]);
          }
        } catch (refreshErr) {
          console.warn('[FCZ-BET] Post-bet refresh encountered an issue:', refreshErr);
        }

        set(state => {
          const next = { ...(state.inFlightBets || {}) };
          delete next[compositeKey];
          return { inFlightBets: next } as any;
        });

        return result;
      }

    } catch (error) {
      console.error('❌ Error placing prediction:', error);
      
      // Provide helpful error messages
      let errorMessage = 'Failed to place prediction';
      if (error instanceof Error) {
        if (error.message.includes('already been used') || error.message.includes('already been consumed')) {
          errorMessage = 'Previous bet attempt was not completed. Please refresh the page and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({
        loading: false,
        error: errorMessage
      });
      throw error;
    } finally {
      // Always clear in-flight guard after attempt window for this composite key
      try {
        const compositeKey = computeBetKey(userId, predictionId, optionId, amount);
        set(state => {
          const next = { ...(state.inFlightBets || {}) };
          delete next[compositeKey];
          return { inFlightBets: next } as any;
        });
      } catch {}
    }
  },

  /**
   * Place a prediction bet using fiat (NGN) balance
   * Phase 7B: Fiat staking
   */
  placeFiatPrediction: async (predictionId: string, optionId: string, amountNgn: number, userId: string) => {
    set({ loading: true, error: null });

    try {
      console.log('[FCZ-BET] Placing fiat bet...', { predictionId, optionId, amountNgn, userId });

      // Generate stable idempotency key
      const compositeKey = computeBetKey(userId, predictionId, optionId, amountNgn);
      const inFlight = get().inFlightBets || {};
      if (inFlight[compositeKey]) {
        console.log('[FCZ-BET] Duplicate click prevented (in-flight):', compositeKey);
        set({ loading: false });
        return;
      }
      set(state => ({ inFlightBets: { ...(state.inFlightBets || {}), [compositeKey]: true } }));
      const requestId = getOrCreateRequestId(compositeKey);

      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${getApiUrl()}/api/predictions/${predictionId}/place-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          optionId,
          amountNgn,
          userId,
          fundingMode: 'fiat',
          requestId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
        if (response.status === 401 || (errorData as any).code === 'FCZ_AUTH_REQUIRED') {
          void useAuthStore.getState().logout();
        }
        if (errorData.error === 'INSUFFICIENT_FUNDS') {
          throw new Error('Insufficient fiat balance. Please deposit more NGN.');
        }
        if (errorData.error === 'FIAT_DISABLED') {
          throw new Error('Fiat betting is currently disabled.');
        }
        if (errorData.error === 'BETTING_DISABLED') {
          throw new Error('Betting is temporarily unavailable. Please try again later.');
        }
        throw new Error(placeBetErrorFromResponse(response.status, errorData));
      }

      const result = await response.json();
      console.log('[FCZ-BET] Fiat bet placed successfully:', result);

      const updatedPrediction = result?.data?.prediction;
      const newEntry = result?.data?.entry;

      set(state => {
        const mergePrediction = (pred: any) => {
          if (!pred || pred.id !== predictionId) return pred;
          return updatedPrediction ? { ...pred, ...updatedPrediction } : pred;
        };

        return {
          predictions: state.predictions.map(mergePrediction),
          userPredictions: state.userPredictions.map(mergePrediction),
          createdPredictions: state.createdPredictions.map(mergePrediction),
          userCreatedPredictions: state.userCreatedPredictions.map(mergePrediction),
          userPredictionEntries: newEntry
            ? [
                ...state.userPredictionEntries.filter(entry => entry.id !== newEntry.id),
                newEntry
              ]
            : state.userPredictionEntries,
          loading: false,
          error: null
        };
      });

      try {
        const { user } = useAuthStore.getState();
        if (user?.id) {
          await Promise.all([
            get().fetchUserCreatedPredictions(user.id),
            get().fetchUserPredictionEntries(user.id)
          ]);
        }
      } catch (refreshErr) {
        console.warn('[FCZ-BET] Post-bet refresh encountered an issue:', refreshErr);
      }

      // Clear in-flight
      set(state => {
        const next = { ...(state.inFlightBets || {}) };
        delete next[compositeKey];
        return { inFlightBets: next } as any;
      });

      return result;
    } catch (error) {
      console.error('❌ Error placing fiat prediction:', error);
      let errorMessage = 'Failed to place prediction';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      set({ loading: false, error: errorMessage });
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

  fetchCompletedPredictions: async (userId: string) => {
    try {
      console.log('📋 Fetching completed predictions (creator or participant) for:', userId);
      const authHeaders = await getAuthHeaders();
      const data = await apiClient.get(`/api/v2/predictions/completed/${userId}`, {
        timeout: 10000,
        retryOptions: { maxRetries: 3 },
        headers: authHeaders,
      });
      const completedPredictions = data.data || [];
      set({ completedPredictions });
      console.log('✅ Completed predictions fetched:', completedPredictions.length);
    } catch (error) {
      console.error('❌ Error fetching completed predictions:', error);
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
      set(state => {
        const mergePrediction = (pred: any) =>
          pred.id === predictionId
            ? { ...pred, ...updatedPrediction, status: 'closed' }
            : pred;

        return {
          predictions: state.predictions.map(mergePrediction),
          userCreatedPredictions: state.userCreatedPredictions.map(mergePrediction),
          createdPredictions: state.createdPredictions.map(mergePrediction),
          userPredictions: state.userPredictions.map(mergePrediction),
          trendingPredictions: state.trendingPredictions.map(mergePrediction),
          completedPredictions: state.completedPredictions.map(mergePrediction),
        };
      });

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
