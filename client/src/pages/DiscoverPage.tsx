import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Heart, MessageCircle, Share2, Clock, User, X, DollarSign } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { useLocation } from 'wouter';
import { scrollToTop } from '../utils/scroll';
import { usePullToRefresh } from '../utils/pullToRefresh';
import { formatTimeRemaining } from '../lib/utils';
import toast from 'react-hot-toast';
import { PredictionCard } from '../components/predictions/PredictionCard';
import { PredictionCardSkeleton } from '../components/ui/Skeleton';

// Modern Mobile Header
const MobileHeader: React.FC<{ 
  user: any; 
  stats: any; 
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateToProfile: () => void;
}> = ({ user, stats, searchQuery, onSearchChange, onNavigateToProfile }) => (
  <div className="bg-white border-b border-gray-100">
    {/* Status bar spacer */}
    <div className="h-11" />
    
    {/* Header content */}
    <div className="px-4 pb-4">
      {/* Welcome text with profile button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Discover
          </h1>
          <p className="text-sm text-gray-600">Find predictions to bet on</p>
        </div>
        <button 
          onClick={onNavigateToProfile}
          className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
        >
          <User size={20} className="text-white" />
        </button>
      </motion.div>

      {/* Live stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold uppercase tracking-wide">
            Live Market
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              ${stats.totalVolume.toLocaleString()}
            </div>
            <div className="text-green-100 text-xs font-medium uppercase tracking-wide">
              Total Volume
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              {stats.activePredictions}
            </div>
            <div className="text-green-100 text-xs font-medium uppercase tracking-wide">
              Active
            </div>
          </div>
            
          <div className="text-center">
            <div className="text-white text-xl font-bold">
              ${stats.todayVolume.toLocaleString()}
            </div>
            <div className="text-green-100 text-xs font-medium uppercase tracking-wide">
              Today
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search predictions, categories..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </motion.div>
    </div>
  </div>
);

// Category filters with improved text alignment
const CategoryFilters: React.FC<{ selectedCategory: string; onSelect: (category: string) => void }> = ({ 
  selectedCategory, 
  onSelect 
}) => {
  const categories = [
    { id: 'all', label: 'All', gradient: 'from-gray-500 to-gray-600' },
    { id: 'sports', label: 'Sports', gradient: 'from-blue-500 to-blue-600' },
    { id: 'politics', label: 'Politics', gradient: 'from-purple-500 to-purple-600' },
    { id: 'entertainment', label: 'Entertainment', gradient: 'from-pink-500 to-pink-600' },
    { id: 'crypto', label: 'Crypto', gradient: 'from-yellow-500 to-orange-500' },
    { id: 'tech', label: 'Tech', gradient: 'from-green-500 to-teal-500' },
  ];

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="category-filters-container category-filters-flex">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(category.id)}
            className={`category-pill px-4 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center h-10 ${
              selectedCategory === category.id
                ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="leading-none">{category.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Compact prediction card component
const CompactPredictionCard: React.FC<{ 
  prediction: any; 
  index: number;
  onPredict: (prediction: any) => void;
  onLike: (predictionId: string) => void;
  onComment: (predictionId: string) => void;
  onShare: (prediction: any) => void;
}> = ({ prediction, index, onPredict, onLike, onComment, onShare }) => {
  const [, setLocation] = useLocation();
  
  // Transform the prediction data to match the new compact design
  const poolTotal = prediction.pool_total || 0;
  const participantCount = prediction.participant_count || 0;
  
  const transformedPrediction = {
    ...prediction,
    creator: {
      id: prediction.creator?.id || 'unknown',
      username: prediction.creator?.username || prediction.creatorName || 'Fan Club Z',
      avatar_url: prediction.creator?.avatar_url,
      is_verified: prediction.creator?.is_verified || false
    },
    likes_count: prediction.likes_count || 0,
    comments_count: prediction.comments_count || 0,
    pool_total: poolTotal,
    participant_count: participantCount,
    options: prediction.options?.map((option: any) => {
      const totalStaked = option.total_staked || 0;
      const percentage = poolTotal > 0 ? Math.min((totalStaked / poolTotal * 100), 100) : 50;
      const current_odds = totalStaked > 0 ? (poolTotal / totalStaked) : 2.0;
      
      return {
        ...option,
        percentage,
        current_odds
      };
    }) || []
  };

  const handleCardClick = () => {
    setLocation(`/prediction/${prediction.id}`);
  };

  const handlePredictClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPredict(prediction);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="mx-4 mb-4"
    >
      <div 
        onClick={handleCardClick}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
        style={{ minHeight: '160px', maxHeight: '180px' }}
      >
        {/* Card Header */}
        <div className="p-4 pb-3">
          {/* Title - 2 lines max */}
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2 leading-tight">
            {prediction.title}
          </h3>
          
          {/* Context line - 1 line max, optional */}
          {prediction.description && (
            <p className="text-sm text-gray-600 line-clamp-1 mb-3">
              {prediction.description.replace(/【.*?】/g, '')} {/* Remove citation tokens */}
            </p>
          )}
          
          {/* Options strip with odds - clickable for participation */}
          <div className="flex gap-2 mb-3">
            {prediction.options?.slice(0, 2).map((option: any, idx: number) => (
              <button
                key={option.id}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  onPredict(prediction);
                }}
                className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-lg p-2 text-center transition-colors"
              >
                <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-600">{option.current_odds?.toFixed(1)}x</div>
              </button>
            ))}
          </div>
        </div>

        {/* Meta bar */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatTimeRemaining(prediction.entry_deadline)}</span>
            </div>
            <div className="flex items-center gap-1">
              <User size={12} />
              <span>{participantCount}</span>
            </div>
          </div>
          

        </div>
      </div>
    </motion.div>
  );
};

// Enhanced staking modal for prediction placement
const PredictionModal: React.FC<{
  prediction: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ prediction, isOpen, onClose }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { getBalance, makePrediction } = useWalletStore();
  const usdBalance = getBalance('USD') || 1000; // Use USD wallet balance
  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction?.options?.find((o: any) => o.id === selectedOptionId);
  const potentialPayout = selectedOption ? numAmount * (selectedOption.current_odds || 2.0) : 0;
  
  const quickAmounts = [1, 5, 10, 25]; // USD amounts as per design
  
  const handleSubmit = async () => {
    if (!selectedOptionId) {
      toast.error('Please select a prediction option');
      return;
    }
    
    if (!numAmount || numAmount < 1) {
      toast.error('Please enter a valid stake amount');
      return;
    }
    
    if (numAmount > usdBalance) {
      toast.error('Insufficient balance');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Make prediction and deduct from wallet
      await makePrediction(numAmount, `Prediction: ${selectedOption.label}`, prediction.id, 'USD');
      
      toast.success(`Successfully placed $${numAmount.toLocaleString()} on "${selectedOption.label}"!`);
      onClose();
      
      // Reset form
      setSelectedOptionId('');
      setAmount('');
    } catch (error) {
      toast.error('Failed to place prediction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !prediction) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Safe area container to avoid bottom navigation */}
      <div 
        className="flex-1 flex items-center justify-center p-4 pb-24"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-xl max-w-md w-full shadow-2xl flex flex-col max-h-[calc(100vh-8rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Make Your Prediction</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mt-2 text-sm">{prediction.title}</p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-6 space-y-6">
              {/* Option Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose your prediction:
                </label>
                <div className="space-y-2">
                  {prediction.options?.map((option: any, index: number) => (
                    <button
                      key={option.id || index}
                      onClick={() => setSelectedOptionId(option.id || `option-${index}`)}
                      className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                        selectedOptionId === (option.id || `option-${index}`)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-600">
                            Odds: {(option.current_odds || 2.0).toFixed(1)}x
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          selectedOptionId === (option.id || `option-${index}`)
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {selectedOptionId === (option.id || `option-${index}`) && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Stake Amount */}
              {selectedOptionId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stake Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="1"
                        max={usdBalance}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                      <span>Min: $1</span>
                      <span>Balance: ${usdBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Quick amounts */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quick amounts:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {quickAmounts.map((quickAmount) => (
                        <button
                          key={quickAmount}
                          onClick={() => setAmount(quickAmount.toString())}
                          disabled={quickAmount > usdBalance}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            quickAmount > usdBalance
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          ${quickAmount}
                        </button>
                      ))}
                    </div>
                  </div>
                    
                  {/* Potential payout */}
                  {numAmount > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-600">Potential return</div>
                          <div className="text-lg font-bold text-green-600">
                            ${potentialPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Profit</div>
                          <div className={`font-semibold ${
                            potentialPayout > numAmount ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${(potentialPayout - numAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={handleSubmit}
              disabled={!selectedOptionId || !numAmount || numAmount > usdBalance || isLoading}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                !selectedOptionId || !numAmount || numAmount > usdBalance || isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Placing Bet...
                </div>
              ) : (
                `Place Bet${numAmount > 0 ? ` ($${numAmount.toLocaleString()})` : ''}`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Main Discover Page Component
const DiscoverPage: React.FC<{ onNavigateToProfile?: () => void }> = ({ onNavigateToProfile }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  
  const { predictions, loading, fetchPredictions } = usePredictionStore();
  const { isAuthenticated, user } = useAuthStore();
  const { getBalance } = useWalletStore();

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('Pull to refresh triggered on Discover page');
    await fetchPredictions();
  }, [fetchPredictions]);

  usePullToRefresh(handleRefresh, {
    threshold: 60,
    disabled: false
  });

  // Fetch predictions on mount - optimized to prevent unnecessary reloads
  useEffect(() => {
    // Only fetch if we don't already have predictions or if they're stale
    if (!predictions || predictions.length === 0) {
      fetchPredictions();
    }
  }, [fetchPredictions, predictions]);

  // Mock stats for now - these should come from the backend
  const stats = {
    totalVolume: 125000,
    activePredictions: 47,
    todayVolume: 8500
  };

  // Filter predictions based on category and search
  const filteredPredictions = predictions.filter(prediction => {
    const matchesCategory = selectedCategory === 'all' || prediction.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      prediction.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prediction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prediction.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handlePredict = useCallback((prediction: any) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to make predictions');
      return;
    }
    setSelectedPrediction(prediction);
    setIsPredictionModalOpen(true);
  }, [isAuthenticated]);

  const handleLike = useCallback((predictionId: string) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like predictions');
      return;
    }
    console.log('Liked prediction:', predictionId);
  }, [isAuthenticated]);

  const handleComment = useCallback((predictionId: string) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to comment');
      return;
    }
    console.log('Comment on prediction:', predictionId);
    toast.success('Comments feature coming soon!');
  }, [isAuthenticated]);

  const handleShare = useCallback((prediction: any) => {
    const shareUrl = `${window.location.origin}/prediction/${prediction.id}`;
    const shareText = `${prediction.title}\n\nMake your prediction on Fan Club Z!`;
    
    if (navigator.share) {
      navigator.share({
        title: prediction.title,
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (loading && (!predictions || predictions.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-100">
          <div className="h-11" />
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            </div>
            <div className="bg-gray-200 rounded-2xl p-4 mb-4">
              <div className="h-4 bg-gray-300 rounded w-20 mb-3"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-16 mx-auto"></div>
                </div>
                <div className="text-center">
                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-12 mx-auto"></div>
                </div>
                <div className="text-center">
                  <div className="h-6 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 bg-gray-300 rounded w-14 mx-auto"></div>
                </div>
              </div>
            </div>
            <div className="h-12 bg-gray-200 rounded-xl"></div>
          </div>
        </div>

        {/* Category filters skeleton */}
        <div className="px-4 py-4 bg-white border-b border-gray-100">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-full w-20"></div>
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="py-4">
          <div className="px-4 mb-6">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
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
    <div className="min-h-screen bg-gray-50 discover-page" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      {/* Header */}
      <MobileHeader 
        user={user} 
        stats={stats} 
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onNavigateToProfile={onNavigateToProfile || (() => console.log('No navigation handler provided'))}
      />

      {/* Category filters */}
      <CategoryFilters 
        selectedCategory={selectedCategory} 
        onSelect={setSelectedCategory} 
      />

      {/* Content */}
      <div className="py-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {selectedCategory === 'all' ? 'All Predictions' : `${selectedCategory} Predictions`}
            {searchQuery && ` - "${searchQuery}"`}
          </h2>
          <p className="text-gray-600">
            {filteredPredictions.length} predictions available
          </p>
        </motion.div>

        {/* Predictions Grid */}
        <div className="space-y-2">
          {filteredPredictions.length > 0 ? (
            filteredPredictions.map((prediction, index) => (
              <CompactPredictionCard
                key={prediction.id}
                prediction={prediction}
                index={index}
                onPredict={handlePredict}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 px-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No predictions found</h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? `No predictions match "${searchQuery}"`
                  : 'Try adjusting your filters or check back later'
                }
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Prediction Modal */}
      <PredictionModal
        prediction={selectedPrediction}
        isOpen={isPredictionModalOpen}
        onClose={() => {
          setIsPredictionModalOpen(false);
          setSelectedPrediction(null);
        }}
      />
    </div>
  );
};

export default DiscoverPage;