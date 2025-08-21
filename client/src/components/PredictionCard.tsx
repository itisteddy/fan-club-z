import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share, TrendingUp, Clock, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { Prediction, PredictionEntry } from '../store/predictionStore';
import { useLikeStore } from '../store/likeStore';
import { useUnifiedCommentStore } from '../store/unifiedCommentStore';
import CommentModal from './modals/CommentModal';
import TappableUsername from './TappableUsername';
import ErrorBoundary from './ErrorBoundary';
import toast from 'react-hot-toast';

interface PredictionCardProps {
  prediction: Prediction;
  entry?: PredictionEntry;
  variant?: 'default' | 'compact' | 'user-entry';
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onPredict?: () => void;
  className?: string;
}

// Safe error fallback for individual prediction cards
const PredictionCardErrorFallback: React.FC<{ error?: string }> = ({ error }) => (
  <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 m-2">
    <div className="text-red-600 text-sm">
      ⚠️ Error loading prediction
      {error && <div className="text-xs mt-1 text-gray-500">{error}</div>}
    </div>
  </div>
);

const PredictionCardContent: React.FC<PredictionCardProps> = ({
  prediction,
  entry,
  variant = 'default',
  onLike: customOnLike,
  onComment: customOnComment,
  onShare: customOnShare,
  onPredict,
  className = ''
}) => {
  // Early return with error boundary if prediction is invalid
  if (!prediction || !prediction.id) {
    console.warn('⚠️ PredictionCard: Invalid prediction data received:', prediction);
    return <PredictionCardErrorFallback error="Invalid prediction data" />;
  }

  const [, setLocation] = useLocation();
  const [mounted, setMounted] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Initialize mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe store access with error handling
  const getLikeData = () => {
    try {
      const { toggleLike, checkIfLiked, getLikeCount } = useLikeStore();
      return { toggleLike, checkIfLiked, getLikeCount };
    } catch (error) {
      console.warn('Error accessing like store:', error);
      return {
        toggleLike: async () => {},
        checkIfLiked: () => false,
        getLikeCount: () => 0
      };
    }
  };

  const getCommentData = () => {
    try {
      const { getCommentCount } = useUnifiedCommentStore();
      return { getCommentCount };
    } catch (error) {
      console.warn('Error accessing comment store:', error);
      return { getCommentCount: () => 0 };
    }
  };

  const { toggleLike, checkIfLiked, getLikeCount } = getLikeData();
  const { getCommentCount } = getCommentData();

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  // Get real-time data from stores with safe fallbacks
  const isLiked = checkIfLiked(prediction.id) || false;
  // FIXED: Always prioritize store data over potentially stale prediction data
  const storeLikeCount = getLikeCount(prediction.id);
  const likeCount = storeLikeCount !== undefined && storeLikeCount !== null ? storeLikeCount : (prediction.likes_count || prediction.likes || 0);
  const commentCount = getCommentCount(prediction.id) || prediction.comments_count || prediction.comments || 0;

  // Calculate real data with safe fallbacks
  const entryDeadline = prediction.entry_deadline || prediction.entryDeadline;
  const timeRemaining = entryDeadline ? Math.max(0, new Date(entryDeadline).getTime() - Date.now()) : 0;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isClosingSoon = hoursRemaining < 24 && hoursRemaining > 0;

  // Use real participant count from database with fallbacks
  const participantCount = prediction.participant_count || prediction.entries?.length || 0;
  
  // Calculate real pool total from options with safe fallbacks
  const totalPool = prediction.options?.reduce((sum, option) => {
    const staked = option.total_staked || option.totalStaked || 0;
    return sum + staked;
  }, 0) || prediction.pool_total || prediction.poolTotal || 0;

  // Format currency consistently
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleLike = async () => {
    if (isLiking) return;
    
    console.log('❤️ Like clicked:', prediction.id, '- Before:', { isLiked, likeCount });
    
    try {
      setIsLiking(true);
      await toggleLike(prediction.id);
      if (customOnLike) customOnLike();
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    setCommentModalOpen(true);
    if (customOnComment) customOnComment();
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: prediction.title,
        text: `Check out this prediction: ${prediction.title}`,
        url: `${window.location.origin}/prediction/${prediction.id}`
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareData.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link copied to clipboard!');
      }
      
      if (customOnShare) customOnShare();
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share');
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || 
        target.closest('a') || 
        target.closest('.interactive') ||
        target.closest('.options-clickable') ||
        target.closest('[data-clickable="true"]') ||
        target.closest('.predict-button') ||
        e.defaultPrevented) {
      return;
    }
    
    // Navigate to prediction details page
    setLocation(`/prediction/${prediction.id}`);
  };

  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return 'Ended';
    if (hoursRemaining >= 24) {
      const days = Math.floor(hoursRemaining / 24);
      return `${days}d left`;
    }
    return `${hoursRemaining}h left`;
  };
  
  if (variant === 'compact') {
    return (
      <>
        <motion.div
          className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer ${className}`}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCardClick}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                {prediction.creator?.username?.slice(0, 2).toUpperCase() || 'FC'}
              </div>
              <div>
                <TappableUsername 
                  username={prediction.creator?.username || prediction.creator?.full_name || 'Anonymous'}
                  userId={prediction.creator?.id || 'anonymous'}
                  className="font-medium text-gray-900 text-sm hover:text-blue-600"
                  showAt={true}
                />
                <div className="text-xs text-gray-500">{formatTimeRemaining()}</div>
              </div>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              prediction.category === 'sports' ? 'bg-red-100 text-red-700' :
              prediction.category === 'pop_culture' ? 'bg-purple-100 text-purple-700' :
              prediction.category === 'esports' ? 'bg-yellow-100 text-yellow-700' :
              prediction.category === 'politics' ? 'bg-blue-100 text-blue-700' :
              prediction.category === 'celebrity_gossip' ? 'bg-pink-100 text-pink-700' :
              'bg-green-100 text-green-700'
            }`}>
              {prediction.category?.replace('_', ' ') || 'General'}
            </span>
          </div>

          {/* Title */}
          <h3 
            className="font-semibold text-gray-900 mb-2 line-clamp-2 cursor-pointer options-clickable"
            onClick={(e) => {
              e.stopPropagation();
              onPredict && onPredict();
            }}
          >
            {prediction.title}
          </h3>
          
          {/* Pool Info */}
          <div className="flex items-center justify-between text-sm">
            <div 
              className="flex items-center gap-2 text-gray-600 cursor-pointer options-clickable"
              onClick={(e) => {
                e.stopPropagation();
                onPredict && onPredict();
              }}
            >
              <span className="font-medium">{formatCurrency(totalPool)}</span>
              <span>•</span>
              <span>{(prediction.options?.length || 2)} options</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className={`flex items-center gap-1 ${isLiked ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-gray-600">{likeCount}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleComment();
                }}
                className="flex items-center gap-1 text-gray-400 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-gray-600">{commentCount}</span>
              </button>
            </div>
          </div>
        </motion.div>

        <CommentModal
          prediction={prediction}
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
        />
      </>
    );
  }

  if (variant === 'user-entry') {
    const hasEntry = !!entry;
    const userChoice = entry?.option_id;
    const potentialPayout = entry?.potential_payout || 0;
    const actualPayout = entry?.actual_payout || 0;
    const status = entry?.status || prediction.status;
    
    return (
      <>
        <motion.div
          className={`bg-white rounded-xl shadow-sm border-l-4 ${
            status === 'won' ? 'border-green-500' :
            status === 'lost' ? 'border-red-500' :
            status === 'settled' ? 'border-gray-500' :
            'border-blue-500'
          } p-4 cursor-pointer ${className}`}
          whileHover={{ scale: 1.01, y: -2 }}
          onClick={handleCardClick}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 text-base line-clamp-1">
                {prediction.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  status === 'won' ? 'bg-green-100 text-green-700' :
                  status === 'lost' ? 'bg-red-100 text-red-700' :
                  status === 'settled' ? 'bg-gray-100 text-gray-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {status?.toUpperCase()}
                </span>
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{formatTimeRemaining()}</span>
              </div>
            </div>
          </div>

          {/* User's Position */}
          {hasEntry && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="text-xs text-gray-600 mb-1">Your Position</div>
              <div className="font-semibold text-gray-900">
                {prediction.options?.find(o => o.id === userChoice)?.label || 'Option selected'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Stake: {formatCurrency(entry?.amount || 0)} • 
                {status === 'won' ? ` Won: ${formatCurrency(actualPayout)}` :
                 status === 'lost' ? ' Lost' :
                 ` Potential: ${formatCurrency(potentialPayout)}`}
              </div>
            </div>
          )}

          {/* Social Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-1 ${isLiked ? 'text-red-500' : 'text-gray-500'} hover:text-red-500 transition-colors`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm">{likeCount}</span>
              </button>
              <button
                onClick={handleComment}
                className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm">{commentCount}</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors"
              >
                <Share className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>
            <button
              onClick={onPredict}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium transition-colors"
            >
              View Details
            </button>
          </div>
        </motion.div>

        <CommentModal
          prediction={prediction}
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
        />
      </>
    );
  }

  // Default variant
  return (
    <>
      <motion.div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer ${className}`}
        whileHover={{ scale: 1.01, y: -2 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleCardClick}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold">
                {prediction.creator?.username?.slice(0, 2).toUpperCase() || 'FC'}
              </div>
              <div>
                <TappableUsername 
                  username={prediction.creator?.username || prediction.creator?.full_name || 'Anonymous'}
                  userId={prediction.creator?.id || 'anonymous'}
                  className="font-medium text-gray-900 hover:text-blue-600"
                  showAt={true}
                />
                <div className="text-sm text-gray-500">
                  {prediction.created_at ? new Date(prediction.created_at).toLocaleDateString() : 'Recently'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                prediction.category === 'sports' ? 'bg-red-100 text-red-700' :
                prediction.category === 'pop_culture' ? 'bg-purple-100 text-purple-700' :
                prediction.category === 'esports' ? 'bg-yellow-100 text-yellow-700' :
                prediction.category === 'politics' ? 'bg-blue-100 text-blue-700' :
                prediction.category === 'celebrity_gossip' ? 'bg-pink-100 text-pink-700' :
                'bg-green-100 text-green-700'
              }`}>
                {prediction.category?.replace('_', ' ') || 'General'}
              </span>
              {isClosingSoon && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  Closing Soon
                </span>
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2 leading-tight">
            {prediction.title}
          </h3>
          
          {prediction.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {prediction.description}
            </p>
          )}
        </div>
        
        {/* Options */}
        <div className="px-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Options</h4>
              <span className="text-xs text-gray-500">{prediction.options?.length || 2} choices</span>
            </div>
            
            <div className="space-y-2">
              {(prediction.options || []).slice(0, 3).map((option, index) => {
                const optionStaked = option.total_staked || option.totalStaked || 0;
                const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : (100 / (prediction.options?.length || 2));
                const odds = optionStaked > 0 ? totalPool / optionStaked : 2.0;
                
                return (
                  <motion.button
                    key={option.id}
                    className="w-full p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 transition-all group"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onPredict && onPredict()}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 group-hover:text-green-700">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {percentage.toFixed(0)}% • {formatCurrency(optionStaked)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {odds.toFixed(1)}x
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
              
              {((prediction.options?.length || 0) > 3) && (
                <div className="text-center text-sm text-gray-500">
                  +{(prediction.options?.length || 0) - 3} more options available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-gray-900">{formatCurrency(totalPool)}</span>
                <span className="text-gray-500">pool</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span>{participantCount}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className={isClosingSoon ? 'text-amber-600 font-medium' : ''}>
                  {formatTimeRemaining()}
                </span>
              </div>
            </div>
            {/* Only show trending if there are actual participants */}
            {participantCount > 5 && (
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Trending</span>
              </div>
            )}
          </div>
        </div>

        {/* Social Actions */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <motion.button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500 transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{likeCount}</span>
              </motion.button>
              <motion.button
                onClick={handleComment}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{commentCount}</span>
              </motion.button>
              <motion.button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share className="w-5 h-5" />
                <span className="text-sm font-medium">Share</span>
              </motion.button>
            </div>
            <motion.button
              onClick={onPredict}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
              whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)' }}
              whileTap={{ scale: 0.98 }}
            >
              Predict Now
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Comment Modal */}
      <CommentModal
        prediction={prediction}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
      />
    </>
  );
};

// Main component wrapped in error boundary
const PredictionCard: React.FC<PredictionCardProps> = (props) => {
  return (
    <ErrorBoundary fallback={<PredictionCardErrorFallback />}>
      <PredictionCardContent {...props} />
    </ErrorBoundary>
  );
};

export default PredictionCard;