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
        { currency: 'USD', available: 0, reserved: 0, total: 0 },
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
        console.log('🔄 Initializing wallet with real database data...');
        set({ isLoading: true, error: null });
        
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log('⚠️ No authenticated user found for wallet initialization');
            set({ isLoading: false });
            return;
          }

          console.log('👤 Initializing wallet for user:', user.id);

          // Fetch wallet data from database
          const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id);

          if (walletError) {
            console.error('❌ Error fetching wallet data:', walletError);
            set({ isLoading: false, error: 'Failed to load wallet data' });
            return;
          }

          // Transform wallet data
          const balances = walletData?.map(wallet => ({
            currency: wallet.currency as 'USD',
            available: Number(wallet.available_balance) || 0,
            reserved: Number(wallet.reserved_balance) || 0,
            total: Number(wallet.available_balance || 0) + Number(wallet.reserved_balance || 0)
          })) || [{ currency: 'USD', available: 0, reserved: 0, total: 0 }];

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
          set({
            isLoading: false,
            error: 'Failed to initialize wallet'
          });
        }
      },

      refreshWalletData: async () => {
        await get().initializeWallet();
      },

      addFunds: async (amount: number, currency: 'USD' = 'USD', method: string = 'Bank Transfer') => {
        set({ isLoading: true, error: null });
        
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet balance
          const { data: currentWallet, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            throw new Error(`Failed to fetch current balance: ${fetchError.message}`);
          }

          // Calculate new balance
          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const currentTotalDeposited = Number(currentWallet?.total_deposited) || 0;
          const newAvailable = currentAvailable + amount;
          const newTotalDeposited = currentTotalDeposited + amount;

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'deposit',
              amount: amount,
              description: `${method} Deposit`,
              currency: currency,
              status: 'completed',
              reference: `DEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: newAvailable,
              reserved_balance: currentReserved,
              total_deposited: newTotalDeposited,
              total_withdrawn: currentWallet?.total_withdrawn || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          return {
            id: transaction.id,
            type: 'deposit',
            amount: Number(transaction.amount),
            description: transaction.description,
            date: new Date(transaction.created_at),
            status: transaction.status as Transaction['status'],
            reference: transaction.reference,
            currency: transaction.currency as 'USD',
            fee: transaction.fee ? Number(transaction.fee) : undefined
          };

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

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet balance
          const { data: currentWallet, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch current balance: ${fetchError.message}`);
          }

          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          
          // Check if user has sufficient funds
          if (currentAvailable < amount) {
            throw new Error('Insufficient funds');
          }

          // Calculate new balance
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const currentTotalWithdrawn = Number(currentWallet?.total_withdrawn) || 0;
          const newAvailable = currentAvailable - amount;
          const newTotalWithdrawn = currentTotalWithdrawn + amount;

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'withdraw',
              amount: amount,
              description: `Withdrawal to ${destination}`,
              currency: currency,
              status: 'completed',
              reference: `WTH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: newAvailable,
              reserved_balance: currentReserved,
              total_deposited: currentWallet?.total_deposited || 0,
              total_withdrawn: newTotalWithdrawn,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          return {
            id: transaction.id,
            type: 'withdraw',
            amount: Number(transaction.amount),
            description: transaction.description,
            date: new Date(transaction.created_at),
            status: transaction.status as Transaction['status'],
            reference: transaction.reference,
            currency: transaction.currency as 'USD',
            fee: transaction.fee ? Number(transaction.fee) : undefined
          };

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

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet balance
          const { data: currentWallet, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch current balance: ${fetchError.message}`);
          }

          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          
          // Check if user has sufficient funds
          if (currentAvailable < amount) {
            throw new Error('Insufficient funds');
          }

          // Calculate new balance
          const newAvailable = currentAvailable - amount;
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const newReserved = currentReserved + amount;

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'prediction',
              amount: amount,
              description: description,
              currency: currency,
              status: 'completed',
              reference: `PRED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0,
              prediction_id: predictionId
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: newAvailable,
              reserved_balance: newReserved,
              total_deposited: currentWallet?.total_deposited || 0,
              total_withdrawn: currentWallet?.total_withdrawn || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          return {
            id: transaction.id,
            type: 'prediction',
            amount: Number(transaction.amount),
            description: transaction.description,
            date: new Date(transaction.created_at),
            status: transaction.status as Transaction['status'],
            reference: transaction.reference,
            currency: transaction.currency as 'USD',
            fee: transaction.fee ? Number(transaction.fee) : undefined,
            predictionId: transaction.prediction_id
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to make prediction';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      recordWin: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true, error: null });
        
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet balance
          const { data: currentWallet, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch current balance: ${fetchError.message}`);
          }

          // Calculate new balance
          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const newAvailable = currentAvailable + amount;
          const newReserved = currentReserved - amount; // Release reserved amount

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'win',
              amount: amount,
              description: description,
              currency: currency,
              status: 'completed',
              reference: `WIN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0,
              prediction_id: predictionId
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: newAvailable,
              reserved_balance: newReserved,
              total_deposited: currentWallet?.total_deposited || 0,
              total_withdrawn: currentWallet?.total_withdrawn || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          return {
            id: transaction.id,
            type: 'win',
            amount: Number(transaction.amount),
            description: transaction.description,
            date: new Date(transaction.created_at),
            status: transaction.status as Transaction['status'],
            reference: transaction.reference,
            currency: transaction.currency as 'USD',
            fee: transaction.fee ? Number(transaction.fee) : undefined,
            predictionId: transaction.prediction_id
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to record win';
          set({ isLoading: false, error: errorMessage });
          throw error;
        }
      },

      recordLoss: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true, error: null });
        
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet balance
          const { data: currentWallet, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch current balance: ${fetchError.message}`);
          }

          // Calculate new balance
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const newReserved = currentReserved - amount; // Release reserved amount

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'loss',
              amount: amount,
              description: description,
              currency: currency,
              status: 'completed',
              reference: `LOSS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0,
              prediction_id: predictionId
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: currentWallet?.available_balance || 0,
              reserved_balance: newReserved,
              total_deposited: currentWallet?.total_deposited || 0,
              total_withdrawn: currentWallet?.total_withdrawn || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          return {
            id: transaction.id,
            type: 'loss',
            amount: Number(transaction.amount),
            description: transaction.description,
            date: new Date(transaction.created_at),
            status: transaction.status as Transaction['status'],
            reference: transaction.reference,
            currency: transaction.currency as 'USD',
            fee: transaction.fee ? Number(transaction.fee) : undefined,
            predictionId: transaction.prediction_id
          };

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

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet balance
          const { data: currentWallet, error: fetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (fetchError) {
            throw new Error(`Failed to fetch current balance: ${fetchError.message}`);
          }

          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          
          // Check if user has sufficient funds
          if (currentAvailable < amount) {
            throw new Error('Insufficient funds');
          }

          // Calculate new balance
          const newAvailable = currentAvailable - amount;

          // Create outgoing transaction record
          const { data: outgoingTransaction, error: outgoingError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'transfer_out',
              amount: amount,
              description: description || `Transfer to ${toUser}`,
              currency: currency,
              status: 'completed',
              reference: `TRF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0,
              to_user: toUser
            })
            .select()
            .single();

          if (outgoingError) {
            throw new Error(`Failed to record outgoing transaction: ${outgoingError.message}`);
          }

          // Create incoming transaction record for recipient
          const { data: incomingTransaction, error: incomingError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: toUser,
              type: 'transfer_in',
              amount: amount,
              description: description || `Transfer from ${user.id}`,
              currency: currency,
              status: 'completed',
              reference: `TRF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              fee: 0,
              from_user: user.id
            })
            .select()
            .single();

          if (incomingError) {
            throw new Error(`Failed to record incoming transaction: ${incomingError.message}`);
          }

          // Update sender's wallet balance
          const { error: senderWalletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: newAvailable,
              reserved_balance: currentWallet?.reserved_balance || 0,
              total_deposited: currentWallet?.total_deposited || 0,
              total_withdrawn: currentWallet?.total_withdrawn || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (senderWalletError) {
            throw new Error(`Failed to update sender wallet: ${senderWalletError.message}`);
          }

          // Update recipient's wallet balance
          const { data: recipientWallet, error: recipientFetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', toUser)
            .eq('currency', currency)
            .single();

          const recipientAvailable = Number(recipientWallet?.available_balance) || 0;
          const newRecipientAvailable = recipientAvailable + amount;

          const { error: recipientWalletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: toUser,
              currency: currency,
              available_balance: newRecipientAvailable,
              reserved_balance: recipientWallet?.reserved_balance || 0,
              total_deposited: (recipientWallet?.total_deposited || 0) + amount,
              total_withdrawn: recipientWallet?.total_withdrawn || 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (recipientWalletError) {
            throw new Error(`Failed to update recipient wallet: ${recipientWalletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          return {
            id: outgoingTransaction.id,
            type: 'transfer_out',
            amount: Number(outgoingTransaction.amount),
            description: outgoingTransaction.description,
            date: new Date(outgoingTransaction.created_at),
            status: outgoingTransaction.status as Transaction['status'],
            reference: outgoingTransaction.reference,
            currency: outgoingTransaction.currency as 'USD',
            fee: outgoingTransaction.fee ? Number(outgoingTransaction.fee) : undefined,
            toUser: outgoingTransaction.to_user
          };

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
