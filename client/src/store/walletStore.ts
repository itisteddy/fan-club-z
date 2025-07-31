import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  total: number;
}

interface WalletState {
  balances: WalletBalance[];
  transactions: Transaction[];
  isDemoMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeWallet: () => void;
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
}

// Demo transaction references
const generateDemoReference = (type: string): string => {
  const prefixes = {
    deposit: 'DEP',
    withdraw: 'WTH',
    transfer_in: 'TIN',
    transfer_out: 'TOU',
    prediction: 'PRD',
    win: 'WIN',
    loss: 'LSS',
    refund: 'REF'
  };
  const prefix = prefixes[type as keyof typeof prefixes] || 'TXN';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}_${timestamp}${random}`;
};

// Demo notification system
const showDemoNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  // Create a temporary notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    max-width: 320px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
    cursor: pointer;
    ${type === 'success' ? 'background: linear-gradient(135deg, #10b981, #059669);' : ''}
    ${type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' : ''}
    ${type === 'info' ? 'background: linear-gradient(135deg, #3b82f6, #2563eb);' : ''}
  `;
  
  // Add animation keyframes to document if not already present
  if (!document.querySelector('#wallet-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'wallet-notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds or on click
  const remove = () => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
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
        { currency: 'NGN', available: 2500, reserved: 0, total: 2500 },
        { currency: 'USD', available: 0, reserved: 0, total: 0 },
        { currency: 'USDT', available: 0, reserved: 0, total: 0 },
        { currency: 'ETH', available: 0, reserved: 0, total: 0 },
      ],
      transactions: [],
      isDemoMode: true,
      isLoading: false,
      error: null,

      initializeWallet: () => {
        const state = get();
        if (state.transactions.length === 0) {
          // Add some initial demo transactions
          const initialTransactions: Transaction[] = [
            {
              id: 'init_001',
              type: 'deposit',
              amount: 2500,
              description: 'Welcome Bonus - Demo Mode',
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              status: 'completed',
              reference: 'DEMO_WELCOME_2500',
              currency: 'NGN'
            }
          ];
          
          set({ transactions: initialTransactions });
        }
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

      addFunds: async (amount: number, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN', method: string = 'Bank Transfer') => {
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

          const transaction: Transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'deposit',
            amount,
            description: `${method} Deposit${isDemoMode ? ' (Demo)' : ''}`,
            date: new Date(),
            status: 'completed', // Always complete for demo mode
            reference: generateDemoReference('deposit'),
            currency,
            fee: 0 // No fees for demo deposits
          };

          set((state) => {
            const updatedBalances = state.balances.map(balance => 
              balance.currency === currency 
                ? { 
                    ...balance, 
                    available: balance.available + amount,
                    total: balance.total + amount
                  }
                : balance
            );

            return {
              balances: updatedBalances,
              transactions: [transaction, ...state.transactions],
              isLoading: false,
              error: null
            };
          });

          showDemoNotification(
            `Successfully deposited ${amount.toLocaleString()} ${currency}${isDemoMode ? ' (Demo)' : ''}`,
            'success'
          );

          return transaction;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Deposit failed';
          set({ error: errorMessage, isLoading: false });
          showDemoNotification(errorMessage, 'error');
          throw error;
        }
      },

      withdraw: async (amount: number, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN', destination: string = 'Bank Account') => {
        const { isDemoMode, simulateNetworkDelay, getBalance } = get();
        
        set({ isLoading: true, error: null });

        try {
          // Validate amount
          if (isNaN(amount) || amount <= 0) {
            throw new Error('Please enter a valid amount');
          }

          // Validate destination
          if (!destination || destination.trim().length === 0) {
            throw new Error('Please specify withdrawal destination');
          }

          const currentBalance = getBalance(currency);
          
          if (amount > currentBalance) {
            throw new Error(`Insufficient funds. Available: ${currentBalance.toLocaleString()} ${currency}`);
          }

          if (isDemoMode) {
            await simulateNetworkDelay();
            
            // Reduce failure rate for better demo experience
            if (Math.random() < 0.03) { // 3% failure rate
              throw new Error('Withdrawal temporarily unavailable - Please try again');
            }
          }

          const transaction: Transaction = {
            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'withdraw',
            amount,
            description: `Withdrawal to ${destination}${isDemoMode ? ' (Demo)' : ''}`,
            date: new Date(),
            status: 'pending',
            reference: generateDemoReference('withdraw'),
            currency,
            fee: 0 // No fees for demo withdrawals
          };

          set((state) => {
            const updatedBalances = state.balances.map(balance => 
              balance.currency === currency 
                ? { 
                    ...balance, 
                    available: balance.available - amount,
                    total: balance.total - amount
                  }
                : balance
            );

            return {
              balances: updatedBalances,
              transactions: [transaction, ...state.transactions],
              isLoading: false,
              error: null
            };
          });

          showDemoNotification(
            `Withdrawal of ${amount.toLocaleString()} ${currency} initiated${isDemoMode ? ' (Demo)' : ''}`,
            'info'
          );

          // Auto-complete demo withdrawals after 2 seconds
          if (isDemoMode) {
            setTimeout(() => {
              set((state) => ({
                transactions: state.transactions.map(t => 
                  t.id === transaction.id ? { ...t, status: 'completed' as const } : t
                )
              }));
              showDemoNotification('Withdrawal completed (Demo)', 'success');
            }, 2000);
          }

          return transaction;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Withdrawal failed';
          set({ error: errorMessage, isLoading: false });
          showDemoNotification(errorMessage, 'error');
          throw error;
        }
      },

      makePrediction: async (amount: number, description: string, predictionId: string, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN') => {
        const { getBalance } = get();
        
        const currentBalance = getBalance(currency);
        
        if (amount > currentBalance) {
          throw new Error('Insufficient funds');
        }

        const transaction: Transaction = {
          id: Date.now().toString(),
          type: 'prediction',
          amount,
          description,
          date: new Date(),
          status: 'completed',
          reference: generateDemoReference('prediction'),
          currency,
          predictionId
        };

        set((state) => {
          const updatedBalances = state.balances.map(balance => 
            balance.currency === currency 
              ? { 
                  ...balance, 
                  available: balance.available - amount,
                  reserved: balance.reserved + amount
                }
              : balance
          );

          return {
            balances: updatedBalances,
            transactions: [transaction, ...state.transactions]
          };
        });

        showDemoNotification(`Prediction placed: ${amount.toLocaleString()} ${currency}`, 'info');
        return transaction;
      },

      recordWin: async (amount: number, description: string, predictionId: string, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN') => {
        const transaction: Transaction = {
          id: Date.now().toString(),
          type: 'win',
          amount,
          description,
          date: new Date(),
          status: 'completed',
          reference: generateDemoReference('win'),
          currency,
          predictionId
        };

        set((state) => {
          const updatedBalances = state.balances.map(balance => 
            balance.currency === currency 
              ? { 
                  ...balance, 
                  available: balance.available + amount,
                  total: balance.total + amount
                }
              : balance
          );

          return {
            balances: updatedBalances,
            transactions: [transaction, ...state.transactions]
          };
        });

        showDemoNotification(`🎉 You won ${amount.toLocaleString()} ${currency}!`, 'success');
        return transaction;
      },

      recordLoss: async (amount: number, description: string, predictionId: string, currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN') => {
        const transaction: Transaction = {
          id: Date.now().toString(),
          type: 'loss',
          amount,
          description,
          date: new Date(),
          status: 'completed',
          reference: generateDemoReference('loss'),
          currency,
          predictionId
        };

        set((state) => {
          const updatedBalances = state.balances.map(balance => 
            balance.currency === currency 
              ? { 
                  ...balance, 
                  reserved: balance.reserved - amount,
                  total: balance.total - amount
                }
              : balance
          );

          return {
            balances: updatedBalances,
            transactions: [transaction, ...state.transactions]
          };
        });

        return transaction;
      },

      transferFunds: async (amount: number, toUser: string, description: string = 'P2P Transfer', currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN') => {
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

          const transaction: Transaction = {
            id: Date.now().toString(),
            type: 'transfer_out',
            amount,
            description: `${description} to ${toUser}${isDemoMode ? ' (Demo)' : ''}`,
            date: new Date(),
            status: 'completed',
            reference: generateDemoReference('transfer_out'),
            currency,
            toUser,
            fee: amount * 0.005 // 0.5% transfer fee
          };

          set((state) => {
            const updatedBalances = state.balances.map(balance => 
              balance.currency === currency 
                ? { 
                    ...balance, 
                    available: balance.available - amount,
                    total: balance.total - amount
                  }
                : balance
            );

            return {
              balances: updatedBalances,
              transactions: [transaction, ...state.transactions],
              isLoading: false
            };
          });

          showDemoNotification(`Transferred ${amount.toLocaleString()} ${currency} to ${toUser}`, 'success');
          return transaction;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      getBalance: (currency: 'NGN' | 'USD' | 'USDT' | 'ETH' = 'NGN') => {
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
      version: 1,
    }
  )
);
