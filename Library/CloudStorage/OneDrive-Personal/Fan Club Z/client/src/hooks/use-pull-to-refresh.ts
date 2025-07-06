import { useState, useEffect, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
}

export const usePullToRefresh = ({ 
  onRefresh, 
  threshold = 80, 
  disabled = false 
}: PullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [startY, setStartY] = useState(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    setStartY(e.touches[0].clientY)
  }, [disabled])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return
    
    const currentY = e.touches[0].clientY
    const scrollTop = (e.target as HTMLElement).scrollTop
    
    // Only trigger if at top of scroll
    if (scrollTop === 0) {
      const pullDistance = Math.max(0, currentY - startY)
      setPullDistance(pullDistance)
      
      // Add haptic feedback at threshold
      if (pullDistance >= threshold && navigator.vibrate) {
        navigator.vibrate(10)
      }
    }
  }, [disabled, isRefreshing, startY, threshold])

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
  }, [disabled, isRefreshing, pullDistance, threshold, onRefresh])

  const refreshIndicatorStyle = {
    transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
    opacity: Math.min(pullDistance / threshold, 1)
  }

  return {
    isRefreshing,
    pullDistance,
    refreshIndicatorStyle,
    touchProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}

export default usePullToRefresh 