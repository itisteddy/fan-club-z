import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Target, Medal, Crown, Award, Users, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import UserAvatar from '../components/common/UserAvatar';
import { OGBadge } from '../components/badges/OGBadge';
import AppHeader from '../components/layout/AppHeader';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';
import EmptyState from '../components/ui/empty/EmptyState';
import { SkeletonCard } from '../components/ui/skeleton/Skeleton';
import { getApiUrl } from '../config';
import { formatNumberShort, formatUSDCompact, formatPercent, formatPercentage } from '@/lib/format';
import { cn } from '../utils/cn';
import { KeyboardNavigation, AriaUtils } from '../utils/accessibility';
import { t } from '@/lib/lexicon';
import { isReferralEnabled, fetchReferralLeaderboard, type ReferralLeaderboardEntry } from '@/lib/referral';

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
  og_badge?: 'gold' | 'silver' | 'bronze' | null;
}

type TabType = 'predictions' | 'profit' | 'winrate' | 'referrals';

const UnifiedLeaderboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  // Determine available tabs based on feature flags
  const referralsEnabled = useMemo(() => isReferralEnabled(), []);
  
  const [activeTab, setActiveTab] = useState<TabType>('predictions');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [referralData, setReferralData] = useState<ReferralLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const openUserProfile = (leaderUser: LeaderboardUser) => {
    const handle = String(leaderUser.username || '').trim();
    if (handle) {
      navigate(`/u/${encodeURIComponent(handle)}`);
      return;
    }
    navigate(`/profile/${encodeURIComponent(String(leaderUser.id))}`);
  };

  const openReferralProfile = (entry: ReferralLeaderboardEntry) => {
    const handle = String(entry.username || '').trim();
    if (handle) {
      navigate(`/u/${encodeURIComponent(handle)}`);
      return;
    }
    navigate(`/profile/${encodeURIComponent(String(entry.userId))}`);
  };

  // Fetch standard leaderboard data
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

  // Fetch referral leaderboard data
  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchReferralLeaderboard(50, 'all');
      setReferralData(data);
    } catch (err) {
      console.error('Error fetching referral leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load referral leaderboard');
      setReferralData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'referrals') {
      fetchReferralData();
    } else {
      fetchLeaderboardData(activeTab);
    }
    
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
        if (!entry) return;
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

  const getTabConfig = () => {
    const baseTabs: Array<{ id: TabType; label: string; icon: typeof Target; description: string }> = [
      { 
        id: 'predictions' as const, 
        label: 'Creators', 
        icon: Target,
        description: 'Most predictions created'
      },
      { 
        id: 'profit' as const, 
        label: 'Winners', 
        icon: TrendingUp,
        description: 'Highest profits earned'
      }
    ];
    
    // Add referrals tab if feature is enabled
    if (referralsEnabled) {
      baseTabs.push({
        id: 'referrals' as const,
        label: 'Referrals',
        icon: Gift,
        description: 'Most active referrals'
      });
    }
    
    return baseTabs;
  };

  const tabs = getTabConfig();

  // Render referral leaderboard item
  const renderReferralItem = (entry: ReferralLeaderboardEntry, index: number) => {
    const rank = index + 1;
    const rankBadge = getRankBadge(rank);
    const isCurrentUser = user?.id === entry.userId;
    const isTopThree = rank <= 3;
    const RankIcon = rankBadge.icon;
    
    return (
      <motion.div 
        key={entry.userId}
        className={cn(
          "bg-white rounded-xl px-3 py-1.5 border",
          isCurrentUser 
            ? 'bg-emerald-50 border-emerald-200' 
            : isTopThree
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
              : 'border-gray-100'
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        role="listitem"
        aria-label={`${entry.fullName || entry.username}, rank ${rank}`}
      >
        <div className="flex items-center gap-2 min-h-0">
          {/* Rank Badge */}
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
            rankBadge.color
          )}>
            {isTopThree ? (
              <RankIcon className="w-3.5 h-3.5" />
            ) : (
              <span>{rank}</span>
            )}
          </div>
          
          {/* User Avatar */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => openReferralProfile(entry)}
            className="shrink-0 rounded-full min-h-0 min-w-0 h-auto w-auto p-0 m-0 border-0 bg-transparent appearance-none cursor-pointer"
            aria-label={`Open profile for ${entry.fullName || entry.username}`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openReferralProfile(entry); }}
          >
            <UserAvatar 
              email={entry.username}
              username={entry.username}
              avatarUrl={entry.avatarUrl}
              size="sm"
              className="h-7 w-7 text-[10px]"
            />
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => openReferralProfile(entry)}
                className="block min-h-0 min-w-0 h-auto w-auto p-0 m-0 border-0 bg-transparent appearance-none text-left font-medium text-sm leading-tight text-gray-900 truncate hover:text-emerald-700 cursor-pointer"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openReferralProfile(entry); }}
              >
                {entry.fullName || entry.username}
              </div>
              <OGBadge tier={entry.ogBadge} size="sm" />
              {isCurrentUser && (
                <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                  You
                </span>
              )}
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => openReferralProfile(entry)}
              className="block min-h-0 min-w-0 h-auto w-auto p-0 m-0 border-0 bg-transparent appearance-none text-left text-xs leading-tight text-gray-500 truncate hover:text-gray-700 cursor-pointer"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openReferralProfile(entry); }}
            >
              @{entry.username}
            </div>
          </div>
          
          {/* Referral Stats */}
          <div className="text-[15px] leading-none font-bold font-mono text-emerald-600 shrink-0">
            {entry.activeReferrals}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AppHeader title="Leaderboard" />
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 py-3 overflow-x-auto scrollbar-hide">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1",
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">
                    {tab.id === 'predictions' ? 'Creators' : 
                     tab.id === 'profit' ? 'Winners' : 'Referrals'}
                  </span>
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
                      onClick={() => activeTab === 'referrals' ? fetchReferralData() : fetchLeaderboardData(activeTab)}
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
            ) : activeTab === 'referrals' ? (
              // Referral leaderboard
              referralData.length > 0 ? (
                <motion.div
                  key="referral-data"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                className="space-y-2"
                role="list"
                aria-label="Top Referrers leaderboard"
                >
                  {referralData.map((entry, index) => renderReferralItem(entry, index))}
                </motion.div>
              ) : (
                <motion.div
                  key="referral-empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <EmptyState
                    icon={<Gift className="w-8 h-8" />}
                    title="No referrals yet"
                    description="Be the first to invite friends! Share your referral link and climb the leaderboard."
                    primaryAction={
                      <motion.button
                        onClick={() => window.location.href = '/profile'}
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Gift className="w-4 h-4" />
                        Get Referral Link
                      </motion.button>
                    }
                  />
                </motion.div>
              )
            ) : leaderboardData.length > 0 ? (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
                className="space-y-2"
                role="list"
                aria-label={`${getTabConfig().find(tab => tab.id === activeTab)?.label} leaderboard`}
            >
              {leaderboardData.map((leaderUser, index) => {
                const rankBadge = getRankBadge(leaderUser.rank || 0);
                const statDisplay = getStatDisplay(leaderUser, activeTab as 'predictions' | 'profit' | 'winrate');
                const isCurrentUser = user?.id === leaderUser.id;
                const isTopThree = (leaderUser.rank || 0) <= 3;
                const RankIcon = rankBadge.icon;
                
                return (
                  <motion.div 
                    key={leaderUser.id}
                    className={cn(
                      "bg-white rounded-xl px-3 py-1.5 border",
                      isCurrentUser 
                        ? 'bg-emerald-50 border-emerald-200' 
                        : isTopThree
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                          : 'border-gray-100'
                    )}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    role="listitem"
                    aria-label={`${leaderUser.full_name || leaderUser.username}, rank ${leaderUser.rank}`}
                  >
                    <div className="flex items-center gap-2 min-h-0">
                      {/* Rank Badge */}
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                        rankBadge.color
                      )}>
                        {isTopThree ? (
                          <RankIcon className="w-3.5 h-3.5" />
                        ) : (
                          <span>{leaderUser.rank}</span>
                        )}
                      </div>
                      
                      {/* User Avatar */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => openUserProfile(leaderUser)}
                        className="shrink-0 rounded-full min-h-0 min-w-0 h-auto w-auto p-0 m-0 border-0 bg-transparent appearance-none cursor-pointer"
                        aria-label={`Open profile for ${leaderUser.full_name || leaderUser.username}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openUserProfile(leaderUser); }}
                      >
                        <UserAvatar 
                          email={leaderUser.username}
                          username={leaderUser.username}
                          avatarUrl={leaderUser.avatar_url}
                          size="sm"
                          className="h-7 w-7 text-[10px]"
                        />
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 min-w-0">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openUserProfile(leaderUser)}
                            className="block min-h-0 min-w-0 h-auto w-auto p-0 m-0 border-0 bg-transparent appearance-none text-left font-medium text-sm leading-tight text-gray-900 truncate hover:text-emerald-700 cursor-pointer"
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openUserProfile(leaderUser); }}
                          >
                            {leaderUser.full_name || leaderUser.username}
                          </div>
                          <OGBadge tier={leaderUser.og_badge} size="sm" />
                          {isCurrentUser && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-medium rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openUserProfile(leaderUser)}
                          className="block min-h-0 min-w-0 h-auto w-auto p-0 m-0 border-0 bg-transparent appearance-none text-left text-xs leading-tight text-gray-500 truncate hover:text-gray-700 cursor-pointer"
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openUserProfile(leaderUser); }}
                        >
                          @{leaderUser.username}
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className={cn("text-[15px] leading-none font-bold font-mono shrink-0", statDisplay.color)}>
                        {statDisplay.primary}
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
                description={`Be the first to appear on the leaderboard by creating predictions and ${t('betting')}!`}
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
