import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePredictionStore, Prediction } from '../store/predictionStore';
import { toast } from 'react-hot-toast';
import PredictionCard from '../components/PredictionCard';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Search } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import PredictionCardSkeleton from '../components/PredictionCardSkeleton';
import { PlacePredictionModal } from '../components/predictions/PlacePredictionModal';

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
                  ? 'active bg-green-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              whileTap={{ scale: 0.96 }}
            >
              <span className="text-xs">{category.icon}</span>
              <span>{category.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
});

CategoryFilters.displayName = 'CategoryFilters';

// Enhanced Mobile Header Component
const MobileHeader = React.memo(function MobileHeader({ 
  user, 
  stats, 
  searchQuery, 
  onSearchChange, 
  onNavigateToProfile 
}: {
  user: any;
  stats: any;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateToProfile: () => void;
}) {
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Status bar spacer */}
      <div className="h-11" />
      
      <div className="px-4 pb-4">
        {/* Top section */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            <p className="text-sm text-gray-600">Find your next winning prediction</p>
          </div>
          <button
            onClick={onNavigateToProfile}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white font-semibold shadow-lg"
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </button>
        </div>

        {/* Live market stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">LIVE MARKETS</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                ${stats?.totalVolume || '0'}
              </div>
              <div className="text-xs text-gray-600">Volume</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {stats?.activePredictions || '0'}
              </div>
              <div className="text-xs text-gray-600">Live</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                {stats?.totalUsers || '0'}
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
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
});

MobileHeader.displayName = 'MobileHeader';

// Main DiscoverPage Component
const DiscoverPage = React.memo(function DiscoverPage({ onNavigateToProfile, onNavigateToPrediction }: DiscoverPageProps) {
  const { user } = useAuthStore();
  const { predictions, loading, refreshPredictions } = usePredictionStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [platformStats, setPlatformStats] = useState({
    totalVolume: '0',
    activePredictions: 0,
    totalUsers: '0',
    rawVolume: 0,
    rawUsers: 0
  });

  // Format volume for display
  const formatVolume = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  // Fetch platform stats
  const fetchPlatformStats = useCallback(async () => {
    try {
      // Use the same environment API URL logic as the rest of the app
      const { getApiUrl } = await import('../lib/environment');
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

  // Filter predictions based on search and category with error handling
  const filteredPredictions = useMemo(() => {
    if (!predictions || !Array.isArray(predictions)) {
      console.log('🔍 DiscoverPage Debug - No valid predictions array:', predictions);
      return [];
    }
    
    // Debug: Log the predictions being filtered
    console.log('🔍 DiscoverPage Debug - Raw predictions:', predictions.length, 'predictions');
    
    return predictions.filter(prediction => {
      // Safety check for prediction object
      if (!prediction || !prediction.id || !prediction.title) {
        console.warn('⚠️ DiscoverPage: Invalid prediction object:', prediction);
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'all' && prediction.category !== selectedCategory) {
        return false;
      }
      
      // Search filter with safe string access
      if (searchQuery.trim()) {
        const title = (prediction.title || '').toLowerCase();
        const description = (prediction.description || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        
        if (!title.includes(query) && !description.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [predictions, selectedCategory, searchQuery]);

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
    // Navigate to prediction detail page with comments
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
    setSearchQuery(query);
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
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
    <div className="discover-page content-with-bottom-nav" style={{ position: 'relative', zIndex: 1 }}>
      {/* Header with proper z-index */}
      <div className="discover-header">
        <div className="header-content">
          <MobileHeader 
            user={user} 
            stats={stats} 
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onNavigateToProfile={onNavigateToProfile || (() => {})}
          />
        </div>
      </div>

      {/* Category filters with explicit positioning */}
      <div className="category-filters-wrapper" style={{ position: 'relative', zIndex: 45 }}>
        <CategoryFilters 
          selectedCategory={selectedCategory} 
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
            {selectedCategory === 'all' ? 'All Predictions' : `${selectedCategory} Predictions`}
            {searchQuery && ` - "${searchQuery}"`}
          </h2>
          <p className="text-sm text-gray-600">
            {filteredPredictions.length} predictions available
          </p>
        </motion.div>

        {/* Predictions Grid with error boundaries */}
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {filteredPredictions.length > 0 ? (
              filteredPredictions.map((prediction, index) => {
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
              })
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
                  {searchQuery 
                    ? `No predictions match "${searchQuery}"`
                    : loading 
                      ? 'Loading predictions...'
                      : 'Try adjusting your filters or check back later'
                  }
                </p>
                {!loading && !searchQuery && (
                  <button
                    onClick={() => refreshPredictions(true)}
                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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