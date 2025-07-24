// Safe UI components fallbacks for missing dependencies

import React from 'react'

// Safe PullToRefreshIndicator component
export const PullToRefreshIndicator: React.FC<{
  isRefreshing: boolean
  isPulling: boolean
  pullDistance: number
}> = ({ isRefreshing, isPulling, pullDistance }) => {
  if (!isPulling && !isRefreshing) return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm">
        {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
      </div>
    </div>
  )
}

// Safe Tabs components
export const Tabs: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={className}>{children}</div>
)

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`flex ${className || ''}`}>{children}</div>
)

export const TabsTrigger: React.FC<{ 
  children: React.ReactNode
  value: string
  className?: string
  onClick?: () => void
}> = ({ children, className, onClick }) => (
  <button className={className} onClick={onClick}>{children}</button>
)

export const TabsContent: React.FC<{ 
  children: React.ReactNode
  value: string
  className?: string
}> = ({ children, className }) => (
  <div className={className}>{children}</div>
)

// Safe Card components
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white rounded-lg shadow-sm ${className || ''}`}>{children}</div>
)

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={className}>{children}</div>
)

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={className}>{children}</div>
)

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <h3 className={className}>{children}</h3>
)

// Safe hook fallback
export const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isPulling, setIsPulling] = React.useState(false)

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])

  return {
    containerRef,
    isRefreshing,
    pullDistance,
    isPulling
  }
}
