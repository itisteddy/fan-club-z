import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Check, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Tag, 
  CheckCircle,
  X,
  Users,
  Lock,
  Globe
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../hooks/use-toast'
import { cn } from '../../lib/utils'
import type { Club } from '@shared/schema'

interface ClubBetModalProps {
  club: Club
  isOpen: boolean
  onClose: () => void
  onBetCreated?: (bet: any) => void
}

export const ClubBetModal: React.FC<ClubBetModalProps> = ({
  club,
  isOpen,
  onClose,
  onBetCreated
}) => {
  const { user, isAuthenticated } = useAuthStore()
  const { toast } = useToast()
  
  const [betType, setBetType] = useState<'binary' | 'multi' | 'pool'>('binary')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(club.category || 'sports')
  const [deadline, setDeadline] = useState('')
  const [minStake, setMinStake] = useState('1')
  const [maxStake, setMaxStake] = useState('100')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isFormValid, setIsFormValid] = useState(false)
  const [isClubOnly, setIsClubOnly] = useState(true)

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

  // Set default deadline (7 days from now)
  useEffect(() => {
    if (isOpen && !deadline) {
      const defaultDeadline = new Date()
      defaultDeadline.setDate(defaultDeadline.getDate() + 7)
      setDeadline(defaultDeadline.toISOString().slice(0, 16))
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBetType('binary')
      setTitle('')
      setDescription('')
      setCategory(club.category || 'sports')
      setDeadline('')
      setMinStake('1')
      setMaxStake('100')
      setErrors({})
      setIsClubOnly(true)
      setIsSubmitting(false)
    }
  }, [isOpen, club.category])

  const createClubBet = async (betData: any) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      throw new Error('No authentication token found')
    }

    console.log('🚀 ClubBetModal: Creating club bet with data:', betData)

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(betData)
    })

    console.log('🌐 ClubBetModal: API response status:', response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ ClubBetModal: API error:', errorData)
      throw new Error(errorData.error || `Failed to create club bet (${response.status})`)
    }

    const result = await response.json()
    console.log('✅ ClubBetModal: Club bet created successfully:', result)
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📝 ClubBetModal: Form submission started')
    
    if (!user || !isAuthenticated) {
      console.log('❌ ClubBetModal: User not authenticated during submit')
      toast({
        title: "Authentication Required",
        description: "Please log in to create a bet"
      })
      return
    }

    if (!validateForm()) {
      console.log('❌ ClubBetModal: Form validation failed', errors)
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
        isPrivate: isClubOnly,
        clubId: club.id // Associate with the club
      }

      const result = await createClubBet(betData)

      toast({
        title: "Club Bet Created!",
        description: `Your bet "${title}" is now live in ${club.name}.`
      })

      // Call success callback
      onBetCreated?.(result.data?.bet)

      // Close modal
      onClose()

    } catch (error: any) {
      console.error('❌ ClubBetModal: Error creating club bet:', error)
      toast({
        title: "Error Creating Bet",
        description: error.message || "Failed to create club bet. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryEmoji = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId)
    return cat?.emoji || '🎯'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getCategoryEmoji(club.category)}</span>
              <span>Create Bet in {club.name}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Club Context Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{club.name}</h3>
              <p className="text-sm text-gray-600">{club.memberCount || 0} members • {club.activeBets || 0} active bets</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bet Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              <Tag className="w-4 h-4 inline mr-1" />
              Bet Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setBetType('binary')}
                className={cn(
                  "p-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation",
                  betType === 'binary'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Yes/No
              </button>
              <button
                type="button"
                onClick={() => setBetType('multi')}
                className={cn(
                  "p-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation",
                  betType === 'multi'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => setBetType('pool')}
                className={cn(
                  "p-3 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 touch-manipulation",
                  betType === 'pool'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                Pool
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Bet Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are club members betting on?"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errors.title}
              </p>
            )}
            <p className="text-gray-400 text-xs mt-1">
              {title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about your club bet..."
              rows={3}
            />
            <p className="text-gray-400 text-xs mt-1">
              Optional - helps club members understand your bet better
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "p-3 rounded-lg text-left transition-all duration-200 active:scale-95 touch-manipulation",
                    category === cat.id
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg flex-shrink-0">{cat.emoji}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Bet Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsClubOnly(true)}
                className={cn(
                  "p-3 rounded-lg text-left transition-all duration-200 active:scale-95 touch-manipulation",
                  isClubOnly
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Lock className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Club Only</p>
                    <p className="text-xs opacity-75">Only club members can participate</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setIsClubOnly(false)}
                className={cn(
                  "p-3 rounded-lg text-left transition-all duration-200 active:scale-95 touch-manipulation",
                  !isClubOnly
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Public</p>
                    <p className="text-xs opacity-75">Anyone can discover and join</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Entry Deadline *
            </label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={errors.deadline ? 'border-red-500' : ''}
            />
            {errors.deadline && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {errors.deadline}
              </p>
            )}
          </div>

          {/* Stake Limits */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Min Stake ($)
              </label>
              <Input
                type="number"
                value={minStake}
                onChange={(e) => setMinStake(e.target.value)}
                min="1"
                className={errors.minStake ? 'border-red-500' : ''}
              />
              {errors.minStake && (
                <p className="text-red-500 text-xs mt-1">{errors.minStake}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Max Stake ($)
              </label>
              <Input
                type="number"
                value={maxStake}
                onChange={(e) => setMaxStake(e.target.value)}
                min="1"
                className={errors.maxStake ? 'border-red-500' : ''}
              />
              {errors.maxStake && (
                <p className="text-red-500 text-xs mt-1">{errors.maxStake}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={cn(
                "flex-1 transition-all duration-200 active:scale-95",
                isFormValid && !isSubmitting
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              )}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Club Bet
                </>
              )}
            </Button>
          </div>
          
          {!isFormValid && !isSubmitting && (
            <p className="text-gray-500 text-xs text-center">
              Please fill in all required fields to continue
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ClubBetModal