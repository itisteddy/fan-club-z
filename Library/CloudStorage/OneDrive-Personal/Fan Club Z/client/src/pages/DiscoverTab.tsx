import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, TrendingUp, Flame, Clock, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator'
import BetCard from '@/components/BetCard'
import { useBetStore } from '@/store/betStore'
import { useAuthStore } from '@/store/authStore'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { cn, debounce } from '@/lib/utils'
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFilter, setSelectedFilter] = useState('trending')
  const [isSearching, setIsSearching] = useState(false)
  
  // Use trendingBets from store if available, otherwise fallback to mockTrendingBets
  const bets = trendingBets && trendingBets.length > 0 ? trendingBets : mockTrendingBets

  // Pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Refreshing trending bets...')
    await fetchTrendingBets()
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
  }, [fetchTrendingBets])

  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh(handleRefresh)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setDebouncedSearchQuery(query)
      setIsSearching(false)
    }, 300),
    []
  )

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setIsSearching(value.length > 0)
    debouncedSearch(value)
  }

  // Filter bets based on selected criteria
  const filteredBets = bets.filter(bet => {
    const matchesSearch = debouncedSearchQuery === '' || 
                         bet.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                         bet.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                         bet.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || bet.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  console.log('🔍 DiscoverTab: Rendering with user:', user?.email, 'bets:', bets.length)
  console.log('🔍 DiscoverTab: trendingBets from store:', trendingBets?.length || 0)
  console.log('🔍 DiscoverTab: filteredBets:', filteredBets.length)
  console.log('🔍 DiscoverTab: first bet:', filteredBets[0]?.title || 'None')

  useEffect(() => {
    // Fetch trending bets on component mount
    fetchTrendingBets()
  }, [fetchTrendingBets])

  // Find the Bitcoin bet for the featured card
  const featuredBet = bets.find(bet => bet.title.toLowerCase().includes('bitcoin') && bet.title.toLowerCase().includes('100k'))

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 relative">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator 
        isRefreshing={isRefreshing}
        isPulling={isPulling}
        pullDistance={pullDistance}
      />

      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">
              Discover
            </h1>
            {user && (
              <p className="text-body text-gray-600 mt-1">
                Welcome back, {user.firstName}! 👋
              </p>
            )}
          </div>
          
          {/* Search Bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Input
                type="search"
                placeholder="Search bets..."
                className="w-full h-11 pl-11 pr-4 bg-gray-100 rounded-[10px] text-body placeholder-gray-500 focus:bg-gray-200 transition-colors block"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="search-input"
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      
      {/* Categories */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="relative">
            {/* Mobile-optimized horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto py-2 -mx-2 px-2 scrollbar-hide scroll-smooth-x">
              {categories.map((category) => (
                <button
                  key={category.id}
                  data-testid="category-button"
                  onClick={() => setSelectedCategory(category.id)}
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
              ))}
            </div>
            
            {/* Subtle gradient indicators for scroll */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-white to-transparent opacity-60" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-4 bg-gradient-to-l from-white to-transparent opacity-60" />
          </div>
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
            onClick={() => featuredBet && navigate(`/bets/${featuredBet.id}`)}
            disabled={!featuredBet}
          >
            View Details
          </Button>
        </div>
      </section>
      
      {/* Bet List */}
      <section className="px-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-title-2 font-bold" data-testid="search-results-header">
            {debouncedSearchQuery ? `Search Results` : 'Trending Now'}
          </h2>
          {debouncedSearchQuery && (
            <span className="text-body-sm text-gray-500" data-testid="search-results-count">
              {filteredBets.length} result{filteredBets.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {debouncedSearchQuery && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg" data-testid="search-query-display">
            <p className="text-body-sm text-blue-700">
              Showing results for: <span className="font-medium">"{debouncedSearchQuery}"</span>
            </p>
          </div>
        )}
        
        {filteredBets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-8" data-testid="empty-state">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl text-gray-400">
                {debouncedSearchQuery ? '🔍' : '🤔'}
              </span>
            </div>
            <h3 className="text-title-3 font-semibold mb-2" data-testid="empty-state-title">
              {debouncedSearchQuery 
                ? 'No Results Found' 
                : (trendingBets && trendingBets.length === 0 ? 'No Bets Found' : 'Unable to load bets')}
            </h3>
            <p className="text-body text-gray-500 text-center mb-6" data-testid="empty-state-message">
              {debouncedSearchQuery
                ? `No bets match "${debouncedSearchQuery}". Try different keywords or browse categories.`
                : (trendingBets && trendingBets.length === 0
                  ? 'Start exploring trending bets or create your own.'
                  : 'There was a problem loading bets. Please try again later.')}
            </p>
            {debouncedSearchQuery && (
              <Button
                onClick={() => {
                  setSearchQuery('')
                  setDebouncedSearchQuery('')
                }}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg"
                data-testid="clear-search-button"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4" data-testid="search-results">
            {filteredBets.map(bet => {
              console.log('🃏 Rendering BetCard for:', bet.id, bet.title)
              return (
                <BetCard key={bet.id} bet={bet} />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default DiscoverTab