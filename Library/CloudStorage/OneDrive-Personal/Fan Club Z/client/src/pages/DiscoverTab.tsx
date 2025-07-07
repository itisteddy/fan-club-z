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
import { useLocation } from 'wouter'

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
  const [location, navigate] = useLocation()
  
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
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">
              {user ? `Welcome back, ${user.firstName}! 👋` : 'Discover Bets 🚀'}
            </h1>
          </div>
          
          {/* Search Bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Search bets, topics, or creators..."
                className="w-full h-11 pl-11 pr-4 bg-gray-100 rounded-[10px] text-body placeholder-gray-500 focus:bg-gray-200 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>
      
      {/* Categories */}
      <div className="px-4 py-3">
        <div className="relative">
          <div className="flex space-x-3 overflow-x-auto py-3 scrollbar-hide px-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-full text-body-sm font-medium whitespace-nowrap transition-all duration-200",
                  selectedCategory === category.id
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                )}
              >
                <span className="text-base">{category.emoji}</span>
                <span>{category.label}</span>
              </button>
            ))}
          </div>
          {/* Left fade */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-gray-50 via-gray-50/80 to-transparent" />
          {/* Right fade */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-gray-50 via-gray-50/80 to-transparent" />
        </div>
      </div>
      
      {/* Featured Section */}
      <section className="px-4 mb-8">
        <h2 className="text-title-2 font-bold mb-4">Featured</h2>
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white">
          <h3 className="text-title-1 font-bold mb-2">
            Today's Top Bet
          </h3>
          <p className="text-body opacity-90 mb-4">
            Bitcoin to hit $100K by year end?
          </p>
          <Button
            className="bg-white/20 backdrop-blur-md px-6 h-11 rounded-[10px] font-medium"
            onClick={() => navigate(`/bets/${bets[0].id}`)}
          >
            View Details
          </Button>
        </div>
      </section>
      
      {/* Bet List */}
      <section className="px-4 pb-24">
        <h2 className="text-title-2 font-bold mb-4">Trending Now</h2>
        <div className="space-y-4">
          {filteredBets.map(bet => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default DiscoverTab
