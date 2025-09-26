import React from 'react';
import { cn } from '../../../utils/cn';

// Base Card Component
export function Card({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        // Base styling with var(--surface, #fff)
        'bg-white',
        // Radius: 16px
        'rounded-2xl',
        // Border: 1px solid rgba(0,0,0,0.06)
        'border border-black/[0.06]',
        // Internal padding: 16px mobile, 20px ≥768px
        'p-4 md:p-5',
        // Shadow: none by default; elevate only when interactive/pressed
        'shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Header with title, meta, and actions
export function CardHeader({ 
  title, 
  meta, 
  actions,
  className,
  ...props 
}: {
  title?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        'flex items-start justify-between',
        'mb-4',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title && (
          <div className="mb-1">
            {typeof title === 'string' ? (
              <CardTitle>{title}</CardTitle>
            ) : (
              title
            )}
          </div>
        )}
        {meta && (
          <div>
            {typeof meta === 'string' ? (
              <CardMeta>{meta}</CardMeta>
            ) : (
              meta
            )}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-2 ml-3">
          {actions}
        </div>
      )}
    </div>
  );
}

// Card Content wrapper
export function CardContent({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn('space-y-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Actions (button row)
export function CardActions({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        'flex items-center space-x-3 pt-4 border-t border-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Card Divider
export function CardDivider({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLHRElement>) {
  return (
    <hr 
      className={cn(
        'border-0 border-t border-gray-100 my-4',
        className
      )}
      {...props}
    />
  );
}

// Typography Components
export function CardTitle({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      className={cn(
        // Title: 14–16px semibold
        'text-sm md:text-base font-semibold text-gray-900 leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardValue({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        // Value: 20–24px semibold/mono
        'text-xl md:text-2xl font-semibold text-gray-900 font-mono leading-tight',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardMeta({ 
  children, 
  className,
  ...props 
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        // Meta: 12–13px medium
        'text-xs md:text-sm text-gray-600 font-medium',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Export all components
export default Card;
