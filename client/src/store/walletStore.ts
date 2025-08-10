import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'prediction' | 'win' | 'loss' | 'refund' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  date: Date;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  currency: 'NGN' | 'USD' | 'USDT' | 'ETH';
  fee?: number;
  fromUser?: string;
  toUser?: string;
  predictionId?: string;
}

interface WalletBalance {
  currency: 'NGN' | 'USD' | 'USDT' | 'ETH';
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
  addFunds: (amount: number, currency?: 'NGN' | 'USD' | 'USDT' | 'ETH', method?: string) => Promise<Transaction>;
  withdraw: (amount: number, currency?: 'NGN' | 'USD' | 'USDT' | 'ETH', destination?: string) => Promise<Transaction>;
  makePrediction: (amount: number, description: string, predictionId: string, currency?: 'NGN' | 'USD' | 'USDT' | 'ETH') => Promise<Transaction>;
  recordWin: (amount: number, description: string, predictionId: string, currency?: 'NGN' | 'USD' | 'USDT' | 'ETH') => Promise<Transaction>;
  recordLoss: (amount: number, description: string, predictionId: string, currency?: 'NGN' | 'USD' | 'USDT' | 'ETH') => Promise<Transaction>;
  transferFunds: (amount: number, toUser: string, description?: string, currency?: 'NGN' | 'USD' | 'USDT' | 'ETH') => Promise<Transaction>;
  getBalance: (currency?: 'NGN' | 'USD' | 'USDT' | 'ETH') => number;
  getTransactionHistory: (filters?: { type?: string; currency?: string; limit?: number }) => Transaction[];
  simulateNetworkDelay: () => Promise<void>;
  clearError: () => void;
  refreshWalletData: () => Promise<void>;
}

const generateDemoReference = (type: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DEMO_${type.toUpperCase()}_${timestamp}_${random}`;
};

const showDemoNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 9999;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Set background color based on type
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#10b981';
      break;
    case 'error':
      notification.style.backgroundColor = '#ef4444';
      break;
    case 'info':
      notification.style.backgroundColor = '#3b82f6';
      break;
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  const remove = () => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  };
  
  notification.onclick = remove;
  setTimeout(remove, 5000);
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      balances: [
        { currency: 'USD', available: 0, reserved: 0, total: 0 },
        { currency: 'NGN', available: 0, reserved: 0, total: 0 },
        { currency: 'USDT', available: 0, reserved: 0, total: 0 },
        { currency: 'ETH', available: 0, reserved: 0, total: 0 },
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

          // Fetch wallet data from database
          const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id);

          if (walletError) {
            console.error('❌ Error fetching wallet data:', walletError);
            return;
          }

          // Fetch transaction history from database
          const { data: transactionData, error: transactionError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (transactionError) {
            console.error('❌ Error fetching transaction data:', transactionError);
            return;
          }

          // Convert database data to store format
          const balances: WalletBalance[] = walletData?.map(wallet => ({
            currency: wallet.currency as 'NGN' | 'USD' | 'USDT' | 'ETH',
            available: wallet.available_balance || 0,
            reserved: wallet.reserved_balance || 0,
            total: (wallet.available_balance || 0) + (wallet.reserved_balance || 0), // Calculate total
          })) || [
            { currency: 'USD', available: 0, reserved: 0, total: 0 },
            { currency: 'NGN', available: 0, reserved: 0, total: 0 },
            { currency: 'USDT', available: 0, reserved: 0, total: 0 },
            { currency: 'ETH', available: 0, reserved: 0, total: 0 },
          ];

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
        if (isDemoMode) {
          showDemoNotification('Demo mode enabled - All transactions are simulated', 'info');
        }
      },

      simulateNetworkDelay: async () => {
        const delay = Math.random() * 1000 + 500; // 500-1500ms delay
        await new Promise(resolve => setTimeout(resolve, delay));
      },

      addFunds: async (amount: number, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD', method: string = 'Bank Transfer') => {
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

          showDemoNotification(
            `Successfully deposited ${amount.toLocaleString()} ${currency}${isDemoMode ? ' (Demo)' : ''}`,
            'success'
          );

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
          showDemoNotification(errorMessage, 'error');
          throw error;
        }
      },

      // ... rest of the methods remain similar but use database operations
      withdraw: async (amount: number, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD', destination: string = 'Bank Account') => {
        const { isDemoMode, simulateNetworkDelay, getBalance } = get();
        
        set({ isLoading: true, error: null });
        
        try {
          const currentBalance = getBalance(currency);
          
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

          showDemoNotification(`Withdrew ${amount.toLocaleString()} ${currency} to ${destination}`, 'success');
          
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
          showDemoNotification(errorMessage, 'error');
          throw error;
        }
      },

      makePrediction: async (amount: number, description: string, predictionId: string, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD') => {
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
              prediction_id: predictionId,
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

      recordWin: async (amount: number, description: string, predictionId: string, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD') => {
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
              prediction_id: predictionId,
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

      recordLoss: async (amount: number, description: string, predictionId: string, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD') => {
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
              prediction_id: predictionId,
              fee: 0
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

      transferFunds: async (amount: number, toUser: string, description: string = 'P2P Transfer', currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD') => {
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

          showDemoNotification(`Transferred ${amount.toLocaleString()} ${currency} to ${toUser}`, 'success');
          
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

      getBalance: (currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'USD') => {
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
    }),
    {
      name: 'fanclubz-wallet-storage',
      version: 3, // Incremented to force reset with new database-driven approach
    }
  )
);
