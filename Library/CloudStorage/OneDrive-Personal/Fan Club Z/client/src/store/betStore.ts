import { create } from 'zustand'
import type { 
  Bet, 
  BetEntry, 
  CreateBetRequest, 
  PlaceBetRequest,
  BetFilters 
} from '@shared/schema'
import { api, queryKeys } from '@/lib/queryClient'
import { queryClient } from '@/lib/queryClient'

interface BetState {
  // Current betting data
  selectedBet: Bet | null
  userBets: Bet[]
  userBetEntries: BetEntry[]
  trendingBets: Bet[]
  
  // UI state
  isPlacingBet: boolean
  isCreatingBet: boolean
  error: string | null
  
  // Filters
  filters: BetFilters
}

interface BetActions {
  // Bet management
  createBet: (betData: CreateBetRequest) => Promise<Bet>
  placeBet: (betId: string, betData: PlaceBetRequest) => Promise<BetEntry>
  selectBet: (bet: Bet | null) => void
  
  // Data fetching
  fetchUserBets: (userId: string) => Promise<void>
  fetchUserBetEntries: (userId: string) => Promise<void>
  fetchTrendingBets: () => Promise<void>
  
  // Social actions
  likeBet: (betId: string) => Promise<void>
  commentOnBet: (betId: string, content: string) => Promise<void>
  shareBet: (betId: string) => Promise<void>
  
  // Filters and UI
  updateFilters: (filters: Partial<BetFilters>) => void
  clearFilters: () => void
  clearError: () => void
}

type BetStore = BetState & BetActions

export const useBetStore = create<BetStore>((set, get) => ({
  // Initial state
  selectedBet: null,
  userBets: [],
  userBetEntries: [],
  trendingBets: [],
  isPlacingBet: false,
  isCreatingBet: false,
  error: null,
  filters: {},

  // Actions
  createBet: async (betData) => {
    try {
      set({ isCreatingBet: true, error: null })
      
      const response = await api.post<{ bet: Bet }>('/bets', betData)
      
      if (response.success) {
        // Invalidate bets queries to refetch data
        queryClient.invalidateQueries({ queryKey: queryKeys.bets })
        queryClient.invalidateQueries({ queryKey: queryKeys.userBets(response.data.bet.creatorId) })
        
        set({ isCreatingBet: false })
        return response.data.bet
      } else {
        throw new Error(response.error || 'Failed to create bet')
      }
    } catch (error: any) {
      set({
        isCreatingBet: false,
        error: error.message || 'Failed to create bet',
      })
      throw error
    }
  },

  placeBet: async (betId, betData) => {
    try {
      set({ isPlacingBet: true, error: null })
      
      const response = await api.post<{ betEntry: BetEntry }>(`/bet-entries`, {
        betId,
        ...betData,
      })
      
      if (response.success) {
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: queryKeys.bet(betId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.betEntries })
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
        queryClient.invalidateQueries({ queryKey: queryKeys.userStats })
        
        set({ isPlacingBet: false })
        return response.data.betEntry
      } else {
        throw new Error(response.error || 'Failed to place bet')
      }
    } catch (error: any) {
      set({
        isPlacingBet: false,
        error: error.message || 'Failed to place bet',
      })
      throw error
    }
  },

  selectBet: (bet) => {
    set({ selectedBet: bet })
  },

  fetchUserBets: async (userId) => {
    try {
      const response = await api.get<{ bets: Bet[] }>(`/bets/user/${userId}`)
      
      if (response.success) {
        set({ userBets: response.data.bets })
      }
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchUserBetEntries: async (userId) => {
    try {
      const response = await api.get<{ betEntries: BetEntry[] }>(`/bet-entries/user/${userId}`)
      
      if (response.success) {
        set({ userBetEntries: response.data.betEntries })
      }
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchTrendingBets: async () => {
    try {
      const response = await api.get<{ bets: Bet[] }>('/bets/trending')
      
      if (response.success) {
        set({ trendingBets: response.data.bets })
      }
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  likeBet: async (betId) => {
    try {
      await api.post(`/bets/${betId}/reactions`, { type: 'like' })
      
      // Optimistically update bet likes
      const { selectedBet } = get()
      if (selectedBet && selectedBet.id === betId) {
        set({
          selectedBet: {
            ...selectedBet,
            likes: selectedBet.likes + 1,
          },
        })
      }
      
      // Invalidate bet queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bet(betId) })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  commentOnBet: async (betId, content) => {
    try {
      await api.post(`/bets/${betId}/comments`, { content })
      
      // Optimistically update comment count
      const { selectedBet } = get()
      if (selectedBet && selectedBet.id === betId) {
        set({
          selectedBet: {
            ...selectedBet,
            comments: selectedBet.comments + 1,
          },
        })
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bet(betId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.betComments(betId) })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  shareBet: async (betId) => {
    try {
      await api.post(`/bets/${betId}/share`)
      
      // Optimistically update shares count
      const { selectedBet } = get()
      if (selectedBet && selectedBet.id === betId) {
        set({
          selectedBet: {
            ...selectedBet,
            shares: selectedBet.shares + 1,
          },
        })
      }
      
      // Invalidate bet queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bet(betId) })
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  updateFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
  },

  clearFilters: () => {
    set({ filters: {} })
  },

  clearError: () => {
    set({ error: null })
  },
}))

// Betting calculations
export const calculateOdds = (totalPool: number, optionAmount: number): number => {
  if (optionAmount === 0) return 1
  return Number((totalPool / optionAmount).toFixed(2))
}

export const calculatePotentialWinnings = (stake: number, odds: number): number => {
  return Number((stake * odds).toFixed(2))
}

export const calculateImpliedProbability = (odds: number): number => {
  return Number((1 / odds * 100).toFixed(1))
}

// Bet status helpers
export const isBetActive = (bet: Bet): boolean => {
  return bet.status === 'open' && new Date(bet.entryDeadline) > new Date()
}

export const isBetExpired = (bet: Bet): boolean => {
  return new Date(bet.entryDeadline) <= new Date()
}

export const isBetSettled = (bet: Bet): boolean => {
  return bet.status === 'settled'
}

// User bet entry helpers
export const getUserBetEntry = (betEntries: BetEntry[], betId: string): BetEntry | null => {
  return betEntries.find(entry => entry.betId === betId) || null
}

export const getUserTotalStake = (betEntries: BetEntry[]): number => {
  return betEntries.reduce((total, entry) => total + entry.amount, 0)
}

export const getUserPotentialWinnings = (betEntries: BetEntry[]): number => {
  return betEntries
    .filter(entry => entry.status === 'active')
    .reduce((total, entry) => total + entry.potentialWinnings, 0)
}
