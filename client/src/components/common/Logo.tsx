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
      {/* SVG version of the FC logo */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle background - Neon Teal */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="#00F5D4"
          stroke="#00F5D4"
          strokeWidth="2"
        />
        
        {/* Electric Purple F section */}
        <path
          d="M 15 15 Q 15 15 35 15 Q 50 15 50 30 Q 50 50 35 50 L 15 50 Q 15 50 15 85 Q 15 85 35 85 Q 85 85 85 50 Q 85 15 50 15 L 35 15 Z"
          fill="#7B2FF7"
        />
        
        {/* White F letter */}
        <g fill="white">
          <rect x="22" y="25" width="6" height="28" />
          <rect x="22" y="25" width="18" height="5" />
          <rect x="22" y="36" width="14" height="4" />
        </g>
        
        {/* White C letter */}
        <g fill="white" transform="translate(45, 15)">
          <path
            d="M 15 10 Q 5 10 5 20 L 5 30 Q 5 40 15 40 L 25 40 L 25 35 L 15 35 Q 10 35 10 30 L 10 20 Q 10 15 15 15 L 25 15 L 25 10 Z"
          />
        </g>
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
