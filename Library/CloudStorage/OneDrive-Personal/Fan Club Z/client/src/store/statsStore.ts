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
        console.log('📊 StatsStore: Fetching stats for user:', userId)
        set({ loading: true, error: null })
        
        try {
          const response = await fetch(`/api/stats/user/${userId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('auth_token')}`,
              'Content-Type': 'application/json'
            }
          })

          console.log('📊 StatsStore: API response status:', response.status)
          
          if (!response.ok) {
            throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          console.log('📊 StatsStore: Stats data received:', data)
          set({ stats: data, loading: false })
        } catch (error) {
          console.error('❌ StatsStore: Error fetching stats:', error)
          
          // Provide fallback stats for demo user
          if (userId === 'demo-user-id') {
            console.log('📊 StatsStore: Using fallback demo stats')
            const fallbackStats = {
              totalBets: 15,
              activeBets: 3,
              wonBets: 8,
              lostBets: 4,
              cancelledBets: 0,
              totalStaked: 750,
              totalWon: 1200,
              totalLost: 300,
              netProfit: 900,
              winRate: 53.3,
              clubsJoined: 5,
              betsCreated: 7,
              totalLikesReceived: 24,
              totalCommentsReceived: 18,
              totalSharesReceived: 6,
              reputationScore: 4.2,
              reputationVotes: 12,
              currentWinStreak: 2,
              longestWinStreak: 5,
              currentLossStreak: 0,
              longestLossStreak: 2,
              lastBetAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              lastWinAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              lastLoginAt: new Date().toISOString()
            }
            set({ stats: fallbackStats, loading: false, error: null })
          } else {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch stats',
              loading: false 
            })
          }
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