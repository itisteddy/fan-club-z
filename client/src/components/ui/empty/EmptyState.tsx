import React from 'react';
import { cn } from '../../../utils/cn';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  primaryAction, 
  secondaryAction,
  className 
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {/* Minimal icon (24–32px) */}
      {icon && (
        <div className="mb-4 text-gray-300">
          {React.cloneElement(icon as React.ReactElement, {
            className: cn(
              'w-6 h-6 md:w-8 md:h-8',
              (icon as React.ReactElement).props.className
            )
          })}
        </div>
      )}

      {/* Title (16–18px) */}
      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {/* Description (14–15px) */}
      {description && (
        <p className="text-sm md:text-base text-gray-600 mb-6 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
