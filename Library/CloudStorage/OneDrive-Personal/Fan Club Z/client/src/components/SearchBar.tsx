import React, { useState, useRef, useEffect } from 'react'
import { Search, X, TrendingUp, Clock, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocation } from 'wouter'
import { cn, debounce } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'bet' | 'club' | 'user'
  title: string
  subtitle?: string
  category?: string
  icon?: string
}

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
}

// Mock search results for demo
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'bet',
    title: 'Bitcoin to $100K by 2025?',
    subtitle: 'Crypto prediction',
    category: 'crypto',
    icon: '₿'
  },
  {
    id: '2',
    type: 'bet',
    title: 'Arsenal vs Chelsea Match',
    subtitle: 'Premier League',
    category: 'sports',
    icon: '⚽'
  },
  {
    id: '3',
    type: 'club',
    title: 'Premier League Predictors',
    subtitle: '1,247 members',
    category: 'sports',
    icon: '⚽'
  },
  {
    id: '4',
    type: 'club',
    title: 'Crypto Bulls',
    subtitle: '892 members',
    category: 'crypto',
    icon: '₿'
  }
]

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search bets, clubs, or users...",
  className,
  onSearch
}) => {
  const [, setLocation] = useLocation()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search function
  const debouncedSearch = debounce(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    
    // Simulate API call delay
    setTimeout(() => {
      const filteredResults = mockSearchResults.filter(result =>
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      setResults(filteredResults)
      setIsLoading(false)
    }, 300)
  }, 300)

  const handleInputChange = (value: string) => {
    setQuery(value)
    setIsOpen(true)
    onSearch?.(value)
    debouncedSearch(value)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleResultClick = (result: SearchResult) => {
    setQuery(result.title)
    setIsOpen(false)
    
    // Navigate based on result type
    switch (result.type) {
      case 'bet':
        setLocation(`/bets/${result.id}`)
        break
      case 'club':
        setLocation(`/clubs/${result.id}`)
        break
      case 'user':
        setLocation(`/profile/${result.id}`)
        break
    }
  }

  const getResultIcon = (result: SearchResult) => {
    switch (result.type) {
      case 'bet':
        return <TrendingUp className="w-4 h-4 text-primary" />
      case 'club':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'user':
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />
      default:
        return <Search className="w-4 h-4 text-gray-400" />
    }
  }

  const getResultBadge = (result: SearchResult) => {
    const badges = {
      bet: { label: 'Bet', color: 'bg-primary/10 text-primary' },
      club: { label: 'Club', color: 'bg-blue-50 text-blue-600' },
      user: { label: 'User', color: 'bg-purple-50 text-purple-600' }
    }
    
    const badge = badges[result.type]
    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', badge.color)}>
        {badge.label}
      </span>
    )
  }

  return (
    <div ref={searchRef} className={cn('relative w-full max-w-md', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 py-3 text-base border-gray-200 focus:border-primary focus:ring-primary"
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query || results.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto shadow-lg border border-gray-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Searching...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="py-2">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {result.icon ? (
                        <span className="text-lg">{result.icon}</span>
                      ) : (
                        getResultIcon(result)
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    
                    {/* Badge */}
                    <div className="flex-shrink-0">
                      {getResultBadge(result)}
                    </div>
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="p-4 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No results found for "{query}"</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try different keywords or browse categories
                </p>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Popular Searches</p>
                <div className="space-y-2">
                  {['Bitcoin predictions', 'Premier League', 'Celebrity gossip', 'Crypto clubs'].map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleInputChange(suggestion)}
                      className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SearchBar
