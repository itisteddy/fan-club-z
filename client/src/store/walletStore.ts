import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'prediction' | 'win' | 'loss' | 'refund' | 'transfer_in' | 'transfer_out';
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
  total: number; // This will be calculated as available + reserved
}

interface WalletState {
  balances: WalletBalance[];
  transactions: Transaction[];
  isDemoMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeWallet: () => Promise<void>;
  setDemoMode: (isDemoMode: boolean) => void;
  addFunds: (amount: number, currency?: 'USD', method?: string) => Promise<Transaction>;
  withdraw: (amount: number, currency?: 'USD', destination?: string) => Promise<Transaction>;
  makePrediction: (amount: number, description: string, predictionId: string, currency?: 'USD') => Promise<Transaction>;
  recordWin: (amount: number, description: string, predictionId: string, currency?: 'USD') => Promise<Transaction>;
  recordLoss: (amount: number, description: string, predictionId: string, currency?: 'USD') => Promise<Transaction>;
  transferFunds: (amount: number, toUser: string, description?: string, currency?: 'USD') => Promise<Transaction>;
  getBalance: (currency?: 'USD') => number;
  getTransactionHistory: (filters?: { type?: string; currency?: string; limit?: number }) => Transaction[];
  simulateNetworkDelay: () => Promise<void>;
  clearError: () => void;
  refreshWalletData: () => Promise<void>;
  resetDemoBalance: () => Promise<void>;
}

const generateDemoReference = (type: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DEMO_${type.toUpperCase()}_${timestamp}_${random}`;
};

// Removed showDemoNotification function to prevent duplicate notifications
// All notifications now handled by react-hot-toast for consistency

export const useWalletStore = create<WalletState>()(
    (set, get) => ({
      balances: [
        { currency: 'USD', available: 0, reserved: 0, total: 0 },
      ],
      transactions: [],
      isDemoMode: true,
      isLoading: false,
      error: null,

      initializeWallet: async () => {
        const state = get();
        console.log('🔄 Initializing wallet with real database data...');
        
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.log('⚠️ No authenticated user found for wallet initialization');
            return;
          }

          // Fetch wallet data and recent transactions in parallel for better performance
          const [walletResult, transactionResult] = await Promise.all([
            supabase
              .from('wallets')
              .select('*')
              .eq('user_id', user.id),
            supabase
              .from('wallet_transactions')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20) // Reduced limit for faster loading
          ]);

          const { data: walletData, error: walletError } = walletResult;
          const { data: transactionData, error: transactionError } = transactionResult;

          if (walletError) {
            console.error('❌ Error fetching wallet data:', walletError);
            return;
          }

          if (transactionError) {
            console.error('❌ Error fetching transaction data:', transactionError);
            // Continue without transactions rather than failing completely
          }

          // Convert database data to store format
          let balances: WalletBalance[];
          
          if (walletData && walletData.length > 0) {
          // User has existing wallet data - filter to only USD
          const usdWallet = walletData.find(w => w.currency === 'USD');
          balances = usdWallet ? [{
              currency: 'USD',
              available: usdWallet.available_balance || 0,
              reserved: usdWallet.reserved_balance || 0,
              total: (usdWallet.available_balance || 0) + (usdWallet.reserved_balance || 0),
            }] : [{ currency: 'USD', available: 0, reserved: 0, total: 0 }];
          } else {
            // New user - create default wallet with $0 balance
            console.log('🆕 Creating default wallet for new user with $0 balance');
            balances = [
              { currency: 'USD', available: 0, reserved: 0, total: 0 },
            ];
            
            // Create wallet records in database for new user - optimized for performance
            try {
              // Create only USD wallet record for MVP
              const walletRecord = {
                user_id: user.id,
                currency: 'USD',
                available_balance: 0,
                reserved_balance: 0,
                total_deposited: 0,
                total_withdrawn: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              const { error: bulkError } = await supabase
                .from('wallets')
                .insert([walletRecord]);
              
              if (bulkError) {
                console.error('❌ Error creating default wallet records:', bulkError);
              } else {
                console.log('✅ Default wallet records created for new user');
              }
            } catch (error) {
              console.error('❌ Error creating default wallet records:', error);
            }
          }

          const transactions: Transaction[] = transactionData?.map(tx => ({
            id: tx.id,
            type: tx.type as any,
            amount: tx.amount || 0,
            description: tx.description || '',
            date: new Date(tx.created_at),
            status: tx.status as any,
            reference: tx.reference,
            currency: tx.currency as any,
            fee: tx.fee,
            fromUser: tx.from_user,
            toUser: tx.to_user,
          })) || [];

          set({ 
            balances, 
            transactions,
            isLoading: false,
            error: null
          });

          console.log('✅ Wallet initialized with real database data:', {
            balances: balances.length,
            transactions: transactions.length
          });

        } catch (error) {
          console.error('❌ Error initializing wallet:', error);
          set({ isLoading: false, error: 'Failed to initialize wallet' });
        }
      },

      refreshWalletData: async () => {
        await get().initializeWallet();
      },

      setDemoMode: (isDemoMode: boolean) => {
        set({ isDemoMode });
        // Demo mode notification handled by UI component if needed
      },

      simulateNetworkDelay: async () => {
        // Reduced delay for better performance - only 100-300ms
        const delay = Math.random() * 200 + 100; // 100-300ms delay
        await new Promise(resolve => setTimeout(resolve, delay));
      },

      addFunds: async (amount: number, currency: 'USD' = 'USD', method: string = 'Bank Transfer') => {
        const { isDemoMode, simulateNetworkDelay } = get();
        
        set({ isLoading: true, error: null });
        
        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          if (isDemoMode) {
            await simulateNetworkDelay();
            
            // Reduce failure rate for better demo experience
            if (Math.random() < 0.05) { // 5% failure rate
              throw new Error('Payment temporarily unavailable - Please try again');
            }
          }

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Create transaction record in database
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
            type: 'deposit',
              amount: amount,
            description: `${method} Deposit${isDemoMode ? ' (Demo)' : ''}`,
              currency: currency,
              status: 'completed',
            reference: generateDemoReference('deposit'),
              fee: 0
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance in database
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: amount,
              reserved_balance: 0,
              total_deposited: amount,
              total_withdrawn: 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          // Success notification handled by UI component

          return {
            id: transaction.id,
            type: 'deposit',
            amount,
            description: `${method} Deposit${isDemoMode ? ' (Demo)' : ''}`,
            date: new Date(transaction.created_at),
            status: 'completed',
            reference: transaction.reference,
            currency,
            fee: 0
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Deposit failed';
          set({ error: errorMessage, isLoading: false });
          // Error notification handled by UI component
          throw error;
        }
      },

      // ... rest of the methods remain similar but use database operations
      withdraw: async (amount: number, currency: 'USD' = 'USD', destination: string = 'Bank Account') => {
        const { isDemoMode, simulateNetworkDelay, getBalance } = get();
        
        set({ isLoading: true, error: null });

        try {
          const currentBalance = getBalance(currency);
          
          // Prevent negative balances
          if (amount > currentBalance) {
            throw new Error('Insufficient funds for withdrawal');
          }

          // For demo mode, prevent withdrawals that would result in negative balance
          if (isDemoMode && amount >= currentBalance) {
            throw new Error('Demo mode: Cannot withdraw all funds. Please keep some balance for testing.');
          }

          if (isDemoMode) {
            await simulateNetworkDelay();
          }

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Get current wallet data
          const { data: currentWallet, error: walletFetchError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .eq('currency', currency)
            .single();

          if (walletFetchError && walletFetchError.code !== 'PGRST116') {
            throw new Error(`Failed to fetch wallet: ${walletFetchError.message}`);
          }

          // Calculate new balance
          const newAvailableBalance = currentWallet ? 
            Math.max(0, currentWallet.available_balance - amount) : 0;
          const newTotalWithdrawn = currentWallet ? 
            currentWallet.total_withdrawn + amount : amount;

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'withdraw',
              amount: -amount, // Negative for withdrawal
              description: `${destination} Withdrawal${isDemoMode ? ' (Demo)' : ''}`,
              currency: currency,
              status: 'completed',
              reference: generateDemoReference('withdraw'),
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
              available_balance: newAvailableBalance,
              reserved_balance: currentWallet?.reserved_balance || 0,
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

          // Success notification handled by UI component

          return {
            id: transaction.id,
            type: 'withdraw',
            amount,
            description: `${destination} Withdrawal${isDemoMode ? ' (Demo)' : ''}`,
            date: new Date(transaction.created_at),
            status: 'completed',
            reference: transaction.reference,
            currency,
            fee: 0
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
          set({ error: errorMessage, isLoading: false });
          // Error notification handled by UI component
          throw error;
        }
      },

      // Add reset demo balance function
      resetDemoBalance: async () => {
        const { isDemoMode } = get();
        
        if (!isDemoMode) {
          throw new Error('Reset balance is only available in demo mode');
        }

        set({ isLoading: true, error: null });

        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Reset balance to demo amount - USD only
          const demoBalance = {
            currency: 'USD', 
            available_balance: 1000, 
            total_deposited: 1000 
          };

          await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: demoBalance.currency,
              available_balance: demoBalance.available_balance,
              reserved_balance: 0,
              total_deposited: demoBalance.total_deposited,
              total_withdrawn: 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          // Refresh wallet data
          await get().refreshWalletData();

          // Success notification handled by UI component

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset demo balance';
          set({ error: errorMessage, isLoading: false });
          // Error notification handled by UI component
          throw error;
        }
      },

      makePrediction: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        const { getBalance } = get();
        
        const currentBalance = getBalance(currency);
        
        if (amount > currentBalance) {
          throw new Error('Insufficient funds for prediction');
        }

        set({ isLoading: true });

        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'prediction_lock',
              amount: -amount, // Negative for prediction lock
              description: description,
              currency: currency,
              status: 'completed',
              reference: generateDemoReference('prediction'),
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
              available_balance: -amount,
              reserved_balance: amount, // Reserve the amount
              total_deposited: 0,
              total_withdrawn: 0,
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
          amount,
          description,
            date: new Date(transaction.created_at),
          status: 'completed',
            reference: transaction.reference,
          currency,
          predictionId
        };

        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      recordWin: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true });

        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'prediction_release',
              amount: amount,
              description: description,
              currency: currency,
              status: 'completed',
              reference: generateDemoReference('win'),
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
              available_balance: amount,
              reserved_balance: 0,
              total_deposited: amount,
              total_withdrawn: 0,
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
          amount,
          description,
            date: new Date(transaction.created_at),
          status: 'completed',
            reference: transaction.reference,
          currency,
          predictionId
        };

        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      recordLoss: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        set({ isLoading: true });

        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'prediction_release',
              amount: 0, // No winnings
              description: description,
              currency: currency,
          status: 'completed',
          reference: generateDemoReference('loss'),
            })
            .select()
            .single();

          if (transactionError) {
            throw new Error(`Failed to record transaction: ${transactionError.message}`);
          }

          // Update wallet balance (release reserved amount)
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: currency,
              available_balance: 0,
              reserved_balance: 0,
              total_deposited: 0,
              total_withdrawn: 0,
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
            amount: 0,
            description,
            date: new Date(transaction.created_at),
            status: 'completed',
            reference: transaction.reference,
          currency,
          predictionId
        };

        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      transferFunds: async (amount: number, toUser: string, description: string = 'P2P Transfer', currency: 'USD' = 'USD') => {
        const { getBalance, isDemoMode, simulateNetworkDelay } = get();
        
        const currentBalance = getBalance(currency);
        
        if (amount > currentBalance) {
          throw new Error('Insufficient funds for transfer');
        }

        set({ isLoading: true });

        try {
          if (isDemoMode) {
            await simulateNetworkDelay();
          }

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Create transaction record
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              user_id: user.id,
              type: 'transfer_out',
              amount: -amount,
              description: `${description} to ${toUser}${isDemoMode ? ' (Demo)' : ''}`,
              currency: currency,
              status: 'completed',
              reference: generateDemoReference('transfer_out'),
              to_user: toUser,
              fee: amount * 0.005 // 0.5% transfer fee
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
              available_balance: -amount,
              reserved_balance: 0,
              total_deposited: 0,
              total_withdrawn: amount,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to update wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

          // Success notification handled by UI component
          
          return {
            id: transaction.id,
            type: 'transfer_out',
            amount,
            description: `${description} to ${toUser}${isDemoMode ? ' (Demo)' : ''}`,
            date: new Date(transaction.created_at),
            status: 'completed',
            reference: transaction.reference,
            currency,
            toUser,
            fee: amount * 0.005
          };

        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      getBalance: (currency: 'USD' = 'USD') => {
        const { balances } = get();
        const balance = balances.find(b => b.currency === currency);
        return balance?.available || 0;
      },

      getTransactionHistory: (filters?: { type?: string; currency?: string; limit?: number }) => {
        const { transactions } = get();
        let filtered = transactions;

        if (filters?.type) {
          filtered = filtered.filter(t => t.type === filters.type);
        }

        if (filters?.currency) {
          filtered = filtered.filter(t => t.currency === filters.currency);
        }

        if (filters?.limit) {
          filtered = filtered.slice(0, filters.limit);
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      clearError: () => {
        set({ error: null });
      }
    })
);
