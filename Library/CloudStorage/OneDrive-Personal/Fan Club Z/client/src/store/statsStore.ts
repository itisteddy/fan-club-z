import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface UserStats {
  totalBets: number
  activeBets: number
  wonBets: number
  lostBets: number
  cancelledBets: number
  totalStaked: number
  totalWon: number
  totalLost: number
  netProfit: number
  winRate: number
  clubsJoined: number
  betsCreated: number
  totalLikesReceived: number
  totalCommentsReceived: number
  totalSharesReceived: number
  reputationScore: number
  reputationVotes: number
  currentWinStreak: number
  longestWinStreak: number
  currentLossStreak: number
  longestLossStreak: number
  lastBetAt: string | null
  lastWinAt: string | null
  lastLoginAt: string | null
}

interface StatsState {
  stats: UserStats | null
  loading: boolean
  error: string | null
  fetchStats: (userId: string) => Promise<void>
  refreshStats: (userId: string) => Promise<void>
  clearStats: () => void
}

export const useStatsStore = create<StatsState>()(
  devtools(
    (set, get) => ({
      stats: null,
      loading: false,
      error: null,

      fetchStats: async (userId: string) => {
        set({ loading: true, error: null })
        
        try {
          const response = await fetch(`/api/stats/user/${userId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error('Failed to fetch stats')
          }

          const data = await response.json()
          set({ stats: data, loading: false })
        } catch (error) {
          console.error('Error fetching stats:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch stats',
            loading: false 
          })
        }
      },

      refreshStats: async (userId: string) => {
        set({ loading: true, error: null })
        
        try {
          const response = await fetch(`/api/stats/user/${userId}/refresh`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error('Failed to refresh stats')
          }

          const data = await response.json()
          set({ stats: data, loading: false })
        } catch (error) {
          console.error('Error refreshing stats:', error)
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refresh stats',
            loading: false 
          })
        }
      },

      clearStats: () => {
        set({ stats: null, error: null })
      }
    }),
    {
      name: 'stats-store'
    }
  )
) 