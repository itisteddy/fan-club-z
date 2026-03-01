import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, animate = true, style }) => (
  <div
    className={cn(
      "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded",
      animate && "animate-pulse",
      className
    )}
    style={{
      backgroundSize: '200% 100%',
      animation: animate ? 'shimmer 1.5s ease-in-out infinite' : undefined,
      ...style,
    }}
  />
);

// Shimmer animation keyframes (add to your CSS)
const shimmerStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

export const DensePredictionCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <>
    <style>{shimmerStyles}</style>
    <motion.div
      className="bg-white rounded-xl border border-gray-100 p-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>

      {/* Title */}
      <div className="mb-2">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Leading option */}
      <div className="flex items-center justify-between text-xs mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <div className="p-2 bg-gray-50 rounded-lg">
          <Skeleton className="h-3 w-full mb-1" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="p-2 bg-gray-50 rounded-lg">
          <Skeleton className="h-3 w-full mb-1" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-6" />
        </div>
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </motion.div>
  </>
);

export const FilterPillsSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 pb-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton 
                  key={index}
                  className="h-7 rounded-full"
                  style={{ width: `${Math.random() * 40 + 60}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);

export const DiscoverHeaderSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <div className="px-4 py-6 bg-white">
      {/* Stats Pills */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </>
);

export const DiscoverPageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    {/* Header Skeleton */}
    <DiscoverHeaderSkeleton />
    
    {/* Filter Pills Skeleton */}
    <FilterPillsSkeleton />
    
    {/* Content */}
    <div className="px-4 py-4 space-y-4">
      {/* Section Header */}
      <div className="mb-6">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      
      {/* Card Grid */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <DensePredictionCardSkeleton key={index} index={index} />
        ))}
      </div>
    </div>
  </div>
);

// Loading state for infinite scroll
export const LoadMoreSkeleton: React.FC = () => (
  <>
    <style>{shimmerStyles}</style>
    <div className="px-4 py-4 space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <DensePredictionCardSkeleton key={index} index={index} />
      ))}
    </div>
  </>
);

// Empty state with skeleton placeholder
export const EmptyDiscoverSkeleton: React.FC<{ 
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}> = ({ 
  title = "No predictions found",
  description = "Try adjusting your filters or check back later",
  showRetry = false,
  onRetry
}) => (
  <>
    <style>{shimmerStyles}</style>
    <div className="px-4 py-12 text-center">
      {/* Icon placeholder */}
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Skeleton className="w-8 h-8" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      
      {showRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </>
);

export default {
  DensePredictionCardSkeleton,
  FilterPillsSkeleton,
  DiscoverHeaderSkeleton,
  DiscoverPageSkeleton,
  LoadMoreSkeleton,
  EmptyDiscoverSkeleton,
};
