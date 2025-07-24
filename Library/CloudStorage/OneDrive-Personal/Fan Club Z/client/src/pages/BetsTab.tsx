import React, { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Clock, Trophy, History, Plus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBetStore } from '@/store/betStore'
import { useStatsStore } from '@/store/statsStore'
import BetCard from '@/components/BetCard'
import FloatingActionButton from '@/components/FloatingActionButton'
import { formatCurrency, formatTimeRemaining } from '@/lib/utils'
import { useLocation } from 'wouter'

// Safe PullToRefreshIndicator component
const PullToRefreshIndicator: React.FC<{
  isRefreshing: boolean
  isPulling: boolean
  pullDistance: number
}> = ({ isRefreshing, isPulling }) => {
  if (!isPulling && !isRefreshing) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm">
        {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
      </div>
    </div>
  )
}

// Safe hook fallback
const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [pullDistance] = React.useState(0)
  const [isPulling] = React.useState(false)

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling
  }
}

export const BetsTab: React.FC = () => {
  const { user } = useAuthStore()
  const { 
    userBets, 
    userBetEntries, 
    trendingBets,
    fetchUserBets, 
    fetchUserBetEntries, 
    fetchTrendingBets 
  } = useBetStore()
  const { stats, loading: statsLoading, fetchStats } = useStatsStore()
  const [activeTab, setActiveTab] = useState('active')
  const [, navigate] = useLocation()

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('🔄 BetsTab: Refreshing bets and stats...')
    if (user?.id) {
      try {
        await Promise.all([
          fetchStats(user.id),
          fetchUserBets(user.id),
          fetchUserBetEntries(user.id),
          fetchTrendingBets()
        ])
      } catch (error) {
        console.error('Error refreshing:', error)
      }
    }
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  }, [user?.id, fetchStats, fetchUserBets, fetchUserBetEntries, fetchTrendingBets])

  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh(handleRefresh)

  // Fetch user data when component mounts
  useEffect(() => {
    if (user?.id) {
      console.log('🎯 BetsTab: Fetching user data for:', user.id)
      
      // Fetch all user-related data
      Promise.all([
        fetchStats(user.id),
        fetchUserBets(user.id),
        fetchUserBetEntries(user.id),
        fetchTrendingBets()
      ]).catch(error => {
        console.error('❌ BetsTab: Error fetching user data:', error)
      })
    }
  }, [user?.id, fetchStats, fetchUserBets, fetchUserBetEntries, fetchTrendingBets])
  
  // Add a visibility change listener to refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        console.log('🎯 BetsTab: Tab became visible, refreshing data')
        Promise.all([
          fetchUserBetEntries(user.id),
          fetchStats(user.id)
        ]).catch(error => {
          console.error('❌ BetsTab: Error refreshing data on visibility change:', error)
        })
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user?.id, fetchUserBetEntries, fetchStats])

  // Helper function to check if a bet is truly active (not expired)
  const isBetActive = (entry: any): boolean => {
    if (entry.status !== 'active') return false
    
    // Get the bet to check its deadline
    const bet = trendingBets.find(b => b.id === entry.betId)
    if (bet) {
      const now = new Date()
      const deadline = new Date(bet.entryDeadline)
      const isNotExpired = deadline > now
      
      // Also check if bet status is still open
      const isBetOpen = bet.status === 'open'
      
      return isNotExpired && isBetOpen
    }
    
    // If bet not found, check entry deadline if available
    if (entry.entryDeadline) {
      const now = new Date()
      const deadline = new Date(entry.entryDeadline)
      return deadline > now
    }
    
    return false
  }
  
  // Helper function to check if a bet has ended but not settled
  const isBetEnded = (entry: any): boolean => {
    if (entry.status !== 'active' && entry.status !== 'pending') return false
    
    const bet = trendingBets.find(b => b.id === entry.betId)
    if (bet) {
      const now = new Date()
      const deadline = new Date(bet.entryDeadline)
      const hasExpired = deadline <= now
      const isBetClosed = bet.status === 'closed' || bet.status === 'settled'
      
      return hasExpired || isBetClosed
    }
    
    // Check entry deadline if available
    if (entry.entryDeadline) {
      const now = new Date()
      const deadline = new Date(entry.entryDeadline)
      return deadline <= now
    }
    
    return false
  }
  
  const activeBets = userBetEntries.filter(entry => isBetActive(entry))
  const endedBets = userBetEntries.filter(entry => isBetEnded(entry))
  const createdBets = userBets || []
  const wonBets = userBetEntries.filter(entry => entry.status === 'won')
  const historyBets = [...userBetEntries.filter(entry => ['settled', 'lost', 'cancelled'].includes(entry.status)), ...endedBets]

  // Helper function to get bet details from betEntry
  const getBetFromEntry = (entry: any) => {
    // Try to find the bet in trending bets first
    const bet = trendingBets.find(b => b.id === entry.betId)
    if (bet) return bet
    
    // Fallback to mock bet data if not found
    return {
      id: entry.betId,
      title: entry.betTitle || `Bet #${entry.betId}`,
      description: entry.betDescription || 'Bet description not available',
      category: entry.category || 'custom',
      status: entry.betStatus || 'open',
      entryDeadline: entry.entryDeadline || new Date(Date.now() + 86400000).toISOString(),
      stakeMin: 1,
      stakeMax: 1000,
      poolTotal: entry.poolTotal || 1000,
      options: entry.options || [
        { id: 'yes', label: 'Yes', totalStaked: 500 },
        { id: 'no', label: 'No', totalStaked: 500 }
      ],
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt || entry.createdAt
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 relative">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator 
        isRefreshing={isRefreshing}
        isPulling={isPulling}
        pullDistance={pullDistance}
      />

      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">My Bets</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-title-1 font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : (activeBets.length || 0)}
            </div>
            <div className="text-body-sm text-gray-500">Active Bets</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-title-1 font-bold text-gray-900 mb-1">
              {statsLoading ? '...' : (stats?.winRate ? `${stats.winRate.toFixed(0)}%` : '0%')}
            </div>
            <div className="text-body-sm text-gray-500">Win Rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'active' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active ({activeBets.length})
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'created' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Created ({createdBets.length})
            </button>
            <button
              onClick={() => setActiveTab('won')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'won' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Won ({wonBets.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History ({historyBets.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Active Positions
            </h3>
            
            {activeBets.length > 0 ? (
              <div className="space-y-4">
                {activeBets.map((entry) => {
                  const bet = getBetFromEntry(entry)
                  const isExpired = new Date(bet.entryDeadline) <= new Date()
                  
                  return (
                    <div key={`active-${entry.id}-${entry.betId}`} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{bet.title}</h4>
                          <p className="text-sm text-gray-600">
                            Your stake: {formatCurrency(entry.amount)} • 
                            Potential win: {formatCurrency(entry.potentialWinnings)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Placed: {new Date(entry.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isExpired 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isExpired ? 'Ended' : 'Active'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className={isExpired ? 'text-orange-600' : 'text-gray-500'}>
                          Deadline: {isExpired ? 'Ended' : formatTimeRemaining(bet.entryDeadline)}
                        </span>
                        <button 
                          className="text-blue-500 hover:text-blue-600 font-medium"
                          onClick={() => navigate(`/bets/${bet.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-body font-medium text-gray-900 mb-2">No active bets</p>
                <p className="text-body-sm text-gray-500 mb-4">Your active positions will appear here</p>
                <button
                  onClick={() => navigate('/discover')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Explore Bets
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'created' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900">Bets You Created</h3>
            
            {createdBets.length > 0 ? (
              <div className="space-y-4">
                {createdBets.map((bet) => (
                  <BetCard key={bet.id} bet={bet} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-body font-medium text-gray-900 mb-2">No created bets</p>
                <p className="text-body-sm text-gray-500 mb-4">Bets you've created will appear here</p>
                <button
                  onClick={() => navigate('/create')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Create Bet
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'won' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900 flex items-center">
              <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
              Winning Bets
            </h3>
            
            {wonBets.length > 0 ? (
              <div className="space-y-4">
                {wonBets.map((entry) => {
                  const bet = getBetFromEntry(entry)
                  return (
                    <div key={entry.id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{bet.title}</h4>
                          <p className="text-sm text-gray-600">
                            Stake: {formatCurrency(entry.amount)} • 
                            Won: {formatCurrency(entry.winnings || entry.potentialWinnings)}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Won
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Profit: +{formatCurrency((entry.winnings || entry.potentialWinnings) - entry.amount)}</span>
                        <button 
                          className="text-blue-500 hover:text-blue-600 font-medium"
                          onClick={() => navigate(`/bets/${bet.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-body font-medium text-gray-900 mb-2">No wins yet</p>
                <p className="text-body-sm text-gray-500 mb-4">Your winning bets will appear here</p>
                <button
                  onClick={() => navigate('/discover')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Place Some Bets
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900 flex items-center">
              <History className="w-4 h-4 mr-2" />
              Bet History
            </h3>
            
            {historyBets.length > 0 ? (
              <div className="space-y-4">
                {historyBets.map((entry) => {
                  const bet = getBetFromEntry(entry)
                  const isLoss = entry.status === 'lost'
                  const profit = isLoss ? -entry.amount : (entry.winnings || entry.potentialWinnings) - entry.amount
                  
                  return (
                    <div key={entry.id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{bet.title}</h4>
                          <p className="text-sm text-gray-600">
                            Stake: {formatCurrency(entry.amount)} • 
                            {isLoss ? 'Lost' : `Won: ${formatCurrency(entry.winnings || entry.potentialWinnings)}`}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isLoss 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                        </span>
                        <button 
                          className="text-blue-500 hover:text-blue-600 font-medium"
                          onClick={() => navigate(`/bets/${bet.id}`)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-body font-medium text-gray-900 mb-2">No bet history</p>
                <p className="text-body-sm text-gray-500 mb-4">Your completed bets will appear here</p>
                <button
                  onClick={() => navigate('/discover')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Start Betting
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  )
}

export default BetsTab