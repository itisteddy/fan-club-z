/**
 * ProfileBadgesSection
 * 
 * Displays user's badges and achievements on their profile.
 * Currently shows OG badges with full context.
 * Designed for future expansion to other badge types.
 * 
 * UX Principles:
 * - Celebrate achievements prominently
 * - Provide context (member #, date)
 * - Visual hierarchy with tier differentiation
 * - Subtle animations for engagement
 */

import React from 'react';
import { Award, Sparkles, Star } from 'lucide-react';
import { OGBadgeEnhanced } from '@/components/badges/OGBadgeEnhanced';
import type { OGTier } from '@/components/badges/OGBadge';
import { cn } from '@/utils/cn';

interface ProfileBadgesSectionProps {
  ogBadge?: OGTier | null;
  ogBadgeAssignedAt?: string | null;
  ogBadgeMemberNumber?: number;
  className?: string;
  showHeader?: boolean;
}

const tierConfig = {
  gold: {
    title: 'Founding Member',
    subtitle: 'OG Gold',
    description: 'One of the original 25 founding members',
    bgGradient: 'from-amber-50 via-yellow-50 to-amber-100',
    borderColor: 'border-amber-200',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    pillBg: 'bg-amber-100',
    pillText: 'text-amber-700',
    sparkleColor: 'text-amber-400',
    priority: 1,
  },
  silver: {
    title: 'Early Adopter',
    subtitle: 'OG Silver',
    description: 'Among the first 125 members to join',
    bgGradient: 'from-gray-50 via-slate-50 to-gray-100',
    borderColor: 'border-gray-200',
    iconBg: 'bg-gradient-to-br from-gray-400 to-slate-500',
    pillBg: 'bg-gray-100',
    pillText: 'text-gray-700',
    sparkleColor: 'text-gray-400',
    priority: 2,
  },
  bronze: {
    title: 'Pioneer',
    subtitle: 'OG Bronze',
    description: 'Among the first 625 members to join',
    bgGradient: 'from-orange-50 via-amber-50 to-orange-100',
    borderColor: 'border-orange-200',
    iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500',
    pillBg: 'bg-orange-100',
    pillText: 'text-orange-700',
    sparkleColor: 'text-orange-400',
    priority: 3,
  },
};

export const ProfileBadgesSection: React.FC<ProfileBadgesSectionProps> = ({
  ogBadge,
  ogBadgeAssignedAt,
  ogBadgeMemberNumber,
  className,
  showHeader = true,
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  // Don't render if no badges to show
  if (!isEnabled || !ogBadge) {
    return null;
  }

  const config = tierConfig[ogBadge];
  if (!config) return null;

  const formattedDate = ogBadgeAssignedAt
    ? new Date(ogBadgeAssignedAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 overflow-hidden',
        'shadow-sm',
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
          <Award className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Achievements</h3>
        </div>
      )}

      {/* OG Badge Feature Card */}
      <div className="p-4">
        <div
          className={cn(
            'relative rounded-xl p-4 overflow-hidden',
            'bg-gradient-to-br',
            config.bgGradient,
            'border',
            config.borderColor
          )}
        >
          {/* Decorative elements for Gold tier */}
          {ogBadge === 'gold' && (
            <>
              <div className="absolute top-2 right-2">
                <Sparkles className={cn('w-5 h-5', config.sparkleColor)} />
              </div>
              <div className="absolute bottom-2 left-2 opacity-30">
                <Star className="w-6 h-6 text-amber-300" />
              </div>
            </>
          )}

          <div className="flex items-start gap-4 relative z-10">
            {/* Large badge display */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg',
                  config.iconBg
                )}
              >
                <OGBadgeEnhanced
                  tier={ogBadge}
                  size="xl"
                  showTooltip={false}
                  animate={false}
                />
              </div>
              
              {/* Member number badge */}
              {ogBadgeMemberNumber && (
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full',
                    'text-xs font-bold font-mono shadow-sm',
                    'bg-white border',
                    config.borderColor,
                    config.pillText
                  )}
                >
                  #{ogBadgeMemberNumber}
                </div>
              )}
            </div>

            {/* Badge info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-bold text-gray-900">
                  {config.title}
                </h4>
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  config.pillBg,
                  config.pillText
                )}>
                  {config.subtitle}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                {config.description}
              </p>
              
              {formattedDate && (
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <span>Member since</span>
                  <span className="font-medium text-gray-500">{formattedDate}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ProfileBadgesCompact
 * Compact inline version for smaller spaces
 */
interface ProfileBadgesCompactProps {
  ogBadge?: OGTier | null;
  ogBadgeMemberNumber?: number;
  className?: string;
}

export const ProfileBadgesCompact: React.FC<ProfileBadgesCompactProps> = ({
  ogBadge,
  ogBadgeMemberNumber,
  className,
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !ogBadge) return null;

  const config = tierConfig[ogBadge];
  if (!config) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'border',
        config.pillBg,
        config.borderColor,
        className
      )}
    >
      <OGBadgeEnhanced
        tier={ogBadge}
        size="sm"
        showTooltip={false}
        animate={false}
      />
      <span className={cn('text-sm font-semibold', config.pillText)}>
        {config.subtitle}
      </span>
      {ogBadgeMemberNumber && (
        <span className={cn('text-xs font-mono', config.pillText, 'opacity-70')}>
          #{ogBadgeMemberNumber}
        </span>
      )}
    </div>
  );
};

export default ProfileBadgesSection;
