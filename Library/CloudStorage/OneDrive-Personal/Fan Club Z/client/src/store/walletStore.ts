import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction } from '@shared/schema';
import { config } from '@/lib/config';

interface WalletState {
  balance: number;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Modal states
  showDepositModal: boolean;
  showWithdrawModal: boolean;
}

interface WalletActions {
  initializeWallet: (userId: string) => Promise<void>;
  refreshBalance: (userId: string) => Promise<void>;
  updateBalance: (amount: number) => void;
  deductBalance: (amount: number) => void;
  fetchTransactions: (userId: string) => Promise<void>;
  addBetTransaction: (betEntry: any) => void;
  addWinTransaction: (winEntry: any) => void;
  addDepositTransaction: (amount: number, userId?: string) => void;
  addWithdrawTransaction: (amount: number, userId?: string) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  openDepositModal: () => void;
  closeDepositModal: () => void;
  openWithdrawModal: () => void;
  closeWithdrawModal: () => void;
}

type WalletStore = WalletState & WalletActions;

// Helper to make authenticated API calls with better error handling
const makeApiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('accessToken');
    
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error: any) {
    // Silently handle ad blocker and network errors to prevent console spam
    if (error.name === 'AbortError' || 
        error.message?.includes('Failed to fetch') || 
        error.message?.includes('NetworkError') ||
        error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
        error.message?.includes('ECONNREFUSED')) {
      // Return a safe fallback response for wallet calls
      return { success: false, error: 'Network unavailable' };
    }
    throw error;
  }
};

export const useWalletStore = create<WalletStore>()(  
  persist(
    (set, get) => ({
      // Initial state
      balance: 0,
      transactions: [],
      isLoading: false,
      error: null,
      isInitialized: false,
      showDepositModal: false,
      showWithdrawModal: false,

      // Initialize wallet with better error handling
      initializeWallet: async (userId: string) => {
        try {
          const state = get();
          if (state.isInitialized || !userId) {
            return; // Already initialized or no user ID
          }
          
          set({ isLoading: true, error: null });
          
          // Fetch balance and transactions with error boundaries
          try {
            await get().refreshBalance(userId);
          } catch (error) {
            console.warn('Wallet balance fetch failed, using cached data');
          }
          
          try {
            await get().fetchTransactions(userId);
          } catch (error) {
            console.warn('Transaction history fetch failed, using cached data');
          }
          
          set({ isInitialized: true, isLoading: false });
        } catch (error: any) {
          // Don't log errors that might spam the console
          set({ 
            isInitialized: true, 
            isLoading: false,
            error: null // Don't show error to user for initialization failures
          });
        }
      },

      // Refresh balance from API with safer error handling
      refreshBalance: async (userId: string) => {
        try {
          if (!userId) {
            return; // Silently return if no user ID
          }

          const result = await makeApiCall(`/wallet/balance/${userId}`);
          
          // Handle the case where makeApiCall returns a fallback response
          if (!result || result.error === 'Network unavailable') {
            return; // Silently fail, keep existing balance
          }
          
          if (result && typeof result === 'object') {
            if (result.success && typeof result.data?.balance === 'number') {
              set({ balance: result.data.balance, error: null });
            } else if (typeof result.balance === 'number') {
              // Handle direct balance response
              set({ balance: result.balance, error: null });
            }
            // If invalid format, silently keep existing balance
          }
        } catch (error: any) {
          // Silently handle all errors to prevent console spam
          // The existing balance will be preserved
        }
      },

      // Update balance locally (optimistic update)
      updateBalance: (amount: number) => {
        if (typeof amount === 'number' && !isNaN(amount)) {
          set((state) => ({ balance: Math.max(0, state.balance + amount) }));
        }
      },
      
      // Deduct balance locally (optimistic update)
      deductBalance: (amount: number) => {
        if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
          set((state) => ({ balance: Math.max(0, state.balance - amount) }));
        }
      },

      // Add bet transaction locally with validation and improved naming
      addBetTransaction: (betEntry: any) => {
        try {
          if (!betEntry || typeof betEntry.amount !== 'number' || betEntry.amount <= 0) {
            return; // Invalid bet entry
          }

          // Create user-friendly bet description
          const betTitle = betEntry.betTitle || betEntry.title || betEntry.description || 'Bet';
          const betDescription = betTitle.length > 50 
            ? `${betTitle.substring(0, 47)}...` 
            : betTitle;

          const transaction: Transaction = {
            id: `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: betEntry.userId || 'unknown',
            type: 'bet_lock',
            amount: betEntry.amount,
            currency: 'USD',
            status: 'completed',
            description: `Bet: ${betDescription}`,
            reference: betEntry.betId || betEntry.id || `bet-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => ({
            balance: Math.max(0, state.balance - betEntry.amount),
            transactions: [transaction, ...state.transactions.slice(0, 99)] // Keep only latest 100
          }));
        } catch (error) {
          console.warn('Failed to add bet transaction:', error);
        }
      },

      // Add method to add win transactions with proper naming
      addWinTransaction: (winEntry: any) => {
        try {
          if (!winEntry || typeof winEntry.amount !== 'number' || winEntry.amount <= 0) {
            return;
          }

          const betTitle = winEntry.betTitle || winEntry.title || winEntry.description || 'Bet Win';
          const betDescription = betTitle.length > 50 
            ? `${betTitle.substring(0, 47)}...` 
            : betTitle;

          const transaction: Transaction = {
            id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: winEntry.userId || 'unknown',
            type: 'bet_release',
            amount: winEntry.amount,
            currency: 'USD',
            status: 'completed',
            description: `Won: ${betDescription}`,
            reference: winEntry.betId || winEntry.id || `win-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => ({
            balance: state.balance + winEntry.amount,
            transactions: [transaction, ...state.transactions.slice(0, 99)]
          }));
        } catch (error) {
          console.warn('Failed to add win transaction:', error);
        }
      },

      // Add deposit transaction locally
      addDepositTransaction: (amount: number, userId?: string) => {
        try {
          if (typeof amount !== 'number' || amount <= 0) {
            return; // Invalid amount
          }

          const transaction: Transaction = {
            id: `deposit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: userId || 'unknown',
            type: 'deposit',
            amount: amount,
            currency: 'USD',
            status: 'completed',
            description: `Deposit via Demo Payment`,
            reference: `DEP-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => ({
            balance: state.balance + amount,
            transactions: [transaction, ...state.transactions.slice(0, 99)] // Keep only latest 100
          }));
          
          console.log('[WALLET] Added deposit transaction:', transaction);
        } catch (error) {
          console.warn('Failed to add deposit transaction:', error);
        }
      },

      // Add withdrawal transaction locally
      addWithdrawTransaction: (amount: number, userId?: string) => {
        try {
          if (typeof amount !== 'number' || amount <= 0) {
            return; // Invalid amount
          }

          const transaction: Transaction = {
            id: `withdraw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            userId: userId || 'unknown',
            type: 'withdraw',
            amount: amount,
            currency: 'USD',
            status: 'completed',
            description: `Withdrawal to Bank Account`,
            reference: `WTH-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => ({
            balance: Math.max(0, state.balance - amount),
            transactions: [transaction, ...state.transactions.slice(0, 99)] // Keep only latest 100
          }));
          
          console.log('[WALLET] Added withdrawal transaction:', transaction);
        } catch (error) {
          console.warn('Failed to add withdrawal transaction:', error);
        }
      },

      // Fetch transactions from API with better error handling
      fetchTransactions: async (userId: string) => {
        try {
          if (!userId) {
            return; // Silently return if no user ID
          }

          const result = await makeApiCall(`/transactions/${userId}`);
          
          // Handle the case where makeApiCall returns a fallback response
          if (!result || result.error === 'Network unavailable') {
            return; // Silently fail, keep existing transactions
          }
          
          if (result && typeof result === 'object') {
            let transactions: Transaction[] = [];
            
            if (result.success && Array.isArray(result.data?.transactions)) {
              transactions = result.data.transactions.filter((t: any) => 
                t && typeof t === 'object' && t.status === 'completed'
              );
            } else if (Array.isArray(result.transactions)) {
              transactions = result.transactions.filter((t: any) => 
                t && typeof t === 'object' && t.status === 'completed'
              );
            } else if (Array.isArray(result)) {
              transactions = result.filter((t: any) => 
                t && typeof t === 'object' && t.status === 'completed'
              );
            }
            
            set({ transactions, error: null });
          }
        } catch (error: any) {
          // Silently handle all errors to prevent console spam
          // Existing transactions will be preserved
        }
      },

      // Utility actions
      setLoading: (loading) => {
        if (typeof loading === 'boolean') {
          set({ isLoading: loading });
        }
      },
      clearError: () => set({ error: null }),
      
      // Modal actions
      openDepositModal: () => set({ showDepositModal: true }),
      closeDepositModal: () => set({ showDepositModal: false }),
      openWithdrawModal: () => set({ showWithdrawModal: true }),
      closeWithdrawModal: () => set({ showWithdrawModal: false }),
    }),
    {
      name: 'fan-club-z-wallet',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        balance: state.balance,
        transactions: state.transactions,
        isInitialized: state.isInitialized
      }),
    }
  )
);

// Helper functions with null checks
export const formatBalance = (balance: number): string => {
  const safeBalance = typeof balance === 'number' && !isNaN(balance) ? balance : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeBalance);
};

export const getTransactionStatusColor = (status: Transaction['status']): string => {
  const colors = {
    pending: 'text-yellow-600 bg-yellow-50',
    completed: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  };
  return status && colors[status] ? colors[status] : colors.pending;
};

export const getTransactionTypeLabel = (type: Transaction['type']): string => {
  const labels = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    bet_lock: 'Bet Placed',
    bet_release: 'Bet Won',
    transfer: 'Transfer',
  };
  return type && labels[type] ? labels[type] : (type || 'Unknown');
};

// Legacy exports for backward compatibility with null checks
export const getCurrencySymbol = () => '$';

export const getTransactionAmount = (transaction: Transaction) => {
  if (!transaction || typeof transaction.amount !== 'number') {
    return { amount: 0, sign: '+' };
  }
  
  return {
    amount: transaction.amount,
    sign: ['deposit', 'bet_release'].includes(transaction.type) ? '+' : '-',
  };
};