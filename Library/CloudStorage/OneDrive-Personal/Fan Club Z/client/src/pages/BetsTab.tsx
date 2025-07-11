import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Clock, Trophy, History } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBetStore } from '@/store/betStore'
import { useStatsStore } from '@/store/statsStore'
import BetCard from '@/components/BetCard'

export const BetsTab: React.FC = () => {
  const { user } = useAuthStore()
  const { stats, loading: statsLoading, fetchStats } = useStatsStore()
  const [activeTab, setActiveTab] = useState('active')

  // Fetch stats when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchStats(user.id)
    }
  }, [user?.id, fetchStats])

  return (
    <div className="min-h-screen bg-gray-50">
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
              {statsLoading ? '...' : (stats?.activeBets || 0)}
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
              Active
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'created' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Created
            </button>
            <button
              onClick={() => setActiveTab('won')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'won' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Won
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 text-body-sm font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'text-blue-500 border-b-2 border-blue-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History
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
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-body font-medium text-gray-900 mb-2">No active bets</p>
              <p className="text-body-sm text-gray-500">Your active positions will appear here</p>
            </div>
          </div>
        )}

        {activeTab === 'created' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900">Bets You Created</h3>
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-body font-medium text-gray-900 mb-2">No created bets</p>
              <p className="text-body-sm text-gray-500">Bets you've created will appear here</p>
            </div>
          </div>
        )}

        {activeTab === 'won' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900 flex items-center">
              <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
              Winning Bets
            </h3>
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-body font-medium text-gray-900 mb-2">No wins yet</p>
              <p className="text-body-sm text-gray-500">Your winning bets will appear here</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-title-3 font-semibold text-gray-900 flex items-center">
              <History className="w-4 h-4 mr-2" />
              Bet History
            </h3>
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-body font-medium text-gray-900 mb-2">No bet history</p>
              <p className="text-body-sm text-gray-500">Your completed bets will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BetsTab
