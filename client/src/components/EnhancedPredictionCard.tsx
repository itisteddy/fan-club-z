import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Flag
} from 'lucide-react';
import { Prediction, PredictionEntry, PredictionOption } from '../store/predictionStore';
import { useLikeStore } from '../store/likeStore';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'wouter';
import toast from 'react-hot-toast';
import { ReportModal } from './reporting/ReportModal';
import { ShareModal } from './modals/ShareModal';

interface EnhancedPredictionCardProps {
  prediction: Prediction;
  entry?: PredictionEntry;
  variant?: 'default' | 'compact' | 'user-entry';
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onPredict?: (optionId: string) => void;
  className?: string;
  maxVisibleOptions?: number;
}

const EnhancedPredictionCard: React.FC<EnhancedPredictionCardProps> = ({
  prediction,
  entry,
  variant = 'default',
  onLike,
  onComment,
  onShare,
  onPredict,
  className = '',
  maxVisibleOptions = 4 // UX constraint: limit visible options for better engagement
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toggleLike, checkIfLiked } = useLikeStore();
  const { isAuthenticated } = useAuthStore();
  
  const isLiked = checkIfLiked(prediction.id);
  const timeRemaining = Math.max(0, new Date(prediction.entryDeadline).getTime() - Date.now());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isClosingSoon = hoursRemaining < 24;

  // Calculate percentages and trends for options
  const totalPool = prediction.options.reduce((sum, option) => sum + option.totalStaked, 0);
  const hasMoreOptions = prediction.options.length > maxVisibleOptions;
  const visibleOptions = isExpanded ? prediction.options : prediction.options.slice(0, maxVisibleOptions);
  const hiddenOptionsCount = prediction.options.length - maxVisibleOptions;

  // Enhanced option analysis
  const getOptionAnalysis = (option: PredictionOption) => {
    const percentage = totalPool > 0 ? (option.totalStaked / totalPool * 100) : (100 / prediction.options.length);
    const isLeading = option.totalStaked === Math.max(...prediction.options.map(o => o.totalStaked));
    const odds = totalPool > 0 ? (totalPool / (option.totalStaked || 1)).toFixed(2) : '2.00';
    
    return {
      percentage: Math.round(percentage),
      isLeading,
      odds,
      confidence: percentage > 60 ? 'high' : percentage > 30 ? 'medium' : 'low'
    };
  };

  // Get trend indicator for option
  const getTrendIcon = (option: PredictionOption) => {
    const analysis = getOptionAnalysis(option);
    if (analysis.isLeading && analysis.percentage > 50) {
      return <TrendingUp size={12} className="text-green-500" />;
    } else if (analysis.percentage < 20) {
      return <TrendingDown size={12} className="text-red-500" />;
    }
    return <Minus size={12} className="text-gray-400" />;
  };

  // Reporting functions
  const openReportModal = () => {
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
  };

  // Compact variant for discovery feeds
  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/50 backdrop-blur-sm border border-gray-200/50 shadow-lg shadow-gray-900/5 ${className}`}
      >
        <div className="absolute top-4 left-4 z-10">
                          <span className="px-3 py-1 text-xs font-semibold bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full border border-gray-200/50 dark:border-gray-600/50">
            {prediction.category}
          </span>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-3 pr-8">
            {prediction.title}
          </h3>
          
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{prediction.participant_count || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>${totalPool.toLocaleString()}</span>
            </div>
          </div>

          {/* Top 2 options preview for compact view */}
          <div className="space-y-2">
            {prediction.options.slice(0, 2).map((option) => {
              const analysis = getOptionAnalysis(option);
              return (
                <div key={option.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(option)}
                    <span className="text-sm font-medium text-gray-800 truncate">{option.label}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{analysis.percentage}%</span>
                </div>
              );
            })}
            {hasMoreOptions && (
              <div className="text-xs text-gray-500 text-center pt-1">
                +{hiddenOptionsCount} more options
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // User entry variant
  if (variant === 'user-entry' && entry) {
    const isWinning = entry.status === 'won';
    const isPending = entry.status === 'active';
    const selectedOptionLabel = prediction.options.find(o => o.id === entry.option_id)?.label;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl border-l-4 ${isWinning ? 'border-l-green-500' : isPending ? 'border-l-blue-500' : 'border-l-gray-300'} shadow-lg shadow-gray-900/5 overflow-hidden ${className}`}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-1">
                {prediction.title}
              </h3>
              <span className="text-sm text-gray-500">
                Your prediction: {selectedOptionLabel}
              </span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isWinning ? 'bg-green-100 text-green-800' :
              isPending ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {entry.status === 'won' ? 'Won' : entry.status === 'lost' ? 'Lost' : 'Active'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl mb-4">
            <div>
              <p className="text-sm text-gray-600">Invested</p>
              <p className="text-lg font-bold text-gray-900">${entry.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {entry.status === 'won' ? 'Won' : 'Potential Return'}
              </p>
              <p className={`text-lg font-bold ${isWinning ? 'text-green-600' : 'text-gray-900'}`}>
                ${(entry.actual_payout || entry.potential_payout || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {isPending && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock size={14} />
              <span>{hoursRemaining}h remaining</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant - Enhanced multi-option design
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-900/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gray-900/10 ${className}`}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">FC</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Fan Club Z</p>
                <p className="text-sm text-gray-500">2h ago</p>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 line-clamp-3 mb-2">
              {prediction.title}
            </h3>
            
            {prediction.description && (
              <p className="text-gray-600 line-clamp-2 text-sm">
                {prediction.description}
              </p>
            )}
          </div>
          
          <div className="ml-4 flex flex-col gap-2">
            <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
              {prediction.category}
            </span>
            {prediction.options.length > 2 && (
              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full text-center">
                {prediction.options.length} options
              </span>
            )}
          </div>
        </div>

        {/* Enhanced stats bar */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold">${totalPool.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{prediction.participant_count || 0} predictors</span>
            </div>
          </div>
          
          <div className={`flex items-center gap-1 ${isClosingSoon ? 'text-amber-600' : 'text-gray-600'}`}>
            <Clock size={14} />
            <span>{hoursRemaining}h left</span>
          </div>
        </div>

        {/* Enhanced options display */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {visibleOptions.map((option, index) => {
              const analysis = getOptionAnalysis(option);
              const isSelected = selectedOption === option.id;
              
              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedOption(option.id);
                      onPredict?.(option.id);
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-200 group ${
                      isSelected 
                        ? 'border-green-400 bg-green-50 shadow-lg shadow-green-500/20' 
                        : 'border-gray-200 hover:border-green-300 bg-gradient-to-r from-gray-50 to-white hover:from-green-50 hover:to-green-25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {/* Color-coded indicator */}
                          <div 
                            className={`w-3 h-3 rounded-full ${
                              analysis.isLeading ? 'bg-green-500' : 
                              analysis.confidence === 'medium' ? 'bg-blue-500' : 
                              'bg-gray-400'
                            }`} 
                          />
                          {/* Trend indicator */}
                          {getTrendIcon(option)}
                        </div>
                        <span className={`font-semibold transition-colors ${
                          isSelected ? 'text-green-700' : 'text-gray-900 group-hover:text-green-700'
                        }`}>
                          {option.label}
                        </span>
                        {analysis.isLeading && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Leading
                          </span>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          analysis.confidence === 'high' ? 'text-green-600' :
                          analysis.confidence === 'medium' ? 'text-blue-600' :
                          'text-gray-600'
                        }`}>
                          {analysis.percentage}%
                        </div>
                        <div className="text-sm text-gray-500">{analysis.odds}x odds</div>
                      </div>
                    </div>
                    
                    {/* Enhanced progress bar with gradient */}
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.percentage}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          analysis.isLeading ? 'bg-gradient-to-r from-green-400 to-green-500' :
                          analysis.confidence === 'medium' ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                          'bg-gradient-to-r from-gray-400 to-gray-500'
                        }`}
                      />
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Expand/Collapse button for many options */}
          {hasMoreOptions && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-green-300 hover:text-green-600 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={16} />
                  <span className="text-sm font-medium">Show less</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span className="text-sm font-medium">Show {hiddenOptionsCount} more options</span>
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Please log in to like predictions');
                  setLocation('/auth');
                  return;
                }
                toggleLike(prediction.id);
                onLike?.();
              }}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">{prediction.likes_count || 0}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Please log in to comment');
                  setLocation('/auth');
                  return;
                }
                onComment?.();
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
            >
              <MessageCircle size={18} />
              <span className="text-sm font-medium">{prediction.comments_count || 0}</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors"
            >
              <Share size={18} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={openReportModal}
              className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
            >
              <Flag size={18} />
            </motion.button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!isAuthenticated) {
                toast.error('Please log in to place predictions');
                setLocation('/auth');
                return;
              }
              if (selectedOption) {
                onPredict?.(selectedOption);
              }
            }}
            disabled={!selectedOption}
            className={`px-6 py-2 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
              selectedOption 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {selectedOption ? 'Place Prediction' : 'Select Option'}
          </motion.button>
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={closeReportModal}
        contentType="prediction"
        contentId={prediction.id}
        contentTitle={prediction.title}
        contentAuthor={prediction.creator?.username}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        prediction={{
          id: prediction.id,
          title: prediction.title,
          description: prediction.description,
          category: prediction.category
        }}
      />
    </motion.div>
  );
};

export default EnhancedPredictionCard;