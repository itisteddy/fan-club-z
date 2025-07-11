import { db } from '../database/config.js'
import { User } from '../types'

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

export class StatsService {
  /**
   * Calculate and update user statistics
   */
  static async calculateUserStats(userId: string): Promise<UserStats> {
    try {
      // Get bet entries for the user from database
      const betEntries = await db('bet_entries')
        .where('user_id', userId)
        .select('*')

      // Get bets created by the user from database
      const createdBets = await db('bets')
        .where('creator_id', userId)
        .select('*')

      // Calculate betting statistics
      const totalBets = betEntries.length
      const activeBets = betEntries.filter(entry => entry.status === 'active').length
      const wonBets = betEntries.filter(entry => entry.status === 'won').length
      const lostBets = betEntries.filter(entry => entry.status === 'lost').length
      const cancelledBets = betEntries.filter(entry => entry.status === 'cancelled').length

      const totalStaked = betEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0)
      const totalWon = betEntries
        .filter(entry => entry.status === 'won')
        .reduce((sum, entry) => sum + parseFloat(entry.potential_winnings || '0'), 0)
      const totalLost = betEntries
        .filter(entry => entry.status === 'lost')
        .reduce((sum, entry) => sum + parseFloat(entry.amount || '0'), 0)
      const netProfit = totalWon - totalLost

      const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0

      // Calculate streaks
      const sortedEntries = betEntries
        .filter(entry => ['won', 'lost'].includes(entry.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      let currentWinStreak = 0
      let longestWinStreak = 0
      let currentLossStreak = 0
      let longestLossStreak = 0
      let tempWinStreak = 0
      let tempLossStreak = 0

      for (const entry of sortedEntries) {
        if (entry.status === 'won') {
          tempWinStreak++
          tempLossStreak = 0
          if (tempWinStreak > longestWinStreak) {
            longestWinStreak = tempWinStreak
          }
          if (currentWinStreak === 0) {
            currentWinStreak = tempWinStreak
          }
        } else if (entry.status === 'lost') {
          tempLossStreak++
          tempWinStreak = 0
          if (tempLossStreak > longestLossStreak) {
            longestLossStreak = tempLossStreak
          }
          if (currentLossStreak === 0) {
            currentLossStreak = tempLossStreak
          }
        }
      }

      // Calculate social statistics (simplified for now)
      const clubsJoined = 3 // Demo data - can be enhanced later
      const betsCreated = createdBets.length
      const totalLikesReceived = createdBets.reduce((sum, bet) => sum + (bet.likes_count || 0), 0)
      const totalCommentsReceived = createdBets.reduce((sum, bet) => sum + (bet.comments_count || 0), 0)
      const totalSharesReceived = createdBets.reduce((sum, bet) => sum + (bet.shares_count || 0), 0)

      // Calculate reputation (simplified for now)
      const reputationScore = 4.5 // Demo data - can be enhanced later
      const reputationVotes = 2 // Demo data - can be enhanced later

      // Get timestamps
      const lastBetAt = betEntries.length > 0 
        ? betEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null

      const lastWinAt = wonBets > 0
        ? betEntries
            .filter(entry => entry.status === 'won')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null

      const stats: UserStats = {
        totalBets,
        activeBets,
        wonBets,
        lostBets,
        cancelledBets,
        totalStaked,
        totalWon,
        totalLost,
        netProfit,
        winRate,
        clubsJoined,
        betsCreated,
        totalLikesReceived,
        totalCommentsReceived,
        totalSharesReceived,
        reputationScore,
        reputationVotes,
        currentWinStreak,
        longestWinStreak,
        currentLossStreak,
        longestLossStreak,
        lastBetAt,
        lastWinAt,
        lastLoginAt: new Date().toISOString()
      }

      return stats
    } catch (error) {
      console.error('Error calculating user stats:', error)
      // Return default stats if calculation fails
      return {
        totalBets: 0,
        activeBets: 0,
        wonBets: 0,
        lostBets: 0,
        cancelledBets: 0,
        totalStaked: 0,
        totalWon: 0,
        totalLost: 0,
        netProfit: 0,
        winRate: 0,
        clubsJoined: 0,
        betsCreated: 0,
        totalLikesReceived: 0,
        totalCommentsReceived: 0,
        totalSharesReceived: 0,
        reputationScore: 0,
        reputationVotes: 0,
        currentWinStreak: 0,
        longestWinStreak: 0,
        currentLossStreak: 0,
        longestLossStreak: 0,
        lastBetAt: null,
        lastWinAt: null,
        lastLoginAt: null
      }
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      return await this.calculateUserStats(userId)
    } catch (error) {
      console.error('Error getting user stats:', error)
      return null
    }
  }

  /**
   * Update stats when a bet entry is created/updated
   */
  static async updateStatsOnBetEntry(userId: string): Promise<void> {
    // Stats are calculated on-demand, so no need to update anything
  }

  /**
   * Update stats when a bet is created
   */
  static async updateStatsOnBetCreated(userId: string): Promise<void> {
    // Stats are calculated on-demand, so no need to update anything
  }

  /**
   * Update stats when a user joins/leaves a club
   */
  static async updateStatsOnClubMembership(userId: string): Promise<void> {
    // Stats are calculated on-demand, so no need to update anything
  }

  /**
   * Update stats when an interaction is created
   */
  static async updateStatsOnInteraction(userId: string): Promise<void> {
    // Stats are calculated on-demand, so no need to update anything
  }
} 