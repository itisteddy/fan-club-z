import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { WalletBalance, Transaction } from '../types/domain';
import { validateWalletBalance, validateTransactionList } from '../api/schemas';
import { get as apiGet, post, ApiResult } from '../api/client';
import type { LoadStatus } from '../types/api';
import { qaLog, qaError } from '../utils/devQa';

interface WalletState {
  // State
  status: LoadStatus;
  walletSummary: WalletBalance | null;
  transactions: Transaction[];
  lastUpdated: number | null;
  error: string | null;

  // Actions
  loadSummary: (userId: string) => Promise<void>;
  loadTransactions: (userId: string, limit?: number) => Promise<void>;
  addFunds: (userId: string, amount: number, currency?: string) => Promise<ApiResult<Transaction>>;
  refresh: (userId: string) => Promise<void>;
  clear: () => void;
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletState>()(
  devtools(
    (set, get) => ({
      // Initial state
      status: 'idle',
      walletSummary: null,
      transactions: [],
      lastUpdated: null,
      error: null,

      // Actions
      loadSummary: async (userId: string) => {
        const currentState = get();

        // Don't load if already loading
        if (currentState.status === 'loading') {
          qaLog('Wallet store: Already loading, skipping');
          return;
        }

        qaLog('Wallet store: Loading wallet summary', { userId });

        set({ 
          status: 'loading', 
          error: null
        });

        try {
          const result: ApiResult<WalletBalance> = await apiGet(
            `/wallet/${userId}/summary`
          );

          if (result.kind === 'success') {
            // Validate the response
            const issues = validateWalletBalance(result.data);
            if (issues.length > 0) {
              qaError('Wallet store: Schema validation failed', issues);
              set({
                status: 'schema_error',
                error: `Schema validation failed: ${issues.join(', ')}`,
                // Keep previous data on schema error
                walletSummary: currentState.walletSummary,
                lastUpdated: currentState.lastUpdated,
              });
              return;
            }

            qaLog('Wallet store: Summary loaded successfully', result.data);

            set({
              status: 'success',
              walletSummary: result.data,
              lastUpdated: Date.now(),
              error: null,
            });
          } else {
            // Handle different error types
            let errorMessage = 'Failed to load wallet summary';
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

            qaError('Wallet store: Load failed', { kind: result.kind, error: errorMessage });

            set({
              status: errorStatus,
              error: errorMessage,
              // Keep previous data on error
              walletSummary: currentState.walletSummary,
              lastUpdated: currentState.lastUpdated,
            });
          }
        } catch (error) {
          qaError('Wallet store: Unexpected error', error);
          
          set({
            status: 'network_error',
            error: 'An unexpected error occurred',
            // Keep previous data on unexpected error
            walletSummary: currentState.walletSummary,
            lastUpdated: currentState.lastUpdated,
          });
        }
      },

      loadTransactions: async (userId: string, limit = 50) => {
        qaLog('Wallet store: Loading transactions', { userId, limit });

        try {
          const result: ApiResult<Transaction[]> = await apiGet(
            `/wallet/${userId}/transactions?limit=${limit}`
          );

          if (result.kind === 'success') {
            // Validate the response
            const issues = validateTransactionList(result.data);
            if (issues.length > 0) {
              qaError('Wallet store: Transaction validation failed', issues);
              return;
            }

            qaLog('Wallet store: Transactions loaded successfully', { count: result.data.length });

            set({
              transactions: result.data,
            });
          } else {
            qaError('Wallet store: Failed to load transactions', result);
          }
        } catch (error) {
          qaError('Wallet store: Unexpected error loading transactions', error);
        }
      },

      addFunds: async (userId: string, amount: number, currency = 'USD') => {
        qaLog('Wallet store: Adding funds', { userId, amount, currency });

        try {
          const result = await post(`/wallet/${userId}/deposit`, {
            amount,
            currency,
          });

          if (result.kind === 'success') {
            qaLog('Wallet store: Funds added successfully');
            
            // Refresh wallet summary and transactions
            await get().loadSummary(userId);
            await get().loadTransactions(userId);
          }

          return result;
        } catch (error) {
          qaError('Wallet store: Error adding funds', error);
          throw error;
        }
      },

      refresh: async (userId: string) => {
        qaLog('Wallet store: Refreshing wallet data');
        
        await Promise.all([
          get().loadSummary(userId),
          get().loadTransactions(userId),
        ]);
      },

      clear: () => {
        qaLog('Wallet store: Clearing state');
        set({
          status: 'idle',
          walletSummary: null,
          transactions: [],
          lastUpdated: null,
          error: null,
        });
      },

      setError: (error: string | null) => {
        qaLog('Wallet store: Setting error', error);
        set({ error });
      },
    }),
    {
      name: 'wallet-store',
    }
  )
);
