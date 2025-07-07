import React, { useState } from 'react'
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
import { formatCurrency, formatTimeRemaining, formatRelativeTime, cn } from '@/lib/utils'

interface BetDetailPageProps {
  betId: string
}

// Mock bet data - in real app this would come from API
const mockBet = {
  id: '1',
  creatorId: 'user1',
  creator: {
    id: 'user1',
    firstName: 'Alex',
    lastName: 'Johnson',
    username: 'alexj',
    profileImage: null,
  },
  title: 'Will Bitcoin reach $100K by end of 2025?',
  description: 'Bitcoin has been on a bull run throughout 2024 and early 2025. With institutional adoption increasing and potential ETF approvals, many analysts predict BTC could hit the magical $100,000 mark. What do you think? Will Bitcoin reach $100K by December 31st, 2025?',
  type: 'binary' as const,
  category: 'crypto' as const,
  options: [
    { id: 'yes', label: 'Yes, it will reach $100K', totalStaked: 15000 },
    { id: 'no', label: 'No, it will stay below $100K', totalStaked: 8500 }
  ],
  status: 'open' as const,
  stakeMin: 10,
  stakeMax: 1000,
  poolTotal: 23500,
  entryDeadline: '2025-12-31T23:59:59Z',
  settlementMethod: 'auto' as const,
  isPrivate: false,
  likes: 234,
  comments: 67,
  shares: 89,
  createdAt: '2025-07-01T10:30:00Z',
  updatedAt: '2025-07-04T15:45:00Z',
  timeLeft: '178d 19h',
  pool: 24000,
  participants: 12
}

const mockComments = [
  {
    id: '1',
    content: 'I think Bitcoin will definitely hit $100K! The fundamentals are strong.',
    authorId: 'user2',
    author: {
      id: 'user2',
      firstName: 'Sarah',
      lastName: 'Chen',
      username: 'sarahc',
      profileImage: null,
    },
    likes: 12,
    createdAt: '2025-07-04T14:20:00Z',
  },
  {
    id: '2',
    content: 'Not so sure... the market is very volatile. Could go either way.',
    authorId: 'user3',
    author: {
      id: 'user3',
      firstName: 'Mike',
      lastName: 'Thompson',
      username: 'miket',
      profileImage: null,
    },
    likes: 8,
    createdAt: '2025-07-04T13:45:00Z',
  },
]

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

export const BetDetailPage: React.FC<BetDetailPageProps> = ({ betId }) => {
  const [, setLocation] = useLocation()
  const { user } = useAuthStore()
  const { id } = useParams()
  
  const [activeTab, setActiveTab] = useState('details')
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)
  const [selectedOption, setSelectedOption] = useState(mockBet.options[0].id)
  const [stake, setStake] = useState('')
  const [comments, setComments] = useState(mockComments.map(normalizeComment))
  const [isPlacingBet, setIsPlacingBet] = useState(false)
  const [pool, setPool] = useState(mockBet.pool)
  const [participants, setParticipants] = useState(mockBet.participants)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [likeCount, setLikeCount] = useState(mockBet.likes)
  const [showShareModal, setShowShareModal] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const bet = mockBet // In real app, fetch by betId
  const commentsList = mockComments

  const isExpired = new Date(bet.entryDeadline) <= new Date()
  const timeRemaining = formatTimeRemaining(bet.entryDeadline)

  const handleBack = () => {
    setLocation('/discover')
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(likeCount + (isLiked ? -1 : 1))
  }

  const handleComment = () => {
    if (commentText.trim()) {
      console.log('Adding comment:', commentText)
      setCommentText('')
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: bet.title,
        text: bet.description,
        url: window.location.href
      })
    } else {
      setShowShareModal(true)
    }
  }

  const handlePlaceBet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!stake || !selectedOption) return
    setIsPlacingBet(true)
    setTimeout(() => {
      setIsPlacingBet(false)
      setShowConfirmation(true)
      setPool(pool + Number(stake))
      setParticipants(participants + 1)
      setStake('')
    }, 1000)
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setComments([
      ...comments,
      {
        id: Date.now().toString(),
        user: { name: 'You', avatar: null },
        text: commentText,
        time: 'now'
      }
    ])
    setCommentText('')
  }

  const safeComments = Array.isArray(comments) ? comments : []

  if (!bet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Bet not found</h2>
          <p className="text-gray-500 mb-4">The bet you are looking for does not exist.</p>
          <Button onClick={() => setLocation('/discover')}>Back to Discover</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="relative h-56 bg-gradient-to-br from-blue-400 to-purple-500">
        <button className="absolute top-12 left-4 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <button className="absolute top-12 right-4 w-8 h-8 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center">
          <Share2 className="w-5 h-5 text-white" />
        </button>
        <div className="absolute bottom-0 left-0 w-full px-6 pb-4">
          <span className="text-caption-1 text-white/80 uppercase tracking-wide">{bet.category}</span>
          <h1 className="text-title-1 font-bold text-white mt-1 line-clamp-2">{bet.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-32">
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
          <p className="text-body text-gray-600 mb-2">{bet.description}</p>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-caption-1 text-gray-400">By @{bet.creator.username}</span>
            <span className="px-2 py-1 bg-gray-100 rounded-full text-caption-1 text-gray-500 ml-2">{bet.status.toUpperCase()}</span>
          </div>
        </div>

        {/* Place Bet Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <h2 className="text-title-3 font-semibold mb-3">Place Your Bet</h2>
          <form onSubmit={handlePlaceBet} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {bet.options.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOption(opt.id)}
                  className={`p-3 rounded-[10px] border text-left transition-colors ${selectedOption === opt.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-caption-1">{opt.totalStaked.toLocaleString()}</span>
                  </div>
                  <div className="text-caption-1 text-gray-500 mt-1">${opt.totalStaked.toLocaleString()}</div>
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
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center mb-3">
            <MessageCircle className="w-5 h-5 text-blue-500 mr-2" />
            <h2 className="text-title-3 font-semibold">Comments</h2>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
            {safeComments.map(c => (
              <div key={c.id} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                  {c.user.avatar ? <img src={c.user.avatar} alt={c.user.name} className="w-8 h-8 rounded-full" /> : c.user.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-body-sm font-medium">{c.user.name}</span>
                    <span className="text-caption-1 text-gray-400">{c.time}</span>
                  </div>
                  <p className="text-body-sm text-gray-700">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="h-10 px-4" disabled={!commentText.trim()}>
              Send
            </Button>
          </form>
        </div>

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
    </div>
  )
}

export default BetDetailPage
