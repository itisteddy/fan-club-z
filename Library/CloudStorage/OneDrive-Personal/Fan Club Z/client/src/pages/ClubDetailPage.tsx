import React, { useState, useEffect } from 'react'
import { useParams, useLocation } from 'wouter'
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Settings, 
  Plus, 
  Heart, 
  Share, 
  Clock, 
  Crown,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Flag,
  Bell,
  BellOff,
  Lock,
  Unlock,
  Globe,
  Calendar,
  MapPin,
  MoreHorizontal,
  Star,
  Trophy,
  Activity,
  BarChart3,
  Award,
  Target,
  Zap
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuthStore } from '../store/authStore'
import { useBetStore } from '../store/betStore'
import { useToast } from '../hooks/use-toast'
import { cn, formatCurrency, formatRelativeTime } from '../lib/utils'
import BetCard from '../components/BetCard'
import BottomNavigation from '../components/BottomNavigation'
import type { Club, Bet, User, BetEntry } from '@shared/schema'

interface ClubMember {
  id: string
  userId: string
  clubId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  user: User
  stats: {
    totalBets: number
    winRate: number
    totalWinnings: number
  }
}

interface ClubDiscussion {
  id: string
  clubId: string
  authorId: string
  title: string
  content: string
  likes: number
  comments: number
  createdAt: string
  author: User
  isLiked: boolean
}

interface ClubStats {
  totalMembers: number
  activeBets: number
  totalBets: number
  totalPool: number
  discussions: number
  avgWinRate: number
  topPerformer: {
    userId: string
    username: string
    winRate: number
    totalWinnings: number
  }
}

export const ClubDetailPage: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>()
  const [location, setLocation] = useLocation()
  const { user } = useAuthStore()
  const { success, error } = useToast()
  
  // State
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [clubBets, setClubBets] = useState<Bet[]>([])
  const [discussions, setDiscussions] = useState<ClubDiscussion[]>([])
  const [stats, setStats] = useState<ClubStats | null>(null)
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Modals
  const [showCreateBet, setShowCreateBet] = useState(false)
  const [showCreateDiscussion, setShowCreateDiscussion] = useState(false)
  const [showInviteMembers, setShowInviteMembers] = useState(false)
  const [showClubSettings, setShowClubSettings] = useState(false)
  
  // Forms
  const [newBet, setNewBet] = useState({
    title: '',
    description: '',
    type: 'binary',
    options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
    stakeMin: 10,
    stakeMax: 1000,
    entryDeadline: '',
    settlementMethod: 'auto'
  })
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    content: ''
  })

  useEffect(() => {
    if (clubId) {
      fetchClubDetails()
    }
  }, [clubId])

  const fetchClubDetails = async () => {
    try {
      setLoading(true)
      
      // Fetch club details
      const clubResponse = await fetch(`/api/clubs/${clubId}`)
      if (clubResponse.ok) {
        const clubData = await clubResponse.json()
        setClub(clubData.club)
      }
      
      // Fetch members
      const membersResponse = await fetch(`/api/clubs/${clubId}/members`)
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.members || [])
        
        // Check if user is a member
        if (user) {
          const userMember = membersData.members?.find((m: ClubMember) => m.userId === user.id)
          setIsMember(!!userMember)
          setUserRole(userMember?.role || null)
        }
      }
      
      // Fetch club bets
      const betsResponse = await fetch(`/api/clubs/${clubId}/bets`)
      if (betsResponse.ok) {
        const betsData = await betsResponse.json()
        setClubBets(betsData.bets || [])
      }
      
      // Fetch discussions
      const discussionsResponse = await fetch(`/api/clubs/${clubId}/discussions`)
      if (discussionsResponse.ok) {
        const discussionsData = await discussionsResponse.json()
        setDiscussions(discussionsData.discussions || [])
      }
      
      // Fetch club stats
      const statsResponse = await fetch(`/api/clubs/${clubId}/stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }
      
    } catch (err) {
      console.error('Failed to fetch club details:', err)
      error('Failed to load club details')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinClub = async () => {
    if (!user) {
      error('Please sign in to join the club')
      return
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        success('Joined club successfully!')
        fetchClubDetails()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to join club')
      }
    } catch (err) {
      error('Failed to join club')
    }
  }

  const handleLeaveClub = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        success('Left club successfully')
        setLocation('/clubs')
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to leave club')
      }
    } catch (err) {
      error('Failed to leave club')
    }
  }

  const handleCreateBet = async () => {
    if (!user) {
      error('Please sign in to create a bet')
      return
    }

    if (!newBet.title || !newBet.description || !newBet.entryDeadline) {
      error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newBet,
          creatorId: user.id,
          clubId: clubId,
        }),
      })

      if (response.ok) {
        success('Bet created successfully!')
        setShowCreateBet(false)
        setNewBet({
          title: '',
          description: '',
          type: 'binary',
          options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }],
          stakeMin: 10,
          stakeMax: 1000,
          entryDeadline: '',
          settlementMethod: 'auto'
        })
        fetchClubDetails()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to create bet')
      }
    } catch (err) {
      error('Failed to create bet')
    }
  }

  const handleCreateDiscussion = async () => {
    if (!user) {
      error('Please sign in to create a discussion')
      return
    }

    if (!newDiscussion.title || !newDiscussion.content) {
      error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newDiscussion,
          authorId: user.id,
        }),
      })

      if (response.ok) {
        success('Discussion created successfully!')
        setShowCreateDiscussion(false)
        setNewDiscussion({ title: '', content: '' })
        fetchClubDetails()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to create discussion')
      }
    } catch (err) {
      error('Failed to create discussion')
    }
  }

  const handleLikeDiscussion = async (discussionId: string) => {
    if (!user) {
      error('Please sign in to like discussions')
      return
    }

    try {
      const response = await fetch(`/api/clubs/${clubId}/discussions/${discussionId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        // Update local state
        setDiscussions(prev => prev.map(d => 
          d.id === discussionId 
            ? { ...d, likes: d.isLiked ? d.likes - 1 : d.likes + 1, isLiked: !d.isLiked }
            : d
        ))
      }
    } catch (err) {
      error('Failed to like discussion')
    }
  }

  const handlePromoteMember = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!user || userRole !== 'owner') return

    try {
      const response = await fetch(`/api/clubs/${clubId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        success(`Member role updated to ${newRole}`)
        fetchClubDetails()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to update member role')
      }
    } catch (err) {
      error('Failed to update member role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!user || (userRole !== 'owner' && userRole !== 'admin')) return

    try {
      const response = await fetch(`/api/clubs/${clubId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        success('Member removed from club')
        fetchClubDetails()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to remove member')
      }
    } catch (err) {
      error('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-gray-500">Loading club...</p>
        </div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-title-2 font-semibold mb-2">Club not found</h2>
          <p className="text-body text-gray-500 mb-4">The club you're looking for doesn't exist</p>
          <Button onClick={() => setLocation('/clubs')}>
            Back to Clubs
          </Button>
        </div>
      </div>
    )
  }

  const getCategoryEmoji = (category: string) => {
    const categories = [
      { id: 'sports', emoji: '⚽' },
      { id: 'crypto', emoji: '₿' },
      { id: 'entertainment', emoji: '🎬' },
      { id: 'politics', emoji: '🗳️' },
      { id: 'technology', emoji: '💻' },
      { id: 'finance', emoji: '💰' },
      { id: 'gaming', emoji: '🎮' }
    ]
    const cat = categories.find(c => c.id === category)
    return cat?.emoji || '🏠'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="flex items-center px-4 pt-12 pb-2">
            <button
              onClick={() => setLocation('/clubs')}
              className="mr-3 p-2 bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-display font-bold">{club.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-lg">{getCategoryEmoji(club.category)}</span>
                <Badge variant={club.isPrivate ? "secondary" : "default"}>
                  {club.isPrivate ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                  {club.isPrivate ? 'Private' : 'Public'}
                </Badge>
                {userRole === 'owner' && (
                  <Badge variant="outline">
                    <Crown className="w-3 h-3 mr-1" />
                    Owner
                  </Badge>
                )}
                {userRole === 'admin' && (
                  <Badge variant="outline">
                    <Settings className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {isMember ? (
                <>
                  {(userRole === 'owner' || userRole === 'admin') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClubSettings(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeaveClub}
                  >
                    Leave
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleJoinClub}
                  disabled={club.isPrivate}
                >
                  {club.isPrivate ? 'Private' : 'Join'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bets">Bets</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="discussions">Discussions</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        <TabsContent value="overview" className="mt-0">
          {/* Club Description */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <p className="text-body text-gray-600 mb-4">{club.description}</p>
              <div className="flex items-center space-x-4 text-body-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Created {formatRelativeTime(club.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{stats?.totalMembers || 0} members</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-title-1 font-bold text-gray-900 mb-1">
                    {stats.activeBets}
                  </div>
                  <div className="text-body-sm text-gray-500">Active Bets</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-title-1 font-bold text-gray-900 mb-1">
                    {stats.avgWinRate.toFixed(0)}%
                  </div>
                  <div className="text-body-sm text-gray-500">Avg Win Rate</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-title-1 font-bold text-gray-900 mb-1">
                    {formatCurrency(stats.totalPool)}
                  </div>
                  <div className="text-body-sm text-gray-500">Total Pool</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <MessageCircle className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-title-1 font-bold text-gray-900 mb-1">
                    {stats.discussions}
                  </div>
                  <div className="text-body-sm text-gray-500">Discussions</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Top Performer */}
          {stats?.topPerformer && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-yellow-500" />
                  Top Performer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>{stats.topPerformer.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold">{stats.topPerformer.username}</h4>
                    <p className="text-body-sm text-gray-500">
                      {stats.topPerformer.winRate.toFixed(0)}% win rate • {formatCurrency(stats.topPerformer.totalWinnings)} won
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clubBets.slice(0, 3).map(bet => (
                  <div key={bet.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-body-sm font-medium">New bet: {bet.title}</p>
                      <p className="text-caption-1 text-gray-500">{formatRelativeTime(bet.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {discussions.slice(0, 2).map(discussion => (
                  <div key={discussion.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-body-sm font-medium">New discussion: {discussion.title}</p>
                      <p className="text-caption-1 text-gray-500">{formatRelativeTime(discussion.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bets" className="mt-0">
          {/* Create Bet CTA */}
          {isMember && (
            <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold mb-1">Create a Club Bet</h3>
                    <p className="text-sm text-blue-100">
                      Start a prediction for club members
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-white text-blue-600 hover:bg-gray-100"
                    onClick={() => setShowCreateBet(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Bet
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Club Bets */}
          <div className="space-y-4">
            {clubBets.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-title-3 font-semibold mb-2">No bets yet</h3>
                  <p className="text-body text-gray-500 mb-4">
                    {isMember ? 'Be the first to create a club bet!' : 'Join the club to see and create bets'}
                  </p>
                  {isMember && (
                    <Button onClick={() => setShowCreateBet(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Bet
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              clubBets.map(bet => (
                <BetCard key={bet.id} bet={bet} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-0">
          {/* Members List */}
          <div className="space-y-4">
            {members.map(member => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>{member.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{member.user.username}</h4>
                          {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                          {member.role === 'admin' && <Settings className="w-4 h-4 text-blue-500" />}
                        </div>
                        <p className="text-body-sm text-gray-500">
                          {member.stats.totalBets} bets • {member.stats.winRate.toFixed(0)}% win rate
                        </p>
                        <p className="text-caption-1 text-gray-400">
                          Joined {formatRelativeTime(member.joinedAt)}
                        </p>
                      </div>
                    </div>
                    
                    {(userRole === 'owner' || (userRole === 'admin' && member.role === 'member')) && (
                      <div className="flex space-x-2">
                        {userRole === 'owner' && member.role === 'member' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromoteMember(member.id, 'admin')}
                          >
                            Promote
                          </Button>
                        )}
                        {userRole === 'owner' && member.role === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePromoteMember(member.id, 'member')}
                          >
                            Demote
                          </Button>
                        )}
                        {member.userId !== user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="discussions" className="mt-0">
          {/* Create Discussion CTA */}
          {isMember && (
            <Card className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold mb-1">Start a Discussion</h3>
                    <p className="text-sm text-green-100">
                      Share your thoughts with club members
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-white text-green-600 hover:bg-gray-100"
                    onClick={() => setShowCreateDiscussion(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Discussion
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discussions List */}
          <div className="space-y-4">
            {discussions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-title-3 font-semibold mb-2">No discussions yet</h3>
                  <p className="text-body text-gray-500 mb-4">
                    {isMember ? 'Start the first discussion!' : 'Join the club to participate in discussions'}
                  </p>
                  {isMember && (
                    <Button onClick={() => setShowCreateDiscussion(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Discussion
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              discussions.map(discussion => (
                <Card key={discussion.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{discussion.author.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{discussion.title}</h4>
                          <p className="text-body-sm text-gray-500">
                            by {discussion.author.username} • {formatRelativeTime(discussion.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-body text-gray-600 mb-3 line-clamp-3">{discussion.content}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleLikeDiscussion(discussion.id)}
                          className={cn(
                            "flex items-center space-x-1 text-body-sm transition-colors",
                            discussion.isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", discussion.isLiked && "fill-current")} />
                          <span>{discussion.likes}</span>
                        </button>
                        <div className="flex items-center space-x-1 text-body-sm text-gray-500">
                          <MessageCircle className="w-4 h-4" />
                          <span>{discussion.comments}</span>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <Share className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </div>

      {/* Create Bet Modal */}
      <Dialog open={showCreateBet} onOpenChange={setShowCreateBet}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Club Bet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Bet Title</label>
              <Input
                value={newBet.title}
                onChange={(e) => setNewBet({ ...newBet, title: e.target.value })}
                placeholder="What are you predicting?"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newBet.description}
                onChange={(e) => setNewBet({ ...newBet, description: e.target.value })}
                placeholder="Provide more details about your prediction"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Entry Deadline</label>
              <Input
                type="datetime-local"
                value={newBet.entryDeadline}
                onChange={(e) => setNewBet({ ...newBet, entryDeadline: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Min Stake</label>
                <Input
                  type="number"
                  value={newBet.stakeMin}
                  onChange={(e) => setNewBet({ ...newBet, stakeMin: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Stake</label>
                <Input
                  type="number"
                  value={newBet.stakeMax}
                  onChange={(e) => setNewBet({ ...newBet, stakeMax: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateBet(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateBet}
                disabled={!newBet.title || !newBet.description || !newBet.entryDeadline}
                className="flex-1"
              >
                Create Bet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Discussion Modal */}
      <Dialog open={showCreateDiscussion} onOpenChange={setShowCreateDiscussion}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Discussion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                placeholder="Discussion title"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                value={newDiscussion.content}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                placeholder="Share your thoughts..."
                className="mt-1"
                rows={4}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateDiscussion(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDiscussion}
                disabled={!newDiscussion.title || !newDiscussion.content}
                className="flex-1"
              >
                Post Discussion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}

export default ClubDetailPage
