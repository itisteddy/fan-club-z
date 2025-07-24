import React, { useState, useEffect } from 'react'
import { Plus, ArrowLeft, Check, AlertCircle, Calendar, DollarSign, Tag, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { useLocation } from 'wouter'
import { cn } from '@/lib/utils'

export const CreateBetTab: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  const [, navigate] = useLocation()
  
  const [betType, setBetType] = useState<'binary' | 'multi' | 'pool'>('binary')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('sports')
  const [deadline, setDeadline] = useState('')
  const [minStake, setMinStake] = useState('1')
  const [maxStake, setMaxStake] = useState('100')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [showTips, setShowTips] = useState(true)

  const categories = [
    { id: 'sports', label: 'Sports', emoji: '⚽' },
    { id: 'pop', label: 'Pop Culture', emoji: '🎭' },
    { id: 'crypto', label: 'Crypto', emoji: '₿' },
    { id: 'politics', label: 'Politics', emoji: '🏛️' },
    { id: 'custom', label: 'Custom', emoji: '🎯' },
  ]

  // Form validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!title.trim()) {
      newErrors.title = 'Bet title is required'
    } else if (title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters'
    } else if (title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters'
    }
    
    if (!deadline) {
      newErrors.deadline = 'Entry deadline is required'
    } else {
      const deadlineDate = new Date(deadline)
      const now = new Date()
      if (deadlineDate <= now) {
        newErrors.deadline = 'Deadline must be in the future'
      }
    }
    
    const minStakeNum = parseInt(minStake)
    const maxStakeNum = parseInt(maxStake)
    
    if (minStakeNum < 1) {
      newErrors.minStake = 'Minimum stake must be at least $1'
    }
    
    if (maxStakeNum < minStakeNum) {
      newErrors.maxStake = 'Maximum stake must be greater than minimum stake'
    }
    
    if (maxStakeNum > 10000) {
      newErrors.maxStake = 'Maximum stake cannot exceed $10,000'
    }
    
    setErrors(newErrors)
    const isValid = Object.keys(newErrors).length === 0
    setIsFormValid(isValid)
    return isValid
  }

  // Validate form on field changes
  useEffect(() => {
    validateForm()
  }, [title, deadline, minStake, maxStake])

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a bet"
      })
      navigate('/auth/login')
    }
  }, [isAuthenticated, user, navigate, toast])

  const createBet = async (betData: any) => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('No authentication token found')
    }

    try {
      // Use the frontend proxy instead of direct backend calls
      // Frontend proxy will handle: /api -> http://localhost:3001/api
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(betData)
      })

      // Handle network errors or no response
      if (!response) {
        throw new Error('Network error - no response received')
      }

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `Failed to create bet (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (parseError) {
          // Silently handle parse errors
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result
      
    } catch (fetchError: any) {
      // Handle specific network errors
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your connection and try again.')
      }
      
      // Handle blocked requests (ad blockers, etc.)
      if (fetchError.message.includes('blocked') || fetchError.message.includes('ERR_BLOCKED')) {
        throw new Error('Request was blocked. Please disable ad blockers and try again.')
      }
      
      // Re-throw the original error if it has a message
      if (fetchError.message) {
        throw fetchError
      }
      
      // Fallback error
      throw new Error('Failed to create bet. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a bet"
      })
      navigate('/auth/login')
      return
    }

    if (!validateForm()) {
      toast({
        title: "Form Validation Error",
        description: "Please fix the errors and try again"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare bet options based on type
      let options: Array<{ label: string }> = []
      if (betType === 'binary') {
        options = [
          { label: 'Yes' },
          { label: 'No' }
        ]
      } else if (betType === 'multi') {
        // For now, use default options - could be enhanced with dynamic option input
        options = [
          { label: 'Option A' },
          { label: 'Option B' },
          { label: 'Option C' }
        ]
      } else if (betType === 'pool') {
        options = [
          { label: 'Pool Entry' }
        ]
      }

      const betData = {
        title: title.trim(),
        description: description.trim(),
        type: betType,
        category,
        options,
        stakeMin: parseInt(minStake),
        stakeMax: parseInt(maxStake),
        entryDeadline: deadline,
        settlementMethod: 'manual' as const,
        isPrivate: false
      }

      const result = await createBet(betData)

      toast({
        title: "Bet Created Successfully!",
        description: "Your bet is now live and people can start betting."
      })

      // Refresh the bet store to include the newly created bet
      try {
        const { useBetStore } = await import('@/store/betStore')
        const betStore = useBetStore.getState()
        await betStore.fetchTrendingBets()
      } catch (refreshError) {
        console.warn('Failed to refresh trending bets:', refreshError)
      }

      // Navigate to the new bet detail page
      if (result.success && result.data?.bet?.id) {
        navigate(`/bets/${result.data.bet.id}`)
      } else {
        navigate('/discover')
      }

    } catch (error: any) {
      // Provide user-friendly error messages
      let errorMessage = 'Failed to create bet. Please try again.'
      
      if (error.message) {
        if (error.message.includes('Network connection failed')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection.'
        } else if (error.message.includes('blocked')) {
          errorMessage = 'Request was blocked. Please disable ad blockers and try again.'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Authentication failed. Please log out and log back in.'
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'You do not have permission to create bets.'
        } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
          errorMessage = 'Invalid bet data. Please check your inputs and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      toast({
        title: "Error Creating Bet",
        description: errorMessage
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Set a default deadline (7 days from now)
  useEffect(() => {
    if (!deadline) {
      const defaultDeadline = new Date()
      defaultDeadline.setDate(defaultDeadline.getDate() + 7)
      setDeadline(defaultDeadline.toISOString().slice(0, 16))
    }
  }, [])

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-title-2 font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-body text-gray-600 mb-6">Please log in to create a bet</p>
          <Button onClick={() => navigate('/auth/login')} className="bg-blue-500 text-white">
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/discover')}
                className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-display font-bold" data-testid="create-bet-header">Create Bet</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24">
        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Plus className="w-5 h-5 mr-2 text-blue-500" />
              <h2 className="text-title-2 font-semibold text-gray-900">New Bet Details</h2>
            </div>
            {isFormValid && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-bet-form">
            {/* Bet Type */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-3 block">
                <Tag className="w-4 h-4 inline mr-1" />
                Bet Type
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setBetType('binary')}
                  className={cn(
                    "p-2 sm:p-3 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]",
                    betType === 'binary'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  )}
                  data-testid="bet-type-binary"
                >
                  Yes/No
                </button>
                <button
                  type="button"
                  onClick={() => setBetType('multi')}
                  className={cn(
                    "p-2 sm:p-3 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]",
                    betType === 'multi'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  )}
                  data-testid="bet-type-multi"
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => setBetType('pool')}
                  className={cn(
                    "p-2 sm:p-3 rounded-[10px] text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px]",
                    betType === 'pool'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  )}
                  data-testid="bet-type-pool"
                >
                  Pool
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-2 block">
                Bet Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are people betting on?"
                required
                data-testid="bet-title-input"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-caption-1 mt-1 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.title}
                </p>
              )}
              <p className="text-gray-400 text-caption-1 mt-1">
                {title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-2 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about your bet..."
                className="w-full p-4 bg-gray-100 rounded-[10px] text-body focus:bg-gray-200 transition-colors resize-none"
                rows={3}
                data-testid="bet-description-input"
              />
              <p className="text-gray-400 text-caption-1 mt-1">
                Optional - helps users understand your bet better
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-3 block">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "p-3 sm:p-4 rounded-[10px] text-left transition-all duration-200 active:scale-95 touch-manipulation min-h-[56px]",
                      category === cat.id
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                    )}
                    data-testid={`category-${cat.id}`}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className="text-lg sm:text-xl flex-shrink-0">{cat.emoji}</span>
                      <span className="text-sm sm:text-base font-medium leading-tight">{cat.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-2 block">
                <Calendar className="w-4 h-4 inline mr-1" />
                Entry Deadline *
              </label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                data-testid="bet-deadline-input"
                className={errors.deadline ? 'border-red-500' : ''}
              />
              {errors.deadline && (
                <p className="text-red-500 text-caption-1 mt-1 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.deadline}
                </p>
              )}
            </div>

            {/* Stake Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-body-sm font-medium text-gray-600 mb-2 block">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Min Stake ($)
                </label>
                <Input
                  type="number"
                  value={minStake}
                  onChange={(e) => setMinStake(e.target.value)}
                  min="1"
                  data-testid="bet-min-stake-input"
                  className={errors.minStake ? 'border-red-500' : ''}
                />
                {errors.minStake && (
                  <p className="text-red-500 text-caption-2 mt-1">{errors.minStake}</p>
                )}
              </div>
              <div>
                <label className="text-body-sm font-medium text-gray-600 mb-2 block">
                  Max Stake ($)
                </label>
                <Input
                  type="number"
                  value={maxStake}
                  onChange={(e) => setMaxStake(e.target.value)}
                  min="1"
                  data-testid="bet-max-stake-input"
                  className={errors.maxStake ? 'border-red-500' : ''}
                />
                {errors.maxStake && (
                  <p className="text-red-500 text-caption-2 mt-1">{errors.maxStake}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className={cn(
                "w-full h-12 transition-all duration-200 active:scale-95",
                isFormValid && !isSubmitting
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
              disabled={!isFormValid || isSubmitting}
              data-testid="create-bet-submit"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating Bet...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Bet
                </>
              )}
            </Button>
            
            {!isFormValid && (
              <p className="text-gray-500 text-caption-1 text-center">
                Please fill in all required fields to continue
              </p>
            )}
          </form>
        </div>

        {/* Tips */}
        {showTips && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title-3 font-semibold text-gray-900">💡 Tips for Great Bets</h3>
              <button
                onClick={() => setShowTips(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Hide tips"
              >
                ×
              </button>
            </div>
            <ul className="space-y-3 text-body-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">•</span>
                Make your question clear and specific
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">•</span>
                Set a reasonable deadline for entries
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">•</span>
                Choose appropriate stake limits
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">•</span>
                Provide enough context in the description
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2 font-bold">•</span>
                Pick the right category for better discovery
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateBetTab