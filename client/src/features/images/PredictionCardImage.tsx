import React from 'react';
import { AutoImage, AutoImageProps } from './AutoImage';
import { cn } from '../../utils/cn';

export interface PredictionCardImageProps extends Omit<AutoImageProps, 'aspect' | 'rounded'> {
  children?: React.ReactNode; // For overlays like badges
}

export const PredictionCardImage: React.FC<PredictionCardImageProps> = ({
  prediction,
  priority = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={cn('relative', className)}>
      <AutoImage
        prediction={prediction}
        aspect="16/9"
        rounded="xl"
        priority={priority}
        {...props}
      />
      
      {/* Overlay content (badges, stats, etc.) */}
      {children && (
        <div className="absolute inset-0 pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};
