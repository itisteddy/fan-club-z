import React, { useState, useEffect, useRef } from 'react';
import { Trophy, TrendingUp, Target, Star, Medal, Crown, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import UserAvatar from '../components/common/UserAvatar';
import AppHeader from '../components/layout/AppHeader';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';
import EmptyState from '../components/ui/empty/EmptyState';
import { SkeletonCard } from '../components/ui/skeleton/Skeleton';
import { getApiUrl } from '../config';
import { formatNumberShort, formatUSDCompact, formatPercent } from '../utils/format';
import { formatPercentage } from '@lib/format';
import { cn } from '../utils/cn';
import { KeyboardNavigation, AriaUtils } from '../utils/accessibility';

// TODO: Replace leaderboard user cards with PredictionCardV3 for consistency
// when showing user's top predictions or recent activity
// import { PredictionCardV3 } from '../components/predictions/PredictionCardV3';

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url?: string;
  full_name?: string;
  predictions_count: number;
  total_profit: number;
  total_invested: number;
  win_rate: number;
  total_entries: number;
  rank?: number;
}

const UnifiedLeaderboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'predictions' | 'profit' | 'winrate'>('predictions');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Fetch leaderboard data
  const fetchLeaderboardData = async (type: 'predictions' | 'profit' | 'winrate') => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/v2/users/leaderboard?type=${type === 'winrate' ? 'accuracy' : type}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.message || 'Failed to fetch leaderboard');
      }

      // Add rank to each user
      const rankedData = (result.data || []).map((user: LeaderboardUser, index: number) => ({
        ...user,
        rank: index + 1,
      }));

      setLeaderboardData(rankedData);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(activeTab);
    // Announce tab change to screen readers
    const tabConfig = getTabConfig().find(tab => tab.id === activeTab);
    if (tabConfig) {
      AriaUtils.announce(`Switched to ${tabConfig.label} leaderboard`);
    }
  }, [activeTab]);

  // Sticky observer for tabs
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(entry.intersectionRatio < 1);
      },
      { threshold: [1] }
    );

    if (filterRef.current) {
      observer.observe(filterRef.current);
    }

    return () => {
      if (filterRef.current) {
        observer.unobserve(filterRef.current);
      }
    };
  }, []);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return { 
        icon: Crown, 
        emoji: '🏆', 
        color: 'text-yellow-600 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
        textColor: 'text-yellow-700'
      };
      case 2: return { 
        icon: Medal, 
        emoji: '🥈', 
        color: 'text-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
        textColor: 'text-gray-700'
      };
      case 3: return { 
        icon: Award, 
        emoji: '🥉', 
        color: 'text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
        textColor: 'text-amber-700'
      };
      default: return { 
        icon: Trophy, 
        emoji: `#${rank}`, 
        color: 'text-gray-500 bg-gray-50 border-gray-100',
        textColor: 'text-gray-600'
      };
    }
  };

  const getStatDisplay = (user: LeaderboardUser, type: 'predictions' | 'profit' | 'winrate') => {
    switch (type) {
      case 'predictions':
        return {
          primary: formatNumberShort(user.predictions_count),
          color: user.predictions_count > 10 ? 'text-blue-600' : 'text-gray-600'
        };
      case 'profit':
        const profit = user.total_profit || 0;
        return {
          primary: formatUSDCompact(profit),
          color: profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-gray-600'
        };
      case 'winrate':
        const winRate = user.win_rate || 0;
        return {
          primary: formatPercent(winRate / 100),
          color: winRate > 70 ? 'text-emerald-600' : winRate > 50 ? 'text-blue-600' : 'text-gray-600'
        };
    }
  };

  const getTabConfig = () => [
    { 
      id: 'predictions' as const, 
      label: 'Top Creators', 
      icon: Target,
      description: 'Most predictions created'
    },
    { 
      id: 'profit' as const, 
      label: 'Big Winners', 
      icon: TrendingUp,
      description: 'Highest profits earned'
    },
    { 
      id: 'winrate' as const, 
      label: 'Best Accuracy', 
      icon: Trophy,
      description: 'Highest win rates'
    }
  ];

  const tabs = getTabConfig();

  return (
    <>
      <AppHeader title="Leaderboard" />
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4 inline mr-1" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === 'predictions' ? 'Creators' : tab.id === 'profit' ? 'Winners' : 'Accuracy'}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {/* Content */}
        <div className="px-4 py-6">
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                    <div className="text-right space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-16 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <EmptyState
                  icon={<Trophy className="w-8 h-8" />}
                  title="Unable to load leaderboard"
                  description={error}
                  primaryAction={
                    <motion.button
                      onClick={() => fetchLeaderboardData(activeTab)}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trophy className="w-4 h-4" />
                      Try Again
                    </motion.button>
                  }
                />
              </motion.div>
            ) : leaderboardData.length > 0 ? (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
              role="list"
              aria-label={`${getTabConfig().find(tab => tab.id === activeTab)?.label} leaderboard`}
            >
              {leaderboardData.map((leaderUser, index) => {
                const rankBadge = getRankBadge(leaderUser.rank || 0);
                const statDisplay = getStatDisplay(leaderUser, activeTab);
                const isCurrentUser = user?.id === leaderUser.id;
                const isTopThree = (leaderUser.rank || 0) <= 3;
                const RankIcon = rankBadge.icon;
                
                return (
                  <motion.div 
                    key={leaderUser.id}
                    className={cn(
                      "bg-white rounded-2xl p-4 transition-all duration-200",
                      "hover:shadow-md hover:scale-[1.01] border",
                      isCurrentUser 
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                        : isTopThree
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-sm'
                          : 'bg-white border-gray-100'
                    )}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    role="listitem"
                    aria-label={`${leaderUser.full_name || leaderUser.username}, rank ${leaderUser.rank}, ${statDisplay.primary} ${activeTab === 'predictions' ? 'predictions' : activeTab === 'profit' ? 'profit' : 'win rate'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        {/* Enhanced Rank Badge */}
                        <div className={cn(
                          "relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
                          rankBadge.color
                        )}>
                          {isTopThree ? (
                            <RankIcon className="w-5 h-5" />
                          ) : (
                            <span className="text-xs">{leaderUser.rank}</span>
                          )}
                          {isTopThree && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <span className="text-xs">✨</span>
                            </motion.div>
                          )}
                        </div>
                        
                        {/* User Avatar */}
                        <UserAvatar 
                          email={leaderUser.username}
                          username={leaderUser.username}
                          avatarUrl={leaderUser.avatar_url}
                          size="md"
                        />
                        
                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {leaderUser.full_name || leaderUser.username}
                            </h4>
                            {isCurrentUser && (
                              <motion.span
                                className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                You
                              </motion.span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            @{leaderUser.username}
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced Stats Display - Simplified */}
                      <div className="text-right">
                        <div className={cn("text-lg font-bold font-mono", statDisplay.color)}>
                          {statDisplay.primary}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <EmptyState
                icon={<Trophy className="w-8 h-8" />}
                title="No leaders yet"
                description="Be the first to appear on the leaderboard by creating predictions and placing bets!"
                primaryAction={
                  <motion.button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Target className="w-4 h-4" />
                    Start Predicting
                  </motion.button>
                }
              />
            </motion.div>
          )}          
            </AnimatePresence>
            </div>
            </div>
      </div>
    </>
  );
};

export default UnifiedLeaderboardPage;
