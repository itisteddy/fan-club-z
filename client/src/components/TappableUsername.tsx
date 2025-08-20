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
    
    if (onClick) {
      onClick();
    } else if (userId) {
      // Navigate to user profile with userId
      navigate(`/profile/${userId}`);
    } else {
      // Navigate to user profile with username
      navigate(`/profile/${username.replace('@', '')}`);
    }
  };

  const displayText = displayName || (showAt ? `@${username.replace('@', '')}` : username.replace('@', ''));

  return (
    <motion.button
      className={`inline-flex items-center font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all cursor-pointer rounded-md px-1 py-0.5 hover:bg-blue-50 ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      {displayText}
    </motion.button>
  );
};

export default TappableUsername;
