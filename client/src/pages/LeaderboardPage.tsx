import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, TrendingUp, Users, ArrowLeft, Crown, Star, Target } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuthStore } from '../store/authStore';
import { useLeaderboardStore, LeaderboardEntry } from '../store/leaderboardStore';
import { scrollToTop } from '../utils/scroll';

const LeaderboardPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user } = useAuthStore();
  const { 
    data: leaderboardData, 
    loading, 
    error, 
    activeTab, 
    stats,
    fetchLeaderboard, 
    setActiveTab: setStoreActiveTab,
    clearError 
  } = useLeaderboardStore();

  const handleTabChange = (tab: 'all' | 'weekly' | 'monthly') => {
    setStoreActiveTab(tab);
    scrollToTop({ behavior: 'smooth' });
    
    // Map tab to API type
    const typeMap = {
      'all': 'predictions',
      'weekly': 'profit',
      'monthly': 'accuracy'
    };
    
    fetchLeaderboard(typeMap[tab], 50);
  };

  // Fetch leaderboard data on component mount
  useEffect(() => {
    // Scroll to top when component mounts
    scrollToTop({ behavior: 'instant' });
    
    // Fetch initial data
    fetchLeaderboard('predictions', 50);
  }, [fetchLeaderboard]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-gray-600 dark:text-gray-300">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  // Mark current user in the leaderboard with null safety
  const processedData = (leaderboardData || []).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isCurrentUser: user?.id === entry.id
  }));

  const tabs = [
    { id: 'all', label: 'All Time', icon: Trophy },
    { id: 'weekly', label: 'This Week', icon: TrendingUp },
    { id: 'monthly', label: 'This Month', icon: Target }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header - Consistent with other pages */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          {/* Status bar spacer */}
          <div className="h-11" />
          <div className="px-4 py-1">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setLocation('/profile')}
                className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex-1 text-center">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
              </div>
              <div className="w-8" /> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Loading Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header - Consistent with other pages */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          {/* Status bar spacer */}
          <div className="h-11" />
          <div className="px-4 py-1">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={() => setLocation('/profile')}
                className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex-1 text-center">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
              </div>
              <div className="w-8" /> {/* Spacer for centering */}
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center py-8">
            <div className="text-red-500 dark:text-red-400 mb-4">
              <Trophy className="w-16 h-16 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to load leaderboard</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => fetchLeaderboard('predictions', 50)}
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Consistent with other pages */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        {/* Status bar spacer */}
        <div className="h-11" />
        <div className="px-4 py-1">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => setLocation('/profile')}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Leaderboard</h1>
            </div>
            <div className="w-8" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {processedData.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-2 transition-all ${
                entry.isCurrentUser
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                  : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Rank and User Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getRankBadgeColor(entry.rank)}`}>
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                        {entry.full_name}
                      </h3>
                      {entry.isCurrentUser && (
                        <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-medium rounded-full flex-shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-xs truncate">@{entry.username}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {entry.predictions_count.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Pred</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {entry.win_rate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Win</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      ${entry.total_profit.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Profit</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {entry.total_entries}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Bets</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.activePredictors.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active Predictors</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalPredictions.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Predictions</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">${stats.totalWinnings.toLocaleString()}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Winnings</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
