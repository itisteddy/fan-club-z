import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

export interface UserAvatarProps {
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeToClasses: Record<NonNullable<UserAvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  email,
  username,
  avatarUrl,
  className,
  size = 'md',
}) => {
  const classes = `${sizeToClasses[size]} ${className || ''}`.trim();
  
  // Generate fallback initials from username, email, or default to 'FC'
  const generateInitials = (): string => {
    if (username && username.trim()) {
      return username
        .trim()
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (email && email.trim()) {
      return email
        .trim()
        .split('@')[0]
        .slice(0, 2)
        .toUpperCase();
    }
    
    return 'FC'; // Fan Club default
  };

  const initials = generateInitials();

  return (
    <Avatar className={classes}>
      {avatarUrl && avatarUrl.trim() ? (
        <AvatarImage 
          src={avatarUrl} 
          alt={username || email || 'User avatar'}
        />
      ) : null}
      <AvatarFallback className="bg-gradient-to-r from-purple-400 to-purple-600 text-white font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;