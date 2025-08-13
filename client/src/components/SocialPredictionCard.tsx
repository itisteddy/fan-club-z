import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, TrendingUp, TrendingDown, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { usePredictionStore } from '../store/predictionStore';
import { useSocialStore, socialHelpers } from '../store/socialStore';
import { CommentThread } from './social/CommentThread';
import { ShareButton } from './social/SharePrediction';
import { LiveActivityBadge } from './notifications/NotificationComponents';

interface SocialPredictionCardProps {
  prediction: any;
  variant?: 'default' | 'compact' | 'detailed';
  showSocialMetrics?: boolean;
  onCardClick?: () => void;
}

export const SocialPredictionCard: React.FC<SocialPredictionCardProps> = ({
  prediction,
  variant = 'default',
  showSocialMetrics = true,
  onCardClick,
}) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  
  const { placePrediction } = usePredictionStore();
  const { togglePredictionLike, isPredictionLiked } = useSocialStore();
  
  const engagement = socialHelpers.getEngagementData(prediction.id);
  const isLiked = isPredictionLiked(prediction.id);
  
  // Calculate time left
  const timeLeft = new Date(prediction.deadline).getTime() - new Date().getTime();
  const isClosingSoon = timeLeft < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isExpired = timeLeft <= 0;

  // Calculate trend
  const totalVotes = prediction.options.reduce((sum: number, option: any) => sum + option.votes, 0);
  const leadingOption = prediction.options.reduce((prev: any, current: any) => 
    current.votes > prev.votes ? current : prev
  );

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      await togglePredictionLike(prediction.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCommentsOpen(true);
  };

  const handleQuickBet = async (optionId: string, amount: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await placePrediction({
        predictionId: prediction.id,
        optionId,
        amount,
      });
    } catch (error) {
      console.error('Failed to place prediction:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <motion.div
        layout
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer min-w-[280px]"
        onClick={onCardClick}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
              {prediction.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded-full">
                {prediction.category}
              </span>
              {isClosingSoon && !isExpired && (
                <LiveActivityBadge isLive={true} />
              )}
            </div>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalVotes}
            </span>
            {showSocialMetrics && (
              <>
                <span className="flex items-center gap-1">
                  <Heart className={`w-3 h-3 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  {engagement.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {engagement.comments}
                </span>
              </>
            )}
          </div>
          <span>{formatDistanceToNow(new Date(prediction.deadline))} left</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4"
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {prediction.creator?.username?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{prediction.creator?.username || 'Anonymous'}</p>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(prediction.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {prediction.category}
            </span>
            {isClosingSoon && !isExpired && (
              <LiveActivityBadge isLive={true} />
            )}
          </div>
        </div>

        <h2 
          className="text-lg font-semibold text-gray-900 mb-3 cursor-pointer hover:text-green-600 transition-colors"
          onClick={onCardClick}
        >
          {prediction.title}
        </h2>

        {prediction.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {prediction.description}
          </p>
        )}
      </div>

      {/* Prediction Options */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {prediction.options.map((option: any) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
            const isLeading = option.id === leadingOption.id && totalVotes > 0;
            
            return (
              <div key={option.id} className="relative">
                <button
                  onClick={(e) => handleQuickBet(option.id, 10, e)}
                  disabled={isExpired}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all duration-200
                    ${isLeading 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${isExpired ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    {isLeading && (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {percentage.toFixed(0)}%
                    </span>
                    <span className="text-sm text-gray-500">
                      {option.votes} votes
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-1.5 rounded-full ${
                        isLeading ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time and Status */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="w-4 h-4" />
            {isExpired ? (
              <span className="text-red-600 font-medium">Closed</span>
            ) : (
              <span className={isClosingSoon ? 'text-amber-600 font-medium' : ''}>
                {formatDistanceToNow(new Date(prediction.deadline))} left
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-4 h-4" />
            <span>{totalVotes} predictions</span>
          </div>
        </div>
      </div>

      {/* Social Actions */}
      {showSocialMetrics && (
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  isLiked 
                    ? 'text-red-500' 
                    : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart 
                  className={`w-5 h-5 transition-transform ${
                    isLiked ? 'fill-current scale-110' : ''
                  } ${isLiking ? 'animate-pulse' : ''}`}
                />
                <span>{engagement.likes}</span>
              </button>

              <button
                onClick={handleComment}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{engagement.comments}</span>
              </button>

              <ShareButton
                predictionId={prediction.id}
                predictionTitle={prediction.title}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-500 transition-colors"
              />
            </div>

            {/* Live viewers count */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{Math.floor(Math.random() * 50) + 10} viewing</span>
            </div>
          </div>
        </div>
      )}

      {/* Comments Thread */}
      <CommentThread
        predictionId={prediction.id}
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
      />
    </motion.div>
  );
};

export default SocialPredictionCard;
