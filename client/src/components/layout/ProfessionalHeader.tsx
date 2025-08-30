import React from 'react';
import { Search, Bell, TrendingUp, User } from 'lucide-react';
import { motion } from 'framer-motion';
import EnhancedUserAvatar from '../common/EnhancedUserAvatar';
import { useAuthStore } from '../../store/authStore';

interface ProfessionalHeaderProps {
  onSearch?: (query: string) => void;
  onNavigate?: (path: string) => void;
  showStats?: boolean;
  stats?: {
    totalVolume: string;
    activeMarkets: number;
    totalUsers: number;
  };
}

export const ProfessionalHeader: React.FC<ProfessionalHeaderProps> = ({
  onSearch,
  onNavigate,
  showStats = true,
  stats
}) => {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onNavigate?.('/')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FC</span>
            </div>
            <span className="fc-text-xl fc-font-bold text-gray-900">
              Fan Club Z
            </span>
          </motion.div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onNavigate?.('/predictions')}
              className="fc-text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Markets
            </button>
            <button
              onClick={() => onNavigate?.('/discover')}
              className="fc-text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Discover
            </button>
            {isAuthenticated && (
              <>
                <button
                  onClick={() => onNavigate?.('/my-bets')}
                  className="fc-text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  My Bets
                </button>
                <button
                  onClick={() => onNavigate?.('/wallet')}
                  className="fc-text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Portfolio
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Stats Display (Trading-style) */}
        {showStats && stats && (
          <div className="hidden lg:flex items-center gap-6 px-6 py-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-green-600" />
              <div>
                <div className="fc-text-xs text-gray-500">Volume</div>
                <div className="fc-text-sm font-semibold text-gray-900">
                  {stats.totalVolume}
                </div>
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <div className="fc-text-xs text-gray-500">Active</div>
              <div className="fc-text-sm font-semibold text-gray-900">
                {stats.activeMarkets}
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <div className="fc-text-xs text-gray-500">Users</div>
              <div className="fc-text-sm font-semibold text-gray-900">
                {stats.totalUsers}
              </div>
            </div>
          </div>
        )}

        {/* Search and User Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search predictions..."
              className="fc-input pl-10 pr-4 py-2 w-64 fc-text-sm"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors relative">
                  <Bell size={20} />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </button>

                {/* User Menu */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <div className="fc-text-sm font-medium text-gray-900">
                      {user?.fullName || user?.username}
                    </div>
                    <div className="fc-text-xs text-gray-500">
                      ${user?.balance?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate?.('/profile')}
                    className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                  >
                    <EnhancedUserAvatar
                      username={user?.username}
                      fullName={user?.fullName}
                      avatarUrl={user?.avatarUrl}
                      size="md"
                      className="ring-2 ring-white shadow-sm"
                    />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate?.('/auth')}
                  className="fc-btn fc-btn-outline fc-btn-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate?.('/auth')}
                  className="fc-btn fc-btn-primary fc-btn-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalHeader;
