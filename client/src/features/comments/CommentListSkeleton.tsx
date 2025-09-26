import React from 'react';

interface CommentListSkeletonProps {
  count?: number;
}

export const CommentListSkeleton: React.FC<CommentListSkeletonProps> = ({ 
  count = 3 
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex gap-3">
            {/* Avatar skeleton */}
            <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0"></div>
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              {/* Header skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              
              {/* Comment text skeleton */}
              <div className="space-y-1">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              
              {/* Actions skeleton */}
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
