import React from 'react';
import { AutoImage, AutoImageProps } from './AutoImage';
import { cn } from '../../utils/cn';

export interface PredictionHeroProps extends Omit<AutoImageProps, 'aspect' | 'rounded' | 'className'> {
  children?: React.ReactNode; // For title, meta, author info
  className?: string;
}

export const PredictionHero: React.FC<PredictionHeroProps> = ({
  prediction,
  priority = true, // Hero images should load with priority
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={cn('relative w-full', className)}>
      {/* Responsive aspect ratios */}
      <div className="aspect-[16/9] lg:aspect-[21/9]">
        <AutoImage
          prediction={prediction}
          aspect="16/9" // We'll handle responsive with CSS
          rounded="2xl"
          priority={priority}
          className="lg:rounded-none lg:aspect-[21/9]"
          {...props}
        />
      </div>
      
      {/* Content overlay */}
      {children && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Enhanced gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Safe area for content */}
          <div className="relative z-10 p-6 lg:p-8">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
