# OG Badges & Referrals Implementation Guide

## Executive Summary

This document provides a comprehensive implementation plan for the OG Badges and Referral System features, with a focus on best-practice UI/UX patterns that align with FanClubZ's design language.

---

## 🎖️ Part 1: OG Badges System

### Current State Analysis
- ✅ Badge SVG assets exist in `/client/public/badges/`
- ✅ OGBadge component exists at `/client/src/components/badges/OGBadge.tsx`
- ✅ Database migrations exist (301, 302)
- ✅ Server routes exist at `/server/src/routes/badges.ts`
- ⚠️ Missing: Integration with Profile page
- ⚠️ Missing: Integration with comment author chips
- ⚠️ Missing: Badge tooltip with context

### UX Improvements Needed

#### 1. Profile Page Integration
The current `UnifiedProfilePage.tsx` doesn't display OG badges. We need to add badge display to:
- Avatar overlay
- Next to username display
- In a dedicated "Achievements" section

#### 2. Enhanced Badge Tooltip
Current implementation shows basic tooltip. Enhance with:
- Tier description
- Member number (e.g., "OG #17")
- Joined date
- Prestige messaging

---

## 🔗 Part 2: Referral System

### Current State Analysis
- ✅ Core referral infrastructure exists
- ✅ ReferralCard and ReferralShareModal components exist
- ✅ useReferral hook exists
- ✅ Server routes exist at `/server/src/routes/referrals.ts`
- ✅ Database migrations exist (201-205)
- ✅ Leaderboard tab integration exists
- ⚠️ Missing: Profile page referral section
- ⚠️ Missing: Post-signup celebration flow
- ⚠️ Missing: Referral onboarding nudges
- ⚠️ Missing: Enhanced share experience

### UX Journey Improvements

#### 1. Referral Discovery Flow
Users should naturally discover their referral link through:
- Profile page (prominent placement)
- Settings/Account section
- Post-prediction creation success modal
- Occasional in-feed prompts

#### 2. Referral Sharing Experience
When sharing:
- Native share sheet on mobile
- Pre-populated social messages
- QR code generation option
- Trackable short links

#### 3. Referrer Recognition
When someone signs up via referral:
- Notify the referrer in-app
- Show "referred by" on new user's profile
- Celebrate milestone referrals (5, 10, 25, 50, 100)

---

## 📁 Files to Create/Modify

### Client-Side

#### 1. Enhanced OG Badge Component
**File: `/client/src/components/badges/OGBadgeEnhanced.tsx`**

```tsx
/**
 * OGBadgeEnhanced Component
 * 
 * An enhanced badge component with richer tooltips, animations,
 * and contextual information about the badge holder.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

export type OGTier = 'gold' | 'silver' | 'bronze';

interface OGBadgeEnhancedProps {
  tier: OGTier | null | undefined;
  memberNumber?: number;
  assignedAt?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTooltip?: boolean;
  animate?: boolean;
}

const sizeConfig = {
  xs: { icon: 12, container: 16 },
  sm: { icon: 14, container: 18 },
  md: { icon: 16, container: 22 },
  lg: { icon: 20, container: 28 },
  xl: { icon: 28, container: 36 },
};

const tierConfig = {
  gold: {
    src: '/badges/og-gold.svg',
    label: 'OG Gold',
    description: 'One of the first 25 verified members',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    textGradient: 'from-amber-600 to-yellow-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    glowColor: 'shadow-amber-200',
  },
  silver: {
    src: '/badges/og-silver.svg',
    label: 'OG Silver',
    description: 'Among the first 125 verified members',
    gradient: 'from-gray-300 via-slate-400 to-gray-500',
    textGradient: 'from-gray-600 to-slate-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    glowColor: 'shadow-gray-200',
  },
  bronze: {
    src: '/badges/og-bronze.svg',
    label: 'OG Bronze',
    description: 'Among the first 625 verified members',
    gradient: 'from-orange-400 via-amber-600 to-orange-700',
    textGradient: 'from-orange-700 to-amber-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    glowColor: 'shadow-orange-200',
  },
};

export const OGBadgeEnhanced: React.FC<OGBadgeEnhancedProps> = ({
  tier,
  memberNumber,
  assignedAt,
  className,
  size = 'md',
  showTooltip = true,
  animate = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !tier) {
    return null;
  }

  const config = tierConfig[tier];
  const sizeSettings = sizeConfig[size];

  if (!config) {
    return null;
  }

  const formattedDate = assignedAt 
    ? new Date(assignedAt).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      })
    : null;

  return (
    <div 
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.span
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          animate && 'transition-shadow duration-200',
          isHovered && animate && `shadow-lg ${config.glowColor}`
        )}
        style={{ width: sizeSettings.container, height: sizeSettings.container }}
        whileHover={animate ? { scale: 1.1 } : undefined}
        whileTap={animate ? { scale: 0.95 } : undefined}
        aria-label={config.label}
        title={config.label}
      >
        <img 
          src={config.src} 
          alt={config.label}
          width={sizeSettings.icon} 
          height={sizeSettings.icon} 
          className="flex-shrink-0"
          loading="lazy"
        />
      </motion.span>

      {/* Enhanced Tooltip */}
      {showTooltip && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2',
                'w-48 p-3 rounded-xl shadow-xl',
                'border backdrop-blur-sm',
                config.bgColor,
                config.borderColor
              )}
            >
              {/* Badge visual header */}
              <div className="flex items-center gap-2 mb-2">
                <img 
                  src={config.src} 
                  alt="" 
                  width={24} 
                  height={24}
                />
                <div>
                  <h4 className={cn(
                    'font-bold text-sm bg-gradient-to-r bg-clip-text text-transparent',
                    config.textGradient
                  )}>
                    {config.label}
                  </h4>
                  {memberNumber && (
                    <p className="text-xs text-gray-500">
                      Member #{memberNumber}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <p className="text-xs text-gray-600 leading-relaxed">
                {config.description}
              </p>
              
              {/* Member since */}
              {formattedDate && (
                <p className="text-xs text-gray-400 mt-2">
                  Member since {formattedDate}
                </p>
              )}
              
              {/* Arrow pointer */}
              <div className={cn(
                'absolute -top-2 left-1/2 -translate-x-1/2',
                'w-3 h-3 rotate-45',
                config.bgColor,
                'border-l border-t',
                config.borderColor
              )} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

/**
 * OGBadgeInline - For use in text contexts (username displays)
 */
export const OGBadgeInline: React.FC<{
  tier: OGTier | null | undefined;
  className?: string;
}> = ({ tier, className }) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !tier) return null;
  
  const config = tierConfig[tier];
  if (!config) return null;

  return (
    <img 
      src={config.src} 
      alt={config.label}
      title={config.label}
      width={14} 
      height={14} 
      className={cn('inline-block align-middle ml-1', className)}
      loading="lazy"
    />
  );
};

export default OGBadgeEnhanced;
```

#### 2. Profile Referral Section
**File: `/client/src/components/profile/ProfileReferralSection.tsx`**

```tsx
/**
 * ProfileReferralSection
 * 
 * Displays user's referral information on their profile page.
 * Shows referral link, stats, and sharing options.
 */

import React, { useState, useCallback } from 'react';
import { Gift, Copy, Check, Share2, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReferral } from '@/hooks/useReferral';
import { isReferralEnabled } from '@/lib/referral';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface ProfileReferralSectionProps {
  isOwnProfile: boolean;
  className?: string;
  onOpenShareModal?: () => void;
}

export const ProfileReferralSection: React.FC<ProfileReferralSectionProps> = ({
  isOwnProfile,
  className,
  onOpenShareModal,
}) => {
  const { isEnabled, referralCode, referralLink, stats, statsLoading, copyLink } = useReferral();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyLink();
    if (success) {
      setCopied(true);
      toast.success('Link copied!', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyLink]);

  const handleShare = useCallback(async () => {
    if (!referralLink) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on FanClubZ!',
          text: 'Check out FanClubZ - predict outcomes on sports, entertainment, and more!',
          url: referralLink,
        });
        return;
      } catch (err) {
        // Fall through to copy
      }
    }
    
    // Fallback to modal or copy
    if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      handleCopy();
    }
  }, [referralLink, handleCopy, onOpenShareModal]);

  // Don't render if feature is disabled or not own profile
  if (!isEnabled || !isOwnProfile) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-gradient-to-br from-emerald-50 via-white to-teal-50',
        'rounded-2xl border border-emerald-100 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-100 bg-white/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Gift className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Invite Friends</h3>
              <p className="text-xs text-gray-500">Share FanClubZ</p>
            </div>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="text-lg font-bold text-emerald-600">{stats.activeReferrals}</p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Link section */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-xl px-3 py-2.5 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-700 truncate font-mono">
              {referralLink ? referralLink.replace('https://', '') : 'Loading...'}
            </p>
          </div>
          
          <button
            onClick={handleCopy}
            disabled={!referralCode}
            className={cn(
              'p-2.5 rounded-xl transition-all flex-shrink-0 active:scale-95',
              copied
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : 'bg-white text-gray-600 border border-gray-200 shadow-sm hover:border-emerald-300 hover:text-emerald-600'
            )}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          
          <button
            onClick={handleShare}
            disabled={!referralCode}
            className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95 flex-shrink-0"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Stats row (compact) */}
        {stats && !statsLoading && (
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {stats.totalSignups} signups
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                {stats.totalClicks} clicks
              </span>
            </div>
            {onOpenShareModal && (
              <button
                onClick={onOpenShareModal}
                className="flex items-center gap-0.5 text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileReferralSection;
```

#### 3. Profile Badges Section
**File: `/client/src/components/profile/ProfileBadgesSection.tsx`**

```tsx
/**
 * ProfileBadgesSection
 * 
 * Displays user's badges and achievements on their profile.
 * Shows OG badge with full context and future expansion for other badges.
 */

import React from 'react';
import { Award, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { OGBadgeEnhanced } from '@/components/badges/OGBadgeEnhanced';
import type { OGTier } from '@/components/badges/OGBadge';
import { cn } from '@/utils/cn';

interface ProfileBadgesSectionProps {
  ogBadge?: OGTier | null;
  ogBadgeAssignedAt?: string | null;
  ogBadgeMemberNumber?: number;
  className?: string;
}

const tierRankings = {
  gold: 1,
  silver: 2,
  bronze: 3,
};

const tierLabels = {
  gold: 'Founding Member',
  silver: 'Early Adopter',
  bronze: 'Pioneer',
};

const tierDescriptions = {
  gold: 'One of the original 25 founding members',
  silver: 'Among the first 125 members to join',
  bronze: 'Among the first 625 members to join',
};

export const ProfileBadgesSection: React.FC<ProfileBadgesSectionProps> = ({
  ogBadge,
  ogBadgeAssignedAt,
  ogBadgeMemberNumber,
  className,
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  // Don't render if no badges to show
  if (!isEnabled || !ogBadge) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-2xl border border-gray-100 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Award className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-gray-900 text-sm">Achievements</h3>
      </div>

      {/* OG Badge Feature */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Large badge display */}
          <div className="relative">
            <motion.div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center',
                'bg-gradient-to-br shadow-lg',
                ogBadge === 'gold' && 'from-amber-100 to-yellow-200 shadow-amber-200',
                ogBadge === 'silver' && 'from-gray-100 to-slate-200 shadow-gray-200',
                ogBadge === 'bronze' && 'from-orange-100 to-amber-200 shadow-orange-200'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <OGBadgeEnhanced 
                tier={ogBadge} 
                size="xl"
                showTooltip={false}
                animate={false}
              />
            </motion.div>
            
            {/* Sparkle effect for gold */}
            {ogBadge === 'gold' && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 15, 0, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
              </motion.div>
            )}
          </div>

          {/* Badge info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900">
                {tierLabels[ogBadge] || 'OG Member'}
              </h4>
              {ogBadgeMemberNumber && (
                <span className={cn(
                  'text-xs font-mono px-2 py-0.5 rounded-full',
                  ogBadge === 'gold' && 'bg-amber-100 text-amber-700',
                  ogBadge === 'silver' && 'bg-gray-100 text-gray-700',
                  ogBadge === 'bronze' && 'bg-orange-100 text-orange-700'
                )}>
                  #{ogBadgeMemberNumber}
                </span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">
              {tierDescriptions[ogBadge]}
            </p>
            
            {ogBadgeAssignedAt && (
              <p className="text-xs text-gray-400">
                Joined {new Date(ogBadgeAssignedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileBadgesSection;
```

#### 4. Comment Author Chip with Badge
**File: `/client/src/components/comments/CommentAuthorChip.tsx`**

```tsx
/**
 * CommentAuthorChip
 * 
 * Displays comment author info with avatar, username, and OG badge.
 * Used in comment lists and activity feeds.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '@/components/common/UserAvatar';
import { OGBadgeInline } from '@/components/badges/OGBadgeEnhanced';
import type { OGTier } from '@/components/badges/OGBadge';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/lib/format';

interface CommentAuthorChipProps {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  ogBadge?: OGTier | null;
  createdAt?: string;
  isCreator?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const CommentAuthorChip: React.FC<CommentAuthorChipProps> = ({
  userId,
  username,
  fullName,
  avatarUrl,
  ogBadge,
  createdAt,
  isCreator,
  className,
  size = 'md',
}) => {
  const displayName = fullName || username;
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Avatar */}
      <Link 
        to={`/profile/${userId}`}
        className="flex-shrink-0"
      >
        <UserAvatar
          username={username}
          avatarUrl={avatarUrl}
          size={size === 'sm' ? 'sm' : 'md'}
        />
      </Link>

      {/* Name and meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          <Link 
            to={`/profile/${userId}`}
            className={cn(
              'font-semibold text-gray-900 hover:text-emerald-600 transition-colors truncate',
              size === 'sm' ? 'text-sm' : 'text-base'
            )}
          >
            {displayName}
          </Link>
          
          {/* OG Badge */}
          <OGBadgeInline tier={ogBadge} />
          
          {/* Creator badge */}
          {isCreator && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
              Creator
            </span>
          )}
        </div>
        
        {/* Username and timestamp */}
        <div className={cn(
          'flex items-center gap-1.5 text-gray-500',
          size === 'sm' ? 'text-xs' : 'text-sm'
        )}>
          <span>@{username}</span>
          {createdAt && (
            <>
              <span>·</span>
              <time dateTime={createdAt}>
                {formatRelativeTime(createdAt)}
              </time>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentAuthorChip;
```

#### 5. Referral Success Celebration
**File: `/client/src/components/referral/ReferralSuccessToast.tsx`**

```tsx
/**
 * ReferralSuccessToast
 * 
 * Celebratory toast notification when a referral is successful.
 * Shows the referee's info and a celebration animation.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, X } from 'lucide-react';
import toast, { Toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';

interface ReferralSuccessToastProps {
  t: Toast;
  refereeName: string;
  refereeAvatar?: string;
  milestoneCount?: number;
}

export const ReferralSuccessToast: React.FC<ReferralSuccessToastProps> = ({
  t,
  refereeName,
  refereeAvatar,
  milestoneCount,
}) => {
  const isMilestone = milestoneCount && [5, 10, 25, 50, 100].includes(milestoneCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden',
        isMilestone
          ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600'
          : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600'
      )}
    >
      {/* Confetti effect for milestones */}
      {isMilestone && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3'][i % 4],
              }}
              initial={{ top: '-10%', opacity: 1 }}
              animate={{ 
                top: '110%', 
                opacity: 0,
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative p-4">
        {/* Close button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            {isMilestone && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm mb-0.5">
              {isMilestone ? `🎉 Milestone: ${milestoneCount} Referrals!` : 'New Referral!'}
            </h4>
            <p className="text-sm text-white/90">
              <span className="font-medium">{refereeName}</span> just joined through your link
            </p>
            {isMilestone && (
              <p className="text-xs text-white/70 mt-1">
                You're on fire! Keep spreading the word.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Show referral success toast
 */
export const showReferralSuccessToast = (
  refereeName: string,
  refereeAvatar?: string,
  milestoneCount?: number
) => {
  toast.custom(
    (t) => (
      <ReferralSuccessToast
        t={t}
        refereeName={refereeName}
        refereeAvatar={refereeAvatar}
        milestoneCount={milestoneCount}
      />
    ),
    {
      duration: milestoneCount ? 6000 : 4000,
      position: 'top-center',
    }
  );
};

export default ReferralSuccessToast;
```

---

## 📊 Updated Profile Page Integration

**File: `/client/src/pages/ProfilePageV2.tsx`** (modifications needed)

Add the following imports and integrate the new sections:

```tsx
// Add imports
import { ProfileReferralSection } from '@/components/profile/ProfileReferralSection';
import { ProfileBadgesSection } from '@/components/profile/ProfileBadgesSection';
import { OGBadgeEnhanced, OGBadgeInline } from '@/components/badges/OGBadgeEnhanced';
import { ReferralShareModal } from '@/components/referral/ReferralShareModal';

// In the component, add state for share modal
const [showReferralModal, setShowReferralModal] = useState(false);

// In the JSX, add sections after the overview card:

{/* Badges Section - only show if user has badges */}
{(displayUser?.og_badge) && (
  <ProfileBadgesSection
    ogBadge={displayUser.og_badge}
    ogBadgeAssignedAt={displayUser.og_badge_assigned_at}
    ogBadgeMemberNumber={displayUser.og_badge_member_number}
    className="mb-4"
  />
)}

{/* Referral Section - only show on own profile */}
{isOwnProfile && (
  <ProfileReferralSection
    isOwnProfile={isOwnProfile}
    onOpenShareModal={() => setShowReferralModal(true)}
    className="mb-4"
  />
)}

{/* Referral Share Modal */}
<ReferralShareModal
  isOpen={showReferralModal}
  onClose={() => setShowReferralModal(false)}
/>
```

---

## 🗄️ Database Updates

### Missing Migration for Badge Member Numbers
**File: `/server/migrations/303_badges_member_numbers.sql`**

```sql
-- Migration 303: Add member number tracking for OG badges
-- This allows us to show "Member #17" type displays

-- Add column for member number within tier
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS og_badge_member_number integer NULL;

-- Create function to calculate member number
CREATE OR REPLACE FUNCTION get_og_badge_member_number(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_tier text;
  v_assigned_at timestamptz;
  v_number integer;
BEGIN
  -- Get user's tier and assignment date
  SELECT og_badge, og_badge_assigned_at 
  INTO v_tier, v_assigned_at
  FROM users 
  WHERE id = p_user_id;
  
  IF v_tier IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Count users with same tier assigned before this user (1-indexed)
  SELECT COUNT(*) + 1 INTO v_number
  FROM users
  WHERE og_badge = v_tier::og_badge_tier
    AND og_badge_assigned_at < v_assigned_at;
  
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing member numbers
UPDATE users
SET og_badge_member_number = get_og_badge_member_number(id)
WHERE og_badge IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.og_badge_member_number IS 'Sequential number within the badge tier (e.g., #17 of Gold badge holders)';
```

### Update Referral Stats MV
**File: `/server/migrations/206_referral_stats_mv_v2.sql`**

```sql
-- Migration 206: Enhanced referral stats materialized view
-- Includes user profile data for efficient leaderboard queries

DROP MATERIALIZED VIEW IF EXISTS referral_stats_mv;

CREATE MATERIALIZED VIEW referral_stats_mv AS
SELECT
  u.id AS referrer_user_id,
  u.username,
  u.full_name,
  u.avatar_url,
  u.og_badge,
  COALESCE(clicks.total_clicks, 0) AS total_clicks,
  COALESCE(signups.total_signups, 0) AS total_signups,
  COALESCE(active_all.active_count, 0) AS active_logins_all,
  COALESCE(active_30d.active_count, 0) AS active_logins_30d,
  CASE 
    WHEN COALESCE(clicks.total_clicks, 0) > 0 
    THEN ROUND((COALESCE(signups.total_signups, 0)::numeric / clicks.total_clicks) * 100, 1)
    ELSE 0 
  END AS conversion_rate,
  now() AS last_updated
FROM users u
LEFT JOIN (
  SELECT 
    ur.id AS referrer_id,
    COUNT(*) AS total_clicks
  FROM users ur
  JOIN referral_clicks rc ON rc.ref_code = ur.referral_code
  GROUP BY ur.id
) clicks ON clicks.referrer_id = u.id
LEFT JOIN (
  SELECT 
    referrer_user_id,
    COUNT(*) AS total_signups
  FROM referral_attributions
  GROUP BY referrer_user_id
) signups ON signups.referrer_user_id = u.id
LEFT JOIN (
  SELECT 
    ra.referrer_user_id,
    COUNT(DISTINCT al.user_id) AS active_count
  FROM referral_attributions ra
  JOIN auth_logins al ON al.user_id = ra.referee_user_id
  GROUP BY ra.referrer_user_id
) active_all ON active_all.referrer_user_id = u.id
LEFT JOIN (
  SELECT 
    ra.referrer_user_id,
    COUNT(DISTINCT al.user_id) AS active_count
  FROM referral_attributions ra
  JOIN auth_logins al ON al.user_id = ra.referee_user_id
  WHERE al.logged_at >= (now() - interval '30 days')
  GROUP BY ra.referrer_user_id
) active_30d ON active_30d.referrer_user_id = u.id
WHERE u.referral_code IS NOT NULL
  AND (signups.total_signups > 0 OR clicks.total_clicks > 0);

CREATE UNIQUE INDEX ON referral_stats_mv (referrer_user_id);
CREATE INDEX ON referral_stats_mv (active_logins_all DESC);
CREATE INDEX ON referral_stats_mv (active_logins_30d DESC);
CREATE INDEX ON referral_stats_mv (total_signups DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_referral_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY referral_stats_mv;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ Acceptance Criteria

### OG Badges
1. [ ] Badges display on profile pages (own and others)
2. [ ] Badges display next to usernames in leaderboard
3. [ ] Badges display next to usernames in comments/activity
4. [ ] Tooltip shows tier info and member number
5. [ ] Feature flag properly gates all badge UI
6. [ ] Admin can assign/remove badges
7. [ ] Backfill script works correctly

### Referrals
1. [ ] Referral link appears on own profile
2. [ ] Copy and share functionality works
3. [ ] Share modal opens with social options
4. [ ] Referral leaderboard tab shows correctly
5. [ ] Stats update after referrals
6. [ ] Attribution works on first sign-in
7. [ ] Success notifications show for referrers
8. [ ] Feature flag properly gates all referral UI

---

## 🚀 Deployment Checklist

1. **Environment Variables**
   ```env
   # Client
   VITE_BADGES_OG_ENABLE=1
   VITE_REFERRALS_ENABLE=1
   VITE_FRONTEND_URL=https://app.fanclubz.app
   
   # Server
   BADGES_OG_ENABLE=1
   BADGES_OG_COUNTS=25,100,500
   REFERRAL_ENABLE=1
   REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
   REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
   ```

2. **Database Migrations**
   - Run migrations 303, 206 (in order)
   - Run OG badge backfill after migration

3. **Verification Steps**
   - Test badge display on test user profile
   - Test referral link generation
   - Test referral attribution flow
   - Test leaderboard tabs

---

## 📚 Related Files Reference

### Existing Components (already implemented)
- `/client/src/components/badges/OGBadge.tsx` - Basic badge component
- `/client/src/components/referral/ReferralCard.tsx` - Referral card
- `/client/src/components/referral/ReferralShareModal.tsx` - Share modal
- `/client/src/hooks/useReferral.ts` - Referral hook
- `/client/src/lib/referral.ts` - Referral utilities

### Server Routes (already implemented)
- `/server/src/routes/badges.ts` - Badge API
- `/server/src/routes/referrals.ts` - Referral API

### Migrations (already implemented)
- `/server/migrations/201-205` - Referral system
- `/server/migrations/301-302` - Badge system

---

*Last Updated: Generated for implementation planning*
