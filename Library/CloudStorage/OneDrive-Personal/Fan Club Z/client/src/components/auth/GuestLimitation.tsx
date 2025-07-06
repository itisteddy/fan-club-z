import React from 'react'
import { Lock, Info, TrendingUp, Eye, Users, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface GuestLimitationProps {
  type: 'blur' | 'lock' | 'banner' | 'overlay'
  feature: 'analytics' | 'betting' | 'leaderboard' | 'history' | 'advanced_stats' | 'save' | 'notifications'
  onSignUp?: () => void
  children?: React.ReactNode
  className?: string
}

export const GuestLimitation: React.FC<GuestLimitationProps> = ({
  type,
  feature,
  onSignUp,
  children,
  className
}) => {
  const getFeatureInfo = () => {
    switch (feature) {
      case 'analytics':
        return {
          icon: <BarChart3 className="w-6 h-6" />,
          title: 'Advanced Analytics',
          description: 'See odds history and detailed trends',
          cta: 'Sign up to unlock'
        }
      case 'betting':
        return {
          icon: <TrendingUp className="w-6 h-6" />,
          title: 'Place Bets',
          description: 'Join the action and make predictions',
          cta: 'Sign up to bet'
        }
      case 'leaderboard':
        return {
          icon: <Users className="w-6 h-6" />,
          title: 'View Leaderboards',
          description: 'See who\'s winning and top performers',
          cta: 'Sign up to compete'
        }
      case 'history':
        return {
          icon: <Eye className="w-6 h-6" />,
          title: 'Betting History',
          description: 'Track your predictions and winnings',
          cta: 'Sign up to track'
        }
      case 'advanced_stats':
        return {
          icon: <BarChart3 className="w-6 h-6" />,
          title: 'Detailed Statistics',
          description: 'Access comprehensive bet analytics',
          cta: 'Sign up for stats'
        }
      case 'save':
        return {
          icon: <Eye className="w-6 h-6" />,
          title: 'Save Favorites',
          description: 'Bookmark interesting bets',
          cta: 'Sign up to save'
        }
      case 'notifications':
        return {
          icon: <Info className="w-6 h-6" />,
          title: 'Get Notifications',
          description: 'Stay updated on your bets',
          cta: 'Sign up for alerts'
        }
      default:
        return {
          icon: <Lock className="w-5 h-5" />,
          title: 'Premium Feature',
          description: 'Unlock this feature with an account',
          cta: 'Sign up to unlock'
        }
    }
  }

  const info = getFeatureInfo()

  // Banner type - shows an info banner above content
  if (type === 'banner') {
    return (
      <div className={cn("space-y-3", className)}>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-3">
              <div className="text-amber-600">
                {info.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {info.title}
                </p>
                <p className="text-xs text-amber-700">
                  {info.description}
                </p>
              </div>
              {onSignUp && (
                <Button
                  size="sm"
                  variant="outline" 
                  onClick={onSignUp}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                >
                  {info.cta}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {children}
      </div>
    )
  }

  // Lock type - shows a lock icon overlay
  if (type === 'lock') {
    return (
      <div className={cn("relative", className)}>
        {children}
        <div className="absolute top-2 right-2 bg-gray-900/80 text-white p-1 rounded">
          <Lock className="w-3 h-3" />
        </div>
      </div>
    )
  }

  // Blur type - blurs content with unlock overlay
  if (type === 'blur') {
    return (
      <div className={cn("relative", className)}>
        <div className="blur-sm pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/60 to-transparent flex items-end justify-center pb-6">
          <div className="text-center px-4">
            <div className="text-gray-400 mb-2">
              {info.icon}
            </div>
            <p className="font-semibold text-gray-700 mb-1 text-sm">
              {info.title}
            </p>
            <p className="text-xs text-gray-600 mb-3">
              {info.description}
            </p>
            {onSignUp && (
              <Button size="sm" onClick={onSignUp}>
                {info.cta}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Overlay type - full overlay replacement
  if (type === 'overlay') {
    return (
      <div className={cn("relative min-h-[200px] flex items-center justify-center", className)}>
        <div className="text-center px-4">
          <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-gray-100 rounded-full">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {info.title}
          </h3>
          <p className="text-gray-600 mb-4 max-w-sm">
            {info.description}
          </p>
          {onSignUp && (
            <Button onClick={onSignUp}>
              {info.cta}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Specific components for common use cases
export const LockedFeature: React.FC<{
  title: string
  description: string
  onUnlock?: () => void
  className?: string
}> = ({ title, description, onUnlock, className }) => (
  <Card className={cn("bg-gray-50 border-gray-200", className)}>
    <CardContent className="p-6 text-center">
      <Lock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      {onUnlock && (
        <Button size="sm" onClick={onUnlock}>
          Sign up to unlock
        </Button>
      )}
    </CardContent>
  </Card>
)

export const BlurredPreview: React.FC<{
  children: React.ReactNode
  title: string
  onUnlock?: () => void
  className?: string
}> = ({ children, title, onUnlock, className }) => (
  <div className={cn("relative", className)}>
    <div className="blur-sm select-none pointer-events-none">
      {children}
    </div>
    <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent flex items-end justify-center pb-4">
      <div className="text-center">
        <Lock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p className="font-semibold mb-2 text-gray-700">{title}</p>
        {onUnlock && (
          <Button size="sm" onClick={onUnlock}>
            Sign up to view
          </Button>
        )}
      </div>
    </div>
  </div>
)

export default GuestLimitation