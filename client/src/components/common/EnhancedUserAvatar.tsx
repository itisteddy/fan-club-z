import React, { useState, useCallback, useMemo } from 'react';
import { User } from 'lucide-react';

export interface EnhancedUserAvatarProps {
  email?: string | null;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatus?: boolean;
  showVerificationBadge?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const sizeConfig = {
  xs: { 
    container: 'h-6 w-6', 
    text: 'text-[10px]', 
    badge: 'h-2 w-2 text-[6px]',
    borderWidth: 'border'
  },
  sm: { 
    container: 'h-8 w-8', 
    text: 'text-xs', 
    badge: 'h-2.5 w-2.5 text-[8px]',
    borderWidth: 'border'
  },
  md: { 
    container: 'h-10 w-10', 
    text: 'text-sm', 
    badge: 'h-3 w-3 text-xs',
    borderWidth: 'border-2'
  },
  lg: { 
    container: 'h-12 w-12', 
    text: 'text-base', 
    badge: 'h-3.5 w-3.5 text-xs',
    borderWidth: 'border-2'
  },
  xl: { 
    container: 'h-16 w-16', 
    text: 'text-lg', 
    badge: 'h-4 w-4 text-sm',
    borderWidth: 'border-2'
  },
  '2xl': { 
    container: 'h-20 w-20', 
    text: 'text-xl', 
    badge: 'h-5 w-5 text-sm',
    borderWidth: 'border-2'
  },
};

const generateInitials = (username?: string | null, fullName?: string | null, email?: string | null): string => {
  // Prioritize full name
  if (fullName && fullName.trim()) {
    return fullName
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  // Fall back to username
  if (username && username.trim()) {
    return username
      .trim()
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  
  // Fall back to email
  if (email && email.trim()) {
    return email
      .trim()
      .split('@')[0]
      .charAt(0)
      .toUpperCase() + (email.split('@')[0].charAt(1) || '').toUpperCase();
  }
  
  return 'FC'; // Fan Club default
};

const generateGradient = (text: string): string => {
  // Generate consistent gradient based on text hash
  const hash = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const gradients = [
    'from-purple-400 to-purple-600',
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-orange-400 to-orange-600',
    'from-teal-400 to-teal-600',
    'from-red-400 to-red-600',
  ];
  
  return gradients[Math.abs(hash) % gradients.length];
};

export const EnhancedUserAvatar: React.FC<EnhancedUserAvatarProps> = ({
  email,
  username,
  fullName,
  avatarUrl,
  isVerified = false,
  size = 'md',
  className = '',
  showStatus = false,
  showVerificationBadge = true,
  loading = false,
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const config = sizeConfig[size];
  
  const initials = useMemo(() => 
    generateInitials(username, fullName, email), 
    [username, fullName, email]
  );
  
  const gradient = useMemo(() => 
    generateGradient(initials), 
    [initials]
  );
  
  const displayName = fullName || username || email?.split('@')[0] || 'User';
  
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);
  
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);
  
  const shouldShowImage = avatarUrl && avatarUrl.trim() && !imageError;
  
  return (
    <div className={`relative inline-block ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      {/* Main Avatar */}
      <div 
        className={`
          ${config.container} 
          ${config.borderWidth}
          relative 
          rounded-full 
          overflow-hidden 
          border-white 
          shadow-sm 
          transition-all 
          duration-200 
          ${onClick ? 'hover:shadow-md hover:scale-105' : ''}
          ${loading ? 'animate-pulse bg-gray-200' : ''}
          ${className}
        `}
        title={displayName}
        aria-label={`${displayName}'s avatar`}
      >
        {loading ? (
          // Loading skeleton
          <div className="w-full h-full bg-gray-200 animate-pulse" />
        ) : shouldShowImage ? (
          // Avatar image
          <img
            src={avatarUrl}
            alt={displayName}
            className={`
              w-full h-full object-cover transition-opacity duration-200
              ${imageLoading ? 'opacity-0' : 'opacity-100'}
            `}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        ) : (
          // Fallback with initials or icon
          <div className={`
            w-full h-full 
            bg-gradient-to-br ${gradient}
            flex items-center justify-center 
            text-white font-bold 
            ${config.text}
          `}>
            {initials === 'FC' ? (
              <User className="w-1/2 h-1/2" />
            ) : (
              initials
            )}
          </div>
        )}
        
        {/* Loading overlay for images */}
        {shouldShowImage && imageLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
      </div>
      
      {/* Verification Badge */}
      {isVerified && showVerificationBadge && (
        <div 
          className={`
            absolute -bottom-0.5 -right-0.5 
            ${config.badge}
            bg-blue-500 
            border-2 border-white 
            rounded-full 
            flex items-center justify-center
            shadow-sm
          `}
          title="Verified user"
        >
          <svg 
            className="w-full h-full text-white p-0.5" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      )}
      
      {/* Online Status Indicator */}
      {showStatus && (
        <div 
          className={`
            absolute -bottom-0.5 -right-0.5 
            ${config.badge}
            bg-green-400 
            border-2 border-white 
            rounded-full
            shadow-sm
          `}
          title="Online"
        />
      )}
    </div>
  );
};

// Memoized version for performance
export default React.memo(EnhancedUserAvatar);
