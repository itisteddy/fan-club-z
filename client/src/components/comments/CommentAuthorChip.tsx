/**
 * CommentAuthorChip
 * 
 * Displays comment author info with avatar, username, and OG badge.
 * Used in comment lists, activity feeds, and anywhere author attribution is needed.
 * 
 * Features:
 * - Compact display with all key info
 * - OG badge integration
 * - Creator/OP badge support
 * - Relative timestamp
 * - Link to user profile
 * 
 * UX Principles:
 * - Minimal but complete information
 * - Badges add context without clutter
 * - Touch-friendly tap target for profile link
 */

import React from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '@/components/common/UserAvatar';
import { OGBadgeInline } from '@/components/badges/OGBadgeEnhanced';
import type { OGTier } from '@/components/badges/OGBadge';
import { cn } from '@/utils/cn';

interface CommentAuthorChipProps {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  ogBadge?: OGTier | null;
  createdAt?: string;
  isCreator?: boolean;
  isOP?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showAvatar?: boolean;
  onUserClick?: () => void;
}

/**
 * Format a relative time string
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const sizeConfig = {
  sm: {
    avatar: 'sm' as const,
    nameText: 'text-sm',
    metaText: 'text-xs',
    gap: 'gap-2',
    badgeSize: 12,
  },
  md: {
    avatar: 'md' as const,
    nameText: 'text-base',
    metaText: 'text-sm',
    gap: 'gap-2.5',
    badgeSize: 14,
  },
  lg: {
    avatar: 'lg' as const,
    nameText: 'text-lg',
    metaText: 'text-base',
    gap: 'gap-3',
    badgeSize: 16,
  },
};

export const CommentAuthorChip: React.FC<CommentAuthorChipProps> = ({
  userId,
  username,
  fullName,
  avatarUrl,
  ogBadge,
  createdAt,
  isCreator,
  isOP,
  className,
  size = 'md',
  showAvatar = true,
  onUserClick,
}) => {
  const displayName = fullName || username;
  const config = sizeConfig[size];
  
  const ProfileLink: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
    children, 
    className: linkClassName 
  }) => {
    if (onUserClick) {
      return (
        <button onClick={onUserClick} className={linkClassName}>
          {children}
        </button>
      );
    }
    return (
      <Link to={`/profile/${userId}`} className={linkClassName}>
        {children}
      </Link>
    );
  };

  return (
    <div className={cn('flex items-center', config.gap, className)}>
      {/* Avatar */}
      {showAvatar && (
        <ProfileLink className="flex-shrink-0">
          <UserAvatar
            username={username}
            avatarUrl={avatarUrl}
            size={config.avatar}
          />
        </ProfileLink>
      )}

      {/* Name and meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          <ProfileLink
            className={cn(
              'font-semibold text-gray-900 hover:text-emerald-600 transition-colors truncate',
              config.nameText
            )}
          >
            {displayName}
          </ProfileLink>
          
          {/* OG Badge - inline next to name */}
          <OGBadgeInline tier={ogBadge} size={config.badgeSize} />
          
          {/* Creator badge */}
          {isCreator && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold uppercase tracking-wide">
              Creator
            </span>
          )}
          
          {/* OP badge */}
          {isOP && !isCreator && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold uppercase tracking-wide">
              OP
            </span>
          )}
        </div>
        
        {/* Username and timestamp */}
        <div className={cn(
          'flex items-center gap-1.5 text-gray-500',
          config.metaText
        )}>
          <span className="truncate">@{username}</span>
          {createdAt && (
            <>
              <span className="text-gray-300">·</span>
              <time dateTime={createdAt} className="flex-shrink-0">
                {formatRelativeTime(createdAt)}
              </time>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * CommentAuthorInline
 * Even more compact version - just name + badge in a single line
 */
interface CommentAuthorInlineProps {
  username: string;
  fullName?: string;
  ogBadge?: OGTier | null;
  isCreator?: boolean;
  className?: string;
}

export const CommentAuthorInline: React.FC<CommentAuthorInlineProps> = ({
  username,
  fullName,
  ogBadge,
  isCreator,
  className,
}) => {
  const displayName = fullName || username;

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span className="font-semibold text-gray-900">{displayName}</span>
      <OGBadgeInline tier={ogBadge} size={12} />
      {isCreator && (
        <span className="text-[9px] px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded font-semibold uppercase">
          Creator
        </span>
      )}
    </span>
  );
};

export default CommentAuthorChip;
