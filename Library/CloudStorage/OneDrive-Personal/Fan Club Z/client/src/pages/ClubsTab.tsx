import React, { useState } from 'react'
import { Search, Users, Plus, TrendingUp, Star, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

// Mock clubs data
const mockClubs = [
  {
    id: '1',
    name: 'Premier League Predictors',
    description: 'The ultimate destination for Premier League betting and predictions',
    category: 'sports',
    memberCount: 1247,
    imageUrl: '⚽',
    isPrivate: false,
    trending: true,
  },
  {
    id: '2', 
    name: 'Crypto Bulls',
    description: 'Betting on cryptocurrency prices and market movements',
    category: 'crypto',
    memberCount: 892,
    imageUrl: '₿',
    isPrivate: false,
    trending: true,
  },
  {
    id: '3',
    name: 'Pop Culture Central',
    description: 'Celebrity drama, award shows, and entertainment bets',
    category: 'pop',
    memberCount: 2156,
    imageUrl: '🎭',
    isPrivate: false,
    trending: false,
  },
]

const categories = [
  { id: 'all', label: 'All', emoji: '⭐' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'crypto', label: 'Crypto', emoji: '₿' },
  { id: 'pop', label: 'Pop Culture', emoji: '🎭' },
  { id: 'general', label: 'General', emoji: '💬' },
]

export const ClubsTab: React.FC = () => {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [clubs] = useState(mockClubs)

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         club.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || club.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
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

      <div className="px-4 pb-24">
        {/* Categories */}
        <div className="flex space-x-3 overflow-x-auto py-4 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-[10px] text-body-sm font-medium whitespace-nowrap transition-all duration-200",
                selectedCategory === category.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              )}
            >
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-title-3 font-bold text-gray-900">{filteredClubs.length}</div>
            <div className="text-caption-1 text-gray-500">Active Clubs</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-title-3 font-bold text-gray-900">
              {filteredClubs.reduce((sum, club) => sum + club.memberCount, 0).toLocaleString()}
            </div>
            <div className="text-caption-1 text-gray-500">Total Members</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Star className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-title-3 font-bold text-gray-900">
              {user ? '3' : '0'}
            </div>
            <div className="text-caption-1 text-gray-500">Joined</div>
          </div>
        </div>

        {/* Create Club CTA */}
        {user && (
          <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-title-3 font-bold mb-1">Start Your Own Club</h3>
                <p className="text-body-sm opacity-90">
                  Create a community around your interests
                </p>
              </div>
              <Button variant="apple-secondary" size="apple-sm" className="bg-white/20 text-white hover:bg-white/30">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
        )}

        {/* Trending Clubs */}
        <div className="mb-8">
          <h2 className="text-title-2 font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
            Trending Clubs
          </h2>
          <div className="space-y-3">
            {filteredClubs.filter(club => club.trending).map((club) => (
              <div key={club.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{club.imageUrl}</div>
                  <div className="flex-1">
                    <h3 className="text-body font-semibold text-gray-900 mb-1">{club.name}</h3>
                    <p className="text-body-sm text-gray-600 mb-3">{club.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-caption-1 text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {club.memberCount.toLocaleString()} members
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded-[6px]">
                          {categories.find(c => c.id === club.category)?.emoji} {club.category}
                        </span>
                      </div>
                      <Button variant="apple-secondary" size="apple-sm">
                        {user ? 'Join' : 'View'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Clubs */}
        <div>
          <h2 className="text-title-2 font-bold text-gray-900 mb-4">
            All Clubs
          </h2>
          <div className="space-y-3">
            {filteredClubs.filter(club => !club.trending).map((club) => (
              <div key={club.id} className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{club.imageUrl}</div>
                  <div className="flex-1">
                    <h3 className="text-body font-semibold text-gray-900 mb-1">{club.name}</h3>
                    <p className="text-body-sm text-gray-600 mb-3">{club.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-caption-1 text-gray-500">
                        <span className="flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {club.memberCount.toLocaleString()} members
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded-[6px]">
                          {categories.find(c => c.id === club.category)?.emoji} {club.category}
                        </span>
                      </div>
                      <Button variant="apple-secondary" size="apple-sm">
                        {user ? 'Join' : 'View'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClubsTab
