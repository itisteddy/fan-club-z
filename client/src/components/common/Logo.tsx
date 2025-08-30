/**
 * FC Logo Component
 * Reusable logo component for consistent branding across the app
 */

import React from 'react';

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
      {/* Green Logo provided by user - preserving original design */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Green background */}
        <rect width="100" height="100" fill="#5F9EA0" />
        
        {/* White logo elements based on the provided green logo */}
        {/* Left arc */}
        <path
          d="M 20 35 Q 15 35 15 40 L 15 60 Q 15 65 20 65 L 25 65 L 25 60 L 20 60 Q 18 60 18 58 L 18 42 Q 18 40 20 40 L 25 40 L 25 35 Z"
          fill="white"
        />
        
        {/* Center arc */}
        <path
          d="M 35 20 Q 25 20 25 30 L 25 70 Q 25 80 35 80 L 45 80 L 45 75 L 35 75 Q 30 75 30 70 L 30 30 Q 30 25 35 25 L 45 25 L 45 20 Z"
          fill="white"
        />
        
        {/* Right semicircle */}
        <circle
          cx="65"
          cy="50"
          r="15"
          fill="white"
        />
        
        {/* Right cutout */}
        <rect
          x="65"
          y="35"
          width="15"
          height="30"
          fill="#5F9EA0"
        />
      </svg>
      
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
