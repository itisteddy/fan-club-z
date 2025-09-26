import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share, TrendingUp, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Prediction, PredictionEntry } from '../store/predictionStore';
import { useLikeStore } from '../store/likeStore';
import { useUnifiedCommentStore } from '../store/unifiedCommentStore';
import CommentModal from './modals/CommentModal';
import TappableUsername from './TappableUsername';
import ErrorBoundary from './ErrorBoundary';
import toast from 'react-hot-toast';
import UserAvatar from './common/UserAvatar';

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

  const navigate = useNavigate();
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
  const storeLikeCount = getLikeCount(prediction.id);
  const likeCount = storeLikeCount !== undefined && storeLikeCount !== null ? storeLikeCount : (prediction.likes_count || prediction.likes || 0);
  const storeCommentCount = getCommentCount(prediction.id);
  const commentCount = storeCommentCount !== undefined && storeCommentCount !== null ? storeCommentCount : (prediction.comments_count || prediction.comments || 0);
  
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

  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return 'Closed';
    if (hoursRemaining < 1) return `${Math.ceil(timeRemaining / (1000 * 60))}m left`;
    if (hoursRemaining < 24) return `${hoursRemaining}h left`;
    const daysRemaining = Math.floor(hoursRemaining / 24);
    return `${daysRemaining}d left`;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation
    
    if (isLiking) return;
    
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

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation
    setCommentModalOpen(true);
    if (customOnComment) customOnComment();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation
    
    try {
      const shareData = {
        title: prediction.question || prediction.title,
        text: `Check out this prediction: ${prediction.question || prediction.title}`,
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

  const handlePredict = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card navigation
    if (onPredict) onPredict();
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || 
        target.closest('a') || 
        target.closest('.interactive')) {
      return;
    }
    
    console.log('🔗 PredictionCard: Navigating to prediction details:', prediction.id);
    
    // Navigate to prediction details page using react-router-dom
    navigate(`/prediction/${prediction.id}`);
  };

  return (
    <>
      <motion.div
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer ${className}`}
        whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCardClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* Only show creator info if we actually have a real creator */}
            {prediction.creator?.firstName || prediction.creator?.email ? (
              <>
                <UserAvatar
                  email={prediction.creator?.email}
                  username={prediction.creator?.firstName || prediction.creator?.email?.split('@')[0]}
                  avatarUrl={prediction.creator?.avatar}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <TappableUsername
                    username={prediction.creator?.firstName || prediction.creator?.email?.split('@')[0]}
                    className="font-medium text-gray-900"
                  />
                  <p className="text-sm text-gray-500">
                    {new Date(prediction.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </>
            ) : (
              // If no real creator info, just show date without any user info
              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  {new Date(prediction.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
            {prediction.category && (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {prediction.category}
                </span>
              </div>
            )}
          </div>

          {/* Question */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
            {prediction.question || prediction.title}
          </h3>

          {/* Options (if available) */}
          {prediction.options && prediction.options.length > 0 && (
            <div className="space-y-2 mb-4">
              {prediction.options.map((option, index) => {
                const optionStaked = option.total_staked || option.totalStaked || 0;
                const percentage = totalPool > 0 ? Math.round((optionStaked / totalPool) * 100) : 0;
                
                return (
                  <div key={index} className="relative">
                    <div 
                      className="absolute inset-0 bg-emerald-100 rounded-lg"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {option.text || option.option}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              <div className="flex items-center gap-1 text-emerald-600">
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
                className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-gray-600'} hover:text-red-500 transition-colors interactive`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm font-medium">{likeCount}</span>
              </motion.button>
              <motion.button
                onClick={handleComment}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors interactive"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{commentCount}</span>
              </motion.button>
              <motion.button
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-600 hover:text-emerald-500 transition-colors interactive"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Share className="w-5 h-5" />
                <span className="text-sm font-medium">Share</span>
              </motion.button>
            </div>
            <motion.button
              onClick={handlePredict}
              className="bg-gradient-to-r from-purple-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm interactive"
              whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(123, 47, 247, 0.25)' }}
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
    <ErrorBoundary>
      <PredictionCardContent {...props} />
    </ErrorBoundary>
  );
};

export default PredictionCard;
