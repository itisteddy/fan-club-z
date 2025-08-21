import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'prediction' | 'prediction_lock' | 'prediction_release' | 'win' | 'loss' | 'refund' | 'transfer_in' | 'transfer_out';
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

interface WalletState {
  balances: WalletBalance[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
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
      balances: [
        { currency: 'USD', available: 1000, reserved: 0, total: 1000 }, // Start with $1000 for demo
      ],
      transactions: [],
      isLoading: false,
      error: null,
      
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
        console.log('🔄 Initializing wallet...');
        set({ isLoading: true, error: null });
        
        try {
          // For demo purposes, we'll use local state with fallback to database
          const state = get();
          if (state.balances.length > 0 && state.balances[0].total > 0) {
            console.log('✅ Wallet already initialized with demo balance');
            set({ isLoading: false });
            return;
          }

          // Try to get from database first
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log('⚠️ No authenticated user found, using demo balance');
            set({ 
              balances: [{ currency: 'USD', available: 1000, reserved: 0, total: 1000 }],
              isLoading: false 
            });
            return;
          }

          console.log('👤 Fetching wallet for user:', user.id);

          // Fetch wallet data from database
          const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id);

          if (walletError && walletError.code !== 'PGRST116') {
            console.error('❌ Error fetching wallet data:', walletError);
            // Use demo balance as fallback
            set({ 
              balances: [{ currency: 'USD', available: 1000, reserved: 0, total: 1000 }],
              isLoading: false 
            });
            return;
          }

          // Transform wallet data
          const balances = walletData?.map(wallet => ({
            currency: wallet.currency as 'USD',
            available: Number(wallet.available_balance) || 0,
            reserved: Number(wallet.reserved_balance) || 0,
            total: Number(wallet.available_balance || 0) + Number(wallet.reserved_balance || 0)
          })) || [{ currency: 'USD', available: 1000, reserved: 0, total: 1000 }];

          // Ensure at least demo balance if no database balance
          if (balances.length === 0 || balances[0].total === 0) {
            balances[0] = { currency: 'USD', available: 1000, reserved: 0, total: 1000 };
          }

          // Fetch transaction history
          const { data: transactionData, error: transactionError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (transactionError) {
            console.error('❌ Error fetching transaction history:', transactionError);
          }

          // Transform transaction data
          const transactions = (transactionData || []).map(tx => ({
            id: tx.id,
            type: tx.type as Transaction['type'],
            amount: Number(tx.amount),
            description: tx.description,
            date: new Date(tx.created_at),
            status: tx.status as Transaction['status'],
            reference: tx.reference,
            currency: tx.currency as 'USD',
            fee: tx.fee ? Number(tx.fee) : undefined,
            fromUser: tx.from_user,
            toUser: tx.to_user,
            predictionId: tx.prediction_id
          }));

          set({
            balances,
            transactions,
            isLoading: false,
            error: null
          });

          console.log('✅ Wallet initialized successfully');
          console.log('💰 Balance:', balances[0]?.available || 0);
          console.log('📊 Transactions:', transactions.length);

        } catch (error) {
          console.error('❌ Error initializing wallet:', error);
          // Use demo balance as final fallback
          set({
            balances: [{ currency: 'USD', available: 1000, reserved: 0, total: 1000 }],
            isLoading: false,
            error: null
          });
        }
      },

      refreshWalletData: async () => {
        await get().initializeWallet();
      },

      // NEW: Lock funds method for predictions
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

          // Update local state immediately for demo
          const newAvailable = currentBalance.available - amount;
          const newReserved = currentBalance.reserved + amount;

          set(state => ({
            balances: state.balances.map(balance => 
              balance.currency === currency 
                ? { ...balance, available: newAvailable, reserved: newReserved, total: newAvailable + newReserved }
                : balance
            ),
            error: null
          }));

          console.log('✅ Funds locked successfully:', amount, currency);

          // Try to update database if user is authenticated
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

          console.log('✅ Funds added successfully:', amount, currency);
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

          // Create transaction
          const transaction: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'prediction',
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