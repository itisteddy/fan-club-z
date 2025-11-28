import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import AppHeader from '../components/layout/AppHeader';
import { formatUSDCompact, formatNumberShort } from '@/lib/format';
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
    { id: 'all', label: 'All' },
    { id: 'sports', label: 'Sports' },
    { id: 'pop_culture', label: 'Pop Culture' },
    { id: 'custom', label: 'Custom' },
    { id: 'politics', label: 'Politics' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'tech', label: 'Tech' },
    { id: 'finance', label: 'Finance' }
  ];

  return (
    <div
      className="category-filters bg-white border-b border-gray-100 px-4 py-3"
      data-tour="category-filters"
      data-tour-id="category-filters"
    >
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              style={{
                height: '28px',
                minHeight: '28px',
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 500,
                lineHeight: 1,
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s',
                backgroundColor: selectedCategory === category.id ? '#7B2FF7' : '#f1f5f9',
                color: selectedCategory === category.id ? '#ffffff' : '#475569',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category.id) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }
              }}
              data-tour="category-chips-item"
            >
              {category.label}
            </button>
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
    <div
      className="px-4 pt-4 pb-4 bg-white"
      data-tour="discover-header"
      data-tour-id="discover-header"
    >
      {/* Live market stats removed per request */}

      {/* Search bar */}
      <div className="relative" data-tour="search-bar" data-tour-id="search-bar">
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

  // Setup infinite scroll using window scroll (no custom container)
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
    threshold: 300
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
    if (!Array.isArray(predictions)) {
      // Silently return empty array - excessive logging removed
      return [];
    }

    const now = Date.now();
    const activePredictions = predictions.filter((prediction) => {
      if (!prediction || !prediction.id || !prediction.title) {
        // Silently filter invalid predictions - excessive logging removed
        return false;
      }

      const isOpen = (prediction.status ?? 'open') === 'open';
      const deadlineMs = prediction.entry_deadline ? new Date(prediction.entry_deadline).getTime() : Number.POSITIVE_INFINITY;
      const isExpired = Number.isFinite(deadlineMs) && deadlineMs <= now;

      return isOpen && !isExpired;
    });

    // Excessive logging removed - only log errors if needed
    return activePredictions;
  }, [predictions]);

  // Event handlers
  const handlePredict = useCallback((prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setIsPredictionModalOpen(true);
  }, []);

  const handleNavigateToPrediction = useCallback((predictionId: string) => {
    if (onNavigateToPrediction) {
      onNavigateToPrediction(predictionId);
    } else {
      window.location.href = `/prediction/${predictionId}`;
    }
  }, [onNavigateToPrediction]);

  const handleLike = useCallback((predictionId: string) => {
    toast.success('Prediction liked!');
  }, []);

  const handleComment = useCallback((predictionId: string) => {
    handleNavigateToPrediction(predictionId);
  }, [handleNavigateToPrediction]);

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
      className="discover-page content-with-bottom-nav"
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
