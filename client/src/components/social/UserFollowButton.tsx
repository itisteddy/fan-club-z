import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, UserCheck, Loader } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';
import { socialApiService } from '../../services/socialApiService';

interface UserFollowButtonProps {
  userId: string;
  username: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

export const UserFollowButton: React.FC<UserFollowButtonProps> = ({
  userId,
  username,
  isFollowing,
  onFollowChange,
  className = '',
  variant = 'default'
}) => {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);

  const handleFollowToggle = useCallback(async () => {
    if (!currentUser) {
      toast.error('Please sign in to follow users');
      return;
    }

    if (currentUser.id === userId) {
      toast.error('You cannot follow yourself');
      return;
    }

    setLoading(true);
    try {
      const newFollowingState = await socialApiService.toggleFollow(userId, following);
      setFollowing(newFollowingState);
      
      if (onFollowChange) {
        onFollowChange(newFollowingState);
      }

      toast.success(
        newFollowingState 
          ? `You are now following ${username}` 
          : `You unfollowed ${username}`
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Error toast is handled by the API service
    } finally {
      setLoading(false);
    }
  }, [currentUser, userId, username, following, onFollowChange]);

  if (!currentUser || currentUser.id === userId) {
    return null;
  }

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>{following ? 'Unfollowing...' : 'Following...'}</span>
        </>
      );
    }

    if (following) {
      return (
        <>
          <UserCheck className="w-4 h-4" />
          <span>Following</span>
        </>
      );
    }

    return (
      <>
        <UserPlus className="w-4 h-4" />
        <span>Follow</span>
      </>
    );
  };

  const getButtonClasses = () => {
    const baseClasses = 'flex items-center gap-2 font-medium transition-all duration-200 rounded-lg';
    
    switch (variant) {
      case 'compact':
        return `${baseClasses} px-3 py-1.5 text-sm ${
          following 
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`;
      case 'minimal':
        return `${baseClasses} px-2 py-1 text-xs ${
          following 
            ? 'text-gray-500 hover:text-gray-700' 
            : 'text-blue-500 hover:text-blue-600'
        }`;
      default:
        return `${baseClasses} px-4 py-2 ${
          following 
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200' 
            : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
        }`;
    }
  };

  return (
    <motion.button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`${getButtonClasses()} ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {getButtonContent()}
    </motion.button>
  );
};
