import React, { useState } from 'react'
import { Lock, Gift, TrendingUp, Users, Eye, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocation } from 'wouter'
import { cn } from '@/lib/utils'

interface AuthPromptProps {
  isOpen: boolean
  onClose: () => void
  context?: {
    action?: 'place_bet' | 'save_bet' | 'join_club' | 'view_analytics' | 'general' | 'create_bet' | 'view_bets' | 'view_wallet' | 'sign_in'
    betTitle?: string
    potentialReturn?: string
    incentive?: string
  }
  trigger?: 'action' | 'time' | 'view_threshold' | 'return_visitor'
}

export const AuthPrompt: React.FC<AuthPromptProps> = ({
  isOpen,
  onClose,
  context = { action: 'general' },
  trigger = 'action'
}) => {
  const [, setLocation] = useLocation()
  const [showIncentive, setShowIncentive] = useState(trigger === 'time' || trigger === 'return_visitor')

  const handleSignUp = () => {
    // Save the intended action in localStorage for post-auth redirect
    if (context.action && context.action !== 'general') {
      localStorage.setItem('pending_action', JSON.stringify(context))
    }
    
    onClose()
    setLocation('/auth/register')
  }

  const handleSignIn = () => {
    // Save the intended action in localStorage for post-auth redirect  
    if (context.action && context.action !== 'general') {
      localStorage.setItem('pending_action', JSON.stringify(context))
    }
    
    onClose()
    setLocation('/auth/login')
  }

  const getContextContent = () => {
    switch (context.action) {
      case 'place_bet':
        return {
          icon: <TrendingUp className="w-8 h-8 text-primary" />,
          title: 'Join the Action!',
          subtitle: context.betTitle || 'Ready to place your bet?',
          description: context.potentialReturn 
            ? `Potential return: ${context.potentialReturn}` 
            : 'Join thousands of users making predictions',
          cta: 'Sign Up to Bet'
        }
      case 'save_bet':
        return {
          icon: <Eye className="w-8 h-8 text-blue-500" />,
          title: 'Save Your Favorites',
          subtitle: 'Never miss an interesting bet',
          description: 'Keep track of bets you want to follow and get notifications',
          cta: 'Sign Up to Save'
        }
      case 'join_club':
        return {
          icon: <Users className="w-8 h-8 text-purple-500" />,
          title: 'Join the Community',
          subtitle: 'Connect with fellow predictors',
          description: 'Access exclusive clubs and compete with friends',
          cta: 'Sign Up to Join'
        }
      case 'view_analytics':
        return {
          icon: <Lock className="w-8 h-8 text-amber-500" />,
          title: 'Unlock Analytics',
          subtitle: 'See detailed insights and trends',
          description: 'Access odds history, leaderboards, and advanced stats',
          cta: 'Sign Up for Analytics'
        }
      case 'view_bets':
        return {
          icon: <TrendingUp className="w-8 h-8 text-primary" />,
          title: 'Track Your Bets',
          subtitle: 'Monitor your predictions',
          description: 'View your betting history, track winnings, and manage active bets',
          cta: 'Sign Up to Track'
        }
      case 'view_wallet':
        return {
          icon: <Lock className="w-8 h-8 text-green-500" />,
          title: 'Access Your Wallet',
          subtitle: 'Manage your funds',
          description: 'Deposit, withdraw, and track your betting balance',
          cta: 'Sign Up for Wallet'
        }
      case 'sign_in':
        return {
          icon: <Lock className="w-8 h-8 text-primary" />,
          title: 'Sign In Required',
          subtitle: 'Access your account',
          description: 'Sign in to access your profile and account settings',
          cta: 'Sign In'
        }
      default:
        return {
          icon: <Gift className="w-8 h-8 text-primary" />,
          title: 'Welcome to Fan Club Z!',
          subtitle: 'Join the prediction community',
          description: 'Make predictions, win rewards, and compete with friends',
          cta: 'Get Started'
        }
    }
  }

  const content = getContextContent()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto p-0 bg-transparent border-none shadow-none">
        <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary to-primary-600 p-6 text-center text-white">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors min-h-touch min-w-touch flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-3">
              {content.icon}
            </div>
            
            <h2 className="text-xl font-bold mb-2">
              {content.title}
            </h2>
            
            <p className="text-primary-100">
              {content.subtitle}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              {content.description}
            </p>

            {/* Welcome Bonus for time-based triggers */}
            {showIncentive && (
              <Card className="bg-amber-50 border-amber-200 mb-6">
                <CardContent className="p-4 text-center">
                  <Gift className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-amber-800 mb-1">
                    Welcome Bonus!
                  </h3>
                  <p className="text-sm text-amber-700">
                    {context.incentive || 'Get $10 free betting credit when you sign up now'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">Free to join and start betting</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">Compete with friends and community</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-gray-700">Real rewards for accurate predictions</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                onClick={handleSignUp}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {content.cta}
              </Button>
              
              <Button 
                onClick={handleSignIn}
                variant="outline"
                className="w-full h-10"
              >
                Already have an account? Sign in
              </Button>
            </div>

            {/* Social proof */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Join 10,000+ users making predictions
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage auth prompts
export const useAuthPrompt = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<AuthPromptProps['context']>()
  const [trigger, setTrigger] = useState<AuthPromptProps['trigger']>('action')

  const showAuthPrompt = (
    newContext?: AuthPromptProps['context'], 
    newTrigger: AuthPromptProps['trigger'] = 'action'
  ) => {
    setContext(newContext)
    setTrigger(newTrigger)
    setIsOpen(true)
  }

  const hideAuthPrompt = () => {
    setIsOpen(false)
    setContext(undefined)
  }

  return {
    isOpen,
    context,
    trigger,
    showAuthPrompt,
    hideAuthPrompt
  }
}

export default AuthPrompt