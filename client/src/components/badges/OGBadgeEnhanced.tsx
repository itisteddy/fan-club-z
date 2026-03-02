/**
 * OGBadgeEnhanced Component
 * 
 * An enhanced badge component with richer tooltips, animations,
 * and contextual information about the badge holder.
 * 
 * Features:
 * - Animated hover states
 * - Rich tooltip with member context
 * - Multiple size variants
 * - Inline version for text contexts
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
  animate: _animate = true,
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
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full',
        )}
        style={{ width: sizeSettings.container, height: sizeSettings.container }}
        aria-label={config.label}
        title={!showTooltip ? config.label : undefined}
      >
        <img 
          src={config.src} 
          alt={config.label}
          width={sizeSettings.icon} 
          height={sizeSettings.icon} 
          className="flex-shrink-0"
          loading="lazy"
        />
      </span>

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
              style={{ pointerEvents: 'none' }}
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
 * Smaller, no tooltip, simple hover effect
 */
interface OGBadgeInlineProps {
  tier: OGTier | null | undefined;
  className?: string;
  size?: number;
}

export const OGBadgeInline: React.FC<OGBadgeInlineProps> = ({ 
  tier, 
  className,
  size = 14 
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !tier) return null;
  
  const config = tierConfig[tier];
  if (!config) return null;

  return (
    <img 
      src={config.src} 
      alt={config.label}
      title={config.label}
      width={size} 
      height={size} 
      className={cn(
        'inline-block align-middle ml-1 flex-shrink-0',
        'hover:scale-110 transition-transform duration-150',
        className
      )}
      loading="lazy"
    />
  );
};

/**
 * OGBadgeLarge - For prominent displays like profile pages
 * Shows full badge with glow and description
 */
interface OGBadgeLargeProps {
  tier: OGTier | null | undefined;
  memberNumber?: number;
  assignedAt?: string;
  className?: string;
}

export const OGBadgeLarge: React.FC<OGBadgeLargeProps> = ({
  tier,
  memberNumber,
  assignedAt,
  className,
}) => {
  const isEnabled = import.meta.env.VITE_BADGES_OG_ENABLE === '1';
  
  if (!isEnabled || !tier) return null;
  
  const config = tierConfig[tier];
  if (!config) return null;

  const formattedDate = assignedAt 
    ? new Date(assignedAt).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
    : null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 px-4 py-3 rounded-2xl',
        'border-2 shadow-lg',
        config.bgColor,
        config.borderColor,
        config.glowColor,
        className
      )}
    >
      <div>
        <img 
          src={config.src} 
          alt={config.label}
          width={40} 
          height={40}
        />
      </div>
      
      <div>
        <div className="flex items-center gap-2">
          <h4 className={cn(
            'font-bold bg-gradient-to-r bg-clip-text text-transparent',
            config.textGradient
          )}>
            {config.label}
          </h4>
          {memberNumber && (
            <span className={cn(
              'text-xs font-mono px-1.5 py-0.5 rounded-full',
              tier === 'gold' && 'bg-amber-200 text-amber-800',
              tier === 'silver' && 'bg-gray-200 text-gray-700',
              tier === 'bronze' && 'bg-orange-200 text-orange-800'
            )}>
              #{memberNumber}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{config.description}</p>
        {formattedDate && (
          <p className="text-xs text-gray-400 mt-0.5">Since {formattedDate}</p>
        )}
      </div>
    </div>
  );
};

export default OGBadgeEnhanced;
