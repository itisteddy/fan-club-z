import { create } from 'zustand'
import type { 
  Transaction, 
  DepositRequest, 
  WithdrawRequest, 
  TransferRequest 
} from '@shared/schema'
import { api, queryKeys } from '@/lib/queryClient'
import { queryClient } from '@/lib/queryClient'

interface WalletState {
  // Balance data
  balance: number
  currency: 'USD' | 'NGN' | 'USDT' | 'ETH'
  
  // Transactions
  transactions: Transaction[]
  pendingTransactions: Transaction[]
  
  // UI state
  isLoading: boolean
  isDepositing: boolean
  isWithdrawing: boolean
  isTransferring: boolean
  error: string | null
  
  // Modal states
  showDepositModal: boolean
  showWithdrawModal: boolean
  showTransferModal: boolean
}

interface WalletActions {
  // Balance management
  refreshBalance: (userId: string) => Promise<void>
  updateBalance: (amount: number) => void
  
  // Transactions
  deposit: (depositData: DepositRequest) => Promise<void>
  withdraw: (withdrawData: WithdrawRequest) => Promise<void>
  transfer: (transferData: TransferRequest) => Promise<void>
  fetchTransactions: (userId: string) => Promise<void>
  
  // Currency
  setCurrency: (currency: 'USD' | 'NGN' | 'USDT' | 'ETH') => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  clearError: () => void
  
  // Modal actions
  openDepositModal: () => void
  closeDepositModal: () => void
  openWithdrawModal: () => void
  closeWithdrawModal: () => void
  openTransferModal: () => void
  closeTransferModal: () => void
}

type WalletStore = WalletState & WalletActions

export const useWalletStore = create<WalletStore>((set, get) => ({
  // Initial state
  balance: 2500, // Default demo balance
  currency: 'USD',
  transactions: [],
  pendingTransactions: [],
  isLoading: false,
  isDepositing: false,
  isWithdrawing: false,
  isTransferring: false,
  error: null,
  showDepositModal: false,
  showWithdrawModal: false,
  showTransferModal: false,

  // Actions
  refreshBalance: async (userId) => {
    try {
      set({ isLoading: true, error: null })
      
      // Use the correct API endpoint with proper error handling
      const response = await fetch(`/api/wallet/balance/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          set({ 
            balance: result.data.balance,
            isLoading: false 
          })
        } else {
          throw new Error(result.error || 'Failed to fetch balance')
        }
      } else {
        // For demo user, use default balance if API fails
        if (userId === 'demo-user-id') {
          set({ 
            balance: 2500,
            isLoading: false 
          })
        } else {
          throw new Error('Failed to fetch balance')
        }
      }
    } catch (error: any) {
      // For demo user, use default balance if API fails
      if (userId === 'demo-user-id') {
        set({ 
          balance: 2500,
          isLoading: false 
        })
      } else {
        set({
          isLoading: false,
          error: error.message || 'Failed to fetch balance',
        })
      }
    }
  },

  updateBalance: (amount) => {
    set((state) => ({ balance: state.balance + amount }))
  },

  deposit: async (depositData) => {
    try {
      set({ isDepositing: true, error: null })
      
      const response = await api.post<{ 
        transaction: Transaction,
        paymentUrl?: string 
      }>('/wallet/deposit', depositData)
      
      if (response.success) {
        // Add pending transaction
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, response.data.transaction],
          isDepositing: false,
          showDepositModal: false,
        }))
        
        // If it's a fiat deposit, redirect to payment URL
        if (response.data.paymentUrl) {
          window.open(response.data.paymentUrl, '_blank')
        }
        
        // Invalidate wallet queries
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      } else {
        throw new Error(response.error || 'Failed to initiate deposit')
      }
    } catch (error: any) {
      set({
        isDepositing: false,
        error: error.message || 'Failed to initiate deposit',
      })
      throw error
    }
  },

  withdraw: async (withdrawData) => {
    try {
      set({ isWithdrawing: true, error: null })
      
      const response = await api.post<{ transaction: Transaction }>('/wallet/withdraw', withdrawData)
      
      if (response.success) {
        // Add pending transaction and update balance
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, response.data.transaction],
          balance: state.balance - withdrawData.amount,
          isWithdrawing: false,
          showWithdrawModal: false,
        }))
        
        // Invalidate wallet queries
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      } else {
        throw new Error(response.error || 'Failed to initiate withdrawal')
      }
    } catch (error: any) {
      set({
        isWithdrawing: false,
        error: error.message || 'Failed to initiate withdrawal',
      })
      throw error
    }
  },

  transfer: async (transferData) => {
    try {
      set({ isTransferring: true, error: null })
      
      const response = await api.post<{ transaction: Transaction }>('/wallet/transfer', transferData)
      
      if (response.success) {
        // Update balance and add transaction
        set((state) => ({
          transactions: [response.data.transaction, ...state.transactions],
          balance: state.balance - transferData.amount,
          isTransferring: false,
          showTransferModal: false,
        }))
        
        // Invalidate wallet queries
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
      } else {
        throw new Error(response.error || 'Failed to transfer funds')
      }
    } catch (error: any) {
      set({
        isTransferring: false,
        error: error.message || 'Failed to transfer funds',
      })
      throw error
    }
  },

  fetchTransactions: async (userId) => {
    try {
      set({ isLoading: true, error: null })
      
      console.log('📋 Fetching transactions for user:', userId)
      
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add auth header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      // Try the main transactions endpoint first
      let response = await fetch(`/api/transactions/${userId}`, {
        method: 'GET',
        headers,
      })
      
      console.log('📋 Transactions API response:', response.status, response.statusText)
      
      // If that fails, try the payments endpoint as fallback
      if (!response.ok && userId !== 'demo-user-id') {
        console.log('📋 Trying payments endpoint as fallback')
        response = await fetch('/api/payments/transactions', {
          method: 'GET',
          headers,
        })
      }
      
      if (response.ok) {
        const result = await response.json()
        console.log('📋 Transactions result:', result)
        
        if (result.success && result.data) {
          const transactions = result.data.transactions || []
          console.log('📋 Found', transactions.length, 'transactions')
          
          // Separate completed and pending transactions
          const completed = transactions.filter((t: Transaction) => t.status === 'completed')
          const pending = transactions.filter((t: Transaction) => t.status === 'pending')
          
          set({ 
            transactions: completed,
            pendingTransactions: pending,
            isLoading: false,
            error: null
          })
        } else {
          throw new Error(result.error || 'Invalid response format')
        }
      } else {
        const errorText = await response.text()
        console.error('📋 API error response:', response.status, errorText)
        
        // For demo user, provide mock transactions
        if (userId === 'demo-user-id') {
          console.log('📋 Using fallback demo transactions')
          const mockTransactions: Transaction[] = [
            {
              id: 'demo-txn-1',
              userId,
              type: 'deposit',
              amount: 100,
              currency: 'USD',
              status: 'completed',
              description: 'Demo wallet deposit',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
              id: 'demo-txn-2',
              userId,
              type: 'bet_lock',
              amount: 25,
              currency: 'USD',
              status: 'completed',
              description: 'Bet on Bitcoin reaching $100K',
              createdAt: new Date(Date.now() - 172800000).toISOString(),
              updatedAt: new Date(Date.now() - 172800000).toISOString()
            },
            {
              id: 'demo-txn-3',
              userId,
              type: 'deposit',
              amount: 500,
              currency: 'USD',
              status: 'completed',
              description: 'Initial wallet funding',
              createdAt: new Date(Date.now() - 259200000).toISOString(),
              updatedAt: new Date(Date.now() - 259200000).toISOString()
            }
          ]
          
          set({ 
            transactions: mockTransactions,
            pendingTransactions: [],
            isLoading: false,
            error: null
          })
        } else {
          throw new Error(`API Error: ${response.status} - ${errorText}`)
        }
      }
    } catch (error: any) {
      console.error('📋 Transaction fetch error:', error)
      
      // For demo user, provide mock transactions as fallback
      if (userId === 'demo-user-id') {
        console.log('📋 Using fallback demo transactions due to error')
        const mockTransactions: Transaction[] = [
          {
            id: 'demo-txn-1',
            userId,
            type: 'deposit',
            amount: 100,
            currency: 'USD',
            status: 'completed',
            description: 'Demo wallet deposit',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'demo-txn-2',
            userId,
            type: 'bet_lock',
            amount: 25,
            currency: 'USD',
            status: 'completed',
            description: 'Bet on Bitcoin reaching $100K',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: 'demo-txn-3',
            userId,
            type: 'deposit',
            amount: 500,
            currency: 'USD',
            status: 'completed',
            description: 'Initial wallet funding',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            updatedAt: new Date(Date.now() - 259200000).toISOString()
          }
        ]
        
        set({ 
          transactions: mockTransactions,
          pendingTransactions: [],
          isLoading: false,
          error: null
        })
      } else {
        set({
          isLoading: false,
          error: error.message || 'Failed to fetch transactions',
        })
      }
    }
  },

  setCurrency: (currency) => {
    set({ currency })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  clearError: () => {
    set({ error: null })
  },

  // Modal actions
  openDepositModal: () => set({ showDepositModal: true }),
  closeDepositModal: () => set({ showDepositModal: false }),
  openWithdrawModal: () => set({ showWithdrawModal: true }),
  closeWithdrawModal: () => set({ showWithdrawModal: false }),
  openTransferModal: () => set({ showTransferModal: true }),
  closeTransferModal: () => set({ showTransferModal: false }),
}))

// Wallet helpers
export const formatBalance = (balance: number, currency: string): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(balance)
}

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    NGN: '₦',
    USDT: 'USDT',
    ETH: 'Ξ',
  }
  return symbols[currency] || currency
}

export const getTransactionStatusColor = (status: Transaction['status']): string => {
  const colors = {
    pending: 'text-yellow-600 bg-yellow-50',
    completed: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
  }
  return colors[status] || colors.pending
}

export const getTransactionTypeLabel = (type: Transaction['type']): string => {
  const labels = {
    deposit: 'Deposit',
    withdraw: 'Withdrawal',
    bet_lock: 'Bet Placed',
    bet_release: 'Bet Won',
    transfer: 'Transfer',
  }
  return labels[type] || type
}

export const getTransactionAmount = (transaction: Transaction): { amount: number, sign: string } => {
  const isCredit = ['deposit', 'bet_release'].includes(transaction.type)
  return {
    amount: transaction.amount,
    sign: isCredit ? '+' : '-',
  }
}

// Transaction filtering helpers
export const filterTransactionsByType = (
  transactions: Transaction[], 
  types: Transaction['type'][]
): Transaction[] => {
  return transactions.filter(t => types.includes(t.type))
}

export const filterTransactionsByDateRange = (
  transactions: Transaction[], 
  startDate: Date, 
  endDate: Date
): Transaction[] => {
  return transactions.filter(t => {
    const transactionDate = new Date(t.createdAt)
    return transactionDate >= startDate && transactionDate <= endDate
  })
}

export const getTransactionsSummary = (transactions: Transaction[]) => {
  const summary = {
    totalIn: 0,
    totalOut: 0,
    totalBets: 0,
    totalWinnings: 0,
  }

  transactions.forEach(transaction => {
    const { amount, sign } = getTransactionAmount(transaction)
    
    if (sign === '+') {
      summary.totalIn += amount
      if (transaction.type === 'bet_release') {
        summary.totalWinnings += amount
      }
    } else {
      summary.totalOut += amount
      if (transaction.type === 'bet_lock') {
        summary.totalBets += amount
      }
    }
  })

  return summary
}
