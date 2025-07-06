import React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  children?: React.ReactNode
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("animate-pulse bg-gray-200 rounded-apple-md", className)}
      {...props}
    >
      {children}
    </div>
  )
}

// Content skeleton for pages
export const ContentSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-apple-lg" />
        <div className="flex space-x-3">
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-22 rounded-full" />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="h-20 rounded-apple-lg" />
        <Skeleton className="h-20 rounded-apple-lg" />
        <Skeleton className="h-20 rounded-apple-lg" />
      </div>
    </div>
  )
}

export default Skeleton