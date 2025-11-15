import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, DollarSign, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePredictionStore, Prediction } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import useScrollPreservation from '../hooks/useScrollPreservation';
import DensePredictionCard from '../components/cards/DensePredictionCard';
import StickyFilters from '../components/filters/StickyFilters';
import { 
  DiscoverPageSkeleton, 
  LoadMoreSkeleton, 
  EmptyDiscoverSkeleton,
  FilterPillsSkeleton 
} from '../components/skeletons/DiscoverSkeletons';
import { BOTTOM_NAV_CLEARANCE } from '../utils/navigation';
import { cn } from '@/utils/cn';
import { getApiUrl } from '@/utils/environment';

interface DiscoverPageProps {
  onNavigateToProfile?: () => void;
  onNavigateToPrediction?: (predictionId: string) => void;
}

interface PlatformStats {
  totalVolume: string;
  activePredictions: number;
  totalUsers: number;
}

const PolishedDiscoverPage: React.FC<DiscoverPageProps> = ({
  onNavigateToProfile,
  onNavigateToPrediction
}) => {
  // State
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
  });
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [searchInputValue, setSearchInputValue] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Store hooks
  const { 
    predictions, 
    isLoading, 
    error, 
    hasMore, 
    fetchPredictions, 
    loadMore,
    refreshPredictions
  } = usePredictionStore();
  const { user } = useAuthStore();

  // Scroll preservation
  useScrollPreservation('discover-page', containerRef);

  // Filter definitions
  const filterOptions = useMemo(() => [
    { id: 'all', label: 'All', color: 'default' as const },
    { id: 'sports', label: 'Sports', color: 'emerald' as const, count: 12 },
    { id: 'politics', label: 'Politics', color: 'blue' as const, count: 8 },
    { id: 'crypto', label: 'Crypto', color: 'orange' as const, count: 15 },
    { id: 'entertainment', label: 'Entertainment', color: 'purple' as const, count: 6 },
    { id: 'business', label: 'Business', color: 'emerald' as const, count: 4 },
    { id: 'technology', label: 'Technology', color: 'blue' as const, count: 9 },
  ], []);

  // Filtered predictions
  const filteredPredictions = useMemo(() => {
    if (!predictions) return [];
    
    return predictions.filter(prediction => {
      // Category filter
      if (filters.category !== 'all' && prediction.category !== filters.category) {
        return false;
      }
      
      // Search filter
      if (filters.search && !prediction.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [predictions, filters]);

  // Fetch platform stats
  const fetchPlatformStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/stats/platform`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch platform stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchPredictions();
    fetchPlatformStats();
  }, [fetchPredictions, fetchPlatformStats]);

  // Search debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInputValue }));
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInputValue]);

  // Infinite scroll
  const { containerProps, endOfListRef } = useInfiniteScroll({
    hasMore,
    loadMore,
    isLoading: isLoading,
    threshold: 400
  });

  // Handlers
  const handleCategoryChange = useCallback((category: string) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInputValue(value);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshPredictions(),
        fetchPlatformStats()
      ]);
      toast.success('Refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshPredictions, fetchPlatformStats]);

  const handleRetry = useCallback(() => {
    fetchPredictions();
    fetchPlatformStats();
  }, [fetchPredictions, fetchPlatformStats]);

  // Loading states
  if (isLoading && !predictions) {
    return <DiscoverPageSkeleton />;
  }

  if (error && !predictions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't load the predictions. Please try again.
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "min-h-screen bg-gray-50",
        BOTTOM_NAV_CLEARANCE
      )}
      {...containerProps}
    >
      {/* Header - stats removed per request; keep search bar only */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 py-6">
          {/* Search Bar */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search predictions..."
              value={searchInputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={cn(
                "w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200",
                "rounded-xl transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
                "focus:bg-white placeholder-gray-500"
              )}
            />
            {(isRefreshing || isLoading) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Sticky Filter Pills */}
      <Suspense fallback={<FilterPillsSkeleton />}>
        <StickyFilters
          filters={filterOptions}
          selectedFilter={filters.category}
          onFilterChange={handleCategoryChange}
          showFilterIcon={true}
        />
      </Suspense>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {filters.category === 'all' ? 'All Predictions' : 
             `${filters.category.charAt(0).toUpperCase() + filters.category.slice(1)} Predictions`}
            {filters.search && ` - "${filters.search}"`}
          </h2>
          <p className="text-sm text-gray-600">
            {filteredPredictions.length} predictions available
          </p>
        </motion.div>

        {/* Predictions List */}
        <AnimatePresence mode="wait">
          {filteredPredictions.length === 0 ? (
            <EmptyDiscoverSkeleton
              title="No predictions found"
              description="Try adjusting your filters or check back later for new predictions"
              showRetry={!!error}
              onRetry={handleRetry}
            />
          ) : (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredPredictions.map((prediction: Prediction, index: number) => (
                <DensePredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  index={index}
                />
              ))}
              
              {/* Load More Trigger */}
              <div ref={endOfListRef} />
              
              {/* Loading More */}
              {isLoading && hasMore && <LoadMoreSkeleton />}
              
              {/* End of List */}
              {!hasMore && filteredPredictions.length > 0 && (
                <motion.div 
                  className="text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p className="text-gray-500 text-sm">
                    You've seen all predictions
                  </p>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="mt-2 px-4 py-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {isRefreshing ? 'Refreshing...' : 'Refresh for new predictions'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PolishedDiscoverPage;
