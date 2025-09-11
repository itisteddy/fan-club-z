import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Medal, Crown, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileHeader from '../components/layout/MobileHeader';

interface LeaderboardUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  total_invested: number;
  total_profit: number;
  total_entries: number;
  won_entries: number;
  predictions_count: number;
  win_rate: number;
}

interface LeaderboardPageProps {
  onNavigateBack?: () => void;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onNavigateBack }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'predictions' | 'profit' | 'accuracy'>('predictions');

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v2/users/leaderboard?type=${selectedType}&limit=50`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.data) {
        setLeaderboardData(result.data);
      } else {
        setLeaderboardData([]);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setLeaderboardData([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Trophy className="w-5 h-5 text-orange-500" />;
      default:
        return <span className="text-sm font-semibold text-gray-500">#{rank}</span>;
    }
  };

  const formatValue = (value: number, type: 'currency' | 'percentage' | 'number') => {
    switch (type) {
      case 'currency':
        return `₦${value.toLocaleString()}`;
      case 'percentage':
        return `${value}%`;
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getMetricValue = (user: LeaderboardUser) => {
    switch (selectedType) {
      case 'profit':
        return formatValue(user.total_profit, 'currency');
      case 'accuracy':
        return formatValue(user.win_rate, 'percentage');
      default:
        return formatValue(user.predictions_count, 'number');
    }
  };

  const getMetricLabel = () => {
    switch (selectedType) {
      case 'profit':
        return 'Total Profit';
      case 'accuracy':
        return 'Win Rate';
      default:
        return 'Predictions Created';
    }
  };

  const tabs = [
    { id: 'predictions', label: 'Creators', icon: Star },
    { id: 'profit', label: 'Profits', icon: TrendingUp },
    { id: 'accuracy', label: 'Accuracy', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader 
        title="Leaderboard" 
        showBack={!!onNavigateBack}
        onBack={onNavigateBack}
        right={
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-600" />
          </div>
        }
        elevated={true}
      />


      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedType === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedType(tab.id as typeof selectedType)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 font-medium text-sm transition-colors ${
                  isActive
                    ? 'text-emerald-600 border-b-2 border-emerald-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pt-4 pb-24">
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-red-500 mb-2">
              <Trophy className="w-12 h-12 mx-auto opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-gray-400 mb-2">
              <Trophy className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rankings Yet</h3>
            <p className="text-gray-600">Be the first to create predictions and climb the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {leaderboardData.map((user, index) => (
                <motion.div
                  key={`${user.id}-${selectedType}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-lg p-4 shadow-sm border ${
                    index < 3 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Rank */}
                      <div className="flex items-center justify-center w-8 h-8">
                        {getRankIcon(index + 1)}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold">
                        {user.avatar_url ? (
                          <img 
                            src={user.avatar_url} 
                            alt={user.full_name || user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (user.full_name || user.username || 'U').charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {user.total_entries} predictions • {user.win_rate}% win rate
                        </p>
                      </div>
                    </div>

                    {/* Metric Value */}
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        {getMetricValue(user)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getMetricLabel()}
                      </p>
                    </div>
                  </div>

                  {/* Additional Stats for Top 3 */}
                  {index < 3 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 pt-3 border-t border-yellow-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Created</p>
                        <p className="font-semibold text-sm">{user.predictions_count}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Invested</p>
                        <p className="font-semibold text-sm">₦{user.total_invested.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Profit</p>
                        <p className={`font-semibold text-sm ${
                          user.total_profit > 0 ? 'text-emerald-600' : 
                          user.total_profit < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          ₦{user.total_profit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default LeaderboardPage;