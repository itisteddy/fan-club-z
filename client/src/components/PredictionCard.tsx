import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share, TrendingUp, Clock, Users } from 'lucide-react';
import { Prediction, PredictionEntry } from '../store/predictionStore';
import { useLikeStore } from '../store/likeStore';
import { useCommentStore } from '../store/commentStore';
import CommentModal from './modals/CommentModal';
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

const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  entry,
  variant = 'default',
  onLike: customOnLike,
  onComment: customOnComment,
  onShare: customOnShare,
  onPredict,
  className = ''
}) => {
  const { toggleLike, checkIfLiked, getLikeCount } = useLikeStore();
  const { getCommentCount } = useCommentStore();
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Get real-time data from stores
  const isLiked = checkIfLiked(prediction.id);
  const likeCount = getLikeCount(prediction.id);
  const commentCount = getCommentCount(prediction.id);

  const timeRemaining = Math.max(0, new Date(prediction.entryDeadline || prediction.entry_deadline).getTime() - Date.now());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isClosingSoon = hoursRemaining < 24;

  // Calculate percentages for options
  const totalPool = prediction.options?.reduce((sum, option) => sum + (option.totalStaked || option.total_staked || 0), 0) || 0;

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    try {
      await toggleLike(prediction.id);
      if (customOnLike) {
        customOnLike();
      }
    } catch (error: any) {
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    if (customOnComment) {
      customOnComment();
    } else {
      setCommentModalOpen(true);
    }
  };

  const handleShare = async () => {
    if (customOnShare) {
      customOnShare();
    } else {
      try {
        const url = `${window.location.origin}/prediction/${prediction.id}`;
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast.error('Failed to copy link');
      }
    }
  };

  if (variant === 'compact') {
    return (
      <>
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/50 backdrop-blur-sm border border-gray-200/50 shadow-lg shadow-gray-900/5 ${className}`}
        >
          {/* Category badge */}
          <div className="absolute top-4 left-4 z-10">
            <span className="px-3 py-1 text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-700 rounded-full border border-gray-200/50">
              {prediction.category}
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-2 pr-12">
              {prediction.title}
            </h3>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Users size={14} />
                <span>{prediction.participant_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{hoursRemaining}h left</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ${totalPool.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Pool</div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`flex items-center gap-1 transition-colors ${
                    isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                  <span className="text-sm">{likeCount}</span>
                </button>
                
                <button
                  onClick={handleComment}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <MessageCircle size={16} />
                  <span className="text-sm">{commentCount}</span>
                </button>
              </div>
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

  // Default variant
  return (
    <>
      <motion.div
        whileHover={{ scale: 1.01, y: -4 }}
        whileTap={{ scale: 0.99 }}
        className={`bg-white rounded-3xl shadow-lg shadow-gray-900/5 border border-gray-200/50 overflow-hidden hover:shadow-xl hover:shadow-gray-900/10 transition-all duration-300 ${className}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white font-semibold">
                {prediction.creator?.username?.[0]?.toUpperCase() || 'F'}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {prediction.creator?.username || 'Fan Club Z'}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(prediction.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <span className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
              {prediction.category}
            </span>
          </div>

          {/* Title and Description */}
          <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
            {prediction.title}
          </h2>
          
          {prediction.description && (
            <p className="text-gray-600 mb-6 line-clamp-2">
              {prediction.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-2xl">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp size={16} className="text-gray-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                ${totalPool.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">Pool</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users size={16} className="text-gray-500" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {prediction.participant_count || 0}
              </div>
              <div className="text-xs text-gray-600">Players</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock size={16} className={isClosingSoon ? "text-orange-500" : "text-gray-500"} />
              </div>
              <div className={`text-lg font-bold ${isClosingSoon ? "text-orange-600" : "text-gray-900"}`}>
                {hoursRemaining}h
              </div>
              <div className="text-xs text-gray-600">Left</div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {prediction.options?.map((option, index) => {
              const optionStaked = option.totalStaked || option.total_staked || 0;
              const percentage = totalPool > 0 ? (optionStaked / totalPool * 100) : 50;
              const odds = totalPool > 0 ? (totalPool / optionStaked || 1).toFixed(2) : '2.00';
              
              return (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onPredict}
                  className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 bg-gradient-to-r from-gray-50 to-white hover:from-green-50 hover:to-green-25 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">
                        {option.label}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{percentage.toFixed(0)}%</div>
                      <div className="text-sm text-gray-500">{odds}x</div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                <span className="text-sm font-medium">{likeCount}</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleComment}
                className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <MessageCircle size={18} />
                <span className="text-sm font-medium">{commentCount}</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleShare}
                className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors"
              >
                <Share size={18} />
              </motion.button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onPredict}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all duration-200"
            >
              Predict
            </motion.button>
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
};

export default PredictionCard;
