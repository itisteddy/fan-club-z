import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, User, Activity, DollarSign, TrendingUp, Target, Trophy, Upload, X, Mail, XCircle, Trash2, Ban, UserCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { isFeatureEnabled } from '@/config/featureFlags';
import { getApiUrl } from '@/utils/environment';
import { usePredictionStore } from '../store/predictionStore';
import { openAuthGate } from '../auth/authGateAdapter';
import UserAvatar from '../components/common/UserAvatar';
import AppHeader from '../components/layout/AppHeader';
import { formatLargeNumber, formatCurrency, formatPercentage, formatTimeAgo } from '@/lib/format';
import { formatTxAmount, toneClass } from '@/lib/txFormat';
import { useUserActivity, ActivityItem as FeedActivityItem } from '@/hooks/useActivityFeed';
import { t } from '@/lib/lexicon';
import { ReferralCard, ReferralShareModal } from '@/components/referral';
import { OGBadge, AvatarWithBadge } from '@/components/badges/OGBadge';
import { OGBadgeEnhanced } from '@/components/badges/OGBadgeEnhanced';
import { ProfileBadgesSection } from '@/components/profile/ProfileBadgesSection';
import { ProfileReferralSection } from '@/components/profile/ProfileReferralSection';
import { useReferral } from '@/hooks/useReferral';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import toast from 'react-hot-toast';
import { ReportContentModal } from '@/components/ugc/ReportContentModal';

interface ProfilePageV2Props {
  onNavigateBack?: () => void;
  userId?: string;
}

const CONFIRM_DELETE_PHRASE = 'DELETE';

const ProfilePageV2: React.FC<ProfilePageV2Props> = ({ onNavigateBack, userId }) => {
  const navigate = useNavigate();
  const { user: sessionUser, session, signOut } = useAuthSession();
  const { user: storeUser, isAuthenticated: storeAuth } = useAuthStore();
  const { 
    getUserPredictionEntries, 
    getUserCreatedPredictions,
    fetchUserPredictionEntries,
    fetchUserCreatedPredictions
  } = usePredictionStore();
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  // Phase 4: Account deletion flow state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Referral hook
  const { isEnabled: referralsEnabled } = useReferral();
  // Block list (UGC) - for viewing other users' profiles
  const { isEnabled: blockListEnabled, isBlocked, blockUser, unblockUser } = useBlockedUsers();

  // Determine user context - prioritize session user
  const user = sessionUser || storeUser;
  const authenticated = !!sessionUser || storeAuth;
  const isOwnProfile = !userId || userId === user?.id;
  const displayUser = user;
  const baseUser: any = displayUser || {};
  const userMetadata: any = baseUser.user_metadata || {};

  const displayEmail: string = baseUser.email || '';
  const displayFirstName: string =
    baseUser.firstName ??
    userMetadata.firstName ??
    userMetadata.first_name ??
    userMetadata.given_name ??
    '';
  const displayLastName: string =
    baseUser.lastName ??
    userMetadata.lastName ??
    userMetadata.last_name ??
    userMetadata.family_name ??
    '';
  const displayAvatar: string =
    baseUser.avatar ??
    baseUser.avatar_url ??
    userMetadata.avatar_url ??
    userMetadata.picture ??
    '';
  const displayHandle: string =
    (baseUser.username ??
      userMetadata.username ??
      (displayEmail ? displayEmail.split('@')[0] : '')) || 'user';
  
  // Get OG badge from user metadata
  const ogBadge = (user as any)?.user_metadata?.og_badge || (user as any)?.og_badge || null;
  const ogBadgeAssignedAt = (user as any)?.user_metadata?.og_badge_assigned_at || (user as any)?.og_badge_assigned_at || null;
  const ogBadgeMemberNumber = (user as any)?.user_metadata?.og_badge_member_number || (user as any)?.og_badge_member_number || null;

  useEffect(() => {
    if (authenticated && user?.id) {
      setLoading(false);
    } else if (!authenticated) {
      setLoading(false);
    }
  }, [authenticated, user?.id]);

  // Ensure profile analytics are calculated from fresh data
  useEffect(() => {
    if (authenticated && user?.id) {
      fetchUserPredictionEntries(user.id);
      fetchUserCreatedPredictions(user.id);
    }
  }, [authenticated, user?.id, fetchUserPredictionEntries, fetchUserCreatedPredictions]);

  // Calculate user stats
  const activityUserId = userId ?? user?.id ?? '';

  const { items: activityItems, loading: loadingActivity } = useUserActivity(activityUserId, {
    limit: 50,
    autoLoad: Boolean(activityUserId)
  });

  const userEntries = getUserPredictionEntries(user?.id || '') || [];
  const userCreated = getUserCreatedPredictions(user?.id || '') || [];
  const completedEntries = userEntries.filter(entry => entry?.status === 'won' || entry?.status === 'lost');
  const wonEntries = userEntries.filter(entry => entry?.status === 'won');
  const totalInvested = userEntries.reduce((sum, entry) => sum + (entry?.amount || 0), 0);
  const totalEarnings = wonEntries.reduce((sum, entry) => sum + (entry?.actual_payout || 0), 0);
  const winRate = completedEntries.length > 0 ? Math.round((wonEntries.length / completedEntries.length) * 100) : 0;
  const balance = totalEarnings - totalInvested;

  // Recent activity (last 5 items)
  const recentActivity = activityItems.slice(0, 5);
  const isActivityLoading = loadingActivity && activityItems.length === 0;

  // Calculate professional KPIs for Profile - must be before any early returns
  const uniquePredictionsBetOn = React.useMemo(() => {
    const ids = new Set<string>();
    for (const e of userEntries) {
      if (e?.prediction_id) ids.add(e.prediction_id);
    }
    return ids.size;
  }, [userEntries]);
  const totalPredictions = uniquePredictionsBetOn + userCreated.length;
  const successRate = completedEntries.length > 0 ? (wonEntries.length / completedEntries.length) * 100 : 0;
  const userRank = Math.max(1, Math.ceil((100 - winRate) / 10)); // Simple ranking based on win rate

  const getActivityDisplay = (item: FeedActivityItem) => {
    switch (item.type) {
      case 'entry.create':
      case 'bet_placed':
        return {
          iconBg: 'bg-blue-100',
          icon: <Target className="w-4 h-4 text-blue-600" />, 
          title: item.predictionTitle ? `Staked on ${item.predictionTitle}` : 'Stake placed',
          subtitle: item.data?.option_label ? `Option: ${item.data.option_label}` : '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'placed',
          badgeColor: 'text-blue-600'
        };
      case 'prediction.created':
        return {
          iconBg: 'bg-purple-100',
          icon: <TrendingUp className="w-4 h-4 text-purple-600" />, 
          title: item.predictionTitle ? `Created ${item.predictionTitle}` : 'Created a prediction',
          subtitle: item.data?.category ? `Category: ${item.data.category}` : '',
          amount: null,
          badge: 'created',
          badgeColor: 'text-purple-600'
        };
      case 'wallet.unlock':
        return {
          iconBg: 'bg-emerald-100',
          icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
          title: 'Escrow funds released',
          subtitle: item.data?.prediction_title ? item.data.prediction_title : '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'wallet',
          badgeColor: 'text-emerald-600'
        };
      case 'wallet.payout':
        return {
          iconBg: 'bg-emerald-100',
          icon: <DollarSign className="w-4 h-4 text-emerald-700" />,
          title: 'Settlement payout received',
          subtitle: item.data?.prediction_title ? item.data.prediction_title : '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'payout',
          badgeColor: 'text-emerald-700'
        };
      case 'wallet.platform_fee':
        return {
          iconBg: 'bg-slate-100',
          icon: <DollarSign className="w-4 h-4 text-slate-600" />,
          title: 'Platform fee credited',
          subtitle: item.data?.prediction_title ? item.data.prediction_title : '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'platform',
          badgeColor: 'text-slate-600'
        };
      case 'wallet.creator_fee':
        return {
          iconBg: 'bg-amber-100',
          icon: <DollarSign className="w-4 h-4 text-amber-600" />,
          title: 'Creator earnings received',
          subtitle: item.data?.prediction_title ? item.data.prediction_title : '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'creator',
          badgeColor: 'text-amber-600'
        };
      case 'wallet.loss':
        return {
          iconBg: 'bg-red-100',
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          title: 'Lost prediction',
          subtitle: item.predictionTitle ?? item.data?.prediction_title ?? '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'loss',
          badgeColor: 'text-red-600'
        };
      case 'wallet.bet_lock':
        return {
          iconBg: 'bg-blue-100',
          icon: <Target className="w-4 h-4 text-blue-600" />,
          title: item.data?.prediction_title ? `Staked on ${item.data.prediction_title}` : 'Stake placed',
          subtitle: item.data?.option_label ? `Option: ${item.data.option_label}` : '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'placed',
          badgeColor: 'text-blue-600'
        };
      case 'wallet.other':
        return {
          iconBg: 'bg-gray-100',
          icon: <Activity className="w-4 h-4 text-gray-500" />,
          title: 'Wallet activity',
          subtitle: item.data?.channel ?? '',
          amount: item.data?.amount ? (() => {
            const tx = formatTxAmount({ amount: Number(item.data.amount), type: item.type, kind: item.type, compact: true });
            return tx.display;
          })() : null,
          badge: 'wallet',
          badgeColor: 'text-gray-500'
        };
      default:
        return {
          iconBg: 'bg-gray-100',
          icon: <Activity className="w-4 h-4 text-gray-500" />, 
          title: 'Activity',
          subtitle: '',
          amount: null,
          badge: item.type,
          badgeColor: 'text-gray-500'
        };
    }
  };

  // Handle authentication required - NO UPSELL, clean experience (same visual structure as wallet)
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AppHeader title="Profile" showNotifications />
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

            {/* Profile Card - Clean signed-out state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
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

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <AppHeader title="Profile" showNotifications />
      
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
                    {userEntries.length} {t('bets')}, {userCreated.length} created
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
                    {formatPercentage(successRate / 100)}
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

              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-center space-x-4">
                  {/* Avatar with OG Badge overlay */}
                  <AvatarWithBadge tier={ogBadge} badgePosition="bottom-right" badgeSize="sm">
                    <UserAvatar
                      email={displayEmail}
                      username={displayFirstName || displayHandle}
                      avatarUrl={displayAvatar}
                      size="lg"
                    />
                  </AvatarWithBadge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {(displayFirstName || displayLastName)
                          ? `${displayFirstName} ${displayLastName}`.trim()
                          : displayHandle || 'User'}
                      </h3>
                      {/* Inline OG Badge next to name */}
                      <OGBadge tier={ogBadge} size="md" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      @{displayHandle}
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        {userEntries.filter(e => e.status === 'active').length} active {t('bets')}
                      </span>
                      <span className="text-gray-500">
                        {completedEntries.length} completed
                      </span>
                      <span className="text-gray-500">
                        {formatCurrency(Math.abs(balance), { compact: true })} {balance >= 0 ? 'profit' : 'loss'}
                      </span>
                    </div>
                  </div>
                  {/* Edit button */}
                  {isOwnProfile && (
                    <button 
                      onClick={() => {
                        setEditFirstName(displayFirstName || '');
                        setEditLastName(displayLastName || '');
                        setEditBio((baseUser as any)?.bio || userMetadata.bio || '');
                        setShowEditModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors self-start"
                      title="Edit profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Badges Section - Show if user has badges */}
              {ogBadge && (
                <ProfileBadgesSection
                  ogBadge={ogBadge}
                  ogBadgeAssignedAt={ogBadgeAssignedAt}
                  ogBadgeMemberNumber={ogBadgeMemberNumber}
                />
              )}

              {/* Report + Block user (UGC) - only when viewing another user's profile */}
              {!isOwnProfile && userId && (
                <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="w-full text-sm px-4 py-3 rounded-2xl border border-red-200 bg-white text-red-700 hover:bg-red-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    Report profile
                  </button>
                  {blockListEnabled && (
                    isBlocked(userId) ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await unblockUser(userId);
                          if (result.ok) toast.success('User unblocked');
                          else toast.error(result.message || 'Failed to unblock');
                        }}
                        className="w-full text-sm px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                      >
                        <UserCheck className="w-4 h-4" />
                        Unblock user
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await blockUser(userId);
                          if (result.ok) toast.success('User blocked. Their content will be hidden from you.');
                          else toast.error(result.message || 'Failed to block');
                        }}
                        className="w-full text-sm px-4 py-3 rounded-2xl border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Ban className="w-4 h-4" />
                        Block user
                      </button>
                    )
                  )}
                </div>
              )}

              {/* Referral Section - Show only on own profile when feature is enabled */}
              {isOwnProfile && referralsEnabled && (
                <ProfileReferralSection
                  isOwnProfile={isOwnProfile}
                  onOpenShareModal={() => setShowShareModal(true)}
                />
              )}

              {/* Recent Activity Card - Enhanced activity display */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  {recentActivity.length > 0 && (
                    <button
                      onClick={() => setShowActivityModal(true)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      View All
                    </button>
                  )}
                </div>
                
                {isActivityLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="animate-pulse flex items-center justify-between py-2 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full" />
                          <div>
                            <div className="h-3 bg-gray-200 rounded w-32 mb-1" />
                            <div className="h-2 bg-gray-200 rounded w-24" />
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-12" />
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((item, index) => {
                      const display = getActivityDisplay(item);
                      return (
                        <div key={index} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${display.iconBg}`}>
                              {display.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{display.title}</p>
                              {display.subtitle && (
                                <p className="text-xs text-gray-500 truncate">{display.subtitle}</p>
                              )}
                              <p className="text-[11px] text-gray-400">
                                {item.timestamp ? formatTimeAgo(item.timestamp) : 'Recently'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            {display.amount && (
                              <div
                                className={`text-sm font-semibold font-mono ${toneClass(
                                  formatTxAmount({
                                    amount: Number(item.data?.amount ?? 0),
                                    type: item.type,
                                    kind: item.type,
                                    compact: true,
                                  }).tone
                                )}`}
                              >
                                {display.amount}
                              </div>
                            )}
                            <div className={`text-xs font-medium ${display.badgeColor}`}>
                              {display.badge}
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

              {/* Contact Support CTA */}
              <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-500 rounded-2xl shadow-lg border border-white/10 p-4 sm:p-5 text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">Need help?</p>
                    <h3 className="text-lg font-bold mt-1">Contact the FanClubZ team</h3>
                    <p className="text-sm text-white/80 mt-1">
                      Have a question or spotted an issue? Email us and we'll follow up quickly.
                    </p>
                    <p className="text-xs text-white/70 font-mono mt-2">tech@fanclubz.app</p>
                  </div>
                  <a
                    href="mailto:tech@fanclubz.app"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <Mail className="w-4 h-4" />
                    Email support
                  </a>
                </div>
              </div>
            </>
          )}
      </div>
    </div>

    {/* Delete account (Phase 4) — only when flag on and own profile */}
    {authenticated && isOwnProfile && isFeatureEnabled('ACCOUNT_DELETION') && (
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 mt-4">
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText('');
            setDeleteError(null);
            setShowDeleteModal(true);
          }}
          className="w-full text-sm px-4 py-3 rounded-2xl border border-red-200 bg-white text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Delete account
        </button>
      </div>
    )}

    {/* Persistent Sign out CTA */}
    {authenticated && (
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 mt-4 mb-[calc(5rem+env(safe-area-inset-bottom))]">
        <button
          onClick={async () => {
            try {
              await useAuthStore.getState().logout();
            } catch (e) {
              console.error('Logout failed', e);
            }
          }}
          className="w-full text-sm px-4 py-3 rounded-2xl border border-black/[0.06] bg-white text-gray-900 hover:bg-gray-50 flex items-center justify-center shadow-sm"
        >
          Sign out
        </button>
      </div>
    )}

    {/* Edit Profile Modal */}
    {showEditModal && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Edit Profile</h2>
            <button
              onClick={() => setShowEditModal(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">First name</label>
                <input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Last name</label>
                <input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-2">Profile photo</label>
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Upload className="w-4 h-4 text-gray-500" />
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await useAuthStore.getState().uploadAvatar(file);
                    } catch (err) {
                      console.error('Avatar upload failed', err);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await useAuthStore.getState().updateProfile({
                    firstName: editFirstName,
                    lastName: editLastName,
                    bio: editBio
                  });
                  setShowEditModal(false);
                } catch (err) {
                  console.error('Update failed', err);
                }
              }}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Delete account confirmation (Phase 4) */}
    {showDeleteModal && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Delete account</h2>
            <button
              type="button"
              onClick={() => !deleteInProgress && setShowDeleteModal(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-700">
              This will permanently delete your account. Your profile (name, avatar, username) will be removed or anonymized. 
              Prediction and bet history may be kept in anonymized form for platform integrity. This cannot be undone.
            </p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Type <strong>{CONFIRM_DELETE_PHRASE}</strong> to confirm
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={CONFIRM_DELETE_PHRASE}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={deleteInProgress}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => !deleteInProgress && setShowDeleteModal(false)}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              disabled={deleteInProgress}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteConfirmText !== CONFIRM_DELETE_PHRASE || deleteInProgress}
              onClick={async () => {
                if (deleteConfirmText !== CONFIRM_DELETE_PHRASE || !session?.access_token) return;
                setDeleteInProgress(true);
                setDeleteError(null);
                try {
                  const res = await fetch(`${getApiUrl()}/api/v2/users/me/delete`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setDeleteError(data?.message || data?.error || 'Deletion failed. Try again or contact support.');
                    setDeleteInProgress(false);
                    return;
                  }
                  await signOut();
                  setShowDeleteModal(false);
                  navigate('/', { replace: true });
                } catch (e: any) {
                  setDeleteError(e?.message || 'Something went wrong. Try again or contact support.');
                  setDeleteInProgress(false);
                }
              }}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteInProgress ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      </div>
    )}

    {!isOwnProfile && userId && (
      <ReportContentModal
        open={showReportModal}
        targetType="user"
        targetId={userId}
        label="this profile"
        accessToken={session?.access_token}
        onClose={() => setShowReportModal(false)}
        onSuccess={() => toast.success('Report submitted. Our team will review it.')}
      />
    )}

    {showActivityModal && (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">All Activity</h2>
            <button
              onClick={() => setShowActivityModal(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="overflow-y-auto divide-y divide-gray-100 max-h-[calc(80vh-3.5rem)] sm:max-h-[calc(80vh-3rem)] pr-1">
            {loadingActivity && activityItems.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">Loading activity…</div>
            ) : activityItems.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">No activity yet.</div>
            ) : (
              activityItems.map((item) => {
                const display = getActivityDisplay(item);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${display.iconBg}`}>
                        {display.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{display.title}</p>
                        {display.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{display.subtitle}</p>
                        )}
                        <p className="text-[11px] text-gray-400">
                          {item.timestamp ? formatTimeAgo(item.timestamp) : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[80px]">
                      {display.amount && (
                        <div
                          className={`text-sm font-mono font-medium ${toneClass(
                            formatTxAmount({
                              amount: Number(item.data?.amount ?? 0),
                              type: item.type,
                              kind: item.type,
                              compact: true,
                            }).tone
                          )}`}
                        >
                          {display.amount}
                        </div>
                      )}
                      <div className={`text-xs font-medium ${display.badgeColor}`}>{display.badge}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    )}

    {/* Referral Share Modal */}
    <ReferralShareModal 
      isOpen={showShareModal} 
      onClose={() => setShowShareModal(false)} 
    />
    </div>
  );
};

export default ProfilePageV2;
