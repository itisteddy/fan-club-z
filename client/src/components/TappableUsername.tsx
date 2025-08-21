import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

interface TappableUsernameProps {
  username: string;
  userId?: string;
  displayName?: string;
  className?: string;
  showAt?: boolean;
  onClick?: () => void;
}

const TappableUsername: React.FC<TappableUsernameProps> = ({
  username,
  userId,
  displayName,
  className = '',
  showAt = true,
  onClick
}) => {
  const [, navigate] = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent click events
    
    console.log('👤 TappableUsername clicked:', { username, userId, displayName });
    
    if (onClick) {
      onClick();
      return;
    }
    
    // Validate userId format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (userId && userId.trim() !== '' && uuidRegex.test(userId.trim())) {
      // Navigate to user profile with valid userId
      console.log('🔗 Navigating to profile with userId:', userId);
      navigate(`/profile/${userId.trim()}`);
    } else if (username && username.trim() !== '') {
      // Log warning for invalid userId but still try username
      if (userId && !uuidRegex.test(userId.trim())) {
        console.warn('⚠️ Invalid userId format, using username instead:', userId);
      }
      const cleanUsername = username.replace('@', '').trim();
      console.log('🔗 Navigating to profile with username:', cleanUsername);
      navigate(`/profile/${cleanUsername}`);
    } else {
      console.warn('⚠️ No valid userId or username provided for profile navigation');
      // Don't navigate on invalid data to prevent React errors
      return;
    }
  };

  const displayText = displayName || (showAt ? `@${username.replace('@', '')}` : username.replace('@', ''));

  return (
    <motion.button
      className={`inline-flex items-center font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer rounded-md px-1 py-0.5 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      type="button"
      aria-label={`View profile for ${displayText}`}
    >
      {displayText}
    </motion.button>
  );
};

export default TappableUsername;