import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { LeaderboardEntry, LeaderboardResponse } from '../types/domain';
import { validateLeaderboardResponse } from '../api/schemas';
import { get as apiGet, ApiResult } from '../api/client';
import type { LoadStatus } from '../types/api';
import { qaLog, qaError } from '../utils/devQa';

interface LeaderboardState {
  // State
  status: LoadStatus;
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  lastUpdated: number | null;
  error: string | null;

  // Actions
  load: (params: { page?: number; limit?: number; sort?: string }) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
  setError: (error: string | null) => void;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: 'idle',
      entries: [],
      total: 0,
      page: 1,
      limit: 50,
      lastUpdated: null,
      error: null,

      // Actions
      load: async (params = {}) => {
        const { page = 1, limit = 50, sort = 'total_predictions' } = params;
        const currentState = get();

        // Don't load if already loading
        if (currentState.status === 'loading') {
          qaLog('Leaderboard store: Already loading, skipping');
          return;
        }

        qaLog('Leaderboard store: Loading leaderboard', { page, limit, sort });

        set({ 
          status: 'loading', 
          error: null,
          entries: page === 1 ? [] : currentState.entries
        });

        try {
          // Build query parameters
          const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            sort,
          });

          const result: ApiResult<LeaderboardResponse> = await apiGet(
            `/leaderboard?${queryParams.toString()}`
          );

          if (result.kind === 'success') {
            // Validate the response
            const issues = validateLeaderboardResponse(result.data);
            if (issues.length > 0) {
              qaError('Leaderboard store: Schema validation failed', issues);
              set({
                status: 'schema_error',
                error: `Schema validation failed: ${issues.join(', ')}`,
                // Keep previous data on schema error
                entries: currentState.entries,
                total: currentState.total,
                page: currentState.page,
                limit: currentState.limit,
                lastUpdated: currentState.lastUpdated,
              });
              return;
            }

            const { data: entries, total, page: responsePage, limit: responseLimit } = result.data;

            qaLog('Leaderboard store: Loaded successfully', { 
              count: entries.length, 
              total, 
              page: responsePage 
            });

            set({
              status: 'success',
              entries: page === 1 ? entries : [...currentState.entries, ...entries],
              total,
              page: responsePage,
              limit: responseLimit,
              lastUpdated: Date.now(),
              error: null,
            });
          } else {
            // Handle different error types
            let errorMessage = 'Failed to load leaderboard';
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

            qaError('Leaderboard store: Load failed', { kind: result.kind, error: errorMessage });

            set({
              status: errorStatus,
              error: errorMessage,
              // Keep previous data on error
              entries: currentState.entries,
              total: currentState.total,
              page: currentState.page,
              limit: currentState.limit,
              lastUpdated: currentState.lastUpdated,
            });
          }
        } catch (error) {
          qaError('Leaderboard store: Unexpected error', error);
          
          set({
            status: 'network_error',
            error: 'An unexpected error occurred',
            // Keep previous data on unexpected error
            entries: currentState.entries,
            total: currentState.total,
            page: currentState.page,
            limit: currentState.limit,
            lastUpdated: currentState.lastUpdated,
          });
        }
      },

      refresh: async () => {
        qaLog('Leaderboard store: Refreshing');
        await get().load({ page: 1 });
      },

      clear: () => {
        qaLog('Leaderboard store: Clearing state');
        set({
          status: 'idle',
          entries: [],
          total: 0,
          page: 1,
          limit: 50,
          lastUpdated: null,
          error: null,
        });
      },

      setError: (error: string | null) => {
        qaLog('Leaderboard store: Setting error', error);
        set({ error });
      },
    }),
    {
      name: 'leaderboard-store',
    }
  )
);
