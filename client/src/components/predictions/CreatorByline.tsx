import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const avatarUrl = creator?.avatar_url || creator?.avatarUrl;
  const displayName = displayNameFor(creator);
  const handle = (creator?.handle || creator?.username || '').trim();
  const creatorId = (creator?.id || '').trim();
  const canOpenProfile = Boolean(handle || creatorId);
  const openProfile = () => {
    if (!canOpenProfile) return;
    if (handle) {
      navigate(`/u/${encodeURIComponent(handle)}`);
      return;
    }
    navigate(`/profile/${encodeURIComponent(creatorId)}`);
  };
  
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      {avatarUrl && (
        canOpenProfile ? (
          <button
            type="button"
            onClick={openProfile}
            className="p-0 border-0 bg-transparent appearance-none rounded-full leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={`Open profile for ${displayName}`}
          >
            <img
              src={avatarUrl}
              alt=""
              className="size-5 rounded-full object-cover bg-muted"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </button>
        ) : (
          <img
            src={avatarUrl}
            alt=""
            className="size-5 rounded-full object-cover bg-muted"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )
      )}
      <span>Created by</span>
      {canOpenProfile ? (
        <button
          type="button"
          onClick={openProfile}
          className="font-medium text-foreground flex items-center gap-1 p-0 border-0 bg-transparent appearance-none hover:text-emerald-700"
          aria-label={`Open profile for ${displayName}`}
        >
          <span>{displayName}</span>
          {creator?.is_verified && (
            <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
          )}
        </button>
      ) : (
        <span className="font-medium text-foreground flex items-center gap-1">
          {displayName}
          {creator?.is_verified && (
            <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
          )}
        </span>
      )}
    </div>
  );
}
