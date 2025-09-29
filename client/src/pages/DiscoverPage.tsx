import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePredictionStore, Prediction } from '../store/predictionStore';
import { toast } from 'react-hot-toast';
import PredictionCard from '../components/PredictionCard';
import PredictionCardV3, { PredictionCardV3Skeleton } from '../components/predictions/PredictionCardV3';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Loader2, Bell } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import PredictionCardSkeleton from '../components/PredictionCardSkeleton';
import { PlacePredictionModal } from '../components/predictions/PlacePredictionModal';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import Logo from '../components/common/Logo';
import useScrollPreservation from '../hooks/useScrollPreservation';
import AppHeader from '../components/layout/AppHeader';
import { formatUSDCompact, formatNumberShort } from '@lib/format';
import { useNavigate } from 'react-router-dom';

interface DiscoverPageProps {
  onNavigateToProfile?: () => void;
  onNavigateToPrediction?: (predictionId: string) => void;
}

// Enhanced Category Filter Component
const CategoryFilters = React.memo(function CategoryFilters({ 
  selectedCategory, 
  onSelect 
}: {
  selectedCategory: string;
  onSelect: (category: string) => void;
}) {
  const categories = [
    { id: 'all', label: 'All', icon: '🌟' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'pop_culture', label: 'Pop Culture', icon: '🎬' },
    { id: 'custom', label: 'Custom', icon: '✨' },
    { id: 'politics', label: 'Politics', icon: '🗳️' },
    { id: 'crypto', label: 'Crypto', icon: '₿' },
    { id: 'tech', label: 'Tech', icon: '💻' },
    { id: 'finance', label: 'Finance', icon: '📈' }
  ];

  return (
    <div className="category-filters bg-white border-b border-gray-100 px-4 py-3" data-tour-id="category-filters">
      <div className="category-filters-container overflow-x-auto -mx-2 px-2">
        <div className="category-filters-flex flex gap-2 pb-1">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`
                category-pill flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-200 whitespace-nowrap
                ${selectedCategory === category.id
                  ? 'active bg-purple-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              whileTap={{ scale: 0.96 }}
            >
              {/* Removed emoji icons in category chips to align with standard iconography preference */}
              <span>{category.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
});

CategoryFilters.displayName = 'CategoryFilters';

// Enhanced Discover Header Component
const DiscoverHeaderContent = React.memo(function DiscoverHeaderContent({ 
  stats, 
  searchQuery, 
  onSearchChange
}: {
  stats: any;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) {
  return (
    <div className="px-4 pt-4 pb-4 bg-white">
      {/* Live market stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-900">LIVE MARKETS</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900" title={`Total volume: ${(stats?.totalVolume || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}>
              {formatUSDCompact(stats?.totalVolume)}
            </div>
            <div className="text-xs text-gray-600">Volume</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900" title={`${(stats?.activePredictions || 0).toLocaleString()} active predictions`}>
              {formatNumberShort(stats?.activePredictions)}
            </div>
            <div className="text-xs text-gray-600">Live</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900" title={`${(stats?.totalUsers || 0).toLocaleString()} total players`}>
              {formatNumberShort(stats?.totalUsers)}
            </div>
            <div className="text-xs text-gray-600">Players</div>
          </div>
        </div>
      </motion.div>

      {/* Search bar */}
      <div className="relative" data-tour-id="search-bar">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search predictions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
        />
      </div>
    </div>
  );
});

DiscoverHeaderContent.displayName = 'DiscoverHeaderContent';

// Main DiscoverPage Component
const DiscoverPage = React.memo(function DiscoverPage({ onNavigateToProfile, onNavigateToPrediction }: DiscoverPageProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { 
    predictions, 
    loading, 
    loadingMore, 
    pagination, 
    filters,
    refreshPredictions,
    loadMorePredictions,
    setFilters 
  } = usePredictionStore();
  
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  
  // Scroll preservation setup
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveScroll } = useScrollPreservation(containerRef, {
    saveOnUnmount: true,
    restoreOnMount: true,
    preserveFor: 15, // 15 minutes
    threshold: 100 // Only save if scrolled more than 100px
  });

  const [platformStats, setPlatformStats] = useState({
    totalVolume: '0',
    activePredictions: 0,
    totalUsers: '0',
    rawVolume: 0,
    rawUsers: 0
  });

  // Fetch platform stats
  const fetchPlatformStats = useCallback(async () => {
    try {
      // Use the same environment API URL logic as the rest of the app
      const { getApiUrl } = await import('@/utils/environment');
      const response = await fetch(`${getApiUrl()}/api/v2/predictions/stats/platform`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPlatformStats(data.data);
          console.log('✅ Platform stats fetched:', data.data);
        }
      } else {
        console.error('Failed to fetch platform stats:', response.status);
      }
    } catch (error) {
      console.error('Error fetching platform stats:', error);
    }
  }, []);

  // Setup infinite scroll on container
  useInfiniteScroll({
    hasNext: pagination.hasNext,
    loading: loadingMore,
    onLoadMore: () => {
      console.log('🔄 Infinite scroll triggered in DiscoverPage:', {
        hasNext: pagination.hasNext,
        loading: loadingMore,
        currentPage: pagination.page,
        total: pagination.total
      });
      loadMorePredictions();
    },
    threshold: 300,
    container: containerRef.current
  });

  // Initialize data on mount
  useEffect(() => {
    refreshPredictions();
    fetchPlatformStats();
  }, [refreshPredictions, fetchPlatformStats]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalVolume: platformStats.totalVolume,
    activePredictions: platformStats.activePredictions,
    totalUsers: platformStats.totalUsers
  }), [platformStats]);

  // Backend now handles filtering - no additional filtering needed
  const displayPredictions = useMemo(() => {
    if (!predictions || !Array.isArray(predictions)) {
      console.log('🔍 DiscoverPage Debug - No valid predictions array:', predictions);
      return [];
    }
    
    console.log(`🔍 DiscoverPage Debug - Displaying ${predictions.length} predictions`);
    return predictions.filter(prediction => {
      // Safety check for prediction object only
      if (!prediction || !prediction.id || !prediction.title) {
        console.warn('⚠️ DiscoverPage: Invalid prediction object:', prediction);
        return false;
      }
      return true;
    });
  }, [predictions]);

  // Event handlers
  const handlePredict = useCallback((prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setIsPredictionModalOpen(true);
  }, []);

  const handleNavigateToPrediction = useCallback((predictionId: string) => {
    // Save scroll position before navigating
    saveScroll('/discover');
    
    if (onNavigateToPrediction) {
      onNavigateToPrediction(predictionId);
    } else {
      window.location.href = `/prediction/${predictionId}`;
    }
  }, [onNavigateToPrediction, saveScroll]);

  const handleLike = useCallback((predictionId: string) => {
    toast.success('Prediction liked!');
  }, []);

  const handleComment = useCallback((predictionId: string) => {
    // Save scroll before navigating to comments
    saveScroll('/discover');
    handleNavigateToPrediction(predictionId);
  }, [handleNavigateToPrediction, saveScroll]);

  const handleShare = useCallback((prediction: Prediction) => {
    const shareText = `Check out this prediction: ${prediction.title}`;
    const shareUrl = `${window.location.origin}/prediction/${prediction.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: prediction.title,
        text: shareText,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    console.log('🔍 Search query changed:', query);
    setFilters({ search: query });
  }, [setFilters]);

  const handleCategorySelect = useCallback((category: string) => {
    console.log('📂 Category changed:', category);
    setFilters({ category });
  }, [setFilters]);

  const handleModalClose = useCallback(() => {
    setIsPredictionModalOpen(false);
    setSelectedPrediction(null);
  }, []);

  // Show optimized loading state
  if (loading && (!predictions || predictions.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-100">
          <div className="h-11" />
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-8 bg-gray-200 rounded w-24 mb-2 loading-skeleton"></div>
                <div className="h-4 bg-gray-200 rounded w-32 loading-skeleton"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full loading-skeleton"></div>
            </div>
            <div className="bg-gray-200 rounded-2xl p-4 mb-4 loading-skeleton">
              <div className="h-4 bg-gray-300 rounded w-20 mb-3 loading-skeleton"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="h-6 bg-gray-300 rounded mb-1 loading-skeleton"></div>
                  <div className="h-3 bg-gray-300 rounded w-16 mx-auto loading-skeleton"></div>
                </div>
                <div className="text-center">
                  <div className="h-6 bg-gray-300 rounded mb-1 loading-skeleton"></div>
                  <div className="h-3 bg-gray-300 rounded w-12 mx-auto loading-skeleton"></div>
                </div>
                <div className="text-center">
                  <div className="h-6 bg-gray-300 rounded mb-1 loading-skeleton"></div>
                  <div className="h-3 bg-gray-300 rounded w-14 mx-auto loading-skeleton"></div>
                </div>
              </div>
            </div>
            <div className="h-12 bg-gray-200 rounded-xl loading-skeleton"></div>
          </div>
        </div>

        {/* Category filters skeleton */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-20 flex-shrink-0 loading-skeleton"></div>
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="py-4">
          <div className="px-4 mb-6">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2 loading-skeleton"></div>
            <div className="h-4 bg-gray-200 rounded w-24 loading-skeleton"></div>
          </div>
          
          {/* Prediction card skeletons */}
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <PredictionCardV3Skeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="discover-page content-with-bottom-nav" 
      data-scroll-container
      style={{ position: 'relative', zIndex: 1, overflowY: 'auto', height: '100vh' }}
    >
      {/* Unified Header - Minimal (no logo, no descriptive text) */}
      <AppHeader title="Discover" />
      
      {/* Header Content */}
      <DiscoverHeaderContent 
        stats={stats} 
        searchQuery={filters.search}
        onSearchChange={handleSearchChange}
      />

      {/* Category filters with explicit positioning */}
      <div className="category-filters-wrapper" style={{ position: 'relative', zIndex: 45 }}>
        <CategoryFilters 
          selectedCategory={filters.category} 
          onSelect={handleCategorySelect} 
        />
      </div>

      {/* Content with proper spacing */}
      <div className="prediction-cards-container">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-4"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-1" data-tour-id="discover-list">
            {filters.category === 'all' ? 'All Predictions' : `${filters.category} Predictions`}
            {filters.search && ` - "${filters.search}"`}
          </h2>
          {/* Show pagination info instead of static count */}
          {pagination.total > 0 && (
            <p className="text-sm text-gray-600">
              Showing {displayPredictions.length} of {pagination.total} predictions
              {pagination.hasNext && ' • Scroll for more'}
            </p>
          )}
        </motion.div>

        {/* Predictions Grid with infinite scroll */}
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {displayPredictions.length > 0 ? (
              <>
                {displayPredictions.map((prediction, index) => {
                  // Additional safety check before rendering
                  if (!prediction || !prediction.id) {
                    console.warn('⚠️ DiscoverPage: Skipping invalid prediction at index', index);
                    return null;
                  }
                  
                  return (
                    <PredictionCardV3
                      key={`${prediction.id}-${index}`}
                      prediction={{
                        id: prediction.id,
                        title: prediction.title,
                        category: prediction.category,
                        endsAt: prediction.entry_deadline,
                        pool: prediction.pool_total,
                        players: prediction.participant_count,
                        options: prediction.options?.slice(0, 2).map(opt => ({
                          label: opt.label,
                          odds: opt.current_odds
                        })),
                        description: prediction.description
                      }}
                    />
                  );
                })}
                
                {/* Loading more indicator */}
                {loadingMore && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center py-8"
                  >
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500 mr-3" />
                    <span className="text-gray-600">Loading more predictions...</span>
                  </motion.div>
                )}
                
                {/* Debug info and manual load more button */}
                {pagination.hasNext && !loadingMore && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <button
                      onClick={() => {
                        console.log('🔄 Manual load more triggered');
                        loadMorePredictions();
                      }}
                      className="bg-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-600 transition-colors"
                    >
                      Load More ({pagination.total - displayPredictions.length} remaining)
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Page {pagination.page} • {displayPredictions.length}/{pagination.total}
                    </p>
                  </motion.div>
                )}
                
                {/* End of list indicator */}
                {!pagination.hasNext && !loadingMore && displayPredictions.length > 10 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <p className="text-gray-500 text-sm">
                      🎉 You've seen all predictions!
                    </p>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-12 px-4"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No predictions found</h3>
                <p className="text-gray-600">
                  {filters.search 
                    ? `No predictions match "${filters.search}"`
                    : loading 
                      ? 'Loading predictions...'
                      : 'Try adjusting your filters or check back later'
                  }
                </p>
                {!loading && !filters.search && (
                  <button
                    onClick={() => refreshPredictions(true)}
                    className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Refresh Predictions
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Prediction Modal */}
      <PlacePredictionModal
        prediction={selectedPrediction}
        isOpen={isPredictionModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
});

DiscoverPage.displayName = 'DiscoverPage';

export default DiscoverPage;
