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
  const letter = (email?.trim()?.charAt(0) || username?.trim()?.charAt(0) || 'U').toUpperCase();
  const classes = `${sizeToClasses[size]} ${className || ''}`.trim();

  return (
    <Avatar className={classes}>
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback className="bg-emerald-600 text-white font-semibold">
        {letter}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;


