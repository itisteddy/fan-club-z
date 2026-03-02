import React, { useState, useEffect } from 'react';
import { Edit3, User, Activity, DollarSign } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { openAuthGate } from '../auth/authGateAdapter';
import UserAvatar from '../components/common/UserAvatar';
import Header from '../components/layout/Header/Header';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';
import StatCard, { StatRow } from '../components/ui/card/StatCard';
import EmptyState from '../components/ui/empty/EmptyState';
import AuthRequiredState from '../components/ui/empty/AuthRequiredState';
import { SkeletonStatRow, SkeletonCard } from '../components/ui/skeleton/Skeleton';
import { truncateText } from '@/lib/format';

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
  const displayUser = user; // In a real app, you'd fetch the target user if userId is different

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Calculate user stats with enhanced formatting
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

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <>
        <Header title="Profile" />
        <Page>
          <AuthRequiredState
            icon={<User />}
            title="Sign in to view your profile"
            description="Customize your handle, avatar, and preferences."
            intent="edit_profile"
          />
        </Page>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Profile" 
        back={!!onNavigateBack}
        onBack={onNavigateBack}
        trailing={isOwnProfile ? (
          <button
            onClick={() => {/* Handle edit */}}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Edit profile"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        ) : undefined}
      />
      
      <Page>
        {loading ? (
          <>
            <SkeletonStatRow />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Stat Row with Enhanced Formatting */}
            <StatRow>
              <StatCard 
                label="Total Predictions" 
                value={userEntries.length} 
                variant="count"
                icon={<Activity className="w-4 h-4" />}
              />
              <StatCard 
                label="Win Rate" 
                value={winRate}
                variant="percentage"
                icon={<User className="w-4 h-4" />}
              />
              <StatCard 
                label="Balance" 
                value={balance}
                variant="balance"
                icon={<DollarSign className="w-4 h-4" />}
              />
            </StatRow>

            {/* Overview Card */}
            <Card>
              <CardHeader 
                title="Overview"
                actions={isOwnProfile ? (
                  <button
                    onClick={() => {/* Handle edit */}}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Edit profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : undefined}
              />
              <CardContent>
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
                        ? truncateText(`${displayUser.firstName} ${displayUser.lastName}`, 25)
                        : truncateText(displayUser?.email?.split('@')[0] || 'User', 20)
                      }
                    </h3>
                    <p className="text-sm text-gray-600">
                      @{truncateText(displayUser?.email?.split('@')[0] || 'user', 15)}
                    </p>
                    <div className="flex space-x-4 mt-2 text-xs text-gray-500">
                      <span>{completedEntries.length} completed</span>
                      <span>{userEntries.filter(e => e.status === 'active').length} active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card>
              <CardHeader title="Recent Activity" />
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {truncateText(
                              'question' in item ? (item.question || 'Prediction') : 'Prediction Entry', 
                              50
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.created_at || 0).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right ml-4">
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
                  <EmptyState
                    title="No recent activity"
                    description="Your prediction activity will appear here."
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Page>
    </>
  );
};

export default ProfilePage;
