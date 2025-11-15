import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PredictionEntry } from '../types/domain';
import { validatePredictionEntryList } from '../api/schemas';
import { get as apiGet, post, ApiResult } from '../api/client';
import type { LoadStatus } from '../types/api';
import { qaLog, qaError } from '../utils/devQa';

interface BetsState {
  // State
  status: LoadStatus;
  bets: PredictionEntry[];
  lastUpdated: number | null;
  error: string | null;

  // Actions
  loadBets: (userId: string, limit?: number) => Promise<void>;
  placeBet: (userId: string, predictionId: string, optionId: string, amount: number) => Promise<ApiResult<PredictionEntry>>;
  refresh: (userId: string) => Promise<void>;
  clear: () => void;
  setError: (error: string | null) => void;
}

export const useBetsStore = create<BetsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: 'idle',
      bets: [],
      lastUpdated: null,
      error: null,

      // Actions
      loadBets: async (userId: string, limit = 50) => {
        const currentState = get();

        // Don't load if already loading
        if (currentState.status === 'loading') {
          qaLog('Bets store: Already loading, skipping');
          return;
        }

        qaLog('Bets store: Loading user bets', { userId, limit });

        set({ 
          status: 'loading', 
          error: null
        });

        try {
          const result: ApiResult<PredictionEntry[]> = await apiGet(
            `/users/${userId}/bets?limit=${limit}`
          );

          if (result.kind === 'success') {
            // Validate the response
            const issues = validatePredictionEntryList(result.data);
            if (issues.length > 0) {
              qaError('Bets store: Schema validation failed', issues);
              set({
                status: 'schema_error',
                error: `Schema validation failed: ${issues.join(', ')}`,
                // Keep previous data on schema error
                bets: currentState.bets,
                lastUpdated: currentState.lastUpdated,
              });
              return;
            }

            qaLog('Bets store: Bets loaded successfully', { count: result.data.length });

            set({
              status: 'success',
              bets: result.data,
              lastUpdated: Date.now(),
              error: null,
            });
          } else {
            // Handle different error types
            let errorMessage = 'Failed to load bets';
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

            qaError('Bets store: Load failed', { kind: result.kind, error: errorMessage });

            set({
              status: errorStatus,
              error: errorMessage,
              // Keep previous data on error
              bets: currentState.bets,
              lastUpdated: currentState.lastUpdated,
            });
          }
        } catch (error) {
          qaError('Bets store: Unexpected error', error);
          
          set({
            status: 'network_error',
            error: 'An unexpected error occurred',
            // Keep previous data on unexpected error
            bets: currentState.bets,
            lastUpdated: currentState.lastUpdated,
          });
        }
      },

      placeBet: async (userId: string, predictionId: string, optionId: string, amount: number) => {
        qaLog('Bets store: Placing bet', { userId, predictionId, optionId, amount });

        try {
          const result = await post(`/predictions/${predictionId}/bets`, {
            user_id: userId,
            option_id: optionId,
            amount,
          });

          if (result.kind === 'success') {
            qaLog('Bets store: Bet placed successfully');
            
            // Refresh bets
            await get().loadBets(userId);
          }

          return result;
        } catch (error) {
          qaError('Bets store: Error placing bet', error);
          throw error;
        }
      },

      refresh: async (userId: string) => {
        qaLog('Bets store: Refreshing bets');
        await get().loadBets(userId);
      },

      clear: () => {
        qaLog('Bets store: Clearing state');
        set({
          status: 'idle',
          bets: [],
          lastUpdated: null,
          error: null,
        });
      },

      setError: (error: string | null) => {
        qaLog('Bets store: Setting error', error);
        set({ error });
      },
    }),
    {
      name: 'bets-store',
    }
  )
);
