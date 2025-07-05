import React, { useState } from 'react'
import { useLocation } from 'wouter'
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  Share, 
  Clock, 
  TrendingUp, 
  Users,
  MoreHorizontal,
  Flag
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
  updatedAt: '2025-07-04T15:45:00Z'
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

export const BetDetailPage: React.FC<BetDetailPageProps> = ({ betId }) => {
  const [, setLocation] = useLocation()
  const { user } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState('details')
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [showBetModal, setShowBetModal] = useState(false)

  const bet = mockBet // In real app, fetch by betId
  const comments = mockComments

  const isExpired = new Date(bet.entryDeadline) <= new Date()
  const timeRemaining = formatTimeRemaining(bet.entryDeadline)

  const handleBack = () => {
    setLocation('/discover')
  }

  const handleLike = () => {
    setIsLiked(!isLiked)
  }

  const handleComment = () => {
    if (commentText.trim()) {
      console.log('Adding comment:', commentText)
      setCommentText('')
    }
  }

  const handleShare = () => {
    console.log('Sharing bet')
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="font-semibold text-gray-900 flex-1 text-center truncate mx-4">
            Bet Details
          </h1>
          
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 pb-20">
        {/* Bet Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            {/* Creator */}
            <div className="flex items-center space-x-3 mb-4">
              {bet.creator.profileImage ? (
                <img
                  src={bet.creator.profileImage}
                  alt={bet.creator.firstName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {bet.creator.firstName[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {bet.creator.firstName} {bet.creator.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  @{bet.creator.username} • {formatRelativeTime(bet.createdAt)}
                </p>
              </div>
            </div>

            {/* Category & Status */}
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-lg">₿</span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                bet.status === 'open' ? 'text-green-600 bg-green-50' : 'text-gray-600 bg-gray-50'
              )}>
                {bet.status.charAt(0).toUpperCase() + bet.status.slice(1)}
              </span>
              <span className="text-sm text-gray-500">
                {timeRemaining}
              </span>
            </div>

            {/* Title & Description */}
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {bet.title}
            </h2>
            <p className="text-gray-600 leading-relaxed">
              {bet.description}
            </p>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Options */}
            <div className="space-y-3 mb-6">
              {bet.options.map((option) => {
                const percentage = bet.poolTotal > 0 ? (option.totalStaked / bet.poolTotal * 100) : 0
                return (
                  <div key={option.id} className="relative">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg relative z-10">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{percentage.toFixed(1)}%</div>
                        <div className="text-sm text-gray-500">{formatCurrency(option.totalStaked)}</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="absolute inset-0 bg-primary/10 rounded-lg" style={{
                      width: `${percentage}%`,
                      zIndex: 1
                    }} />
                  </div>
                )
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="font-bold text-gray-900">{formatCurrency(bet.poolTotal)}</div>
                <div className="text-xs text-gray-500">Total Pool</div>
              </div>
              <div className="text-center">
                <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="font-bold text-gray-900">47</div>
                <div className="text-xs text-gray-500">Participants</div>
              </div>
              <div className="text-center">
                <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <div className="font-bold text-gray-900 text-xs">{timeRemaining}</div>
                <div className="text-xs text-gray-500">Remaining</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center space-x-2 transition-colors",
                    isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                  )}
                >
                  <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                  <span className="text-sm font-medium">{bet.likes}</span>
                </button>
                
                <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{bet.comments}</span>
                </button>
                
                <button
                  onClick={handleShare}
                  className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors"
                >
                  <Share className="w-5 h-5" />
                  <span className="text-sm font-medium">{bet.shares}</span>
                </button>
              </div>

              <Button variant="ghost" size="sm" className="text-gray-500">
                <Flag className="w-4 h-4 mr-1" />
                Report
              </Button>
            </div>

            {/* Place Bet Button */}
            {!isExpired && user && (
              <Button className="w-full" size="lg">
                Place Bet
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
            <TabsTrigger value="participants">Players</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bet Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Min Stake</p>
                    <p className="text-gray-900">{formatCurrency(bet.stakeMin)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Max Stake</p>
                    <p className="text-gray-900">{formatCurrency(bet.stakeMax)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Entry Deadline</p>
                  <p className="text-gray-900">{new Date(bet.entryDeadline).toLocaleString()}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Settlement Method</p>
                  <p className="text-gray-900 capitalize">{bet.settlementMethod}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Category</p>
                  <p className="text-gray-900 capitalize">{bet.category}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <div className="space-y-4">
              {/* Add Comment */}
              {user && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex space-x-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-medium">
                          {user.firstName[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment..."
                          className="mb-2"
                        />
                        <Button size="sm" onClick={handleComment} disabled={!commentText.trim()}>
                          Comment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-medium">
                            {comment.author.firstName[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {comment.author.firstName} {comment.author.lastName}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{comment.content}</p>
                          <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{comment.likes}</span>
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participants">
            <Card>
              <CardContent className="p-4">
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Participant list coming soon</p>
                  <p className="text-sm">View who's betting on this prediction</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default BetDetailPage
