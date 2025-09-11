import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePredictionStore, Prediction } from '../store/predictionStore';
import { toast } from 'react-hot-toast';
import PredictionCard from '../components/PredictionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import PredictionCardSkeleton from '../components/PredictionCardSkeleton';
import { PlacePredictionModal } from '../components/predictions/PlacePredictionModal';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import UserAvatar from '../components/common/UserAvatar';
import MobileHeader from '../components/layout/MobileHeader';
import { LiveSummaryCard } from '../components/LiveSummaryCard';
import { SearchBar } from '../components/SearchBar';
import useScrollPreservation from '../hooks/useScrollPreservation';
import { logger } from '../lib/logger';

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
    <div className="category-filters" data-tour-id="category-filters">
      <div className="category-filters-container overflow-x-auto">
        <div className="category-filters-flex flex gap-2">
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

// Main DiscoverPage Component
const DiscoverPage = React.memo(function DiscoverPage({ onNavigateToProfile, onNavigateToPrediction }: DiscoverPageProps) {
  const { user } = useAuthStore();
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

  // Platform stats removed - now computed from active predictions in LiveSummaryCard

  // Setup infinite scroll on container
  useInfiniteScroll({
    hasNext: pagination.hasNext,
    loading: loadingMore,
    onLoadMore: () => {
      logger.debug('🔄 Infinite scroll triggered in DiscoverPage:', {
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
  }, [refreshPredictions]);

  // Stats now computed inside LiveSummaryCard

  // Backend now handles filtering - no additional filtering needed
  const displayPredictions = useMemo(() => {
    if (!predictions || !Array.isArray(predictions)) {
      logger.warn('🔍 DiscoverPage Debug - No valid predictions array:', predictions);
      return [];
    }
    
    logger.debug(`🔍 DiscoverPage Debug - Displaying ${predictions.length} predictions`);
    return predictions.filter(prediction => {
      // Safety check for prediction object only
      if (!prediction || !prediction.id || !prediction.title) {
        logger.warn('⚠️ DiscoverPage: Invalid prediction object:', prediction);
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
    logger.debug('🔍 Search query changed:', query);
    setFilters({ search: query });
  }, [setFilters]);

  const handleCategorySelect = useCallback((category: string) => {
    logger.debug('📂 Category changed:', category);
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
              <PredictionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <MobileHeader 
        title="Discover" 
      />
      
      <main 
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        data-scroll-container
      >
        {/* Live Summary Card */}
        <section className="px-5 pt-3">
          <LiveSummaryCard />
        </section>

        {/* Search Bar and Category Chips */}
        <section className="px-5 pt-4">
          <SearchBar 
            searchQuery={filters.search}
            onSearchChange={handleSearchChange}
          />
          <div className="mt-3">
            <CategoryFilters 
              selectedCategory={filters.category} 
              onSelect={handleCategorySelect} 
            />
          </div>
        </section>

        {/* Predictions Content */}
        <section className="px-5 pb-safe pt-4">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
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
          <div className="space-y-3">
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
                    <PredictionCard
                      key={`${prediction.id}-${index}`} // More robust key
                      prediction={prediction}
                      variant="compact"
                      onPredict={() => handlePredict(prediction)}
                      onLike={() => handleLike(prediction.id)}
                      onComment={() => handleComment(prediction.id)}
                      onShare={() => handleShare(prediction)}
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
                        logger.debug('🔄 Manual load more triggered');
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
        </section>
      </main>

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
