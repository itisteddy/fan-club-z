import React from 'react'
import { Check, Lock, TrendingUp, Users, BarChart3, Eye, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Feature {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  available: boolean
}

const GUEST_FEATURES: Feature[] = [
  {
    id: 'browse',
    title: 'Browse Bets',
    description: 'View all available predictions',
    icon: Eye,
    available: true
  },
  {
    id: 'view_details',
    title: 'View Bet Details',
    description: 'See odds and participant counts',
    icon: TrendingUp,
    available: true
  },
  {
    id: 'explore_clubs',
    title: 'Explore Clubs',
    description: 'Browse betting communities',
    icon: Users,
    available: true
  },
  {
    id: 'place_bets',
    title: 'Place Bets',
    description: 'Make predictions and win rewards',
    icon: TrendingUp,
    available: false
  },
  {
    id: 'save_favorites',
    title: 'Save Favorites',
    description: 'Bookmark interesting bets',
    icon: Eye,
    available: false
  },
  {
    id: 'view_analytics',
    title: 'Advanced Analytics',
    description: 'See odds history and trends',
    icon: BarChart3,
    available: false
  },
  {
    id: 'notifications',
    title: 'Get Notifications',
    description: 'Stay updated on your bets',
    icon: Bell,
    available: false
  }
]

interface GuestProgressIndicatorProps {
  onSignUp?: () => void
  className?: string
  variant?: 'compact' | 'full'
}

export const GuestProgressIndicator: React.FC<GuestProgressIndicatorProps> = ({
  onSignUp,
  className,
  variant = 'full'
}) => {
  const availableCount = GUEST_FEATURES.filter(f => f.available).length
  const totalCount = GUEST_FEATURES.length
  const progressPercentage = (availableCount / totalCount) * 100

  if (variant === 'compact') {
    return (
      <Card className={cn("bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {availableCount} of {totalCount} features available
                </p>
                <div className="w-24 h-2 bg-blue-200 rounded-full mt-1">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
            {onSignUp && (
              <Button size="sm" onClick={onSignUp}>
                Unlock All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200", className)}>
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Guest Access
          </h3>
          <p className="text-blue-700 mb-4">
            You're currently browsing with limited access
          </p>
          
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-blue-600 mb-2">
              <span>{availableCount} available</span>
              <span>{totalCount - availableCount} locked</span>
            </div>
            <div className="w-full h-3 bg-blue-200 rounded-full">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {GUEST_FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.id}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                  feature.available
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-200"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  feature.available
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-400"
                )}>
                  {feature.available ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Lock className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-body font-medium",
                    feature.available ? "text-green-800" : "text-gray-600"
                  )}>
                    {feature.title}
                  </p>
                  <p className={cn(
                    "text-body-sm",
                    feature.available ? "text-green-600" : "text-gray-500"
                  )}>
                    {feature.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        {onSignUp && (
          <div className="text-center">
            <Button onClick={onSignUp} size="lg" className="w-full min-h-touch">
              Sign Up to Unlock All Features
            </Button>
            <p className="text-body-sm text-blue-600 mt-apple-sm">
              Free to join • Get $10 free credit
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GuestProgressIndicator 