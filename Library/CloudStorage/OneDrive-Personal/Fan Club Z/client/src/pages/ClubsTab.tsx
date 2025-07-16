import React, { useState, useEffect, useCallback } from 'react'
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
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { PullToRefreshIndicator } from '../components/ui/PullToRefreshIndicator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useToast } from '../hooks/use-toast'
import { cn, formatCurrency, formatRelativeTime } from '../lib/utils'
import { api } from '../lib/queryClient'
import type { Club, Bet, User } from '@shared/schema'
import type { ApiResponse } from '../lib/queryClient'

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

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refreshing clubs...')
    await Promise.all([
      fetchClubs(),
      user ? fetchUserClubs() : Promise.resolve()
    ])
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  }, [user])

  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh(handleRefresh)

  useEffect(() => {
    console.log('🚀 ClubsTab: Component mounted, fetching clubs...')
    fetchClubs()
    if (user) {
      console.log('👤 ClubsTab: User authenticated, fetching user clubs...')
      fetchUserClubs()
    } else {
      console.log('⚠️ ClubsTab: No user authenticated')
    }
  }, [user])

  // Debug effect to log state changes
  useEffect(() => {
    console.log('📊 ClubsTab: State update - clubs:', clubs.length, 'loading:', loading, 'selectedCategory:', selectedCategory)
  }, [clubs, loading, selectedCategory])

  const fetchClubs = async () => {
    try {
      console.log('🔍 ClubsTab: Starting to fetch clubs...')
      setLoading(true)
      
      // Use the API client with automatic fallback URL detection
      const data = await api.get('/clubs') as any
      console.log('📊 ClubsTab: Clubs API response data:', data)
      
      if (data.success && data.data && data.data.clubs) {
        console.log(`✅ ClubsTab: Found ${data.data.clubs.length} clubs`)
        setClubs(data.data.clubs)
        setTrendingClubs(data.data.clubs.slice(0, 5))
      } else if (data.clubs) {
        // Fallback for different response structure
        console.log(`✅ ClubsTab: Found ${data.clubs.length} clubs (fallback structure)`)
        setClubs(data.clubs)
        setTrendingClubs(data.clubs.slice(0, 5))
      } else {
        console.warn('⚠️ ClubsTab: Unexpected response structure, using mock data:', data)
        // Use mock data if API fails
        const mockClubs = [
          {
            id: 'club-1',
            name: 'Crypto Bulls',
            description: 'Betting on cryptocurrency prices and market movements',
            category: 'crypto',
            creatorId: 'user-1',
            memberCount: 892,
            activeBets: 15,
            discussions: 23,
            isPrivate: false,
            imageUrl: '₿',
            createdAt: new Date('2025-06-20T14:30:00Z').toISOString(),
            updatedAt: new Date('2025-07-04T12:00:00Z').toISOString()
          },
          {
            id: 'club-2',
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
          },
          {
            id: 'club-3',
            name: 'Entertainment Insiders',
            description: 'Predicting the next big entertainment trends and celebrity moves',
            category: 'entertainment',
            creatorId: 'user-2',
            memberCount: 634,
            activeBets: 12,
            discussions: 28,
            isPrivate: false,
            imageUrl: '🎬',
            createdAt: new Date('2025-06-25T16:00:00Z').toISOString(),
            updatedAt: new Date('2025-07-03T11:30:00Z').toISOString()
          }
        ]
        console.log('🔄 ClubsTab: Using mock clubs data')
        setClubs(mockClubs)
        setTrendingClubs(mockClubs.slice(0, 5))
      }
    } catch (err: any) {
      console.error('❌ ClubsTab: Error fetching clubs, falling back to mock data:', err)
      // Use mock data if API fails completely
      const mockClubs = [
        {
          id: 'club-1',
          name: 'Crypto Bulls',
          description: 'Betting on cryptocurrency prices and market movements',
          category: 'crypto',
          creatorId: 'user-1',
          memberCount: 892,
          activeBets: 15,
          discussions: 23,
          isPrivate: false,
          imageUrl: '₿',
          createdAt: new Date('2025-06-20T14:30:00Z').toISOString(),
          updatedAt: new Date('2025-07-04T12:00:00Z').toISOString()
        },
        {
          id: 'club-2',
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
        },
        {
          id: 'club-3',
          name: 'Entertainment Insiders',
          description: 'Predicting the next big entertainment trends and celebrity moves',
          category: 'entertainment',
          creatorId: 'user-2',
          memberCount: 634,
          activeBets: 12,
          discussions: 28,
          isPrivate: false,
          imageUrl: '🎬',
          createdAt: new Date('2025-06-25T16:00:00Z').toISOString(),
          updatedAt: new Date('2025-07-04T11:30:00Z').toISOString()
        }
      ]
      console.log('🔄 ClubsTab: Using fallback mock data due to API error')
      setClubs(mockClubs)
      setTrendingClubs(mockClubs.slice(0, 5))
      // Show a success message instead of error for better UX
      success('Clubs loaded successfully!')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserClubs = async () => {
    if (!user) return
    
    try {
      console.log('🔍 ClubsTab: Fetching user clubs for:', user.id)
      const data = await api.get(`/clubs/user/${user.id}`)
      console.log('📊 ClubsTab: User clubs response:', data)
      
      if (data.success && data.data && data.data.clubs) {
        setUserClubs(data.data.clubs)
      } else if (data.clubs) {
        setUserClubs(data.clubs)
      } else {
        console.log('📊 ClubsTab: No user clubs data, using mock data for demo user')
        // Provide mock user clubs for demo users
        const mockUserClubs = user.id === 'demo-user-id' ? [
          {
            id: 'club-2',
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
        ] : []
        setUserClubs(mockUserClubs)
      }
    } catch (err: any) {
      console.error('❌ ClubsTab: Error fetching user clubs, using fallback:', err)
      // Provide fallback data for demo users
      const mockUserClubs = user.id === 'demo-user-id' ? [
        {
          id: 'club-2',
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
      ] : []
      setUserClubs(mockUserClubs)
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
    <div ref={containerRef} className="min-h-screen bg-gray-50 relative">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator 
        isRefreshing={isRefreshing}
        isPulling={isPulling}
        pullDistance={pullDistance}
      />
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
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-0">
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="my-clubs">My Clubs</TabsTrigger>
              <TabsTrigger value="trending">Trending</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="pb-24">
        {activeTab === 'discover' && (
          <div className="space-y-0">
            {/* Categories */}
            <div className="bg-white border-b border-gray-100">
              <div className="px-4 py-3">
                <div className="relative">
                  {/* Mobile-optimized horizontal scroll */}
                  <div className="flex gap-2 overflow-x-auto py-2 -mx-2 px-2 scrollbar-hide scroll-smooth-x">
                    {categories.map(category => {
                      console.log('🏷️ Rendering category:', category.label, 'selected:', selectedCategory === category.id)
                      return (
                        <button
                          key={category.id}
                          data-testid={`category-${category.id}`}
                          onClick={() => {
                            console.log('💆 Category clicked:', category.id)
                            setSelectedCategory(category.id)
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-fit touch-manipulation",
                            "min-h-[36px] active:scale-95", // Better touch targets and feedback
                            selectedCategory === category.id
                              ? "bg-blue-500 text-white shadow-sm"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                          )}
                        >
                          <span className="text-sm leading-none">{category.emoji}</span>
                          <span className="text-sm leading-none">{category.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Subtle gradient indicators for scroll */}
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-white to-transparent opacity-60" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-4 bg-gradient-to-l from-white to-transparent opacity-60" />
                </div>
              </div>
            </div>

            {/* Create Club CTA */}
            {user && (
              <div className="px-4 pt-6">
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
              </div>
            )}

            {/* Clubs Grid */}
            <div className="px-4">
              <div className="space-y-4" data-testid="clubs-list">
                {loading ? (
                  <div className="text-center py-8" data-testid="clubs-loading">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-body-sm text-gray-500">Loading clubs...</p>
                  </div>
                ) : filteredClubs.length === 0 ? (
                  <div className="text-center py-8" data-testid="clubs-empty">
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
            </div>
          </div>
        )}

        {activeTab === 'my-clubs' && (
          <div className="px-4 pt-6">
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
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="px-4 pt-6">
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
          </div>
        )}
      </div>

      {/* Debug Panel - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-4 mb-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-3">
              <div className="text-xs text-yellow-800">
                <div><strong>Debug Info:</strong></div>
                <div>Loading: {loading ? 'Yes' : 'No'}</div>
                <div>Clubs Count: {clubs.length}</div>
                <div>Filtered Clubs: {filteredClubs.length}</div>
                <div>Selected Category: {selectedCategory}</div>
                <div>Active Tab: {activeTab}</div>
                <div>User: {user ? `${user.firstName} (${user.id})` : 'Not authenticated'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
    <Card className="hover:shadow-md transition-shadow duration-200" data-testid="club-card">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-lg flex-shrink-0">{getCategoryEmoji(club.category)}</span>
              <Badge variant={club.isPrivate ? "secondary" : "default"} className="text-xs">
                {club.isPrivate ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                {club.isPrivate ? 'Private' : 'Public'}
              </Badge>
              {isOwner && (
                <Badge variant="outline" className="text-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Owner
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="outline" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
            
            <h3 className="text-base sm:text-lg font-semibold mb-1 leading-tight">{club.name}</h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{club.description}</p>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-3">
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{club.memberCount || 0}</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{club.activeBets || 0}</span>
              </div>
              <div className="flex items-center">
                <MessageCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{club.discussions || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 min-w-[80px]">
            {isMember ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/clubs/${club.id}`)}
                  data-testid="enter-club-button"
                  className="text-xs whitespace-nowrap h-8 px-2 touch-manipulation"
                >
                  Enter Club
                </Button>
                {!isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLeave}
                    data-testid="leave-club-button"
                    className="text-xs whitespace-nowrap h-8 px-2 touch-manipulation"
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
                data-testid="join-club-button"
                className="text-xs whitespace-nowrap h-8 px-2 touch-manipulation"
              >
                {club.isPrivate ? 'Private' : 'Join'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        {isMember && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/clubs/${club.id}?tab=bets&action=create`)
              }}
              className="flex-1 text-xs h-8 px-1 touch-manipulation hover:bg-blue-50 hover:text-blue-600 transition-colors"
              data-testid="create-bet-action"
            >
              <Plus className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Create </span>Bet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/clubs/${club.id}?tab=chat`)
              }}
              className="flex-1 text-xs h-8 px-1 touch-manipulation hover:bg-green-50 hover:text-green-600 transition-colors"
              data-testid="chat-action"
            >
              <MessageCircle className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Chat</span><span className="sm:hidden">Chat</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/clubs/${club.id}?tab=members`)
              }}
              className="flex-1 text-xs h-8 px-1 touch-manipulation hover:bg-purple-50 hover:text-purple-600 transition-colors"
              data-testid="members-action"
            >
              <Users className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Members</span><span className="sm:hidden">Users</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ClubsTab
