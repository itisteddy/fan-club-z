import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Bell, Shield, HelpCircle, CreditCard, Moon, Sun, User, Lock, Trash2, Download } from 'lucide-react';
import { scrollToTop } from '../utils/scroll';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useNotificationStore } from '../store/notificationStore';
import { showUserError } from '../utils/errorHandler';
import { toast } from 'react-hot-toast';
import { LogoutConfirmationModal } from '../components/ui/LogoutConfirmationModal';
import { APP_VERSION as VERSION } from '../lib/version';

const SettingsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user: currentUser, logout, loading } = useAuthStore();
  const { mode, setTheme } = useThemeStore();
  const notificationStore = useNotificationStore();

  // Local notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    predictionAlerts: true,
    commentNotifications: true,
    achievementNotifications: true,
    marketingEmails: false
  });

  // Logout confirmation modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  // Navigation handlers
  const onNavigateBack = useCallback(() => {
    setLocation('/profile');
    scrollToTop({ behavior: 'instant' });
  }, [setLocation]);

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

  const handleNotificationChange = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${!notificationSettings[key] ? 'enabled' : 'disabled'}`);
  };

  const resetNotificationSettings = () => {
    setNotificationSettings({
      pushNotifications: true,
      emailNotifications: true,
      predictionAlerts: true,
      commentNotifications: true,
      achievementNotifications: true,
      marketingEmails: false
    });
    toast.success('Notification settings reset to defaults');
  };

  const handleExportData = () => {
    if (!window.confirm('Export your data? This will download a JSON file with your profile, settings, and preferences.')) {
      return;
    }

    const userData = {
      profile: currentUser,
      settings: {
        theme: mode,
        notifications: notificationSettings
      },
      exportDate: new Date().toISOString(),
      version: VERSION
    };
    
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fanclubz-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully! Check your downloads folder.');
  };

  const handleDeleteAccount = () => {
    const confirmMessage = `Are you sure you want to delete your account?

This action will:
• Permanently delete your profile and all data
• Cancel all active predictions
• Remove your wallet balance
• Delete all comments and likes

This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      const finalConfirm = window.confirm('This is your final warning. Are you absolutely sure you want to delete your account?');
      if (finalConfirm) {
        // Call the auth store to delete account
        logout();
        toast.success('Account deleted successfully');
      }
    }
  };

  const handleEditProfile = () => {
    setLocation('/profile');
    scrollToTop({ behavior: 'instant' });
    toast.success('Navigate to profile page to edit your details');
  };

  const handlePrivacySecurity = () => {
    // Navigate to a dedicated privacy & security page or show a modal
    setLocation('/privacy-security');
  };

  const handleHelpSupport = () => {
    // Open help documentation or support chat
    const helpUrl = 'https://fanclubz.com/help';
    window.open(helpUrl, '_blank');
    toast.success('Opening help documentation');
  };

  const handlePaymentMethods = () => {
    setLocation('/wallet');
    toast.success('Navigate to wallet to manage payment methods');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Consistent with Wallet page styling */}
      <div className="bg-white border-b border-gray-100">
        {/* Status bar spacer - reduced height */}
                  <div className="h-11" />
        <div className="px-4 py-1">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onNavigateBack}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h1>
            <div className="w-8 h-8" /> {/* Spacer to balance header */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Appearance Settings */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
            <button
              onClick={() => setTheme('system')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Use System
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                 {mode === 'dark' ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-gray-600" />}
               </div>
              <div>
                <p className="font-medium text-gray-900">Dark Mode</p>
                <p className="text-sm text-gray-600">Toggle dark theme</p>
              </div>
            </div>
                           <button
                 onClick={() => setTheme(mode === 'dark' ? 'light' : 'dark')}
                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                   mode === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                 }`}
               >
                 <span
                   className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                     mode === 'dark' ? 'translate-x-6' : 'translate-x-1'
                   }`}
                 />
               </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={resetNotificationSettings}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Reset to Defaults
            </button>
          </div>
          <div className="space-y-4">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      {value ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange(key as keyof typeof notificationSettings)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
          <div className="space-y-3">
            <button 
              onClick={handleEditProfile}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Edit Profile</span>
            </button>
            <button 
              onClick={handlePrivacySecurity}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Lock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Privacy & Security</span>
            </button>
            <button 
              onClick={handleExportData}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Download className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Export Data</span>
            </button>
          </div>
        </div>

        {/* Support & Help */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Support</h3>
          <div className="space-y-3">
            <button 
              onClick={handleHelpSupport}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Help & Support</span>
            </button>
            <button 
              onClick={handlePaymentMethods}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <CreditCard className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Payment Methods</span>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-red-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-red-700"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-sm font-medium">Delete Account</span>
            </button>
          </div>
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

export default SettingsPage;
