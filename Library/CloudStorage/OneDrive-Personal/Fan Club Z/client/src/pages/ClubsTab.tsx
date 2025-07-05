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
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Clubs 🏆
          </h1>
          <p className="text-gray-600">
            Join communities and bet with like-minded people
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
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
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">{filteredClubs.length}</div>
              <div className="text-xs text-gray-600">Active Clubs</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">
                {filteredClubs.reduce((sum, club) => sum + club.memberCount, 0)}
              </div>
              <div className="text-xs text-gray-600">Total Members</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">
                {user ? '3' : '0'}
              </div>
              <div className="text-xs text-gray-600">Joined</div>
            </CardContent>
          </Card>
        </div>

        {/* Create Club CTA */}
        {user && (
          <Card className="mb-6 bg-gradient-to-r from-primary to-primary-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold mb-1">Start Your Own Club</h3>
                  <p className="text-sm text-primary-100">
                    Create a community around your interests
                  </p>
                </div>
                <Button variant="secondary" size="sm" className="bg-white text-primary hover:bg-gray-100">
                  <Plus className="w-4 h-4 mr-1" />
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trending Clubs */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="w-5 h-5 text-orange-500 mr-2" />
            Trending Clubs
          </h2>
          <div className="space-y-3">
            {filteredClubs.filter(club => club.trending).map((club) => (
              <Card key={club.id} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{club.imageUrl}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{club.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{club.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {club.memberCount.toLocaleString()} members
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded-full">
                            {categories.find(c => c.id === club.category)?.emoji} {club.category}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          {user ? 'Join' : 'View'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Clubs */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            All Clubs
          </h2>
          <div className="space-y-3">
            {filteredClubs.filter(club => !club.trending).map((club) => (
              <Card key={club.id} className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{club.imageUrl}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{club.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{club.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {club.memberCount.toLocaleString()} members
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded-full">
                            {categories.find(c => c.id === club.category)?.emoji} {club.category}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          {user ? 'Join' : 'View'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredClubs.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No clubs found
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
    </div>
  )
}

export default ClubsTab
