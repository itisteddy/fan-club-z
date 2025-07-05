import React, { useState, useEffect } from 'react'
import { Search, Filter, TrendingUp, Flame, Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import BetCard from '@/components/BetCard'
import { useBetStore } from '@/store/betStore'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Bet } from '@shared/schema'

// Mock data for development
const mockTrendingBets: Bet[] = [
  {
    id: '1',
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
    id: '2',
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
    entryDeadline: '2025-07-15T14:00:00Z',
    settlementMethod: 'auto',
    isPrivate: false,
    likes: 445,
    comments: 123,
    shares: 67,
    createdAt: '2025-07-02T09:15:00Z',
    updatedAt: '2025-07-04T16:20:00Z'
  },
  {
    id: '3',
    creatorId: 'user3',
    title: 'Taylor Swift announces surprise album?',
    description: 'Swifties are convinced she\'s dropping hints. Will T-Swift surprise us with a new album announcement this month?',
    type: 'binary',
    category: 'pop',
    options: [
      { id: 'yes', label: 'Yes, she will', totalStaked: 6500 },
      { id: 'no', label: 'No announcement', totalStaked: 4200 }
    ],
    status: 'open',
    stakeMin: 1,
    stakeMax: 100,
    poolTotal: 10700,
    entryDeadline: '2025-07-31T23:59:59Z',
    settlementMethod: 'manual',
    isPrivate: false,
    likes: 156,
    comments: 89,
    shares: 234,
    createdAt: '2025-07-03T14:22:00Z',
    updatedAt: '2025-07-04T11:18:00Z'
  }
]

const categories = [
  { id: 'all', label: 'All', icon: Star, emoji: '⭐' },
  { id: 'sports', label: 'Sports', icon: TrendingUp, emoji: '⚽' },
  { id: 'pop', label: 'Pop Culture', icon: Flame, emoji: '🎭' },
  { id: 'crypto', label: 'Crypto', icon: TrendingUp, emoji: '₿' },
  { id: 'politics', label: 'Politics', icon: Clock, emoji: '🏛️' },
  { id: 'custom', label: 'Custom', icon: Star, emoji: '🎯' },
]

const filterOptions = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'ending-soon', label: 'Ending Soon', icon: Clock },
  { id: 'high-volume', label: 'High Volume', icon: TrendingUp },
]

export const DiscoverTab: React.FC = () => {
  const { user } = useAuthStore()
  const { fetchTrendingBets, trendingBets, filters, updateFilters } = useBetStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFilter, setSelectedFilter] = useState('trending')
  const [bets, setBets] = useState<Bet[]>(mockTrendingBets) // Using mock data for now

  useEffect(() => {
    // Fetch trending bets on component mount
    fetchTrendingBets()
  }, [fetchTrendingBets])

  // Filter bets based on selected criteria
  const filteredBets = bets.filter(bet => {
    const matchesSearch = bet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bet.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || bet.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20">
        <div className="p-4">
          {/* Welcome Message */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {user ? `Welcome back, ${user.firstName}! 👋` : 'Discover Bets 🚀'}
            </h1>
            <p className="text-gray-600">
              {user ? 'Ready to make some predictions?' : 'Join the fun and start betting on what matters to you'}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search bets, topics, or creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 text-base border-gray-200 focus:border-primary focus:ring-primary"
            />
          </div>

          {/* Category Pills */}
          <div className="flex space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                  selectedCategory === category.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary"
                )}
              >
                <span className="text-base">{category.emoji}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>

          {/* Filter Options */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {filterOptions.map((filter) => {
              const Icon = filter.icon
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
                    selectedFilter === filter.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {filteredBets.length}
              </div>
              <div className="text-sm text-gray-600">Active Bets</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                ${Math.round(filteredBets.reduce((sum, bet) => sum + bet.poolTotal, 0) / 1000)}K
              </div>
              <div className="text-sm text-gray-600">Total Volume</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                24h
              </div>
              <div className="text-sm text-gray-600">Hot Streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Trending Horizontal Scroll */}
        {selectedFilter === 'trending' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <Flame className="w-5 h-5 text-orange-500 mr-2" />
                Trending Now
              </h2>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            
            <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
              {filteredBets.slice(0, 5).map((bet) => (
                <BetCard
                  key={bet.id}
                  bet={bet}
                  variant="horizontal"
                  className="min-w-0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Main Bet Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {selectedCategory === 'all' ? 'All Bets' : 
               categories.find(c => c.id === selectedCategory)?.label + ' Bets'}
            </h2>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                Filters
              </Button>
            </div>
          </div>

          {filteredBets.length > 0 ? (
            <div className="space-y-4">
              {filteredBets.map((bet) => (
                <BetCard
                  key={bet.id}
                  bet={bet}
                  variant="vertical"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No bets found
              </h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search or browse different categories
              </p>
              <Button onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Create Bet CTA */}
        {user && (
          <div className="mt-8 p-6 bg-gradient-to-r from-primary to-primary-600 rounded-xl text-white text-center">
            <h3 className="text-lg font-bold mb-2">Got a prediction?</h3>
            <p className="text-primary-100 mb-4">
              Create your own bet and let others join the fun!
            </p>
            <Button variant="secondary" className="bg-white text-primary hover:bg-gray-100">
              Create Bet
            </Button>
          </div>
        )}
      </div>

      {/* Bottom padding for mobile navigation */}
      <div className="h-24"></div>
    </div>
  )
}

export default DiscoverTab
