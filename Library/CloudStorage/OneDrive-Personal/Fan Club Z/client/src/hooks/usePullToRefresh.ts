import { useState, useEffect, useCallback, useRef } from 'react'

interface PullToRefreshOptions {
  pullThreshold?: number
  maxPullDistance?: number
  dampingFactor?: number
}

export const usePullToRefresh = (
  onRefresh: () => Promise<void>,
  options: PullToRefreshOptions = {}
) => {
  const {
    pullThreshold = 60,
    maxPullDistance = 80,
    dampingFactor = 0.5
  } = options

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only trigger if we're at the top of the page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY.current)
    
    // Prevent default scrolling when pulling down
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault()
      setPullDistance(Math.min(distance * dampingFactor, maxPullDistance))
    }
  }, [isPulling, isRefreshing, dampingFactor, maxPullDistance])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return

    setIsPulling(false)
    
    // Trigger refresh if pulled down enough
    if (pullDistance > pullThreshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
  }, [isPulling, pullDistance, pullThreshold, isRefreshing, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling: isPulling && pullDistance > 0
  }
}