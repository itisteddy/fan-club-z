import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Heart, MessageCircle, Share2, Clock, User, X } from 'lucide-react';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { scrollToTop } from '../utils/scroll';
import { usePullToRefresh } from '../utils/pullToRefresh';
import { formatTimeRemaining } from '../lib/utils';
import toast from 'react-hot-toast';

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
    { id: 'Sports', label: 'Sports', gradient: 'from-blue-500 to-blue-600' },
    { id: 'Politics', label: 'Politics', gradient: 'from-purple-500 to-purple-600' },
    { id: 'Entertainment', label: 'Entertainment', gradient: 'from-pink-500 to-pink-600' },
    { id: 'Crypto', label: 'Crypto', gradient: 'from-orange-500 to-orange-600' },
    { id: 'Tech', label: 'Tech', gradient: 'from-indigo-500 to-indigo-600' },
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

// Modern prediction card
const PredictionCard: React.FC<{ 
  prediction: any; 
  index: number;
  onPredict: (prediction: any) => void;
  onLike: (predictionId: string) => void;
  onComment: (predictionId: string) => void;
  onShare: (prediction: any) => void;
}> = ({ prediction, index, onPredict, onLike, onComment, onShare }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);
  const [commentCount, setCommentCount] = useState(12);

  if (!prediction || !prediction.options || prediction.options.length === 0) {
    return null;
  }

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    onLike(prediction.id);
    toast.success(isLiked ? 'Removed from likes' : 'Added to likes');
  };

  const handleComment = () => {
    onComment(prediction.id);
  };

  const handleShare = () => {
    onShare(prediction);
    toast.success('Shared to social media!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-white rounded-lg p-3 mx-4 mb-3 shadow-sm border border-gray-100"
    >
      {/* Compact header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-md flex items-center justify-center">
          <span className="text-white font-bold text-xs">
            {prediction.creatorName?.charAt(0) || 'FC'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate">
            {prediction.creatorName || 'Fan Club Z'}
          </div>
          <div className="text-xs text-gray-500">2h ago</div>
              </div>
        <div className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-200">
          {prediction.category || 'general'}
              </div>
            </div>
            
      {/* Compact content */}
      <div className="mb-2">
        <h3 className="text-sm font-bold text-gray-900 mb-0.5 leading-tight line-clamp-2">
              {prediction.title || 'Untitled Prediction'}
            </h3>
            
            {prediction.description && (
          <p className="text-gray-600 text-xs leading-tight line-clamp-1">
                {prediction.description}
              </p>
            )}
          </div>
          
      {/* Compact stats */}
      <div className="flex items-center justify-between py-1.5 border-t border-gray-100 mb-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 bg-green-500 rounded-full" />
            <span className="text-sm font-bold text-gray-900">
              ${(prediction.poolTotal || 0).toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            {prediction.participantCount || 0} predictors
          </div>
        </div>

        <div className="flex items-center gap-1 text-orange-500">
          <Clock className="w-3 h-3" />
          <span className="text-xs font-semibold">
            {formatTimeRemaining(prediction.entry_deadline)}
          </span>
            </div>
          </div>
          
      {/* Compact prediction options - Grid layout */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
          {prediction.options.slice(0, 2).map((option: any, optionIndex: number) => {
            const totalStaked = option.totalStaked || 0;
            const poolTotal = prediction.poolTotal || 1;
            const percentage = poolTotal > 0 ? Math.min((totalStaked / poolTotal * 100), 100) : 50;
            const odds = totalStaked > 0 ? (poolTotal / totalStaked).toFixed(2) : '2.00';
            
            return (
              <motion.button
                key={option.id || optionIndex}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPredict(prediction)}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                      optionIndex === 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                  <span className="font-medium text-xs text-gray-900 truncate">
                      {option.label || `Option ${optionIndex + 1}`}
                    </span>
                  </div>
                  
                <div className="text-sm font-bold text-gray-900">
                  {Math.round(percentage)}%
                  </div>
                <div className="text-xs text-gray-600">
                  {odds}x
                </div>
                
                {/* Mini progress bar */}
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(percentage, 2)}%` }}
                    transition={{ duration: 0.8, delay: optionIndex * 0.1 }}
                    className={`h-full rounded-full ${
                      optionIndex === 0 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  />
                </div>
                </div>
              </motion.button>
            );
          })}
        </div>

      {/* Compact engagement */}
      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-0.5 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
            }`}
          >
            <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs font-medium">{likeCount}</span>
          </button>
          
          <button 
            onClick={handleComment}
            className="flex items-center gap-0.5 text-gray-600 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            <span className="text-xs font-medium">{commentCount}</span>
            </button>
            
          <button 
            onClick={handleShare}
            className="flex items-center gap-0.5 text-gray-600 hover:text-green-500 transition-colors"
          >
            <Share2 className="w-3 h-3" />
            </button>
          </div>
          
          <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPredict(prediction)}
          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md transition-colors text-xs"
          >
            Predict
          </motion.button>
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
  const usdBalance = getBalance('USD') || 2500; // Use USD wallet balance
  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction?.options?.find((o: any) => o.id === selectedOptionId);
  const potentialPayout = selectedOption ? numAmount * (selectedOption.current_odds || 2.0) : 0;
  
  const quickAmounts = [25, 50, 100, 250, 500, 1000];
  
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
                        Odds: {(option.current_odds || 2.0).toFixed(2)}x
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
                <div className="grid grid-cols-3 gap-2">
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
          
          {/* Extra bottom padding for scrolling */}
          <div className="h-4"></div>
          </div>
        </div>
        
        {/* Fixed Footer with safe area */}
        <div className="p-6 border-t border-gray-100 space-y-3 flex-shrink-0">
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
                <span>Placing Bet...</span>
              </div>
            ) : (
                              `Place Bet${numAmount > 0 ? ` ($${numAmount.toLocaleString()})` : ''}`
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
        </motion.div>
      </div>
    </div>
  );
};

// Note: Using formatTimeRemaining from utils.ts for consistent time formatting across the app

interface DiscoverPageProps {
  onNavigateToProfile?: () => void;
}

const DiscoverPage: React.FC<DiscoverPageProps> = ({ onNavigateToProfile }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  
  const { predictions, loading, fetchPredictions } = usePredictionStore();
  const { user, isAuthenticated } = useAuthStore();

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  // Fetch predictions on component mount
  useEffect(() => {
    console.log('🔄 DiscoverPage mounted, fetching predictions...');
    fetchPredictions();
  }, [fetchPredictions]);

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    console.log('Pull to refresh triggered on Discover page');
    await fetchPredictions();
  }, [fetchPredictions]);

  usePullToRefresh(handleRefresh, {
    threshold: 60,
    disabled: loading
  });

  const stats = {
    totalVolume: predictions?.reduce((sum, pred) => sum + (pred.pool_total || 0), 0) || 2547892,
    activePredictions: predictions?.length || 0,
    todayVolume: 89234,
  };

  // Filter predictions based on search query and category
  const filteredPredictions = (predictions || []).filter(prediction => {
    if (!prediction) return false;
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || 
      (prediction.category && prediction.category === selectedCategory);
    
    // Search filter
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
    const shareText = `${prediction.title}\n\nMake your prediction on Fan Club Z!`;
    
    if (navigator.share) {
      navigator.share({
        title: prediction.title,
        text: shareText,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  if (loading && (!predictions || predictions.length === 0)) {
  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
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

        {/* Predictions list */}
        <div className="pb-6">
          <AnimatePresence initial={false}>
            {filteredPredictions.map((prediction, index) => (
              <PredictionCard
                key={prediction?.id || `prediction-${index}`}
                prediction={prediction}
                index={index}
                onPredict={handlePredict}
                onLike={handleLike}
                onComment={handleComment}
                onShare={handleShare}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {filteredPredictions.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-4"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'No predictions found' : 'No predictions available'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Try adjusting your search terms or category filter'
                : 'Check back later for new predictions'
              }
            </p>
          </motion.div>
        )}
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