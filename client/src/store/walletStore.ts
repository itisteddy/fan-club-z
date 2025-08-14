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
  isDemoMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Computed properties for easy access
  balance: number; // Available USD balance
  totalBalance: number; // Total USD balance (available + reserved)
  reservedBalance: number; // Reserved USD balance
  
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

export const useWalletStore = create<WalletState>()(
    (set, get) => ({
      balances: [
        { currency: 'USD', available: 0, reserved: 0, total: 0 },
      ],
      transactions: [],
      isDemoMode: true,
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
              .limit(20)
          ]);

          const { data: walletData, error: walletError } = walletResult;
          const { data: transactionData, error: transactionError } = transactionResult;

          if (walletError) {
            console.error('❌ Error fetching wallet data:', walletError);
            set({ isLoading: false, error: 'Failed to load wallet data' });
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
            if (usdWallet) {
              const available = Number(usdWallet.available_balance) || 0;
              const reserved = Number(usdWallet.reserved_balance) || 0;
              balances = [{
                currency: 'USD',
                available,
                reserved,
                total: available + reserved,
              }];
            } else {
              balances = [{ currency: 'USD', available: 0, reserved: 0, total: 0 }];
            }
          } else {
            // New user - create default wallet with $1000 demo balance
            console.log('🆕 Creating default wallet for new user with $1000 demo balance');
            balances = [
              { currency: 'USD', available: 1000, reserved: 0, total: 1000 },
            ];
            
            // Create wallet records in database for new user
            try {
              const walletRecord = {
                user_id: user.id,
                currency: 'USD',
                available_balance: 1000, // Start with demo balance
                reserved_balance: 0,
                total_deposited: 1000,
                total_withdrawn: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
              const { error: insertError } = await supabase
                .from('wallets')
                .insert([walletRecord]);
              
              if (insertError) {
                console.error('❌ Error creating default wallet records:', insertError);
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
            amount: Number(tx.amount) || 0,
            description: tx.description || '',
            date: new Date(tx.created_at),
            status: tx.status as any,
            reference: tx.reference,
            currency: tx.currency as any,
            fee: Number(tx.fee) || 0,
            fromUser: tx.from_user,
            toUser: tx.to_user,
            predictionId: tx.prediction_id,
          })) || [];

          set({ 
            balances, 
            transactions,
            isLoading: false,
            error: null
          });

          console.log('✅ Wallet initialized with real database data:', {
            balances: balances.length,
            transactions: transactions.length,
            usdBalance: balances.find(b => b.currency === 'USD')
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
      },

      simulateNetworkDelay: async () => {
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
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      withdraw: async (amount: number, currency: 'USD' = 'USD', destination: string = 'Bank Account') => {
        const { isDemoMode, simulateNetworkDelay, getBalance } = get();
        
        set({ isLoading: true, error: null });

        try {
          const currentBalance = getBalance(currency);
          
          // Prevent negative balances
          if (amount > currentBalance) {
            throw new Error('Insufficient funds for withdrawal');
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
          const newAvailableBalance = Math.max(0, (Number(currentWallet?.available_balance) || 0) - amount);
          const newTotalWithdrawn = (Number(currentWallet?.total_withdrawn) || 0) + amount;

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
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      // Reset demo balance function
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
          const { error: walletError } = await supabase
            .from('wallets')
            .upsert({
              user_id: user.id,
              currency: 'USD',
              available_balance: 1000,
              reserved_balance: 0,
              total_deposited: 1000,
              total_withdrawn: 0,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,currency'
            });

          if (walletError) {
            throw new Error(`Failed to reset wallet: ${walletError.message}`);
          }

          // Refresh wallet data
          await get().refreshWalletData();

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reset demo balance';
          set({ error: errorMessage, isLoading: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      makePrediction: async (amount: number, description: string, predictionId: string, currency: 'USD' = 'USD') => {
        const { getBalance } = get();
        
        const currentBalance = getBalance(currency);
        
        if (amount > currentBalance) {
          throw new Error('Insufficient funds for prediction');
        }

        set({ isLoading: true, error: null });

        try {
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

          // Calculate new balances
          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const newAvailable = currentAvailable - amount;
          const newReserved = currentReserved + amount;

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
              prediction_id: predictionId,
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
        } finally {
          set({ isLoading: false });
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

          // Calculate new balances (release reserved funds + add winnings)
          const currentAvailable = Number(currentWallet?.available_balance) || 0;
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const newAvailable = currentAvailable + amount;
          const newReserved = Math.max(0, currentReserved - amount); // Reduce reserved by original stake

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
              prediction_id: predictionId,
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
        } finally {
          set({ isLoading: false });
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

          // Calculate new balances (release reserved funds, no winnings)
          const currentReserved = Number(currentWallet?.reserved_balance) || 0;
          const newReserved = Math.max(0, currentReserved - amount); // Release the lost amount

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
              prediction_id: predictionId,
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
        } finally {
          set({ isLoading: false });
        }
      },

      transferFunds: async (amount: number, toUser: string, description: string = 'P2P Transfer', currency: 'USD' = 'USD') => {
        const { getBalance, isDemoMode, simulateNetworkDelay } = get();
        
        const currentBalance = getBalance(currency);
        
        if (amount > currentBalance) {
          throw new Error('Insufficient funds for transfer');
        }

        set({ isLoading: true, error: null });

        try {
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
          const transferFee = amount * 0.005; // 0.5% transfer fee
          const totalDeducted = amount + transferFee;
          const newAvailableBalance = (Number(currentWallet?.available_balance) || 0) - totalDeducted;
          const newTotalWithdrawn = (Number(currentWallet?.total_withdrawn) || 0) + totalDeducted;

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
              fee: transferFee
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
            fee: transferFee
          };

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Transfer failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        } finally {
          set({ isLoading: false });
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
