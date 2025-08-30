import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  Trophy, 
  Star,
  Search,
  Filter,
  UserPlus,
  MessageCircle,
  Heart
} from 'lucide-react';
import { ActivityFeed } from '../components/social/ActivityFeed';
import { UserFollowButton } from '../components/social/UserFollowButton';
import { UserAvatar } from '../components/common/UserAvatar';
import { scrollToTop } from '../utils/scroll';
import { socialApiService, UserProfile } from '../services/socialApiService';

const CommunityPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'top'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  // Fetch community users
  useEffect(() => {
    const fetchCommunityUsers = async () => {
      setLoading(true);
      try {
        const users = await socialApiService.getCommunityUsers({
          tab: activeTab,
          search: searchQuery,
          limit: 20
        });
        setUsers(users);
      } catch (error) {
        console.error('Error fetching community users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityUsers();
  }, [activeTab, searchQuery]);

  const handleBack = () => {
    setLocation('/discover');
  };

  const handleUserClick = (userId: string) => {
    setLocation(`/profile/${userId}`);
    scrollToTop({ behavior: 'instant' });
  };

  const handleFollowChange = (userId: string, isFollowing: boolean) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isFollowing, followers: isFollowing ? user.followers + 1 : user.followers - 1 } : user
    ));
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'trending':
        return 'Trending Predictors';
      case 'recent':
        return 'Recently Active';
      case 'top':
        return 'Top Performers';
      default:
        return 'Community';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="h-11" />
          <div className="px-4 py-1">
            <div className="animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-32 mb-1"></div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="h-11" /> {/* Status bar spacer */}
        <div className="px-4 py-1">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Community</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'trending', label: 'Trending', icon: TrendingUp },
              { key: 'recent', label: 'Recent', icon: Users },
              { key: 'top', label: 'Top', icon: Trophy }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Community Users */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm mb-6">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">{getTabContent()}</h2>
                <p className="text-sm text-gray-600">Discover and connect with top predictors</p>
              </div>

              <div className="p-4">
                {users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleUserClick(user.id)}
                  >
                    <UserAvatar
                      src={user.avatar}
                      alt={user.username}
                      size="lg"
                      className="w-16 h-16"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{user.username}</h3>
                        {user.isVerified && (
                          <Star className="w-4 h-4 text-blue-500 fill-current" />
                        )}
                      </div>
                      
                      {user.bio && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{user.bio}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span>{user.followers} followers</span>
                        <span>{user.totalPredictions} predictions</span>
                        <span>{user.winRate}% win rate</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {user.badges.slice(0, 3).map((badge, badgeIndex) => (
                          <span
                            key={badgeIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <UserFollowButton
                        userId={user.id}
                        username={user.username}
                        isFollowing={user.isFollowing}
                        onFollowChange={(isFollowing) => handleFollowChange(user.id, isFollowing)}
                        variant="compact"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="lg:col-span-1">
            <ActivityFeed limit={8} />
          </div>
        </div>

        {/* Community Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Active Predictions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">$0</div>
              <div className="text-sm text-gray-600">Total Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">0%</div>
              <div className="text-sm text-gray-600">Avg Win Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
