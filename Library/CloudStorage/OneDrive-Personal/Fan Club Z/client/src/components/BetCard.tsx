import React, { useState } from 'react'
import { Heart, MessageCircle, Share, Clock, TrendingUp, Users, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useBetStore } from '@/store/betStore'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatTimeRemaining, formatRelativeTime, cn } from '@/lib/utils'
import type { Bet, BetEntry } from '@shared/schema'

interface BetCardProps {
  bet: Bet
  variant?: 'vertical' | 'horizontal' | 'user-entry'
  userEntry?: BetEntry
  showActions?: boolean
  className?: string
}

export const BetCard: React.FC<BetCardProps> = ({
  bet,
  variant = 'vertical',
  userEntry,
  showActions = true,
  className,
}) => {
  const { user } = useAuthStore()
  const { placeBet, likeBet, commentOnBet, shareBet, isPlacingBet } = useBetStore()
  const { success, error } = useToast()
  
  const [showBetModal, setShowBetModal] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [betAmount, setBetAmount] = useState<string>('')
  const [isLiked, setIsLiked] = useState(false)

  const isExpired = new Date(bet.entryDeadline) <= new Date()
  const timeRemaining = formatTimeRemaining(bet.entryDeadline)
  const createdTime = formatRelativeTime(bet.createdAt)

  const handlePlaceBet = async () => {
    if (!user) {
      error('Please sign in to place a bet')
      return
    }

    if (!selectedOption || !betAmount) {
      error('Please select an option and enter amount')
      return
    }

    const amount = parseFloat(betAmount)
    if (isNaN(amount) || amount < bet.stakeMin || amount > bet.stakeMax) {
      error(`Amount must be between ${formatCurrency(bet.stakeMin)} and ${formatCurrency(bet.stakeMax)}`)
      return
    }

    try {
      await placeBet(bet.id, {
        optionId: selectedOption,
        amount,
      })
      
      success('Bet placed successfully!')
      setShowBetModal(false)
      setBetAmount('')
      setSelectedOption('')
    } catch (err: any) {
      error(err.message || 'Failed to place bet')
    }
  }

  const handleLike = async () => {
    if (!user) {
      error('Please sign in to like bets')
      return
    }

    try {
      await likeBet(bet.id)
      setIsLiked(!isLiked)
      success(isLiked ? 'Like removed' : 'Bet liked!')
    } catch (err: any) {
      error(err.message || 'Failed to like bet')
    }
  }

  const handleShare = async () => {
    try {
      await shareBet(bet.id)
      success('Bet shared!')
    } catch (err: any) {
      error(err.message || 'Failed to share bet')
    }
  }

  const getCategoryEmoji = (category: string) => {
    const emojis = {
      sports: '⚽',
      pop: '🎭',
      crypto: '₿',
      politics: '🏛️',
      custom: '🎯',
    }
    return emojis[category as keyof typeof emojis] || '🎯'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      closed: 'text-gray-600 bg-gray-50',
      settled: 'text-blue-600 bg-blue-50',
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  // User Entry variant - shows user's position
  if (variant === 'user-entry' && userEntry) {
    return (
      <Card className={cn("hover:shadow-md transition-shadow duration-200", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{getCategoryEmoji(bet.category)}</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(bet.status)
                )}>
                  {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                {bet.title}
              </h3>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* User's position */}
            <div className="bg-primary/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Your Position</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  userEntry.status === 'won' ? 'text-green-600 bg-green-50' :
                  userEntry.status === 'lost' ? 'text-red-600 bg-red-50' :
                  'text-blue-600 bg-blue-50'
                )}>
                  {userEntry.status.charAt(0).toUpperCase() + userEntry.status.slice(1)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Stake</p>
                  <p className="font-semibold">{formatCurrency(userEntry.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Potential Win</p>
                  <p className="font-semibold text-primary">{formatCurrency(userEntry.potentialWinnings)}</p>
                </div>
              </div>
            </div>

            {/* Time info */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{isExpired ? 'Ended' : timeRemaining}</span>
              </div>
              <span>{createdTime}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Horizontal variant - for discovery scrolling
  if (variant === 'horizontal') {
    return (
      <Card className={cn("w-64 flex-shrink-0 hover:shadow-md transition-shadow duration-200", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{getCategoryEmoji(bet.category)}</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(bet.status)
                )}>
                  {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                {bet.title}
              </h3>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Pool info */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="text-gray-500">Pool</p>
                <p className="font-semibold">{formatCurrency(bet.poolTotal)}</p>
              </div>
              <div className="text-sm text-right">
                <p className="text-gray-500">Range</p>
                <p className="font-semibold">{formatCurrency(bet.stakeMin)}-{formatCurrency(bet.stakeMax)}</p>
              </div>
            </div>

            {/* Quick bet button */}
            {!isExpired && showActions && (
              <Dialog open={showBetModal} onOpenChange={setShowBetModal}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="sm">
                    Quick Bet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Place Bet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Select Option</label>
                      <div className="space-y-2 mt-2">
                        {bet.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setSelectedOption(option.id)}
                            className={cn(
                              "w-full p-3 rounded-lg border text-left transition-colors",
                              selectedOption === option.id
                                ? "border-primary bg-primary/5"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-gray-500">
                              Pool: {formatCurrency(option.totalStaked)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Bet Amount</label>
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        placeholder={`Min: ${formatCurrency(bet.stakeMin)}`}
                        className="mt-2"
                      />
                    </div>
                    
                    <Button 
                      onClick={handlePlaceBet} 
                      disabled={isPlacingBet || !selectedOption || !betAmount}
                      className="w-full"
                    >
                      {isPlacingBet ? 'Placing Bet...' : 'Place Bet'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default vertical variant
  return (
    <Card className={cn("hover:shadow-md transition-shadow duration-200", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getCategoryEmoji(bet.category)}</span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                getStatusColor(bet.status)
              )}>
                {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
              </span>
              {bet.clubId && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                  Club
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 leading-tight mb-2">
              {bet.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {bet.description}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Options */}
          <div className="space-y-2">
            {bet.options.map((option) => {
              const percentage = bet.poolTotal > 0 ? (option.totalStaked / bet.poolTotal * 100) : 0
              return (
                <div key={option.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium">{option.label}</span>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{percentage.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">{formatCurrency(option.totalStaked)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <p className="font-semibold">{formatCurrency(bet.poolTotal)}</p>
              <p className="text-gray-500 text-xs">Pool</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <p className="font-semibold">
                {bet.options.reduce((sum, opt) => sum + opt.totalStaked, 0) > 0 ? '12' : '0'}
              </p>
              <p className="text-gray-500 text-xs">Players</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <p className="font-semibold text-xs">{isExpired ? 'Ended' : timeRemaining}</p>
              <p className="text-gray-500 text-xs">Time</p>
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center space-x-1 text-sm transition-colors",
                    isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  <span>{bet.likes}</span>
                </button>
                
                <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  <span>{bet.comments}</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-1 text-sm text-gray-500 hover:text-green-500 transition-colors"
                >
                  <Share className="w-4 h-4" />
                  <span>{bet.shares}</span>
                </button>
              </div>

              {!isExpired && user && (
                <Dialog open={showBetModal} onOpenChange={setShowBetModal}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      Place Bet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Place Bet: {bet.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Select Option</label>
                        <div className="space-y-2 mt-2">
                          {bet.options.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => setSelectedOption(option.id)}
                              className={cn(
                                "w-full p-3 rounded-lg border text-left transition-colors",
                                selectedOption === option.id
                                  ? "border-primary bg-primary/5"
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-gray-500">
                                Pool: {formatCurrency(option.totalStaked)}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Bet Amount</label>
                        <Input
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          placeholder={`${formatCurrency(bet.stakeMin)} - ${formatCurrency(bet.stakeMax)}`}
                          className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Range: {formatCurrency(bet.stakeMin)} - {formatCurrency(bet.stakeMax)}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handlePlaceBet} 
                        disabled={isPlacingBet || !selectedOption || !betAmount}
                        className="w-full"
                      >
                        {isPlacingBet ? 'Placing Bet...' : 'Place Bet'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default BetCard
