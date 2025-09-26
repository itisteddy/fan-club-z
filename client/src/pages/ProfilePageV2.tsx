import React, { useState, useEffect } from 'react';
import { Edit3, User, Activity, DollarSign, TrendingUp, Target, Trophy } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { usePredictionStore } from '../store/predictionStore';
import { openAuthGate } from '../auth/authGateAdapter';
import UserAvatar from '../components/common/UserAvatar';
import AppHeader from '../components/layout/AppHeader';
import { formatLargeNumber, formatCurrency, formatPercentage } from '../utils/formatters';

interface ProfilePageV2Props {
  onNavigateBack?: () => void;
  userId?: string;
}

const ProfilePageV2: React.FC<ProfilePageV2Props> = ({ onNavigateBack, userId }) => {
  const { user: sessionUser } = useAuthSession();
  const { user: storeUser, isAuthenticated: storeAuth } = useAuthStore();
  const { getUserPredictionEntries, getUserCreatedPredictions } = usePredictionStore();
  const [loading, setLoading] = useState(true);
  
  // Determine user context - prioritize session user
  const user = sessionUser || storeUser;
  const authenticated = !!sessionUser || storeAuth;
  const isOwnProfile = !userId || userId === user?.id;
  const displayUser = user;

  useEffect(() => {
    if (authenticated && user?.id) {
      setLoading(false);
    } else if (!authenticated) {
      setLoading(false);
    }
  }, [authenticated, user?.id]);

  // Calculate user stats
  const userEntries = getUserPredictionEntries(user?.id || '') || [];
  const userCreated = getUserCreatedPredictions(user?.id || '') || [];
  const completedEntries = userEntries.filter(entry => entry?.status === 'won' || entry?.status === 'lost');
  const wonEntries = userEntries.filter(entry => entry?.status === 'won');
  const totalInvested = userEntries.reduce((sum, entry) => sum + (entry?.amount || 0), 0);
  const totalEarnings = wonEntries.reduce((sum, entry) => sum + (entry?.actual_payout || 0), 0);
  const winRate = completedEntries.length > 0 ? Math.round((wonEntries.length / completedEntries.length) * 100) : 0;
  const balance = totalEarnings - totalInvested;

  // Recent activity (last 5 items)
  const recentActivity = [...userEntries, ...userCreated]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  // Handle authentication required - NO UPSELL, clean experience (same visual structure as wallet)
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AppHeader title="Profile" />
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
          {/* Same visual structure as authenticated, but with placeholders */}
          <div className="space-y-4">
            {/* Empty Stat Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <Activity className="w-4 h-4 text-gray-300" />
                  <div className="text-xs text-gray-400 font-medium tracking-wide">Predictions</div>
                </div>
                <div className="text-lg font-bold text-gray-300 font-mono truncate">--</div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <Target className="w-4 h-4 text-gray-300" />
                  <div className="text-xs text-gray-400 font-medium tracking-wide">Win Rate</div>
                </div>
                <div className="text-lg font-bold text-gray-300 font-mono truncate">--</div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <Trophy className="w-4 h-4 text-gray-300" />
                  <div className="text-xs text-gray-400 font-medium tracking-wide">Rank</div>
                </div>
                <div className="text-lg font-bold text-gray-300 font-mono truncate">--</div>
              </div>
            </div>

            {/* Overview Card - Clean signed-out state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Overview</h3>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view profile</h4>
                <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
                  Customize your handle, avatar, and track your prediction performance.
                </p>
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

            {/* Recent Activity Card - Empty state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">Your prediction activity will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate professional KPIs for Profile
  const totalPredictions = userEntries.length + userCreated.length;
  const successRate = completedEntries.length > 0 ? (wonEntries.length / completedEntries.length) * 100 : 0;
  const userRank = Math.max(1, Math.ceil((100 - winRate) / 10)); // Simple ranking based on win rate

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <AppHeader title="Profile" />
      
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
        <div className="space-y-4">
          {loading ? (
            <>
              {/* Professional Loading Skeleton */}
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                    <div className="h-3 bg-gray-200 rounded mb-2 w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                    <div className="h-2 bg-gray-200 rounded w-12 mt-1"></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-40"></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Professional Stat Row - Handles lengthy figures cleanly */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Predictions</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono truncate">
                    {formatLargeNumber(totalPredictions)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {userEntries.length} bets, {userCreated.length} created
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Target className={`w-4 h-4 ${successRate >= 70 ? 'text-emerald-500' : successRate >= 50 ? 'text-yellow-500' : 'text-red-500'}`} />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Win Rate</div>
                  </div>
                  <div className={`text-lg font-bold font-mono truncate ${
                    successRate >= 70 ? 'text-emerald-600' : 
                    successRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(successRate)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {wonEntries.length}/{completedEntries.length} won
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Trophy className="w-4 h-4 text-purple-500" />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Rank</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono truncate">
                    #{userRank}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {balance >= 0 ? 'profitable' : 'improving'}
                  </div>
                </div>
              </div>

              {/* Overview Card - Professional profile display */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
                  {isOwnProfile && (
                    <button 
                      onClick={async () => {
                        try {
                          await openAuthGate({ intent: 'edit_profile' });
                        } catch (error) {
                          console.error('Edit profile error:', error);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <UserAvatar
                    email={displayUser?.email}
                    username={(displayUser as any)?.firstName || displayUser?.email?.split('@')[0]}
                    avatarUrl={(displayUser as any)?.avatar}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900">
                      {(displayUser as any)?.firstName && (displayUser as any)?.lastName 
                        ? `${(displayUser as any).firstName} ${(displayUser as any).lastName}`
                        : displayUser?.email?.split('@')[0] || 'User'
                      }
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      @{displayUser?.email?.split('@')[0] || 'user'}
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        {userEntries.filter(e => e.status === 'active').length} active bets
                      </span>
                      <span className="text-gray-500">
                        {completedEntries.length} completed
                      </span>
                      <span className="text-gray-500">
                        {formatCurrency(Math.abs(balance), { compact: true })} {balance >= 0 ? 'profit' : 'loss'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card - Enhanced activity display */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  {recentActivity.length > 0 && (
                    <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      View All
                    </button>
                  )}
                </div>
                
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((item, index) => {
                      const isEntry = 'status' in item;
                      const isPrediction = 'question' in item;
                      
                      return (
                        <div key={index} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isEntry ? 
                                (item as any).status === 'won' ? 'bg-emerald-100' : 
                                (item as any).status === 'lost' ? 'bg-red-100' : 'bg-blue-100'
                              : 'bg-purple-100'
                            }`}>
                              {isEntry ? (
                                (item as any).status === 'won' ? (
                                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                                ) : (item as any).status === 'lost' ? (
                                  <Activity className="w-4 h-4 text-red-600" />
                                ) : (
                                  <Target className="w-4 h-4 text-blue-600" />
                                )
                              ) : (
                                <User className="w-4 h-4 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {isPrediction ? String((item as any).question) : 
                                 isEntry ? `${(item as any).status === 'won' ? 'Won' : (item as any).status === 'lost' ? 'Lost' : 'Placed'} Prediction` :
                                 'Prediction Activity'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(item.created_at || 0).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            {isEntry && (item as any).amount && (
                              <div className={`text-sm font-semibold font-mono ${
                                (item as any).status === 'won' ? 'text-emerald-600' : 
                                (item as any).status === 'lost' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {formatCurrency((item as any).amount, { compact: true })}
                              </div>
                            )}
                            <div className={`text-xs font-medium ${
                              isEntry ? (
                                (item as any).status === 'won' ? 'text-emerald-600' :
                                (item as any).status === 'lost' ? 'text-red-600' :
                                'text-blue-600'
                              ) : 'text-purple-600'
                            }`}>
                              {isEntry ? (item as any).status : 'created'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Activity className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-900 font-medium mb-1">No recent activity</p>
                    <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                      Your prediction activity and results will appear here.
                    </p>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
                    >
                      Explore Predictions
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePageV2;
