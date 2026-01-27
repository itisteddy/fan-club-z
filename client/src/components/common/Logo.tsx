/**
 * FC Logo Component
 * Reusable logo component for consistent branding across the app
 */

import React from 'react';
import { LogoMarkPng } from '@/assets/brand';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
  onClick?: () => void;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'full', 
  className = '',
  onClick 
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8',   // 32px
    md: 'w-12 h-12', // 48px  
    lg: 'w-16 h-16', // 64px
    xl: 'w-24 h-24'  // 96px
  };

  const logoSize = sizeClasses[size];

  return (
    <div 
      className={`${logoSize} ${className} ${onClick ? 'cursor-pointer' : ''} flex items-center justify-center`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Logo image - preserve aspect ratio, no distortion */}
      <img
        src={LogoMarkPng}
        alt="Fan Club Z"
        className="w-full h-full object-contain"
        style={{ objectFit: 'contain' }}
      />
      
      {/* Text variant (if full logo is requested) */}
      {variant === 'full' && size !== 'sm' && (
        <span className="ml-2 font-bold text-gray-900 text-lg">
          Fan Club Z
        </span>
      )}
    </div>
  );
};

export default Logo;
