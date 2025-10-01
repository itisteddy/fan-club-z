import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { displayNameFor } from '@/lib/users';

export type CreatorInfo = {
  id?: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean | null;
  displayName?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
};

interface CreatorBylineProps {
  creator?: CreatorInfo;
  className?: string;
}

/**
 * Displays creator information with avatar and name
 * Shows "Created by [name]" with optional verification badge
 */
export default function CreatorByline({ creator, className = '' }: CreatorBylineProps) {
  const avatarUrl = creator?.avatar_url || creator?.avatarUrl;
  const displayName = displayNameFor(creator);
  
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt=""
          className="size-5 rounded-full object-cover bg-muted"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Hide broken images
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <span>Created by</span>
      <span className="font-medium text-foreground flex items-center gap-1">
        {displayName}
        {creator?.is_verified && (
          <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
        )}
      </span>
    </div>
  );
}

