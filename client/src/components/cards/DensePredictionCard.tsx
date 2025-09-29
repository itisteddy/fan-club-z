import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, TrendingUp, Clock, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Prediction } from '../../store/predictionStore';
import { useLikeStore } from '../../store/likeStore';
import { useUnifiedCommentStore } from '../../store/unifiedCommentStore';
import UserAvatar from '../common/UserAvatar';
import { cn } from '@/utils/cn';

interface DensePredictionCardProps {
  prediction: Prediction;
  className?: string;
  index?: number;
}

const DensePredictionCard: React.FC<DensePredictionCardProps> = ({
  prediction,
  className,
  index = 0
}) => {
  const navigate = useNavigate();
  const [isLiking, setIsLiking] = useState(false);
  
  const { toggleLike, checkIfLiked, getLikeCount } = useLikeStore();
  const { getCommentCount } = useUnifiedCommentStore();

  const isLiked = checkIfLiked(prediction.id);
  const likeCount = getLikeCount(prediction.id);
  const commentCount = getCommentCount(prediction.id);

  const handleCardClick = useCallback(() => {
    navigate(`/prediction/${prediction.id}`);
  }, [navigate, prediction.id]);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      await toggleLike(prediction.id);
    } catch (error) {
      console.error('Failed to like prediction:', error);
    } finally {
      setIsLiking(false);
    }
  }, [isLiking, toggleLike, prediction.id]);

  const formatTimeRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}m`;
  };

  const getHighestOption = () => {
    if (!prediction.options || prediction.options.length === 0) return null;
    
    return prediction.options.reduce((highest, option) => {
      const optionTotal = parseFloat(option.total_amount || '0');
      const highestTotal = parseFloat(highest.total_amount || '0');
      return optionTotal > highestTotal ? option : highest;
    });
  };

  const highestOption = getHighestOption();
  const totalVolume = prediction.options?.reduce((sum, option) => 
    sum + parseFloat(option.total_amount || '0'), 0
  ) || 0;

  return (
    <motion.div
      className={cn(
        "bg-white rounded-xl border border-gray-100 overflow-hidden",
        "cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-gray-200",
        "active:scale-[0.98]",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`View prediction: ${prediction.title}`}
    >
      {/* Dense Header */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          {/* Creator Info - Compact */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <UserAvatar
              email={prediction.creator?.email}
              username={prediction.creator?.firstName || prediction.creator?.email?.split('@')[0]}
              avatarUrl={prediction.creator?.avatar}
              size="xs"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {prediction.creator?.firstName || prediction.creator?.email?.split('@')[0] || 'Anonymous'}
              </p>
            </div>
          </div>
          
          {/* Time Remaining Badge */}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600 font-medium">
            <Clock size={12} />
            {formatTimeRemaining(prediction.end_date)}
          </div>
        </div>

        {/* Title - More compact */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight mb-2">
          {prediction.title}
        </h3>

        {/* Leading Option & Volume - Compact */}
        {highestOption && (
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp size={12} />
              <span className="font-medium truncate max-w-[120px]">{highestOption.title}</span>
            </div>
            <div className="text-gray-500">
              ${totalVolume.toLocaleString()}
            </div>
          </div>
        )}

        {/* Compact Options */}
        {prediction.options && prediction.options.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {prediction.options.slice(0, 2).map((option, idx) => {
              const amount = parseFloat(option.total_amount || '0');
              const percentage = totalVolume > 0 ? (amount / totalVolume) * 100 : 0;
              
              return (
                <div
                  key={option.id}
                  className="relative p-2 bg-gray-50 rounded-lg overflow-hidden"
                >
                  {/* Progress Bar */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-transparent opacity-60"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                  
                  {/* Content */}
                  <div className="relative">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {option.title}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-emerald-600 font-semibold">
                        {percentage.toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        ${amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions Bar - Very compact */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Like Button */}
            <motion.button
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"
              )}
              whileTap={{ scale: 0.9 }}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <Heart 
                size={14} 
                className={isLiked ? "fill-current" : ""} 
              />
              <span className="font-medium">{likeCount || 0}</span>
            </motion.button>

            {/* Comments */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MessageCircle size={14} />
              <span className="font-medium">{commentCount || 0}</span>
            </div>

            {/* Participants */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={14} />
              <span className="font-medium">{prediction.participant_count || 0}</span>
            </div>
          </div>

          {/* View Arrow */}
          <ChevronRight 
            size={16} 
            className="text-gray-400 transition-transform group-hover:translate-x-0.5" 
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DensePredictionCard;
