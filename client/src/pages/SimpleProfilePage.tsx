import React from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Trophy, TrendingUp, DollarSign, Star } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface SimpleProfilePageProps {
  onNavigateBack?: () => void;
}

const SimpleProfilePage: React.FC<SimpleProfilePageProps> = ({ onNavigateBack }) => {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account and view your stats</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-teal-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user?.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-gray-600">{user?.email || 'user@example.com'}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">12</div>
              <div className="text-xs text-gray-600">Predictions</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-teal-600">8</div>
              <div className="text-xs text-gray-600">Wins</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-900">67%</div>
              <div className="text-xs text-gray-600">Win Rate</div>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Account Settings</div>
              <div className="text-sm text-gray-600">Manage your account preferences</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Achievements</div>
              <div className="text-sm text-gray-600">View your badges and milestones</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Performance</div>
              <div className="text-sm text-gray-600">Detailed analytics and insights</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SimpleProfilePage;
