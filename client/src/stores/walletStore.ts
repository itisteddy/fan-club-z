import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface WalletBalance {
  currency: string;
  available_balance: number;
  reserved_balance: number;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'prediction_lock' | 'prediction_release' | 'transfer_in' | 'transfer_out';
  currency: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  created_at: string;
}

interface WalletState {
  balances: WalletBalance[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

interface WalletActions {
  fetchWalletData: () => Promise<void>;
  deposit: (currency: string, amount: number, method: string) => Promise<void>;
  withdraw: (currency: string, amount: number, destination: string) => Promise<void>;
  transfer: (recipientId: string, currency: string, amount: number) => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState & WalletActions>((set, get) => ({
  balances: [],
  transactions: [],
  isLoading: false,
  error: null,

  fetchWalletData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [balances, transactions] = await Promise.all([
        apiClient.get('/wallet/balances'),
        apiClient.get('/wallet/transactions')
      ]);
      
      set({ 
        balances, 
        transactions,
        isLoading: false 
      });
    } catch (error) {
      set({ error: 'Failed to fetch wallet data', isLoading: false });
    }
  },

  deposit: async (currency: string, amount: number, method: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/wallet/deposit', {
        currency,
        amount,
        method
      });
      
      // Refresh wallet data
      await get().fetchWalletData();
      
      set({ isLoading: false });
      return response;
    } catch (error) {
      set({ error: 'Failed to process deposit', isLoading: false });
      throw error;
    }
  },

  withdraw: async (currency: string, amount: number, destination: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/wallet/withdraw', {
        currency,
        amount,
        destination
      });
      
      // Refresh wallet data
      await get().fetchWalletData();
      
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to process withdrawal', isLoading: false });
      throw error;
    }
  },

  transfer: async (recipientId: string, currency: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/wallet/transfer', {
        recipient_id: recipientId,
        currency,
        amount
      });
      
      // Refresh wallet data
      await get().fetchWalletData();
      
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to process transfer', isLoading: false });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
