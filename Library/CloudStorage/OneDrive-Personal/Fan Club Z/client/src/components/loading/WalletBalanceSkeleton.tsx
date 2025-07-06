import React from 'react'
import { cn } from '@/lib/utils'

interface WalletBalanceSkeletonProps {
  variant?: 'compact' | 'full'
  className?: string
}

export const WalletBalanceSkeleton: React.FC<WalletBalanceSkeletonProps> = ({
  variant = 'compact',
  className
}) => {
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <div className="w-4 h-4 animate-pulse bg-gray-200 rounded"></div>
        <div className="w-16 h-4 animate-pulse bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 animate-pulse bg-gray-200 rounded"></div>
        <div className="w-20 h-4 animate-pulse bg-gray-200 rounded"></div>
      </div>
      <div className="w-24 h-6 animate-pulse bg-gray-200 rounded"></div>
    </div>
  )
}

export default WalletBalanceSkeleton 