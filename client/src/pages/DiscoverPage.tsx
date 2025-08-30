import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePredictionStore, Prediction } from '../store/predictionStore';
import { toast } from 'react-hot-toast';
import PredictionCard from '../components/PredictionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import PredictionCardSkeleton from '../components/PredictionCardSkeleton';
import { SearchFilters } from '../components/search/SmartSearchBar';
import { PlacePredictionModal } from '../components/predictions/PlacePredictionModal';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { scrollToTop } from '../utils/scroll';
import Logo from '../components/common/Logo';
import useScrollPreservation from '../hooks/useScrollPreservation';
import { ShareModal } from '../components/modals/ShareModal';

interface DiscoverPageProps {
  onNavigateToProfile?: () => void;
  onNavigateToPrediction?: (predictionId: string) => void;
}





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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [predictionToShare, setPredictionToShare] = useState<Prediction | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    status: 'all',
    sortBy: 'newest',
    minPool: 0,
    maxPool: 1000000,
    timeRange: 'all',
    hasImage: false,
    verifiedOnly: false
  });
  
  // Scroll preservation setup
  const containerRef = useRef<HTMLDivElement>(null);
  const { saveScroll } = useScrollPreservation(containerRef, {
    saveOnUnmount: true,
    restoreOnMount: true,
    preserveFor: 15, // 15 minutes
    threshold: 100 // Only save if scrolled more than 100px
  });

  // Use unified platform stats from prediction store
  const { 
    platformStats, 
    fetchPlatformStats: fetchStorePlatformStats, 
    statsLoading 
  } = usePredictionStore();

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
    fetchStorePlatformStats();
    scrollToTop({ behavior: 'instant' });
  }, [refreshPredictions, fetchStorePlatformStats]);

  // Calculate stats with null safety
  const stats = useMemo(() => ({
    totalVolume: platformStats?.totalVolume || '0',
    activePredictions: platformStats?.activePredictions || 0,
    totalUsers: platformStats?.totalUsers || '0'
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
    setPredictionToShare(prediction);
    setIsShareModalOpen(true);
  }, []);



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
    <div 
      ref={containerRef} 
      className="min-h-screen bg-gray-50" 
      data-scroll-container
    >
      {/* Header - Consistent with other pages */}
      <div className="bg-white border-b border-gray-100">
        <div className="h-11" />
        <div className="px-4 py-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Logo size="sm" variant="icon" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Fan Club Z</h1>
              </div>
            </div>
            <div className="w-8 h-8" /> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="px-4 py-3">
        {/* Live market stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-emerald-50 dark:from-purple-900/30 dark:to-emerald-900/30 rounded-xl p-3 mb-3"
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-base font-bold text-gray-900 dark:text-white">
                ${stats?.totalVolume || '0'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Volume</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-gray-900 dark:text-white">
                {stats?.activePredictions || '0'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Active</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-gray-900 dark:text-white">
                {stats?.totalUsers || '0'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Players</div>
            </div>
          </div>
        </motion.div>

        {/* Simple Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search predictions, topics..."
            value={searchFilters.query}
            onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setFilters({ search: searchFilters.query });
              }
            }}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all text-sm shadow-sm"
          />
        </div>

        {/* Content with proper spacing */}
        <div className="prediction-cards-container">
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
      </div>

      {/* Prediction Modal */}
      <PlacePredictionModal
        prediction={selectedPrediction}
        isOpen={isPredictionModalOpen}
        onClose={handleModalClose}
      />

      {/* Share Modal */}
      {predictionToShare && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setPredictionToShare(null);
          }}
          prediction={{
            id: predictionToShare.id,
            title: predictionToShare.title,
            description: predictionToShare.description,
            category: predictionToShare.category
          }}
        />
      )}
    </div>
  );
});

DiscoverPage.displayName = 'DiscoverPage';

export default DiscoverPage;
