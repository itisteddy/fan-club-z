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
  balance: 0,
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
      
      const response = await api.get<{ balance: number }>(`/wallet/balance/${userId}`)
      
      if (response.success) {
        set({ 
          balance: response.data.balance,
          isLoading: false 
        })
      } else {
        throw new Error(response.error || 'Failed to fetch balance')
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch balance',
      })
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
      
      const response = await api.get<{ transactions: Transaction[] }>(`/transactions/${userId}`)
      
      if (response.success) {
        // Separate completed and pending transactions
        const completed = response.data.transactions.filter(t => t.status === 'completed')
        const pending = response.data.transactions.filter(t => t.status === 'pending')
        
        set({ 
          transactions: completed,
          pendingTransactions: pending,
          isLoading: false 
        })
      } else {
        throw new Error(response.error || 'Failed to fetch transactions')
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch transactions',
      })
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
