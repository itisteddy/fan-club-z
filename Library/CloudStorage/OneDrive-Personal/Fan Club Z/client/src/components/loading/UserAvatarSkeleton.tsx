import React from 'react'
import { cn } from '@/lib/utils'

interface UserAvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const UserAvatarSkeleton: React.FC<UserAvatarSkeletonProps> = ({
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div 
      className={cn(
        "animate-pulse bg-gray-200 rounded-full",
        sizeClasses[size],
        className
      )}
    />
  )
}

export default UserAvatarSkeleton 