import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'prediction' | 'prediction_lock' | 'prediction_release' | 'win' | 'loss' | 'refund' | 'transfer_in' | 'transfer_out' | 'bet_lock' | 'bet_release';
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  currency: 'USD';
  fee?: number;
  fromUser?: string;
  toUser?: string;
  predictionId?: string;
}

interface WalletBalance {
  currency: 'USD';
  available: number;
  reserved: number;
  total: number;
}

export interface WalletState {
  balances: WalletBalance[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  walletSummary?: {
    available_balance?: number;
    reserved_balance?: number;
    total_balance?: number;
  } | null;
  
  // Computed properties for easy access
  balance: number; // Available USD balance
  totalBalance: number; // Total USD balance (available + reserved)
  reservedBalance: number; // Reserved USD balance
  
  // Actions
  initializeWallet: () => Promise<void>;
  addFunds: (amount: number, currency?: 'USD', method?: string) => Promise<Transaction>;
  withdraw: (amount: number, currency?: 'USD', destination?: string) => Promise<Transaction>;
  makePrediction: (amount: number, description: string, predictionId: string, currency?: 'USD') => Promise<Transaction>;
  lockFunds: (amount: number, currency?: 'USD') => Promise<void>; // Added this method
  recordWin: (amount: number, description: string, predictionId: string, currency?: 'USD') => Promise<Transaction>;
  recordLoss: (amount: number, description: string, predictionId: string, currency?: 'USD') => Promise<Transaction>;
  transferFunds: (amount: number, toUser: string, description?: string, currency?: 'USD') => Promise<Transaction>;
  getBalance: (currency?: 'USD') => number;
  getTransactionHistory: (filters?: { type?: string; currency?: string; limit?: number }) => Transaction[];
  clearError: () => void;
  refreshWalletData: () => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
    (set, get) => ({
      balances: [],
      transactions: [],
      isLoading: false,
      error: null,
      walletSummary: null,
      
      // Computed properties
      get balance() {
        const state = get();
        const usdBalance = state.balances.find(b => b.currency === 'USD');
        return usdBalance?.available || 0;
      },
      
      get totalBalance() {
        const state = get();
        const usdBalance = state.balances.find(b => b.currency === 'USD');
        return usdBalance?.total || 0;
      },
      
      get reservedBalance() {
        const state = get();
        const usdBalance = state.balances.find(b => b.currency === 'USD');
        return usdBalance?.reserved || 0;
      },

      initializeWallet: async () => {
        // DISABLED: This function reads from wallets table (demo/mock data)
        // Wallet balance must come from on-chain data via useUSDCBalance hook
        // Escrow data comes from useWalletSummary hook
        console.log('[FCZ-PAY] initializeWallet() called but disabled - use on-chain hooks instead');
        set({ 
          balances: [],
          transactions: [],
          isLoading: false,
          error: null
        });
      },

      refreshWalletData: async () => {
        await get().initializeWallet();
      },

      // Lock funds method for predictions (creates bet_lock transaction)
      lockFunds: async (amount: number, currency: 'USD' = 'USD') => {
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          
          if (!currentBalance || currentBalance.available < amount) {
            throw new Error('Insufficient funds');
          }

          // Update local state immediately
          const newAvailable = currentBalance.available - amount;
          const newReserved = currentBalance.reserved + amount;

          // Create transaction record for locking funds
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'bet_lock',
            amount: amount,
            description: 'Funds locked for prediction',
            date: new Date(),
            status: 'completed',
            reference: `LOCK_${Date.now()}`,
            currency: currency,
            fee: 0
          };

          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, reserved: newReserved, total: newAvailable + newReserved }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            error: null
          }));

          console.log('✅ Funds locked successfully with transaction record:', amount, currency);

          // Persist to database if user is authenticated
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: newAvailable,
                  reserved_balance: newReserved,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id,currency'
                });

              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: transaction.type,
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  created_at: new Date().toISOString()
                });
            }
          } catch (dbError) {
            console.log('⚠️ Could not update database, using local state only');
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to lock funds';
          set({ error: errorMessage });
          throw error;
        }
      },

      addFunds: async (amount: number, currency: 'USD' = 'USD', method: string = 'Bank Transfer') => {
        set({ isLoading: true, error: null });
        
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          const newAvailable = (currentBalance?.available || 0) + amount;
          const newTotal = newAvailable + (currentBalance?.reserved || 0);

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'deposit',
            amount: amount,
            description: `${method} Deposit`,
            date: new Date(),
            status: 'completed',
            reference: `DEP_${Date.now()}`,
            currency: currency,
            fee: 0
          };

          // Update state
          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, total: newTotal }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            isLoading: false,
            error: null
          }));

          // CRITICAL: Save to database for persistence
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // Update wallet balance in database
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: newAvailable,
                  reserved_balance: currentBalance?.reserved || 0,
                  total_deposited: (currentBalance?.available || 0) + amount,
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'user_id,currency'
                });

              // Create transaction record in database
              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: transaction.type,
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  created_at: new Date().toISOString()
                });

              console.log('✅ Funds added and saved to database:', amount, currency);
            }
          } catch (dbError) {
            console.error('❌ Failed to save to database:', dbError);
            // Don't throw error here - local state is updated, just log the issue
          }

          return transaction;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add funds';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      withdraw: async (amount: number, currency: 'USD' = 'USD', destination: string = 'Bank Account') => {
        set({ isLoading: true, error: null });
        
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          
          if (!currentBalance || currentBalance.available < amount) {
            throw new Error('Insufficient funds');
          }

          const newAvailable = currentBalance.available - amount;
          const newTotal = newAvailable + currentBalance.reserved;

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'withdraw',
            amount: amount,
            description: `Withdrawal to ${destination}`,
            date: new Date(),
            status: 'completed',
            reference: `WTH_${Date.now()}`,
            currency: currency,
            fee: 0
          };

          // Update state
          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, total: newTotal }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            isLoading: false,
            error: null
          }));

          // Persist to database
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: newAvailable,
                  reserved_balance: currentBalance.reserved,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,currency' });

              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: transaction.type,
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  created_at: new Date().toISOString()
                });
            }
          } catch (dbError) {
            console.error('❌ Failed to persist withdrawal:', dbError);
          }

          console.log('✅ Withdrawal successful:', amount, currency);
          return transaction;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to withdraw funds';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      makePrediction: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true, error: null });
        
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          
          if (!currentBalance || currentBalance.available < amount) {
            throw new Error('Insufficient funds');
          }

          const newAvailable = currentBalance.available - amount;
          const newReserved = currentBalance.reserved + amount;
          const newTotal = newAvailable + newReserved;

          // Create transaction (lock)
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'bet_lock',
            amount: amount,
            description: description,
            date: new Date(),
            status: 'completed',
            reference: `PRED_${Date.now()}`,
            currency: currency,
            fee: 0,
            predictionId: predictionId
          };

          // Update state
          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, reserved: newReserved, total: newTotal }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            isLoading: false,
            error: null
          }));

          // Persist to database
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: newAvailable,
                  reserved_balance: newReserved,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,currency' });

              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: transaction.type,
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  created_at: new Date().toISOString()
                });
            }
          } catch (dbError) {
            console.error('❌ Failed to persist prediction lock:', dbError);
          }

          console.log('✅ Prediction made successfully:', amount, currency);
          return transaction;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to make prediction';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      recordWin: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true, error: null });
        
        try {
          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          const newAvailable = (currentBalance?.available || 0) + amount;
          const newReserved = Math.max(0, (currentBalance?.reserved || 0) - amount);
          const newTotal = newAvailable + newReserved;

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'win',
            amount: amount,
            description: description,
            date: new Date(),
            status: 'completed',
            reference: `WIN_${Date.now()}`,
            currency: currency,
            fee: 0,
            predictionId: predictionId
          };

          // Update state
          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, reserved: newReserved, total: newTotal }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            isLoading: false,
            error: null
          }));

          // Persist to database
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: newAvailable,
                  reserved_balance: newReserved,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,currency' });

              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: 'bet_release',
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  prediction_id: predictionId,
                  created_at: new Date().toISOString()
                });
            }
          } catch (dbError) {
            console.error('❌ Failed to persist win:', dbError);
          }

          console.log('✅ Win recorded successfully:', amount, currency);
          return transaction;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to record win';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      recordLoss: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true, error: null });
        
        try {
          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          const newReserved = Math.max(0, (currentBalance?.reserved || 0) - amount);
          const newTotal = (currentBalance?.available || 0) + newReserved;

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'loss',
            amount: amount,
            description: description,
            date: new Date(),
            status: 'completed',
            reference: `LOSS_${Date.now()}`,
            currency: currency,
            fee: 0,
            predictionId: predictionId
          };

          // Update state
          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, reserved: newReserved, total: newTotal }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            isLoading: false,
            error: null
          }));

          // Persist to database
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: currentBalance?.available || 0,
                  reserved_balance: newReserved,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,currency' });

              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: 'loss',
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  prediction_id: predictionId,
                  created_at: new Date().toISOString()
                });
            }
          } catch (dbError) {
            console.error('❌ Failed to persist loss:', dbError);
          }

          console.log('✅ Loss recorded successfully:', amount, currency);
          return transaction;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to record loss';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      transferFunds: async (amount: number, toUser: string, description?: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true, error: null });
        
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          const state = get();
          const currentBalance = state.balances.find(b => b.currency === currency);
          
          if (!currentBalance || currentBalance.available < amount) {
            throw new Error('Insufficient funds');
          }

          const newAvailable = currentBalance.available - amount;
          const newTotal = newAvailable + currentBalance.reserved;

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'transfer_out',
            amount: amount,
            description: description || `Transfer to ${toUser}`,
            date: new Date(),
            status: 'completed',
            reference: `TRF_${Date.now()}`,
            currency: currency,
            fee: 0,
            toUser: toUser
          };

          // Update state
          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, total: newTotal }
                : balance
            ),
            transactions: [transaction, ...state.transactions],
            isLoading: false,
            error: null
          }));

          // Persist to database
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from('wallets')
                .upsert({
                  user_id: user.id,
                  currency: currency,
                  available_balance: newAvailable,
                  reserved_balance: currentBalance.reserved,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,currency' });

              await supabase
                .from('wallet_transactions')
                .insert({
                  user_id: user.id,
                  type: transaction.type,
                  currency: transaction.currency,
                  amount: transaction.amount,
                  status: transaction.status,
                  reference: transaction.reference,
                  description: transaction.description,
                  to_user: toUser,
                  created_at: new Date().toISOString()
                });
            }
          } catch (dbError) {
            console.error('❌ Failed to persist transfer:', dbError);
          }

          console.log('✅ Transfer successful:', amount, currency);
          return transaction;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to transfer funds';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      getBalance: (currency: 'USD' = 'USD') => {
        const state = get();
        const balance = state.balances.find(b => b.currency === currency);
        return balance?.available || 0;
      },

      getTransactionHistory: (filters?: { type?: string; currency?: string; limit?: number }) => {
        const state = get();
        let transactions = [...state.transactions];

        if (filters?.type) {
          transactions = transactions.filter(tx => tx.type === filters.type);
        }

        if (filters?.currency) {
          transactions = transactions.filter(tx => tx.currency === filters.currency);
        }

        if (filters?.limit) {
          transactions = transactions.slice(0, filters.limit);
        }

        return transactions;
      },

      clearError: () => {
        set({ error: null });
      }
    })
  );