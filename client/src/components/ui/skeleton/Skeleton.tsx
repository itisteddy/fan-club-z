import React from 'react';
import { cn } from '../../../utils/cn';
import Card from '../card/Card';
import { StatRow } from '../card/StatCard';

// Base Skeleton primitive
export function Skeleton({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded',
        className
      )}
      {...props}
    />
  );
}

// Skeleton lines
export function SkeletonLines({ 
  count = 3, 
  className 
}: { 
  count?: number; 
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton 
          key={i}
          className={cn(
            'h-4',
            // Last line is shorter
            i === count - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
}

// Skeleton for StatCard
export function SkeletonStatCard({ 
  className 
}: { 
  className?: string;
}) {
  return (
    <Card 
      className={cn(
        'min-h-[88px] md:min-h-[96px] p-3 md:p-4',
        'flex flex-col justify-center',
        className
      )}
    >
      <div className="space-y-3">
        {/* Label */}
        <Skeleton className="h-3 w-2/3" />
        {/* Value */}
        <Skeleton className="h-6 w-3/4" />
      </div>
    </Card>
  );
}

// Skeleton for StatRow (3 stat cards)
export function SkeletonStatRow({ 
  className 
}: { 
  className?: string;
}) {
  return (
    <StatRow className={className}>
      <SkeletonStatCard />
      <SkeletonStatCard />
      <SkeletonStatCard />
    </StatRow>
  );
}

// Skeleton for list item
export function SkeletonListItem({ 
  showAvatar = true,
  className 
}: { 
  showAvatar?: boolean; 
  className?: string;
}) {
  return (
    <div className={cn('flex items-start space-x-3 py-3', className)}>
      {showAvatar && (
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

// Skeleton for list (5 items by default)
export function SkeletonList({ 
  count = 5,
  showAvatar = true,
  className 
}: { 
  count?: number; 
  showAvatar?: boolean; 
  className?: string;
}) {
  return (
    <div className={cn('divide-y divide-gray-100', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem 
          key={i} 
          showAvatar={showAvatar}
          className={i === 0 ? 'pt-0' : undefined}
        />
      ))}
    </div>
  );
}

// Skeleton for Card
export function SkeletonCard({ 
  includeHeader = true,
  className 
}: { 
  includeHeader?: boolean; 
  className?: string;
}) {
  return (
    <Card className={className}>
      {includeHeader && (
        <div className="mb-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-48" />
        </div>
      )}
      <SkeletonLines count={3} />
    </Card>
  );
}

export default Skeleton;
