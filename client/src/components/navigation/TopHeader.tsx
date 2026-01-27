import React from 'react';
import { useLocation } from 'wouter';
import { Search, Bell, Menu, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import UserAvatar from '../common/UserAvatar';
import Logo from '../common/Logo';
import { useAuth } from '../../providers/AuthProvider';
import { generateInitials, getAvatarUrl } from '../../lib/utils';

export const TopHeader: React.FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();

  const getPageTitle = () => {
    if (location === '/' || location === '/discover') return 'Discover';
    if (location === '/predictions') return 'My Predictions';
    if (location === '/create') return 'Create Prediction';
    if (location === '/clubs') return 'Clubs';
    if (location === '/wallet') return 'Wallet';
    if (location === '/profile') return 'Profile';
    return 'Fan Club Z';
  };

  const getPageIcon = () => {
    if (location === '/' || location === '/discover') return <Sparkles className="w-6 h-6 text-primary-green" />;
    return null;
  };

  const isDiscoverPage = location === '/' || location === '/discover';

  return (
    <motion.header 
      // Safe-area foundation: header height includes top inset; inner row stays 80px.
      className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-subtle border-b border-cool-gray-100 z-40 shadow-sm pt-[var(--app-safe-top)] h-[calc(80px+var(--app-safe-top))]"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between px-6 h-20">
        {/* Left Section - Logo and Title */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Logo size="md" variant="icon" />
          <div>
            <h1 className="display-small text-cool-gray-900 font-bold">
              {getPageTitle()}
            </h1>
            {isDiscoverPage && (
              <p className="caption text-cool-gray-600 mt-1">
                Predict the future, earn rewards
              </p>
            )}
          </div>
        </motion.div>

        {/* Right Section - Actions */}
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Search Button */}
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative w-11 h-11 rounded-xl hover:bg-cool-gray-50 transition-colors"
            >
              <Search className="w-5 h-5 text-cool-gray-600" />
            </Button>
          </motion.div>
          
          {/* Notifications Button */}
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative w-11 h-11 rounded-xl hover:bg-cool-gray-50 transition-colors"
            >
              <Bell className="w-5 h-5 text-cool-gray-600" />
              <motion.span 
                className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full border-2 border-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.5 }}
              />
            </Button>
          </motion.div>

          {/* User Avatar */}
          <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
            <UserAvatar email={user?.email} username={user?.username} avatarUrl={getAvatarUrl(user || {})} size="md" className="ring-2 ring-primary-green/20 transition-all duration-200 hover:ring-primary-green/40" />
          </motion.div>
        </motion.div>
      </div>

      {/* Enhanced separator line with gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cool-gray-200 to-transparent" />
    </motion.header>
  );
};
