import React from 'react'
import { cn } from '@/lib/utils'

interface BetCardSkeletonProps {
  variant?: 'default' | 'featured' | 'compact'
  className?: string
}

export const BetCardSkeleton: React.FC<BetCardSkeletonProps> = ({
  variant = 'default',
  className
}) => {
  if (variant === 'featured') {
    return (
      <div className={cn("card-apple overflow-hidden", className)}>
        <div className="animate-pulse">
          {/* Hero gradient placeholder */}
          <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800"></div>
          
          {/* Content */}
          <div className="p-4">
            {/* Category */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-3"></div>
            
            {/* Title */}
            <div className="space-y-2 mb-3">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            
            {/* Metadata */}
            <div className="flex items-center space-x-4 mb-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
            
            {/* Button */}
            <div className="w-full h-[50px] bg-gray-200 dark:bg-gray-700 rounded-apple-md"></div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn("card-apple w-64 flex-shrink-0", className)}>
        <div className="animate-pulse p-4">
          {/* Category and status */}
          <div className="flex items-center justify-between mb-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
          </div>
          
          {/* Title */}
          <div className="space-y-2 mb-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10"></div>
            </div>
          </div>
          
          {/* Button */}
          <div className="w-full h-11 bg-gray-200 dark:bg-gray-700 rounded-apple-md"></div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("card-apple", className)}>
      <div className="animate-pulse p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-16 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="w-12 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        
        {/* Title */}
        <div className="space-y-2 mb-2">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
        </div>
        
        {/* Description */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
        
        {/* Options */}
        <div className="space-y-2 mb-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-apple-md p-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="text-right space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-apple-md p-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              <div className="text-right space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Metadata row */}
        <div className="flex items-center space-x-4 mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14"></div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="w-20 h-[50px] bg-gray-200 dark:bg-gray-700 rounded-apple-md"></div>
        </div>
      </div>
    </div>
  )
}

export default BetCardSkeleton