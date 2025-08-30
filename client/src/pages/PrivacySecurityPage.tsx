import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Shield, Eye, Lock, Bell, Users, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scrollToTop } from '../utils/scroll';

const PrivacySecurityPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    showOnlineStatus: true,
    allowDataCollection: true,
    allowMarketing: false,
  });

  const onNavigateBack = () => {
    setLocation('/settings');
  };

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  const handlePrivacyChange = (key: keyof typeof privacySettings, value: any) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
    toast.success(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} updated`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
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
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy & Security</h1>
            <div className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Privacy</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Visibility
              </label>
              <select
                value={privacySettings.profileVisibility}
                onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="public">Public - Anyone can see your profile</option>
                <option value="friends">Friends Only - Only your connections can see</option>
                <option value="private">Private - Only you can see your profile</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Show Email Address</p>
                    <p className="text-sm text-gray-600">Display your email on your profile</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePrivacyChange('showEmail', !privacySettings.showEmail)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacySettings.showEmail ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacySettings.showEmail ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Show Online Status</p>
                    <p className="text-sm text-gray-600">Let others see when you're online</p>
                  </div>
                </div>
                <button
                  onClick={() => handlePrivacyChange('showOnlineStatus', !privacySettings.showOnlineStatus)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    privacySettings.showOnlineStatus ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      privacySettings.showOnlineStatus ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Security</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Add an extra layer of security</p>
                </div>
              </div>
              <button
                onClick={() => toast.success('Two-factor authentication setup coming soon')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Setup
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Device Management</p>
                  <p className="text-sm text-gray-600">Manage active sessions</p>
                </div>
              </div>
              <button
                onClick={() => toast.success('Device management coming soon')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySecurityPage;
