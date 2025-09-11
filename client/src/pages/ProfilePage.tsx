import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '../hooks/useRequireAuth';
import EmptyState from '../components/EmptyState';
import { AuthCTA } from '../components/auth/AuthCTA';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  Star,
  Edit3,
  Camera,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  ArrowLeft,
  Save,
  X,
  ChevronLeft,
  ToggleLeft,
  Lock,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  FileText,
  Heart
} from 'lucide-react';
import UserAvatar from '../components/common/UserAvatar';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { scrollToTop } from '../utils/scroll';
import { usePullToRefresh } from '../utils/pullToRefresh';
import { APP_VERSION } from '../lib/version';
import { getApiUrl } from '../config';
import MobileHeader from '../components/layout/MobileHeader';

interface ProfilePageProps {
  onNavigateBack?: () => void;
  userId?: string; // Optional userId for viewing other users' profiles
}

// Settings Components - Using MobileHeader for all subsections
const AccountSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, updateProfile } = useAuthStore();
  const [settings, setSettings] = useState({
    twoFactorEnabled: false,
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    publicProfile: true,
    showEarnings: false
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleSetting = async (key: keyof typeof settings) => {
    setIsUpdating(true);
    setTimeout(() => {
      setSettings({ ...settings, [key]: !settings[key] });
      setIsUpdating(false);
    }, 500);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <MobileHeader 
        title="Account Settings" 
        showBack={true}
        onBack={onBack}
        elevated={true}
      />

      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>Profile Visibility</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '500', fontSize: '14px' }}>Public Profile</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Allow others to see your profile</div>
              </div>
              <button
                onClick={() => handleToggleSetting('publicProfile')}
                disabled={isUpdating}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: settings.publicProfile ? '#059669' : '#e5e7eb',
                  position: 'relative',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: settings.publicProfile ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <MobileHeader 
        title="Notifications" 
        showBack={true}
        onBack={onBack}
        elevated={true}
      />
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Notification Settings
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Notification preferences will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

const SecuritySettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <MobileHeader 
        title="Security & Privacy" 
        showBack={true}
        onBack={onBack}
        elevated={true}
      />
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Security Settings
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Security settings will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

const HelpSupport: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <MobileHeader 
        title="Help & Support" 
        showBack={true}
        onBack={onBack}
        elevated={true}
      />
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Help & Support
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Help resources will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

// Simplified LeaderboardView that redirects to main leaderboard page
const LeaderboardView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  React.useEffect(() => {
    // Redirect to main leaderboard page
    onBack(); // First go back to profile
    setTimeout(() => {
      // Then navigate to leaderboard through the bottom navigation
      if (typeof window !== 'undefined') {
        window.location.href = '/leaderboard';
      }
    }, 100);
  }, [onBack]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <MobileHeader 
        title="Leaderboard" 
        showBack={true}
        onBack={onBack}
        elevated={true}
      />
      <div style={{ padding: '24px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', margin: '0 0 16px 0' }}>
            Redirecting to Leaderboard...
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
            Taking you to the main leaderboard page.
          </p>
        </div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateBack, userId }) => {
  const { user: currentUser, updateProfile, logout } = useAuthStore();
  const requireAuth = useRequireAuth();
  const { getUserPredictionEntries, getUserCreatedPredictions, fetchUserPredictionEntries, fetchUserCreatedPredictions } = usePredictionStore();
  
  // All state hooks must be called before any conditional returns
  const [activeSection, setActiveSection] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [viewingOtherUser, setViewingOtherUser] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    bio: currentUser?.bio || ''
  });

  // All useMemo hooks must also be called before conditional returns
  const userStats = React.useMemo(() => {
    const dataUser = profileUser || currentUser;
    const targetUserId = userId || currentUser?.id;
    
    if (!dataUser || !targetUserId) {
      return {
        totalEarnings: 0,
        totalInvested: 0,
        winRate: 0,
        activePredictions: 0,
        totalPredictions: 0,
        rank: 0,
        joinedDate: 'Recently',
        level: 'New Predictor'
      };
    }
    
    try {
      const userEntries = getUserPredictionEntries(targetUserId) || [];
      const userCreated = getUserCreatedPredictions(targetUserId) || [];
      
      const activePredictions = userEntries.filter(entry => entry?.status === 'active').length;
      const completedEntries = userEntries.filter(entry => entry?.status === 'won' || entry?.status === 'lost');
      const wonEntries = userEntries.filter(entry => entry?.status === 'won');
      const totalInvested = userEntries.reduce((sum, entry) => sum + (entry?.amount || 0), 0);
      const totalEarnings = wonEntries.reduce((sum, entry) => sum + (entry?.actual_payout || 0), 0);
      const winRate = completedEntries.length > 0 ? Math.round((wonEntries.length / completedEntries.length) * 100) : 0;
      
      return {
        totalEarnings,
        totalInvested,
        winRate,
        activePredictions,
        totalPredictions: userEntries.length + userCreated.length,
        rank: dataUser.rank || 0,
        joinedDate: dataUser.createdAt ? new Date(dataUser.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        }) : 'Recently',
        level: activePredictions > 5 ? 'Expert Predictor' : activePredictions > 0 ? 'Active Predictor' : 'New Predictor'
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return {
        totalEarnings: 0,
        totalInvested: 0,
        winRate: 0,
        activePredictions: 0,
        totalPredictions: 0,
        rank: 0,
        joinedDate: 'Recently',
        level: 'New Predictor'
      };
    }
  }, [profileUser?.id, userId, currentUser?.id, getUserPredictionEntries, getUserCreatedPredictions]);

  const menuItems = React.useMemo(() => [
    {
      id: 'account',
      label: 'Account Settings',
      icon: Settings,
      description: 'Manage your account preferences',
      action: () => setActiveSection('account')
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'Control your notification settings',
      action: () => setActiveSection('notifications')
    },
    {
      id: 'security',
      label: 'Security & Privacy',
      icon: Shield,
      description: 'Manage security settings',
      action: () => setActiveSection('security')
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: HelpCircle,
      description: 'Get help and contact support',
      action: () => setActiveSection('help')
    }
  ], [setActiveSection]);

  const achievements = React.useMemo(() => {
    const targetUserId = userId || currentUser?.id;
    if (!targetUserId) return [];

    try {
      const userEntries = getUserPredictionEntries(targetUserId) || [];
      const userCreated = getUserCreatedPredictions(targetUserId) || [];
      
      const totalPredictions = userEntries.length;
      const totalCreated = userCreated.length;
      const wonPredictions = userEntries.filter(entry => entry?.status === 'won').length;
      
      return [
        { 
          id: 1, 
          title: 'First Prediction', 
          icon: '🎯', 
          unlocked: totalPredictions > 0,
          description: 'Make your first prediction'
        },
        { 
          id: 2, 
          title: 'Active Predictor', 
          icon: '🔥', 
          unlocked: totalPredictions >= 3,
          description: `Make 3 predictions (${totalPredictions}/3)`
        },
        { 
          id: 3, 
          title: 'Top Predictor', 
          icon: '👑', 
          unlocked: wonPredictions >= 5,
          description: `Win 5 predictions (${wonPredictions}/5)`
        },
        { 
          id: 4, 
          title: 'Community Leader', 
          icon: '⭐', 
          unlocked: totalCreated >= 2,
          description: `Create 2 predictions (${totalCreated}/2)`
        }
      ];
    } catch (error) {
      console.error('Error calculating achievements:', error);
      return [];
    }
  }, [userId, currentUser?.id, getUserPredictionEntries, getUserCreatedPredictions]);

  // Event handlers - these don't use hooks so they can be anywhere
  const handleSaveProfile = () => {
    updateProfile({
      ...currentUser,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      bio: editForm.bio
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      bio: currentUser?.bio || ''
    });
    setIsEditing(false);
  };

  const handleLogout = () => {
    const confirmLogout = () => {
      logout();
      if (onNavigateBack) {
        onNavigateBack();
      }
    };
    
    // Show simple confirm dialog
    if (window.confirm('Are you sure you want to sign out?')) {
      confirmLogout();
    }
  };

  // Handle non-blocking auth - show sign-in prompt if not authenticated
  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-dvh">
        <MobileHeader 
          title="Profile" 
          showBack={!!onNavigateBack}
          onBack={onNavigateBack}
        />
        
        <main className="flex-1 overflow-y-auto">
          <AuthCTA
            icon="profile"
            title="Sign in to view your profile"
            subtitle="Access your prediction history, stats, and settings."
            onGoogle={async () => {
              await requireAuth();
            }}
            testId="profile-auth-cta"
          />
        </main>
      </div>
    );
  }

  // Handle settings sections with conditional rendering instead of early returns
  if (!viewingOtherUser && activeSection === 'account') {
    return <AccountSettings onBack={() => setActiveSection('overview')} />;
  }

  if (!viewingOtherUser && activeSection === 'notifications') {
    return <NotificationSettings onBack={() => setActiveSection('overview')} />;
  }

  if (!viewingOtherUser && activeSection === 'security') {
    return <SecuritySettings onBack={() => setActiveSection('overview')} />;
  }

  if (!viewingOtherUser && activeSection === 'help') {
    return <HelpSupport onBack={() => setActiveSection('overview')} />;
  }

  if (!viewingOtherUser && activeSection === 'leaderboard') {
    return <LeaderboardView onBack={() => setActiveSection('overview')} />;
  }

  // Main profile overview content continues here...

  // Main profile view with unified MobileHeader
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* Unified Mobile Header */}
      <MobileHeader 
        title={viewingOtherUser ? 'User Profile' : 'Profile'} 
        showBack={!!onNavigateBack}
        onBack={onNavigateBack}
        right={!viewingOtherUser ? (
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isEditing ? <X className="w-5 h-5 text-gray-700" /> : <Edit3 className="w-5 h-5 text-gray-700" />}
          </button>
        ) : undefined}
        elevated={true}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Profile Card - Now positioned below header */}
        <div className="p-4">
          <div 
            data-tour-id="profile-card"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <AnimatePresence mode="wait">
              {!viewingOtherUser && isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      <UserAvatar email={editForm.email} avatarUrl={currentUser?.avatar} size="xl" className="ring-4 ring-white" />
                      <button 
                        className="absolute bottom-0 right-0 w-7 h-7 bg-green-600 border-2 border-white rounded-full flex items-center justify-center"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e: any) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await useAuthStore.getState().uploadAvatar(file);
                              console.log('Avatar uploaded:', url);
                            } catch (err) {
                              console.error('Avatar upload failed', err);
                              alert('Failed to upload image. Please try again.');
                            }
                          };
                          input.click();
                        }}
                      >
                        <Camera size={12} className="text-white" />
                      </button>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="First Name"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:border-green-600"
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold focus:outline-none focus:border-green-600"
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:border-green-600"
                      />
                      <textarea
                        placeholder="Bio (optional)"
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-12 focus:outline-none focus:border-green-600"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end mt-4">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-600 transition-colors flex items-center gap-1"
                    >
                      <Save size={16} />
                      Save
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="viewing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      <UserAvatar email={currentUser?.email} username={currentUser?.username} avatarUrl={currentUser?.avatar} size="lg" className="ring-4 ring-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-1 leading-tight">
                        {currentUser?.firstName && currentUser?.lastName 
                          ? `${currentUser.firstName} ${currentUser.lastName}` 
                          : currentUser?.email?.split('@')[0] || 'User'
                        }
                      </h2>
                      <p className="text-gray-600 text-sm mb-1 leading-tight">
                        {viewingOtherUser ? '' : (currentUser?.email || 'No email provided')}
                      </p>
                      {currentUser?.bio && (
                        <p className="text-gray-600 text-sm mb-1 leading-tight">
                          {currentUser.bio}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Star size={14} className="text-yellow-500" />
                        <span className="text-xs text-gray-600 font-medium">
                          Rank #{userStats.rank} • {userStats.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">{userStats.totalPredictions}</div>
                      <div className="text-xs text-gray-600">Predictions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-green-600">{userStats.winRate}%</div>
                      <div className="text-xs text-gray-600">Win Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-gray-900">₦{(userStats.totalEarnings - userStats.totalInvested).toLocaleString()}</div>
                      <div className="text-xs text-gray-600">Net Profit</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="px-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Overview</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">₦{userStats.totalEarnings.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">Total Earnings</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{userStats.activePredictions}</div>
                  <div className="text-xs text-gray-600">Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="px-4 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Achievements</h3>
              <button 
                onClick={() => setActiveSection('leaderboard')}
                className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-1"
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-xl border-2 ${
                    achievement.unlocked 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{achievement.icon}</span>
                    <div className="text-sm font-semibold text-gray-900">{achievement.title}</div>
                  </div>
                  <div className="text-xs text-gray-600">{achievement.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Menu - Only for own profile */}
        {!viewingOtherUser && (
          <div className="px-4 mb-24">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {menuItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <button
                    onClick={item.action}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-600">{item.description}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                  {index < menuItems.length - 1 && <div className="border-t border-gray-100" />}
                </React.Fragment>
              ))}
              
              {/* Sign Out Button */}
              <div className="border-t border-gray-100">
                <motion.button
                  className="w-full p-4 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors"
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut size={20} />
                  <span className="font-medium">Sign Out</span>
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;