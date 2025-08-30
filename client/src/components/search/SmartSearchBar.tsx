import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, X, TrendingUp, Clock, Users, DollarSign, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SearchFilters {
  query: string;
  category: string;
  status: string;
  sortBy: string;
  minPool: number;
  maxPool: number;
  timeRange: string;
  hasImage: boolean;
  verifiedOnly: boolean;
}

interface SmartSearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  initialFilters?: Partial<SearchFilters>;
  className?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: Star },
  { value: 'sports', label: 'Sports', icon: TrendingUp },
  { value: 'pop_culture', label: 'Pop Culture', icon: Star },
  { value: 'esports', label: 'Esports', icon: TrendingUp },
  { value: 'celebrity_gossip', label: 'Celebrity', icon: Star },
  { value: 'politics', label: 'Politics', icon: TrendingUp },
  { value: 'custom', label: 'Custom', icon: Star }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'settled', label: 'Settled' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: Clock },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'pool_size', label: 'Largest Pool', icon: DollarSign },
  { value: 'participants', label: 'Most Participants', icon: Users },
  { value: 'ending_soon', label: 'Ending Soon', icon: Clock }
];

const TIME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
];

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  onSearch,
  onClear,
  initialFilters = {},
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    status: 'all',
    sortBy: 'newest',
    minPool: 0,
    maxPool: 1000000,
    timeRange: 'all',
    hasImage: false,
    verifiedOnly: false,
    ...initialFilters
  });

  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update active filters when filters change
  useEffect(() => {
    const active: string[] = [];
    if (filters.query) active.push(`"${filters.query}"`);
    if (filters.category !== 'all') active.push(CATEGORIES.find(c => c.value === filters.category)?.label || '');
    if (filters.status !== 'all') active.push(STATUS_OPTIONS.find(s => s.value === filters.status)?.label || '');
    if (filters.sortBy !== 'newest') active.push(SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label || '');
    if (filters.minPool > 0) active.push(`Min $${filters.minPool.toLocaleString()}`);
    if (filters.maxPool < 1000000) active.push(`Max $${filters.maxPool.toLocaleString()}`);
    if (filters.timeRange !== 'all') active.push(TIME_RANGES.find(t => t.value === filters.timeRange)?.label || '');
    if (filters.hasImage) active.push('With Images');
    if (filters.verifiedOnly) active.push('Verified Only');
    
    setActiveFilters(active.filter(Boolean));
  }, [filters]);

  const handleSearch = useCallback(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const handleClear = useCallback(() => {
    const clearedFilters: SearchFilters = {
      query: '',
      category: 'all',
      status: 'all',
      sortBy: 'newest',
      minPool: 0,
      maxPool: 1000000,
      timeRange: 'all',
      hasImage: false,
      verifiedOnly: false
    };
    setFilters(clearedFilters);
    onClear();
  }, [onClear]);

  const removeFilter = useCallback((filterToRemove: string) => {
    const newFilters = { ...filters };
    
    if (filterToRemove === filters.query) {
      newFilters.query = '';
    } else if (CATEGORIES.find(c => c.label === filterToRemove)) {
      newFilters.category = 'all';
    } else if (STATUS_OPTIONS.find(s => s.label === filterToRemove)) {
      newFilters.status = 'all';
    } else if (SORT_OPTIONS.find(s => s.label === filterToRemove)) {
      newFilters.sortBy = 'newest';
    } else if (TIME_RANGES.find(t => t.label === filterToRemove)) {
      newFilters.timeRange = 'all';
    } else if (filterToRemove === 'With Images') {
      newFilters.hasImage = false;
    } else if (filterToRemove === 'Verified Only') {
      newFilters.verifiedOnly = false;
    } else if (filterToRemove.startsWith('Min $')) {
      newFilters.minPool = 0;
    } else if (filterToRemove.startsWith('Max $')) {
      newFilters.maxPool = 1000000;
    }
    
    setFilters(newFilters);
  }, [filters]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              onKeyPress={handleKeyPress}
              placeholder="Search predictions, topics..."
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all text-sm shadow-sm"
            />
            {filters.query && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, query: '' }))}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2.5 rounded-lg border transition-all ${
              isExpanded 
                ? 'bg-purple-50 border-purple-200 text-purple-600' 
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
          

        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              <span>{filter}</span>
              <button
                onClick={() => removeFilter(filter)}
                className="hover:bg-blue-100 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
          <button
            onClick={handleClear}
            className="px-3 py-1 text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Advanced Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-xl p-6 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CATEGORIES.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pool Size Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pool Size Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPool || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPool: Number(e.target.value) || 0 }))}
                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPool === 1000000 ? '' : filters.maxPool}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPool: Number(e.target.value) || 1000000 }))}
                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TIME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Filters */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Additional Filters
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasImage}
                      onChange={(e) => setFilters(prev => ({ ...prev, hasImage: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">With Images</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, verifiedOnly: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Verified Creators Only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleClear}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
