import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Plus, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Heart, 
  Share, 
  Clock, 
  Star,
  Crown,
  Settings,
  MoreHorizontal,
  Calendar,
  MapPin,
  Globe,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Flag,
  Bell,
  BellOff
} from 'lucide-react'
import { useLocation } from 'wouter'
import { useAuthStore } from '../store/authStore'
import { useBetStore } from '../store/betStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useToast } from '../hooks/use-toast'
import { cn, formatCurrency, formatRelativeTime } from '../lib/utils'
import type { Club, Bet, User } from '@shared/schema'

interface ClubMember {
  id: string
  userId: string
  clubId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  user: User
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
}

interface ClubStats {
  totalMembers: number
  activeBets: number
  totalBets: number
  totalPool: number
  discussions: number
  avgWinRate: number
}

export const ClubsTab: React.FC = () => {
  const { user } = useAuthStore()
  const { success, error } = useToast()
  const [location, navigate] = useLocation()
  
  // State
  const [clubs, setClubs] = useState<Club[]>([])
  const [userClubs, setUserClubs] = useState<Club[]>([])
  const [trendingClubs, setTrendingClubs] = useState<Club[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('discover')
  const [loading, setLoading] = useState(false)
  const [showCreateClub, setShowCreateClub] = useState(false)
  const [showJoinClub, setShowJoinClub] = useState(false)
  
  // Create club form
  const [newClub, setNewClub] = useState({
    name: '',
    description: '',
    category: '',
    isPrivate: false,
    maxMembers: 100,
    rules: ''
  })

  // Categories
  const categories = [
    { id: 'all', label: 'All', emoji: '🏠' },
    { id: 'sports', label: 'Sports', emoji: '⚽' },
    { id: 'crypto', label: 'Crypto', emoji: '₿' },
    { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
    { id: 'politics', label: 'Politics', emoji: '🗳️' },
    { id: 'technology', label: 'Technology', emoji: '💻' },
    { id: 'finance', label: 'Finance', emoji: '💰' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮' }
  ]

  useEffect(() => {
    fetchClubs()
    if (user) {
      fetchUserClubs()
    }
  }, [user])

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/clubs')
      if (response.ok) {
        const data = await response.json()
        setClubs(data.clubs || [])
        setTrendingClubs(data.clubs?.slice(0, 5) || [])
      }
    } catch (err) {
      console.error('Failed to fetch clubs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserClubs = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/clubs/user/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserClubs(data.clubs || [])
      }
    } catch (err) {
      console.error('Failed to fetch user clubs:', err)
    }
  }

  const handleCreateClub = async () => {
    if (!user) {
      error('Please sign in to create a club')
      return
    }

    if (!newClub.name || !newClub.description || !newClub.category) {
      error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/clubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...newClub,
          creatorId: user.id,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        success('Club created successfully!')
        setShowCreateClub(false)
        setNewClub({ name: '', description: '', category: '', isPrivate: false, maxMembers: 100, rules: '' })
        fetchClubs()
        fetchUserClubs()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to create club')
      }
    } catch (err) {
      error('Failed to create club')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinClub = async (clubId: string) => {
    if (!user) {
      error('Please sign in to join a club')
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
        fetchUserClubs()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to join club')
      }
    } catch (err) {
      error('Failed to join club')
    }
  }

  const handleLeaveClub = async (clubId: string) => {
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
        fetchUserClubs()
      } else {
        const errorData = await response.json()
        error(errorData.error || 'Failed to leave club')
      }
    } catch (err) {
      error('Failed to leave club')
    }
  }

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         club.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || club.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryEmoji = (category: string) => {
    const cat = categories.find(c => c.id === category)
    return cat?.emoji || '🏠'
  }

  const getMemberRole = (club: Club) => {
    if (!user) return null
    // This would come from the API in a real implementation
    return club.creatorId === user.id ? 'owner' : 'member'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">Clubs</h1>
          </div>
          
          {/* Search Bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-clubs">My Clubs</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Categories */}
      <div className="px-4 mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-full text-body-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === category.id
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300"
              )}
            >
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        <TabsContent value="discover" className="mt-0">
          {/* Create Club CTA */}
          {user && (
            <Card className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold mb-1">Create Your Own Club</h3>
                    <p className="text-sm text-blue-100">
                      Start a community around your favorite topics
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="bg-white text-blue-600 hover:bg-gray-100"
                    onClick={() => setShowCreateClub(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Club
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clubs Grid */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-body-sm text-gray-500">Loading clubs...</p>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-title-3 font-semibold mb-2">No clubs found</h3>
                <p className="text-body text-gray-500 mb-4">
                  Try adjusting your search or create a new club
                </p>
                {user && (
                  <Button onClick={() => setShowCreateClub(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Club
                  </Button>
                )}
              </div>
            ) : (
              filteredClubs.map(club => (
                <ClubCard 
                  key={club.id} 
                  club={club} 
                  onJoin={() => handleJoinClub(club.id)}
                  onLeave={() => handleLeaveClub(club.id)}
                  userRole={getMemberRole(club)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-clubs" className="mt-0">
          {!user ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-title-3 font-semibold mb-2">Sign in to see your clubs</h3>
              <p className="text-body text-gray-500">Join clubs and manage your memberships</p>
            </div>
          ) : userClubs.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-title-3 font-semibold mb-2">No clubs joined yet</h3>
              <p className="text-body text-gray-500 mb-4">
                Discover and join clubs to start betting with friends
              </p>
              <Button onClick={() => setActiveTab('discover')}>
                Discover Clubs
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userClubs.map(club => (
                <ClubCard 
                  key={club.id} 
                  club={club} 
                  onJoin={() => handleJoinClub(club.id)}
                  onLeave={() => handleLeaveClub(club.id)}
                  userRole={getMemberRole(club)}
                  isUserClub={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="mt-0">
          <div className="space-y-4">
            {trendingClubs.map((club, index) => (
              <div key={club.id} className="relative">
                {index < 3 && (
                  <div className="absolute -top-2 -left-2 z-10">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} #{index + 1}
                    </Badge>
                  </div>
                )}
                <ClubCard 
                  club={club} 
                  onJoin={() => handleJoinClub(club.id)}
                  onLeave={() => handleLeaveClub(club.id)}
                  userRole={getMemberRole(club)}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </div>

      {/* Create Club Modal */}
      <Dialog open={showCreateClub} onOpenChange={setShowCreateClub}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Club</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Club Name</label>
              <Input
                value={newClub.name}
                onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                placeholder="Enter club name"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newClub.description}
                onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                placeholder="Describe your club"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={newClub.category} onValueChange={(value) => setNewClub({ ...newClub, category: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.slice(1).map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.emoji} {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="private"
                checked={newClub.isPrivate}
                onChange={(e) => setNewClub({ ...newClub, isPrivate: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="private" className="text-sm">Private club (invite only)</label>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateClub(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateClub}
                disabled={loading || !newClub.name || !newClub.description || !newClub.category}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Club'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Club Card Component
interface ClubCardProps {
  club: Club
  onJoin: () => void
  onLeave: () => void
  userRole?: 'owner' | 'admin' | 'member' | null
  isUserClub?: boolean
}

const ClubCard: React.FC<ClubCardProps> = ({ club, onJoin, onLeave, userRole, isUserClub }) => {
  const [location, navigate] = useLocation()
  const { user } = useAuthStore()
  
  const isMember = userRole !== null
  const isOwner = userRole === 'owner'
  const isAdmin = userRole === 'admin'

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
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getCategoryEmoji(club.category)}</span>
              <Badge variant={club.isPrivate ? "secondary" : "default"}>
                {club.isPrivate ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                {club.isPrivate ? 'Private' : 'Public'}
              </Badge>
              {isOwner && (
                <Badge variant="outline">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="outline">
                  <Settings className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            
            <h3 className="text-title-3 font-semibold mb-1">{club.name}</h3>
            <p className="text-body-sm text-gray-600 mb-3 line-clamp-2">{club.description}</p>
            
            <div className="flex items-center space-x-4 text-body-sm text-gray-500 mb-3">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>{club.memberCount || 0} members</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>{club.activeBets || 0} active bets</span>
              </div>
              <div className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-1" />
                <span>{club.discussions || 0} discussions</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            {isMember ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/clubs/${club.id}`)}
                >
                  View Club
                </Button>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLeave}
                  >
                    Leave
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                onClick={onJoin}
                disabled={club.isPrivate}
              >
                {club.isPrivate ? 'Private' : 'Join'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        {isMember && (
          <div className="flex space-x-2 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/clubs/${club.id}/bets/create`)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Bet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/clubs/${club.id}/discussions`)}
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Discuss
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/clubs/${club.id}/members`)}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-1" />
              Members
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ClubsTab
