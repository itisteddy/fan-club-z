import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Prediction, PredictionListResponse } from '../types/domain';
import { validatePredictionListResponse } from '../api/schemas';
import { get as apiGet, post as apiPost, ApiResult } from '../api/client';
import type { LoadStatus } from '../types/api';
import { qaLog, qaError } from '../utils/devQa';

interface PredictionState {
  // State
  status: LoadStatus;
  predictions: Prediction[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  lastUpdated: number | null;
  error: string | null;

  // Actions
  load: (params: { page?: number; limit?: number; category?: string; search?: string }) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchPrediction: (id: string) => Promise<Prediction | null>;
  fetchPredictionById: (id: string) => Promise<Prediction | null>;
  placePrediction: (predictionId: string, optionId: string, amount: number, transactionHash: string, userId: string) => Promise<{ success: boolean; data?: any }>;
  clear: () => void;
  setError: (error: string | null) => void;
  closePrediction: (predictionId: string) => Promise<{ success: boolean; data?: unknown }>;
}

export const usePredictionStore = create<PredictionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: 'idle',
      predictions: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
      lastUpdated: null,
      error: null,

      // Actions
      load: async (params = {}) => {
        const { page = 1, limit = 20, category, search } = params;
        const currentState = get();

        // Don't load if already loading
        if (currentState.status === 'loading') {
          qaLog('Prediction store: Already loading, skipping');
          return;
        }

        qaLog('Prediction store: Loading predictions', { page, limit, category, search });

        set({ 
          status: 'loading', 
          error: null,
          // Only clear predictions if loading first page
          predictions: page === 1 ? [] : currentState.predictions
        });

        try {
          // Build query parameters
          const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
          });

          if (category) queryParams.append('category', category);
          if (search) queryParams.append('search', search);

          const result: ApiResult<{ data: PredictionListResponse; message: string; version: string }> = await apiGet(
            `/v2/predictions?${queryParams.toString()}`
          );

          if (result.kind === 'success') {
            // Extract the actual data from the nested response
            const responseData = result.data.data;
            
            // Validate the response
            const issues = validatePredictionListResponse(responseData);
            if (issues.length > 0) {
              qaError('Prediction store: Schema validation failed', issues);
              set({
                status: 'schema_error',
                error: `Schema validation failed: ${issues.join(', ')}`,
                // Keep previous data on schema error
                predictions: currentState.predictions,
                total: currentState.total,
                page: currentState.page,
                limit: currentState.limit,
                hasMore: currentState.hasMore,
                lastUpdated: currentState.lastUpdated,
              });
              return;
            }

            const { data: predictions, total, page: responsePage, limit: responseLimit, has_more } = responseData;

            qaLog('Prediction store: Loaded successfully', { 
              count: predictions.length, 
              total, 
              page: responsePage,
              hasMore: has_more 
            });

            set({
              status: 'success',
              predictions: page === 1 ? predictions : [...currentState.predictions, ...predictions],
              total,
              page: responsePage,
              limit: responseLimit,
              hasMore: has_more,
              lastUpdated: Date.now(),
              error: null,
            });
          } else {
            // Handle different error types
            let errorMessage = 'Failed to load predictions';
            let errorStatus: LoadStatus = 'server_error';

            switch (result.kind) {
              case 'network_error':
                errorMessage = 'Network error. Please check your connection.';
                errorStatus = 'network_error';
                break;
              case 'server_error':
                errorMessage = 'Server error. Please try again later.';
                errorStatus = 'server_error';
                break;
              case 'client_error':
                errorMessage = 'Request failed. Please check your input.';
                errorStatus = 'client_error';
                break;
              case 'parse_error':
                errorMessage = 'Failed to parse response.';
                errorStatus = 'parse_error';
                break;
              case 'schema_error':
                errorMessage = `Data validation failed: ${result.issues.join(', ')}`;
                errorStatus = 'schema_error';
                break;
            }

            qaError('Prediction store: Load failed', { kind: result.kind, error: errorMessage });

            set({
              status: errorStatus,
              error: errorMessage,
              // Keep previous data on error
              predictions: currentState.predictions,
              total: currentState.total,
              page: currentState.page,
              limit: currentState.limit,
              hasMore: currentState.hasMore,
              lastUpdated: currentState.lastUpdated,
            });
          }
        } catch (error) {
          qaError('Prediction store: Unexpected error', error);
          
          set({
            status: 'network_error',
            error: 'An unexpected error occurred',
            // Keep previous data on unexpected error
            predictions: currentState.predictions,
            total: currentState.total,
            page: currentState.page,
            limit: currentState.limit,
            hasMore: currentState.hasMore,
            lastUpdated: currentState.lastUpdated,
          });
        }
      },

      loadMore: async () => {
        const currentState = get();
        
        if (!currentState.hasMore || currentState.status === 'loading') {
          qaLog('Prediction store: Cannot load more', { 
            hasMore: currentState.hasMore, 
            status: currentState.status 
          });
          return;
        }

        qaLog('Prediction store: Loading more predictions', { 
          currentPage: currentState.page,
          currentCount: currentState.predictions.length 
        });

        await get().load({ page: currentState.page + 1 });
      },

      refresh: async () => {
        const currentState = get();
        qaLog('Prediction store: Refreshing predictions');
        
        // Reset to first page and reload
        await get().load({ page: 1 });
      },

      fetchPredictionById: async (id: string) => {
        qaLog('Prediction store: Fetching prediction by ID:', id);
        
        try {
          // First check if it's already in the store with options
          const { predictions } = get();
          const existing = predictions.find(p => p.id === id);
          if (existing && existing.options && existing.options.length > 0) {
            qaLog('Found prediction in store with options:', existing.title, existing.options.length);
            return existing;
          }
          
          // Fetch directly from the API
          const result: ApiResult<{ data: Prediction; message: string; version: string }> = await apiGet(`/v2/predictions/${id}`);
          
          if (result.kind === 'success') {
            const prediction = result.data.data;
            qaLog('Fetched prediction from API:', prediction.title);
            qaLog('Prediction options:', prediction.options?.length || 0);
            
            // Update the store with the fetched prediction
            set(state => ({
              predictions: state.predictions.some(p => p.id === id) 
                ? state.predictions.map(p => p.id === id ? prediction : p)
                : [...state.predictions, prediction]
            }));
            
            return prediction;
          } else {
            qaError('Failed to fetch prediction by ID:', result);
            return null;
          }
        } catch (error) {
          qaError('Unexpected error fetching prediction by ID:', error);
          return null;
        }
      },

      placePrediction: async (predictionId: string, optionId: string, amount: number, transactionHash: string, userId: string) => {
        qaLog('Prediction store: Placing prediction:', { predictionId, optionId, amount, transactionHash, userId });
        
        if (!predictionId || !optionId || !amount || !transactionHash || !userId) {
          qaError('Prediction store: missing required fields');
          throw new Error('All fields are required: predictionId, optionId, amount, transactionHash, userId');
        }
        
        try {
          const payload = {
            option_id: optionId,
            amount: Number(amount),
            transaction_hash: transactionHash,
            user_id: userId
          };
          
          qaLog('Prediction store: Sending payload:', payload);
          
          const result = await apiPost(`/v2/predictions/${predictionId}/entries`, payload);
          
          if (result.kind === 'success') {
            const data = result.data.data;
            
            if (data.prediction) {
              set(state => ({
                predictions: state.predictions.map(pred => 
                  pred.id === predictionId 
                    ? { ...pred, ...data.prediction, user_entry: data.entry }
                    : pred
                )
              }));
            }
            
            qaLog('Prediction placed successfully');
            return { success: true, data };
          } else {
            qaError('Failed to place prediction:', result);
            throw new Error(`Failed to place prediction: ${result.kind}`);
          }
        } catch (error) {
          qaError('Error placing prediction:', error);
          throw error;
        }
      },

      fetchPrediction: async (id: string) => {
        qaLog('Prediction store: Fetching prediction by ID:', id);
        
        try {
          const result: ApiResult<{ data: Prediction; message: string; version: string }> = await apiGet(`/v2/predictions/${id}`);
          
          if (result.kind === 'success') {
            qaLog('Prediction store: Fetched prediction successfully:', result.data.data);
            return result.data.data; // Extract the actual prediction data from the nested response
          } else {
            qaError('Prediction store: Failed to fetch prediction:', result);
            return null;
          }
        } catch (error) {
          qaError('Prediction store: Unexpected error fetching prediction:', error);
          return null;
        }
      },

      clear: () => {
        qaLog('Prediction store: Clearing state');
        set({
          status: 'idle',
          predictions: [],
          total: 0,
          page: 1,
          limit: 20,
          hasMore: false,
          lastUpdated: null,
          error: null,
        });
      },

      setError: (error: string | null) => {
        qaLog('Prediction store: Setting error', error);
        set({ error });
      },

      closePrediction: async (predictionId: string) => {
        qaLog('Prediction store: Closing prediction:', predictionId);

        try {
          const result = await apiPost(`/v2/predictions/${predictionId}/close`, {});

          if (result.kind === 'success') {
            const closedPrediction = result.data.data;

            set(state => ({
              predictions: state.predictions.map(pred =>
                pred.id === predictionId
                  ? { ...pred, ...closedPrediction, status: 'closed' as const }
                  : pred
              ),
            }));

            qaLog('Prediction closed successfully');
            return { success: true, data: closedPrediction };
          }

          qaError('Failed to close prediction:', result);
          throw new Error(`Failed to close prediction: ${result.kind}`);
        } catch (error) {
          qaError('Error closing prediction:', error);
          throw error;
        }
      },
    }),
    {
      name: 'prediction-store',
    }
  )
);
