/**
 * OGBadge Component
 * 
 * Displays the OG (Founding User) badge with tier-specific styling.
 * Feature-flagged: only renders when VITE_BADGES_OG_ENABLE=1
 * 
 * Usage:
 * <OGBadge tier="gold" />
 * <OGBadge tier="silver" withLabel />
 * <OGBadge tier="bronze" size="lg" />
 */

import React from 'react';
import { cn } from '@/utils/cn';

export type OGTier = 'gold' | 'silver' | 'bronze';

interface OGBadgeProps {
  tier: OGTier | null | undefined;
  className?: string;
  withLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  xs: { icon: 12, text: 'text-[10px]' },
  sm: { icon: 14, text: 'text-xs' },
  md: { icon: 16, text: 'text-xs' },
  lg: { icon: 20, text: 'text-sm' },
};

const tierConfig = {
  gold: {
    src: '/badges/og-gold.svg',
    label: 'OG Gold',
    labelColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  silver: {
    src: '/badges/og-silver.svg',
    label: 'OG Silver',
    labelColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  bronze: {
    src: '/badges/og-bronze.svg',
    label: 'OG Bronze',
    labelColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

export const OGBadge: React.FC<OGBadgeProps> = ({ 
  tier, 
  className, 
  withLabel = false,
  size = 'md'
}) => {
  // Feature flag check
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  // Don't render if feature is disabled or no tier
  if (!isEnabled || !tier) {
    return null;
  }

  const config = tierConfig[tier];
  const sizeSettings = sizeConfig[size];

  if (!config) {
    return null;
  }

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1',
        className
      )} 
      aria-label={config.label} 
      title={config.label}
    >
      <img 
        src={config.src} 
        alt="" 
        width={sizeSettings.icon} 
        height={sizeSettings.icon} 
        className="inline-block align-middle flex-shrink-0"
        loading="lazy"
      />
      {withLabel && (
        <span className={cn(sizeSettings.text, config.labelColor, 'font-medium')}>
          {config.label}
        </span>
      )}
    </span>
  );
};

/**
 * OGBadgePill - A pill-style badge variant for more prominent display
 */
export const OGBadgePill: React.FC<Omit<OGBadgeProps, 'withLabel'>> = ({
  tier,
  className,
  size = 'sm'
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !tier) {
    return null;
  }

  const config = tierConfig[tier];
  const sizeSettings = sizeConfig[size];

  if (!config) {
    return null;
  }

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border',
        config.bgColor,
        config.borderColor,
        className
      )} 
      aria-label={config.label} 
      title={config.label}
    >
      <img 
        src={config.src} 
        alt="" 
        width={sizeSettings.icon} 
        height={sizeSettings.icon} 
        className="inline-block align-middle flex-shrink-0"
        loading="lazy"
      />
      <span className={cn(sizeSettings.text, config.labelColor, 'font-semibold')}>
        {config.label}
      </span>
    </span>
  );
};

/**
 * AvatarWithBadge - Wrapper to overlay badge on avatar
 */
interface AvatarWithBadgeProps {
  children: React.ReactNode;
  tier: OGTier | null | undefined;
  badgePosition?: 'bottom-right' | 'top-right';
  badgeSize?: 'xs' | 'sm';
}

export const AvatarWithBadge: React.FC<AvatarWithBadgeProps> = ({
  children,
  tier,
  badgePosition = 'bottom-right',
  badgeSize = 'xs'
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !tier) {
    return <>{children}</>;
  }

  const positionClasses = {
    'bottom-right': '-bottom-0.5 -right-0.5',
    'top-right': '-top-0.5 -right-0.5',
  };

  return (
    <div className="relative inline-block">
      {children}
      <span className={cn(
        'absolute',
        positionClasses[badgePosition],
        'bg-white rounded-full p-0.5 shadow-sm'
      )}>
        <OGBadge tier={tier} size={badgeSize} />
      </span>
    </div>
  );
};

export default OGBadge;
