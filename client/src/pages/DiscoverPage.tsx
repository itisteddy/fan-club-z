import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, Heart, MessageCircle, Share2, Clock, User } from 'lucide-react';
import { usePredictionsStore } from '../stores/predictionsStore';
import { useAuthStore } from '../stores/authStore';
import { PlacePredictionModal } from '../components/predictions/PlacePredictionModal';
import { CommentsModal } from '../components/predictions/CommentsModal';
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Ready to make some winning predictions?
          </p>
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
              ₦{stats.totalVolume.toLocaleString()}
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
              ₦{stats.todayVolume.toLocaleString()}
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
    { id: 'crypto', label: 'Crypto', gradient: 'from-orange-500 to-orange-600' },
    { id: 'tech', label: 'Tech', gradient: 'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="px-4 py-4 bg-white border-b border-gray-100">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(category.id)}
            className={`category-pill px-4 py-2.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all flex items-center justify-center h-10 min-w-max ${
              selectedCategory === category.id
                ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="leading-none flex items-center justify-center">{category.label}</span>
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
    onComment(prediction);
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
      className="bg-white rounded-xl p-4 mx-4 mb-4 shadow-sm border border-gray-100"
    >
      {/* Compact header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">FC</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">Fan Club Z</div>
          <div className="text-xs text-gray-500">2h ago</div>
        </div>
        <div className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md border border-green-200">
          {prediction.category || 'general'}
        </div>
      </div>

      {/* Compact content */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-gray-900 mb-1 leading-tight line-clamp-2">
          {prediction.title || 'Untitled Prediction'}
        </h3>
        
        {prediction.description && (
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
            {prediction.description}
          </p>
        )}
      </div>

      {/* Compact stats */}
      <div className="flex items-center justify-between py-2 border-t border-b border-gray-100 mb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-base font-bold text-gray-900">
              ₦{(prediction.poolTotal || 0).toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            {prediction.participantCount || 0} predictors
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-orange-500">
          <Clock className="w-3 h-3" />
          <span className="text-xs font-semibold">5h left</span>
        </div>
      </div>

      {/* Compact prediction options */}
      <div className="space-y-1.5 mb-3">
        {prediction.options.slice(0, 2).map((option: any, optionIndex: number) => {
          const totalStaked = option.totalStaked || 0;
          const poolTotal = prediction.poolTotal || 1;
          const percentage = poolTotal > 0 ? Math.min((totalStaked / poolTotal * 100), 100) : 50;
          const odds = totalStaked > 0 ? (poolTotal / totalStaked).toFixed(2) : '2.00';
          
          return (
            <motion.button
              key={option.id || optionIndex}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    optionIndex === 0 ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <span className="font-semibold text-sm text-gray-900">
                    {option.label || `Option ${optionIndex + 1}`}
                  </span>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {Math.round(percentage)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {odds}x odds
                  </div>
                </div>
              </div>
              
              {/* Compact progress bar */}
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(percentage, 2)}%` }}
                  transition={{ duration: 0.8, delay: optionIndex * 0.1 }}
                  className={`h-full rounded-full ${
                    optionIndex === 0 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Compact engagement */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1 transition-colors ${
              isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-xs font-semibold">{likeCount}</span>
          </button>
          
          <button 
            onClick={handleComment}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">{commentCount}</span>
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center gap-1 text-gray-600 hover:text-green-500 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPredict(prediction)}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors shadow-sm text-sm"
        >
          Predict Now
        </motion.button>
      </div>
    </motion.div>
  );
};

interface DiscoverPageProps {
  onNavigateToProfile?: () => void;
}

const DiscoverPage: React.FC<DiscoverPageProps> = ({ onNavigateToProfile }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedPredictionForComments, setSelectedPredictionForComments] = useState<any>(null);
  
  const { predictions } = usePredictionsStore();
  const { user } = useAuthStore();

  const stats = {
    totalVolume: 2547892,
    activePredictions: 1247,
    todayVolume: 89234,
  };

  // Filter predictions based on search query and category
  const filteredPredictions = (predictions || []).filter(prediction => {
    if (!prediction) return false;
    
    // Category filter
    const matchesCategory = selectedCategory === 'all' || 
      (prediction.category && prediction.category.toLowerCase() === selectedCategory);
    
    // Search filter
    const matchesSearch = !searchQuery || 
      prediction.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prediction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prediction.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handlePredict = useCallback((prediction: any) => {
    setSelectedPrediction(prediction);
    setIsPredictionModalOpen(true);
  }, []);

  const handleLike = useCallback((predictionId: string) => {
    // This would typically make an API call to like/unlike
    console.log('Liked prediction:', predictionId);
  }, []);

  const handleComment = useCallback((prediction: any) => {
    setSelectedPredictionForComments(prediction);
    setIsCommentsModalOpen(true);
  }, []);

  const handleShare = useCallback((prediction: any) => {
    // This would typically open a share dialog
    if (navigator.share) {
      navigator.share({
        title: prediction.title,
        text: prediction.description,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${prediction.title}\n${prediction.description}\n${window.location.href}`);
    }
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

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
            {selectedCategory === 'all' ? 'All Predictions' : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Predictions`}
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
        {filteredPredictions.length === 0 && (
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
                : 'Try adjusting your category filter'
              }
            </p>
          </motion.div>
        )}
      </div>

      {/* Prediction Modal */}
      {selectedPrediction && (
        <PlacePredictionModal
          prediction={selectedPrediction}
          isOpen={isPredictionModalOpen}
          onClose={() => {
            setIsPredictionModalOpen(false);
            setSelectedPrediction(null);
          }}
        />
      )}

      {/* Comments Modal */}
      {selectedPredictionForComments && (
        <CommentsModal
          predictionId={selectedPredictionForComments.id}
          predictionTitle={selectedPredictionForComments.title}
          isOpen={isCommentsModalOpen}
          onClose={() => {
            setIsCommentsModalOpen(false);
            setSelectedPredictionForComments(null);
          }}
        />
      )}
    </div>
  );
};

export default DiscoverPage;