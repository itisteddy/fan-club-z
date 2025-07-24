import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useParams } from 'wouter'
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share, 
  Clock, 
  TrendingUp, 
  Users,
  MoreHorizontal,
  Flag,
  Share2,
  Copy,
  Info,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/authStore'
import { useBetStore } from '@/store/betStore'
import { getUserBetEntry } from '@/store/betStore'
import { formatCurrency, formatTimeRemaining, formatRelativeTime, cn } from '@/lib/utils'
import BottomNavigation from '@/components/BottomNavigation'
import BetComments from '@/components/bets/BetComments'

interface BetDetailPageProps {
  betId: string
}

// Map mockComments to expected format for state
const normalizeComment = (c: any) => ({
  id: c.id,
  user: {
    name: c.author ? c.author.firstName : 'Unknown',
    avatar: c.author && c.author.profileImage ? c.author.profileImage : null
  },
  text: c.content,
  time: c.createdAt ? new Date(c.createdAt).toLocaleString() : ''
})

type ShareModalProps = { open: boolean, onClose: () => void, link: string }

export const BetDetailPage: React.FC<BetDetailPageProps & { referrer?: string }> = ({ betId, referrer: propReferrer }) => {
  const [location, setLocation] = useLocation()
  const { user } = useAuthStore()
  const { trendingBets, fetchUserBets, fetchUserBetEntries, commentOnBet, fetchTrendingBets, fetchBetById, placeBet } = useBetStore()
  
  // UI State - NO hardcoded values, all derived from data
  const [activeTab, setActiveTab] = useState('details')
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)
  const [selectedOption, setSelectedOption] = useState('')
  const [stake, setStake] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [isPlacingBet, setIsPlacingBet] = useState(false)
  
  // Dynamic state derived from bet data
  const [pool, setPool] = useState(0)
  const [participants, setParticipants] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  
  // Modal states
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [userBetEntry, setUserBetEntry] = useState<any>(null)
  const [isFetchingBet, setIsFetchingBet] = useState(false)

  // Parse referrer from query string if not provided as prop
  const referrer = useMemo(() => {
    if (propReferrer) return propReferrer
    try {
      const url = new URL(window.location.href)
      return url.searchParams.get('referrer') || undefined
    } catch {
      return undefined
    }
  }, [propReferrer])

  // Data validation helper
  const validateBetData = (betData: any): boolean => {
    if (!betData) return false
    if (!betData.id || !betData.title || !betData.options) return false
    if (!Array.isArray(betData.options) || betData.options.length === 0) return false
    if (!betData.options.every((opt: any) => opt.id && opt.label)) return false
    return true
  }

  // Get bet with comprehensive fallback and validation
  const bet = useMemo(() => {
    // First try to find in trending bets (real data)
    const foundBet = trendingBets.find(b => b.id === betId)
    
    if (foundBet && validateBetData(foundBet)) {
      return foundBet
    }
    
    // Fallback to mock data only if no real data is available
    if (trendingBets.length === 0) {
      // Use consistent mock data that matches the setup-demo-data.js
      const mockTrendingBets = [
        {
          id: 'ee9fdff7-2817-43f4-b862-5f1d17a41534',
          creatorId: 'user1',
          title: 'Will Bitcoin reach $100K by end of 2025?',
          description: 'Bitcoin has been on a bull run. Will it hit the magical 100K mark by December 31st, 2025?',
          type: 'binary',
          category: 'crypto',
          options: [
            { id: 'yes', label: 'Yes', totalStaked: 15000 },
            { id: 'no', label: 'No', totalStaked: 8500 }
          ],
          status: 'open',
          stakeMin: 10,
          stakeMax: 1000,
          poolTotal: 23500,
          entryDeadline: '2025-12-31T23:59:59Z',
          settlementMethod: 'auto',
          isPrivate: false,
          likes: 234,
          comments: 67,
          shares: 89,
          createdAt: '2025-07-01T10:30:00Z',
          updatedAt: '2025-07-04T15:45:00Z'
        },
        {
          id: 'fa7e0caf-d615-4bd3-bac9-86142110044ff',
          creatorId: 'user2', 
          title: 'Premier League: Man City vs Arsenal - Who wins?',
          description: 'The title race is heating up! City and Arsenal face off in what could be the decisive match.',
          type: 'multi',
          category: 'sports',
          options: [
            { id: 'city', label: 'Man City', totalStaked: 12000 },
            { id: 'arsenal', label: 'Arsenal', totalStaked: 9000 },
            { id: 'draw', label: 'Draw', totalStaked: 4000 }
          ],
          status: 'open',
          stakeMin: 5,
          stakeMax: 500,
          poolTotal: 25000,
          entryDeadline: '2025-07-30T14:00:00Z',
          settlementMethod: 'auto',
          isPrivate: false,
          likes: 445,
          comments: 123,
          shares: 67,
          createdAt: '2025-07-02T09:15:00Z',
          updatedAt: '2025-07-04T16:20:00Z'
        }
      ]
      
      const mockBetMatch = mockTrendingBets.find(b => b.id === betId)
      if (mockBetMatch && validateBetData(mockBetMatch)) {
        return mockBetMatch
      }
    }
    
    return null
  }, [betId, trendingBets])

  // Fetch bet data: first try store, then individual fetch
  useEffect(() => {
    const loadBet = async () => {
      // First check if bet exists in store
      const existingBet = trendingBets.find(b => b.id === betId)
      if (existingBet && validateBetData(existingBet)) {
        return // Bet already loaded
      }
      
      // If not in store, try to fetch individually
      setIsFetchingBet(true)
      try {
        await fetchBetById(betId)
      } catch (error) {
        console.error('Failed to fetch bet:', error)
      } finally {
        setIsFetchingBet(false)
      }
    }
    
    loadBet()
  }, [betId, trendingBets, fetchBetById])

  // Also fetch trending bets if store is empty (for general app state)
  useEffect(() => {
    if (trendingBets.length === 0) {
      fetchTrendingBets()
    }
  }, [trendingBets.length, fetchTrendingBets])

  // Set default selected option when bet data loads
  useEffect(() => {
    if (bet && bet.options && bet.options.length > 0 && !selectedOption) {
      setSelectedOption(bet.options[0].id)
    }
  }, [bet, selectedOption])

  // Synchronize all state with bet data to prevent mismatches
  useEffect(() => {
    if (bet && validateBetData(bet)) {
      // Update derived state from bet data
      setPool(bet.poolTotal || 0)
      setParticipants(bet.memberCount || 0)
      setLikeCount(bet.likes || 0)
      
      // Reset selection if current selection is invalid for this bet
      if (selectedOption && !bet.options.some(opt => opt.id === selectedOption)) {
        setSelectedOption(bet.options[0].id)
      }
    }
  }, [bet, selectedOption])

  // Fetch comments from backend
  useEffect(() => {
    if (!bet || !user) return
    
    setLoadingComments(true)
    fetch(`/api/bets/${bet.id}/comments`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(async data => {
        if (data.success && Array.isArray(data.data?.comments)) {
          // Map backend comment format to frontend format
          const mappedComments = await Promise.all(
            data.data.comments.map(async (comment: any) => {
              // Fetch user info for each comment
              let userInfo = { name: 'Unknown User', avatar: null }
              try {
                const userRes = await fetch(`/api/user/${comment.authorId}`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                })
                if (userRes.ok) {
                  const userData = await userRes.json()
                  if (userData.success && userData.data?.user) {
                    userInfo = {
                      name: `${userData.data.user.firstName} ${userData.data.user.lastName}`,
                      avatar: userData.data.user.profileImage
                    }
                  }
                }
              } catch (err) {
                // Silently handle error
              }
              
              return {
                id: comment.id,
                user: userInfo,
                text: comment.content,
                time: new Date(comment.createdAt).toLocaleString()
              }
            })
          )
          setComments(mappedComments)
        } else {
          setComments([])
        }
        setLoadingComments(false)
      })
      .catch(err => {
        setCommentsError('Failed to load comments')
        setLoadingComments(false)
        setComments([])
      })
  }, [betId, user, bet])

  // Determine if user has an entry in this bet and initialize like state
  useEffect(() => {
    if (user && bet) {
      // Fetch user bet entries
      fetchUserBetEntries(user.id).then(() => {
        const entry = getUserBetEntry(
          typeof useBetStore.getState === 'function' ? useBetStore.getState().userBetEntries : [],
          bet.id
        )
        setUserBetEntry(entry)
      })
      
      // Also refresh wallet data when viewing a bet
      const refreshWalletData = async () => {
        try {
          const { useWalletStore } = await import('@/store/walletStore')
          const walletStore = useWalletStore.getState()
          await walletStore.refreshBalance(user.id)
        } catch (error) {
          // Silently handle wallet refresh errors
        }
      }
      refreshWalletData()
    }
  }, [user, bet, fetchUserBetEntries])

  // Guard: Show loading state while fetching bet
  if (isFetchingBet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Bet...</h2>
          <p className="text-gray-600">Fetching bet details</p>
        </div>
      </div>
    )
  }

  // Guard: If bet is not found after trying to fetch, show error message
  if (!bet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Bet Not Found</h2>
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
            <p className="text-gray-600 mb-4">
              The bet you are looking for does not exist or could not be loaded.
            </p>
            <div className="text-sm text-gray-400 mb-4 space-y-1">
              <p><strong>Bet ID:</strong> {betId}</p>
              <p><strong>Available Bets:</strong> {trendingBets.length}</p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation('/discover')} 
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                Back to Discover
              </Button>
              <Button 
                onClick={async () => {
                  setIsFetchingBet(true)
                  try {
                    await fetchBetById(betId)
                  } finally {
                    setIsFetchingBet(false)
                  }
                }} 
                variant="outline" 
                className="w-full"
              >
                Retry Loading
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Validate bet data integrity before rendering
  if (!validateBetData(bet)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Bet Data</h2>
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
            <p className="text-gray-600 mb-4">
              The bet data is corrupted or incomplete.
            </p>
            <div className="text-sm text-gray-400 mb-4">
              <p><strong>Bet ID:</strong> {betId}</p>
              <p><strong>Issues:</strong> Missing required fields</p>
            </div>
            <Button onClick={() => setLocation('/discover')} className="w-full">
              Back to Discover
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // After this point, bet is guaranteed to be defined
  const isExpired = new Date(bet!.entryDeadline) <= new Date()
  const timeRemaining = formatTimeRemaining(bet!.entryDeadline)

  const handleBack = () => {
    if (referrer) {
      setLocation(referrer)
    } else {
    setLocation('/discover')
    }
  }

  const handleLike = async () => {
    if (!user) {
      setLocation('/auth/login')
      return
    }
    
    // Real user: persist to backend with better error handling
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('accessToken')
      const response = await fetch(`/api/bets/${bet!.id}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'like' })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setIsLiked(!isLiked)
          setLikeCount(likeCount + (isLiked ? -1 : 1))
        }
      }
    } catch (err) {
      // Silently handle like errors
    }
  }

  const handleComment = () => {
    if (commentText.trim()) {
      setCommentText('')
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: bet!.title,
        text: bet!.description,
        url: window.location.href
      })
    } else {
      setShowShareModal(true)
    }
  }

  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stake || !selectedOption) return
    setIsPlacingBet(true)
    try {
      await placeBetAndRefresh()
    } catch (err) {
      setIsPlacingBet(false)
    }
  }

  const placeBetAndRefresh = async () => {
    if (!user) {
      return
    }

    // Comprehensive data validation before placing bet
    if (!bet || !validateBetData(bet)) {
      alert('Error: Invalid bet data. Please refresh the page and try again.')
      return
    }

    if (!selectedOption) {
      alert('Please select an option before placing your bet.')
      return
    }

    // Validate that selected option exists in this bet
    const validOption = bet.options.find(opt => opt.id === selectedOption)
    if (!validOption) {
      alert('Error: Invalid option selected. Please refresh the page and try again.')
      return
    }

    const amount = Number(stake)
    if (!amount || amount <= 0) {
      alert('Please enter a valid bet amount.')
      return
    }

    // Validate amount is within bet limits
    if (bet.stakeMin && amount < bet.stakeMin) {
      alert(`Minimum bet amount is ${bet.stakeMin}`)
      return
    }

    if (bet.stakeMax && amount > bet.stakeMax) {
      alert(`Maximum bet amount is ${bet.stakeMax}`)
      return
    }

    try {
      // Use the bet store's placeBet method for real users
      const betEntry = await placeBet(bet.id, {
        optionId: selectedOption,
        amount
      })
      
      setIsPlacingBet(false)
      setShowConfirmation(true)
      setPool(pool + amount)
      setParticipants(participants + 1)
      setStake('')
      
      // Force refresh user bet entries to update My Bets
      await fetchUserBetEntries(user.id)
      
      // Also refresh wallet to update balance display
      const { useWalletStore } = await import('@/store/walletStore')
      const walletStore = useWalletStore.getState()
      await walletStore.refreshBalance(user.id)
      await walletStore.fetchTransactions(user.id)
      
    } catch (err: any) {
      setIsPlacingBet(false)
      
      // Show user-friendly error message
      const errorMessage = err.message || 'Failed to place bet. Please try again.'
      alert(`Bet placement failed: ${errorMessage}`)
    }
  }

  const handleAddComment = async (commentText: string) => {
    // Early return for unauthenticated users
    if (!user) {
      setLocation('/auth/login')
      return
    }
    
    // Real user: improved API call with better error handling
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('accessToken')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await fetch(`/api/bets/${bet!.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: commentText })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh comments list
        await fetchCommentsFromAPI()
      } else {
        throw new Error(data.error || 'Failed to post comment')
      }
    } catch (err: any) {
      setCommentsError(`Failed to post comment: ${err.message}`)
      
      // Show user-friendly error message
      alert(`Could not post comment: ${err.message}. Please try again.`)
    }
  }

  // Helper function to fetch comments
  const fetchCommentsFromAPI = async () => {
    if (!bet || !user) return
    
    try {
      setLoadingComments(true)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('accessToken')
      
      const response = await fetch(`/api/bets/${bet.id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.data?.comments)) {
          // Process comments with user info
          const processedComments = await Promise.all(
            data.data.comments.map(async (comment: any) => {
              let userInfo = { name: 'Unknown User', avatar: null, id: comment.authorId }
              
              try {
                const userResponse = await fetch(`/api/users/${comment.authorId}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                })
                
                if (userResponse.ok) {
                  const userData = await userResponse.json()
                  if (userData.success && userData.data?.user) {
                    userInfo = {
                      name: `${userData.data.user.firstName} ${userData.data.user.lastName}`,
                      avatar: userData.data.user.profileImage,
                      id: userData.data.user.id
                    }
                  }
                }
              } catch (userErr) {
                // Silently handle user fetch errors
              }
              
              return {
                id: comment.id,
                user: userInfo,
                text: comment.content,
                time: new Date(comment.createdAt).toLocaleString()
              }
            })
          )
          
          setComments(processedComments)
          setCommentsError(null)
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (err: any) {
      setCommentsError('Failed to load comments')
    } finally {
      setLoadingComments(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-auto">
      {/* Hero Section */}
      <div className="relative h-56 bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0">
        <button className="absolute top-12 left-4 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button className="absolute top-12 right-4 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center">
          <Share2 className="w-5 h-5 text-white" />
        </button>
        <div className="absolute bottom-0 left-0 w-full px-6 pb-4">
          <span className="text-caption-1 text-white/80 uppercase tracking-wide">{bet!.category}</span>
          <h1 className="text-title-1 font-bold text-white mt-1 line-clamp-2">{bet!.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-20 overflow-y-auto">
        {/* Bet Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center mb-2 space-x-4">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-body-sm text-gray-700">{participants} participants</span>
            <span className="mx-2 text-gray-300">•</span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <span className="text-body-sm text-gray-700">${pool.toLocaleString()} pool</span>
            <span className="mx-2 text-gray-300">•</span>
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-body-sm text-gray-700">{timeRemaining}</span>
          </div>
          <p className="text-body text-gray-600 mb-2">{bet!.description || 'No description available.'}</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-caption-1 text-gray-400">By @Unknown</span>
            <span className="px-2 py-1 bg-gray-100 rounded-full text-caption-1 text-gray-500 ml-2">{bet!.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Place Bet Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <h2 className="text-title-3 font-semibold mb-3">Place Your Bet</h2>
          <form onSubmit={handlePlaceBet} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {bet!.options.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOption(opt.id)}
                  className={`p-3 rounded-[10px] border text-left transition-colors ${
                    selectedOption === opt.id 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-caption-1">{(opt.totalStaked || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-caption-1 text-gray-500 mt-1">${(opt.totalStaked || 0).toLocaleString()}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="1"
                placeholder="Enter stake ($)"
                value={stake}
                onChange={e => setStake(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button
              className="w-full h-[50px] bg-blue-500 text-white font-semibold rounded-[10px]"
              type="submit"
              disabled={isPlacingBet || !stake || !selectedOption}
            >
              {isPlacingBet ? 'Placing...' : 'Place Bet'}
            </Button>
          </form>
        </div>

        {/* Comments/Chat Section */}
        <BetComments
          comments={comments}
          onAddComment={handleAddComment}
          currentUser={user ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            avatar: user.profileImage
          } : null}
          loading={loadingComments}
          error={commentsError}
          maxHeight="400px"
        />

        {/* Participants Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center mb-3">
            <Users className="w-5 h-5 text-blue-500 mr-2" />
            <h2 className="text-title-3 font-semibold">Top Participants</h2>
          </div>
          <div className="space-y-2">
            {/* Placeholder participants */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">A</div>
              <span className="text-body-sm font-medium">Alice</span>
              <span className="ml-auto text-caption-1 text-gray-500">$1,000</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-700 font-bold">B</div>
              <span className="text-body-sm font-medium">Bob</span>
              <span className="ml-auto text-caption-1 text-gray-500">$800</span>
            </div>
          </div>
        </div>

        {/* Social Actions */}
        <div className="flex items-center justify-between mt-6 mb-4 px-2">
          <Button variant="ghost" className="flex items-center space-x-1" onClick={handleLike}>
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500 scale-110 transition-transform' : 'text-red-500'}`} />
            <span>Like</span>
            <span className="ml-1 text-body-sm">{likeCount}</span>
          </Button>
          <Button variant="ghost" className="flex items-center space-x-1" onClick={handleShare}>
            <Share2 className="w-5 h-5 text-blue-500" />
            <span>Share</span>
          </Button>
          <Button variant="ghost" className="flex items-center space-x-1">
            <Info className="w-5 h-5 text-gray-400" />
            <span>Report</span>
          </Button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-lg w-80 text-center">
            <h3 className="text-title-3 font-semibold mb-2">Share this Bet</h3>
            <div className="mb-4 break-all text-body-sm text-gray-700">{window.location.href}</div>
            <Button
              className="w-full mb-2"
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href)
                setCopySuccess(true)
                setTimeout(() => setCopySuccess(false), 1500)
              }}
            >
              Copy Link
            </Button>
            {copySuccess && <div className="text-green-600 text-sm mb-2">Copied!</div>}
            <Button variant="ghost" className="w-full" onClick={() => setShowShareModal(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Toast/Modal */}
      {showConfirmation && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-center animate-fade-in">
          Bet placed successfully!
          <button className="ml-4 underline" onClick={() => setShowConfirmation(false)}>Dismiss</button>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTabOverride={userBetEntry ? '/bets' : referrer || undefined} />
    </div>
  )
}

export default BetDetailPage