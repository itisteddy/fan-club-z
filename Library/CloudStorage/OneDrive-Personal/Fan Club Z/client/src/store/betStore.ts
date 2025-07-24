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
  
  // Persistence
  lastUpdated: string | null
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
  fetchBetById: (betId: string) => Promise<Bet | null>
  
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
  lastUpdated: null,

  // Actions
  createBet: async (betData) => {
    try {
      set({ isCreatingBet: true, error: null })
      
      const response = await api.post<{ success: boolean; data: { bet: Bet }; error?: string }>('/bets', betData)
      
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
      
      // Get current user from auth store
      const { useAuthStore } = await import('./authStore')
      const { user } = useAuthStore.getState()
      
      if (!user) {
        throw new Error('User must be logged in to place bets')
      }
      
      // Import wallet store
      const { useWalletStore } = await import('./walletStore')
      const walletStore = useWalletStore.getState()
      
      // Check if user has sufficient balance
      if (walletStore.balance < betData.amount) {
        throw new Error('Insufficient balance to place this bet')
      }
      
      // Prepare bet request with userId
      const betRequest = {
        betId,
        optionId: betData.optionId,
        amount: betData.amount,
        userId: user.id
      }
      
      // Make API call to place bet
      const response = await api.post<{ success: boolean; data: { betEntry: BetEntry }; error?: string }>('/bet-entries', betRequest)
      
      if (response.success) {
        const betEntry = response.data.betEntry
        
        // Get the actual bet details for wallet transaction
        let betTitle = `Bet #${betEntry.id}` // Fallback
        try {
          // Try to get bet from trendingBets, userBets, or selectedBet first
          const { trendingBets, userBets, selectedBet } = get()
          const foundBet = trendingBets.find(b => b.id === betId) || 
                          userBets.find(b => b.id === betId) || 
                          (selectedBet?.id === betId ? selectedBet : null)
          
          if (foundBet) {
            betTitle = foundBet.title
          } else {
            // Fetch the bet details if not found locally
            const betResponse = await api.get<{ success: boolean; data: { bet: Bet } }>(`/bets/${betId}`)
            if (betResponse.success) {
              betTitle = betResponse.data.bet.title
            }
          }
        } catch (error) {
          console.warn('Failed to get bet title, using fallback:', error)
        }
        
        // Update local state immediately for better UX
        set((state) => {
          const newBetEntries = [...state.userBetEntries, betEntry]
          
          // Persist bet entries to localStorage
          persistBetEntries(betEntry.userId, newBetEntries)
          
          return {
            userBetEntries: newBetEntries,
            isPlacingBet: false,
            lastUpdated: new Date().toISOString()
          }
        })
        
        // Update wallet with the bet transaction using actual bet title
        walletStore.addBetTransaction({
          id: betEntry.id,
          userId: betEntry.userId,
          amount: betEntry.amount,
          betTitle: betTitle, // Now using actual bet title
          betId: betId,
          optionId: betData.optionId,
          createdAt: new Date().toISOString()
        })
        
        // Refresh wallet balance
        await walletStore.refreshBalance(user.id)
        
        // Invalidate related queries to refresh all dependent data
        queryClient.invalidateQueries({ queryKey: queryKeys.bet(betId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.betEntries })
        queryClient.invalidateQueries({ queryKey: queryKeys.userBetEntries(betEntry.userId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet })
        queryClient.invalidateQueries({ queryKey: queryKeys.userStats(betEntry.userId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions(betEntry.userId) })
        
        return betEntry
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
      const response = await api.get<{ success: boolean; data: { bets: Bet[] }; error?: string }>(`/bets/user/${userId}`)
      
      if (response.success) {
        set({ userBets: response.data.bets })
      }
    } catch (error: any) {
      set({ error: error.message })
    }
  },

  fetchUserBetEntries: async (userId) => {
    try {
      // Load cached bet entries first
      const cachedEntries = loadBetEntries(userId)
      if (cachedEntries.length > 0) {
        set({ 
          userBetEntries: cachedEntries,
          lastUpdated: new Date().toISOString()
        })
        return
      }
      
      // Fetch from API as fallback
      const response = await api.get<{ success: boolean; data: { betEntries: BetEntry[] }; error?: string }>(`/bet-entries/user/${userId}`)
      
      if (response.success) {
        const betEntries = response.data.betEntries || []
        
        set({ 
          userBetEntries: betEntries,
          lastUpdated: new Date().toISOString()
        })
        
        // Persist the fetched entries
        persistBetEntries(userId, betEntries)
      } else {
        // Use cached entries as fallback
        set({ 
          userBetEntries: cachedEntries,
          error: response.error || 'Failed to fetch bet entries' 
        })
      }
    } catch (error: any) {
      // Use cached entries as fallback
      const cachedEntries = loadBetEntries(userId)
      set({ 
        userBetEntries: cachedEntries,
        error: error.message 
      })
    }
  },

  fetchTrendingBets: async () => {
    try {
      // Try to fetch from API first
      const response = await api.get<{ success: boolean; data: { bets: Bet[] }; error?: string }>('/bets/trending')
      
      if (response.success) {
        // Sort by trending criteria: pool size, likes, recent activity
        const sortedBets = response.data.bets.sort((a, b) => {
          // Calculate trending score based on multiple factors
          const scoreA = calculateTrendingScore(a)
          const scoreB = calculateTrendingScore(b)
          return scoreB - scoreA
        })
        
        set({ trendingBets: sortedBets, error: null })
      } else {
        // Fallback to mock data with proper trending sort
        console.log('📈 Using mock trending data with trending algorithm')
        const mockBets: Bet[] = [
          {
            id: '1',
            creatorId: 'user1',
            title: 'Will Bitcoin reach $100K by end of 2025?',
            description: 'Bitcoin has been on a bull run. Will it hit the magical 100K mark by December 31st, 2025?',
            type: 'binary',
            category: 'crypto',
            options: [
              { id: 'yes', label: 'Yes', totalStaked: 15000 },
              { id: 'no', label: 'No', totalStaked: 8500 }
            ],
            status: 'open',
            stakeMin: 10,
            stakeMax: 1000,
            poolTotal: 23500,
            entryDeadline: '2025-12-31T23:59:59Z',
            settlementMethod: 'auto',
            isPrivate: false,
            likes: 234,
            comments: 67,
            shares: 89,
            createdAt: '2025-07-01T10:30:00Z',
            updatedAt: '2025-07-04T15:45:00Z'
          },
          {
            id: '2',
            creatorId: 'user2', 
            title: 'Premier League: Man City vs Arsenal - Who wins?',
            description: 'The title race is heating up! City and Arsenal face off in what could be the decisive match.',
            type: 'multi',
            category: 'sports',
            options: [
              { id: 'city', label: 'Man City', totalStaked: 12000 },
              { id: 'arsenal', label: 'Arsenal', totalStaked: 9000 },
              { id: 'draw', label: 'Draw', totalStaked: 4000 }
            ],
            status: 'open',
            stakeMin: 5,
            stakeMax: 500,
            poolTotal: 25000,
            entryDeadline: '2025-07-15T14:00:00Z',
            settlementMethod: 'auto',
            isPrivate: false,
            likes: 445,
            comments: 123,
            shares: 67,
            createdAt: '2025-07-02T09:15:00Z',
            updatedAt: '2025-07-04T16:20:00Z'
          },
          {
            id: '3',
            creatorId: 'user3',
            title: 'Taylor Swift announces surprise album?',
            description: 'Swifties are convinced she\'s dropping hints. Will T-Swift surprise us with a new album announcement this month?',
            type: 'binary',
            category: 'pop',
            options: [
              { id: 'yes', label: 'Yes, she will', totalStaked: 6500 },
              { id: 'no', label: 'No announcement', totalStaked: 4200 }
            ],
            status: 'open',
            stakeMin: 1,
            stakeMax: 100,
            poolTotal: 10700,
            entryDeadline: '2025-07-31T23:59:59Z',
            settlementMethod: 'manual',
            isPrivate: false,
            likes: 156,
            comments: 89,
            shares: 234,
            createdAt: '2025-07-03T14:22:00Z',
            updatedAt: '2025-07-04T11:18:00Z'
          }
        ]
        
        // Sort mock data by trending score
        const sortedMockBets = mockBets.sort((a, b) => {
          const scoreA = calculateTrendingScore(a)
          const scoreB = calculateTrendingScore(b)
          return scoreB - scoreA
        })
        
        set({ trendingBets: sortedMockBets, error: null })
      }
    } catch (error: any) {
      console.error('Failed to fetch trending bets:', error)
      set({ error: error.message })
      
      // Fallback to empty array on complete failure
      set({ trendingBets: [] })
    }
  },

  fetchBetById: async (betId) => {
    try {
      const response = await api.get<{ success: boolean; data: { bet: Bet }; error?: string }>(`/bets/${betId}`)
      
      if (response.success) {
        const bet = response.data.bet
        
        // Update the trending bets if this bet isn't already there
        set((state) => {
          const existingBetIndex = state.trendingBets.findIndex(b => b.id === betId)
          if (existingBetIndex === -1) {
            // Add the bet to trending bets
            return {
              trendingBets: [bet, ...state.trendingBets],
              error: null
            }
          } else {
            // Update existing bet
            const updatedBets = [...state.trendingBets]
            updatedBets[existingBetIndex] = bet
            return {
              trendingBets: updatedBets,
              error: null
            }
          }
        })
        
        return bet
      } else {
        set({ error: response.error || 'Failed to fetch bet' })
        return null
      }
    } catch (error: any) {
      set({ error: error.message })
      return null
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

// Trending score calculation - determines which bets are most popular
export const calculateTrendingScore = (bet: Bet): number => {
  // Factors that contribute to trending score:
  // 1. Pool size (higher = more trending) - weight: 40%
  // 2. Social engagement (likes + comments + shares) - weight: 30% 
  // 3. Recent activity (newer bets get boost) - weight: 20%
  // 4. Participation rate (number of participants) - weight: 10%
  
  const now = new Date()
  const createdAt = new Date(bet.createdAt)
  const hoursOld = Math.max(1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
  
  // Pool size score (normalized to 0-100 scale)
  const poolScore = Math.min(100, bet.poolTotal / 1000) // Max score at $100k pool
  
  // Social engagement score
  const socialScore = Math.min(100, (bet.likes + bet.comments + bet.shares) / 10) // Max score at 1000 total engagements
  
  // Recency boost (newer bets get higher score, decays over time)
  const recencyScore = Math.max(0, 100 - (hoursOld / 24) * 10) // Decays 10 points per day
  
  // Participation score (estimate based on pool size and min stake)
  const estimatedParticipants = Math.max(1, bet.poolTotal / bet.stakeMin)
  const participationScore = Math.min(100, estimatedParticipants / 100) // Max score at 10k participants
  
  // Weighted final score
  const trendingScore = 
    (poolScore * 0.4) + 
    (socialScore * 0.3) + 
    (recencyScore * 0.2) + 
    (participationScore * 0.1)
  
  return Number(trendingScore.toFixed(2))
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

// Local storage persistence helpers
const persistBetEntries = (userId: string, betEntries: BetEntry[]): void => {
  try {
    const key = `bet-entries-${userId}`
    localStorage.setItem(key, JSON.stringify(betEntries))
  } catch (error) {
    // Silently handle persistence errors
  }
}

const loadBetEntries = (userId: string): BetEntry[] => {
  try {
    const key = `bet-entries-${userId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const betEntries = JSON.parse(stored) as BetEntry[]
      return betEntries
    }
  } catch (error) {
    // Silently handle loading errors
  }
  return []
}