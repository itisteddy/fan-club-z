import React from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean
  isPulling: boolean
  pullDistance: number
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isRefreshing,
  isPulling,
  pullDistance
}) => {
  if (!isPulling && !isRefreshing) return null

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm border-b border-gray-200 transition-all duration-300"
      style={{ 
        height: isPulling ? `${Math.max(60, pullDistance + 20)}px` : isRefreshing ? '80px' : '0px',
        transform: `translateY(${isPulling ? 0 : isRefreshing ? 0 : '-100%'})`
      }}
    >
      <div className="flex items-center space-x-2 text-blue-500">
        <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
        <span className="text-sm font-medium">
          {isRefreshing ? 'Refreshing...' : isPulling ? 'Pull to refresh' : ''}
        </span>
      </div>
    </div>
  )
}