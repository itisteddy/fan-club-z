import React, { useState, useEffect } from 'react';
import { Edit3, User, Activity, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePredictionStore, PredictionEntry, Prediction } from '../../store/predictionStore';
import { openAuthGate } from '../../auth/authGateAdapter';
import UserAvatar from '../../components/common/UserAvatar';
import AppHeader from '../../components/layout/AppHeader';
import { SignOutButton } from '../../components/profile/SignOutButton';
import { formatCurrency, formatInt, formatPercent } from '@/lib/format';

interface ProfilePageProps {
  onNavigateBack?: () => void;
  userId?: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateBack, userId }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { getUserPredictionEntries, getUserCreatedPredictions } = usePredictionStore();
  const [loading, setLoading] = useState(!isAuthenticated);
  
  // Determine if viewing own profile
  const isOwnProfile = !userId || userId === user?.id;
  const displayUser = user;

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Calculate user stats
  const userEntries = getUserPredictionEntries(user?.id || '') || [];
  const userCreated = getUserCreatedPredictions(user?.id || '') || [];
  const completedEntries = userEntries.filter((entry: PredictionEntry) => entry?.status === 'won' || entry?.status === 'lost');
  const wonEntries = userEntries.filter((entry: PredictionEntry) => entry?.status === 'won');
  const totalInvested = userEntries.reduce((sum: number, entry: PredictionEntry) => sum + (entry?.amount || 0), 0);
  const totalEarnings = wonEntries.reduce((sum: number, entry: PredictionEntry) => sum + (entry?.actual_payout || 0), 0);
  const winRate = completedEntries.length > 0 ? Math.round((wonEntries.length / completedEntries.length) * 100) : 0;
  const balance = totalEarnings - totalInvested;

  // Recent activity (last 5 items)
  const recentActivity = [...userEntries, ...userCreated]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Profile" />
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="mb-4 text-gray-300">
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your profile</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm">Customize your handle, avatar, and preferences.</p>
            <button
              onClick={async () => {
                try {
                  await openAuthGate({ intent: 'edit_profile' });
                } catch (error) {
                  console.error('Auth gate error:', error);
                }
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Profile" />
      
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
        <div className="space-y-4">
          {loading ? (
            <>
              {/* Loading Skeleton */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Stat Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Predictions</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {userEntries.length}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Win Rate</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {winRate}%
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Balance</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {formatCurrency(balance)}
                  </div>
                </div>
              </div>

              {/* Overview Card */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
                  {isOwnProfile && (
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <UserAvatar
                    email={displayUser?.email}
                    username={displayUser?.firstName || displayUser?.email?.split('@')[0]}
                    avatarUrl={displayUser?.avatar}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {displayUser?.firstName && displayUser?.lastName 
                        ? `${displayUser.firstName} ${displayUser.lastName}`
                        : displayUser?.email?.split('@')[0] || 'User'
                      }
                    </h3>
                    <p className="text-sm text-gray-600">
                      @{displayUser?.email?.split('@')[0] || 'user'}
                    </p>
                    <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                      <span>{completedEntries.length} completed</span>
                      <span>{userEntries.filter((e: PredictionEntry) => e.status === 'active').length} active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {'question' in item ? item.question : 'Prediction Entry'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.created_at || 0).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {'status' in item && (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              item.status === 'won' ? 'bg-green-100 text-green-800' :
                              item.status === 'lost' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recent activity</p>
                    <p className="text-sm">Your prediction activity will appear here.</p>
                  </div>
                )}
              </div>

              {/* Sign Out Button - Only for own profile */}
              {isOwnProfile && (
                <div className="mt-4">
                  <SignOutButton />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
