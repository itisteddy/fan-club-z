import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { scrollToTop } from '../utils/scroll';
import { 
  ArrowLeft, 
  Camera, 
  Edit3, 
  Save, 
  X, 
  LogOut, 
  Settings, 
  User, 
  Users,
  Target, 
  CreditCard, 
  TrendingUp, 
  CheckCircle, 
  Share2,
  Trophy,
  Flame,
  Crown,
  Star
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore } from '../store/predictionStore';
import { useWalletStore } from '../store/walletStore';
import { useLikeStore } from '../store/likeStore';
import { useSettlementStore } from '../store/settlementStore';
import { useSocialStore } from '../store/socialStore';
import { UserAvatar } from '../components/common/UserAvatar';
import { showUserError } from '../utils/errorHandler';
import { toast } from 'react-hot-toast';
import { LogoutConfirmationModal } from '../components/ui/LogoutConfirmationModal';


interface EditForm {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
}

const ProfilePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user: currentUser, updateProfile, logout, loading } = useAuthStore();
  const { predictions, fetchUserPredictions } = usePredictionStore();
  const { balance, refreshWalletData } = useWalletStore();
  const { likedPredictions, likeCounts, initializeLikes } = useLikeStore();
  const { comments, getPredictionComments } = useSocialStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(true);
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: '',
    lastName: '',
    email: '',
    bio: ''
  });

  // Navigation handlers
  const onNavigateBack = useCallback(() => {
    setLocation('/discover');
  }, [setLocation]);

  const onNavigateToDiscover = useCallback(() => {
    setLocation('/discover');
  }, [setLocation]);

  const onNavigateToWallet = useCallback(() => {
    setLocation('/wallet');
  }, [setLocation]);

  const onNavigateToBets = useCallback(() => {
    setLocation('/bets');
  }, [setLocation]);

  const onNavigateToSettings = useCallback(() => {
    setLocation('/settings');
  }, [setLocation]);

  // Initialize data
  useEffect(() => {
    // Scroll to top when component mounts
    scrollToTop({ behavior: 'instant' });
    
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setShowLoadingSkeleton(true);

        // Fetch all user data in parallel
        if (currentUser) {
          await Promise.all([
            fetchUserPredictions(currentUser.id),
            refreshWalletData(),
            initializeLikes()
          ]);
        }

        // Initialize edit form with current user data
        if (currentUser) {
          setEditForm({
            firstName: currentUser.firstName || '',
            lastName: currentUser.lastName || '',
            email: currentUser.email || '',
            bio: currentUser.bio || ''
          });
        }

        setIsLoading(false);
        setShowLoadingSkeleton(false);
      } catch (error) {
        console.error('Failed to initialize profile data:', error);
        showUserError('PROFILE_LOAD_FAILED', error instanceof Error ? error.message : 'Failed to load profile data');
        setIsLoading(false);
        setShowLoadingSkeleton(false);
      }
    };

    initializeData();
  }, [currentUser, fetchUserPredictions, refreshWalletData, initializeLikes]);

  // Handle profile update
  const handleSaveProfile = async () => {
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      showUserError('PROFILE_UPDATE_FAILED', error instanceof Error ? error.message : 'Failed to update profile');
    }
  };

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Handle logout
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      // Logout function now handles redirect to discover page
    } catch (error) {
      console.error('Logout failed:', error);
      showUserError('LOGOUT_FAILED', error instanceof Error ? error.message : 'Failed to logout');
    } finally {
      setShowLogoutModal(false);
    }
  };

  // Loading skeleton
  if (showLoadingSkeleton) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header - Consistent with Wallet page styling */}
        <div className="bg-white border-b border-gray-100">
          {/* Status bar spacer - reduced height */}
          <div className="h-11" />
          <div className="px-4 py-1">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={onNavigateToDiscover}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
              <div className="w-8 h-8" /> {/* Spacer to balance header */}
            </div>
          </div>
        </div>

        {/* Loading skeleton content */}
        <div className="p-4">
          <div className="bg-white rounded-2xl p-6 mb-4 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header - Consistent with Wallet page styling */}
        <div className="bg-white border-b border-gray-100">
          {/* Status bar spacer - reduced height */}
          <div className="h-11" />
          <div className="px-4 py-1">
            <div className="flex items-center justify-between mb-1">
              <button
                onClick={onNavigateToDiscover}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
              <div className="w-8 h-8" /> {/* Spacer to balance header */}
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-white rounded-2xl p-6 text-center">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Signed In</h2>
            <p className="text-gray-600 mb-6">Please sign in to view your profile</p>
            <button
              onClick={() => setLocation('/auth')}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
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
      {/* Header - Consistent with Wallet page styling */}
      <div className="bg-white border-b border-gray-100">
        {/* Status bar spacer - reduced height */}
        <div className="h-11" />
        <div className="px-4 py-1">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={onNavigateBack}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
            <div className="w-8 h-8" /> {/* Spacer to balance header */}
          </div>
        </div>
      </div>

      {/* Content - Normal spacing */}
      <div className="p-4">
        {/* Profile Card */}
        <div 
          data-tour-id="profile-card"
          className="bg-gradient-to-br from-purple-500 to-emerald-600 rounded-2xl p-6 shadow-sm mb-6 text-white"
        >
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <UserAvatar 
                      email={editForm.email} 
                      avatarUrl={currentUser?.avatar} 
                      size="xl" 
                      className="ring-4 ring-white" 
                    />
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
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none transition-colors focus:border-green-600"
                      />
                      <input
                        type="text"
                        placeholder="Last Name"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold outline-none transition-colors focus:border-green-600"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none transition-colors focus:border-green-600 mb-3"
                    />
                    <textarea
                      placeholder="Bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none transition-colors focus:border-green-600 resize-none"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Cancel
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
                  <UserAvatar 
                    email={currentUser.email} 
                    avatarUrl={currentUser.avatar} 
                    size="xl" 
                    className="ring-4 ring-white" 
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white mb-1">
                      {currentUser.firstName} {currentUser.lastName}
                    </h2>
                    <p className="text-green-100 text-sm mb-2">{currentUser.email}</p>
                    {currentUser.bio && (
                      <p className="text-green-100 text-sm">{currentUser.bio}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <Edit3 size={16} className="text-white" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Predictions</p>
                <p className="text-xl font-bold text-gray-900">{predictions.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance</p>
                <p className="text-xl font-bold text-gray-900">${balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Likes</p>
                <p className="text-xl font-bold text-gray-900">{likedPredictions.size}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Settlements</p>
                <p className="text-xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={onNavigateToBets}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">My Predictions</span>
            </button>
            
            <button
              onClick={onNavigateToWallet}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <CreditCard className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Wallet</span>
            </button>
            

            
            <button
              onClick={onNavigateToSettings}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </button>
            

            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-700">Logout</span>
            </button>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Achievements</h3>
            <button
              onClick={() => {
                scrollToTop({ behavior: 'instant' });
                setLocation('/leaderboard');
              }}
              className="bg-green-50 border border-green-200 text-green-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* First Prediction */}
            <div className={`bg-gray-50 rounded-xl p-4 border-2 transition-all ${
              (currentUser?.totalPredictions || 0) >= 1 ? 'border-green-200 bg-green-50' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  (currentUser?.totalPredictions || 0) >= 1 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Target className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm ${
                    (currentUser?.totalPredictions || 0) >= 1 ? 'text-green-800' : 'text-gray-900'
                  }`}>
                    First Prediction
                  </h4>
                </div>
              </div>
              <p className={`text-xs ${
                (currentUser?.totalPredictions || 0) >= 1 ? 'text-green-600' : 'text-gray-600'
              }`}>
                Make your first prediction
              </p>
            </div>

            {/* Active Predictor */}
            <div className={`bg-gray-50 rounded-xl p-4 border-2 transition-all ${
              (currentUser?.totalPredictions || 0) >= 3 ? 'border-green-200 bg-green-50' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  (currentUser?.totalPredictions || 0) >= 3 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Flame className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm ${
                    (currentUser?.totalPredictions || 0) >= 3 ? 'text-green-800' : 'text-gray-900'
                  }`}>
                    Active Predictor
                  </h4>
                </div>
              </div>
              <p className={`text-xs ${
                (currentUser?.totalPredictions || 0) >= 3 ? 'text-green-600' : 'text-gray-600'
              }`}>
                Make 3 predictions ({Math.min(currentUser?.totalPredictions || 0, 3)}/3)
              </p>
            </div>

            {/* Top Predictor */}
            <div className={`bg-gray-50 rounded-xl p-4 border-2 transition-all ${
              (currentUser?.totalEarnings || 0) >= 5 ? 'border-green-200 bg-green-50' : 'border-gray-100'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${
                  (currentUser?.totalEarnings || 0) >= 5 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Crown className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm ${
                    (currentUser?.totalEarnings || 0) >= 5 ? 'text-green-800' : 'text-gray-900'
                  }`}>
                    Top Predictor
                  </h4>
                </div>
              </div>
              <p className={`text-xs ${
                (currentUser?.totalEarnings || 0) >= 5 ? 'text-green-600' : 'text-gray-600'
              }`}>
                Win 5 predictions ({Math.min(currentUser?.totalEarnings ? 1 : 0, 5)}/5)
              </p>
            </div>


          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {predictions.length > 0 ? (
            <div className="space-y-3">
              {predictions.slice(0, 3).map((prediction) => (
                <div key={prediction.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{prediction.title}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(prediction.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation(`/prediction/${prediction.id}`)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Share2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No predictions yet</p>
              <button
                onClick={() => setLocation('/create-prediction')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Create Your First Prediction
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
        loading={loading}
      />
    </div>
  );
};

export default ProfilePage;