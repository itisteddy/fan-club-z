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

// Simple Tab Components to avoid conflicts
const SimpleTabs = ({ children, value, onValueChange }: any) => (
  <div data-value={value}>
    {React.Children.map(children, (child: any) => 
      React.cloneElement(child, { activeTab: value, onTabChange: onValueChange })
    )}
  </div>
)

const SimpleTabsList = ({ children, activeTab, onTabChange }: any) => (
  <div className="flex border-b border-gray-200 bg-white">
    {React.Children.map(children, (child: any) =>
      React.cloneElement(child, { activeTab, onTabChange })
    )}
  </div>
)

const SimpleTabsTrigger = ({ value, children, activeTab, onTabChange }: any) => (
  <button
    onClick={() => onTabChange(value)}
    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
      activeTab === value 
        ? 'border-b-2 border-blue-500 text-blue-600' 
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
)

const SimpleTabsContent = ({ value, children, activeTab }: any) => {
  if (activeTab !== value) return null
  return <div>{children}</div>
}

// Simple Chat Component
const SimpleClubChat = ({ clubName, members }: any) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      user: 'Demo User',
      content: 'Welcome to our club chat! 👋',
      timestamp: '2 min ago'
    },
    {
      id: '2', 
      user: 'Alex Johnson',
      content: 'Great to be here! Looking forward to some exciting bets 🎯',
      timestamp: '1 min ago'
    }
  ])
  
  const [newMessage, setNewMessage] = useState('')
  
  const sendMessage = () => {
    if (newMessage.trim()) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        user: 'You',
        content: newMessage,
        timestamp: 'now'
      }])
      setNewMessage('')
    }
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden h-96 bg-white">
      {/* Chat Header */}
      <div className="bg-gray-50 p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{clubName}</h3>
            <p className="text-xs text-gray-500">{members.length} members • 2 online</p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 p-3 space-y-3 h-64 overflow-y-auto">
        {messages.map(message => (
          <div key={message.id} className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{message.user}</span>
              <span className="text-xs text-gray-500">{message.timestamp}</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-2 text-sm max-w-xs">
              {message.content}
            </div>
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Message ${clubName}...`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

// Simple Bet Creation Modal
const SimpleClubBetModal = ({ club, isOpen, onClose }: any) => {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: "Error", description: "Please enter a bet title" })
      return
    }
    
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      toast({ title: "Success!", description: `Bet "${title}" created in ${club.name}!` })
      setTitle('')
      setDescription('')
      setLoading(false)
      onClose()
    }, 1000)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Bet in {club.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bet Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are club members betting on?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about your club bet..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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

export const ClubDetailPage: React.FC<{ clubId?: string }> = ({ clubId: propClubId }) => {
  const { clubId: paramClubId } = useParams<{ clubId: string }>()
  const clubId = propClubId || paramClubId
  const [location, setLocation] = useLocation()
  const { user } = useAuthStore()
  const { success, error } = useToast()
  
  // State
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [clubBets, setClubBets] = useState<Bet[]>([])
  const [stats, setStats] = useState<ClubStats | null>(null)
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showClubBetModal, setShowClubBetModal] = useState(false)

  useEffect(() => {
    if (clubId) {
      fetchClubDetails()
    }
    
    // Handle URL parameters for tab and actions
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    const action = urlParams.get('action')
    
    if (tab) {
      setActiveTab(tab)
    }
    
    if (action === 'create' && tab === 'bets') {
      setTimeout(() => {
        setShowClubBetModal(true)
      }, 500)
    }
  }, [clubId])

  const fetchClubDetails = async () => {
    try {
      setLoading(true)
      
      // Mock club data for demo
      const mockClub = {
        id: clubId!,
        name: 'Premier League Predictors',
        description: 'The ultimate destination for Premier League betting and predictions',
        category: 'sports',
        creatorId: 'demo-user-id',
        memberCount: 1247,
        activeBets: 8,
        discussions: 45,
        isPrivate: false,
        imageUrl: '⚽',
        createdAt: new Date('2025-06-15T10:00:00Z').toISOString(),
        updatedAt: new Date('2025-07-04T15:45:00Z').toISOString()
      }
      
      const mockMembers = [
        {
          id: 'member-1',
          userId: 'demo-user-id',
          clubId: clubId!,
          role: 'owner' as const,
          joinedAt: new Date('2025-06-15T10:00:00Z').toISOString(),
          user: {
            id: 'demo-user-id',
            username: 'demo_user',
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@fanclubz.app',
            phone: '+1 (555) 123-4567',
            bio: 'Demo account',
            profileImage: null,
            walletAddress: '0xDemo',
            kycLevel: 'verified' as const,
            walletBalance: 2500,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          stats: {
            totalBets: 15,
            winRate: 68.5,
            totalWinnings: 2340
          }
        },
        {
          id: 'member-2',
          userId: 'user-1',
          clubId: clubId!,
          role: 'admin' as const,
          joinedAt: new Date('2025-06-16T14:30:00Z').toISOString(),
          user: {
            id: 'user-1',
            username: 'alexj',
            firstName: 'Alex',
            lastName: 'Johnson',
            email: 'alex@example.com',
            phone: '+1 (555) 987-6543',
            bio: 'Sports enthusiast',
            profileImage: null,
            walletAddress: '0xAlex',
            kycLevel: 'verified' as const,
            walletBalance: 1200,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          stats: {
            totalBets: 23,
            winRate: 71.2,
            totalWinnings: 3450
          }
        }
      ]
      
      const mockStats = {
        totalMembers: 1247,
        activeBets: 8,
        totalBets: 156,
        totalPool: 75000,
        discussions: 45,
        avgWinRate: 68.5,
        topPerformer: {
          userId: 'user-1',
          username: 'alexj',
          winRate: 71.2,
          totalWinnings: 3450
        }
      }
      
      setClub(mockClub)
      setMembers(mockMembers)
      setStats(mockStats)
      
      // Check if user is a member
      if (user) {
        const userMember = mockMembers.find(m => m.userId === user.id)
        setIsMember(!!userMember)
        setUserRole(userMember?.role || null)
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

    success('Joined club successfully!')
    setIsMember(true)
    setUserRole('member')
  }

  const handleLeaveClub = async () => {
    success('Left club successfully')
    setLocation('/clubs')
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveClub}
                >
                  Leave
                </Button>
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
        <SimpleTabs value={activeTab} onValueChange={setActiveTab}>
          <SimpleTabsList>
            <SimpleTabsTrigger value="overview">Overview</SimpleTabsTrigger>
            <SimpleTabsTrigger value="bets">Bets</SimpleTabsTrigger>
            <SimpleTabsTrigger value="chat">Chat</SimpleTabsTrigger>
            <SimpleTabsTrigger value="members">Members</SimpleTabsTrigger>
          </SimpleTabsList>
        
          {/* Content */}
          <div className="pb-24">
            <SimpleTabsContent value="overview">
              <div className="space-y-6">
                {/* Club Description */}
                <Card>
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
                  <div className="grid grid-cols-2 gap-4">
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
              </div>
            </SimpleTabsContent>

            <SimpleTabsContent value="bets">
              <div className="space-y-6">
                {/* Create Bet CTA */}
                {isMember && (
                  <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
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
                          onClick={() => setShowClubBetModal(true)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Create Bet
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No Bets State */}
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-title-3 font-semibold mb-2">No bets yet</h3>
                    <p className="text-body text-gray-500 mb-4">
                      {isMember ? 'Be the first to create a club bet!' : 'Join the club to see and create bets'}
                    </p>
                    {isMember && (
                      <Button onClick={() => setShowClubBetModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Bet
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </SimpleTabsContent>

            <SimpleTabsContent value="chat">
              {!user ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-title-3 font-semibold mb-2">Sign in to chat</h3>
                  <p className="text-body text-gray-500">Join the conversation with club members</p>
                </div>
              ) : !isMember ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-title-3 font-semibold mb-2">Join the club to chat</h3>
                  <p className="text-body text-gray-500 mb-4">
                    Connect with members and discuss bets in real-time
                  </p>
                  <Button onClick={handleJoinClub} disabled={club.isPrivate}>
                    {club.isPrivate ? 'Private Club' : 'Join Club'}
                  </Button>
                </div>
              ) : (
                <SimpleClubChat
                  clubName={club.name}
                  members={members}
                />
              )}
            </SimpleTabsContent>

            <SimpleTabsContent value="members">
              <div className="space-y-4">
                {members.map(member => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>{member.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </SimpleTabsContent>
          </div>
        </SimpleTabs>
      </div>

      {/* Club Bet Modal */}
      <SimpleClubBetModal
        club={club}
        isOpen={showClubBetModal}
        onClose={() => setShowClubBetModal(false)}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}

export default ClubDetailPage