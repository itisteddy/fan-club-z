import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, DollarSign, TrendingUp, MessageCircle, Share2, Heart } from 'lucide-react';
import type { Prediction } from '../../../shared/schema';

interface CompactPredictionCardProps {
  prediction: Prediction;
  index: number;
  onPredict: (prediction: Prediction) => void;
  onLike: (predictionId: string) => void;
  onComment: (predictionId: string) => void;
  onShare: (prediction: Prediction) => void;
  onNavigate?: (predictionId: string) => void;
}

const CompactPredictionCard: React.FC<CompactPredictionCardProps> = ({
  prediction,
  index,
  onPredict,
  onLike,
  onComment,
  onShare,
  onNavigate,
}) => {
  const formatTimeRemaining = (deadline: string | Date) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Ending soon';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle different property naming conventions
  const poolTotal = prediction.poolTotal || prediction.pool_total || 0;
  const entryDeadline = prediction.entryDeadline || prediction.entry_deadline || new Date();
  const stakeMin = prediction.stakeMin || prediction.stake_min || 1;
  const likesCount = prediction.likes || prediction.likes_count || 0;
  const commentsCount = prediction.comments || prediction.comments_count || 0;
  const participantCount = prediction.participant_count || prediction.entries?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
      style={{ margin: '0 1rem 0.75rem 1rem' }}
      onClick={() => {
        if (onNavigate) {
          onNavigate(prediction.id);
        } else {
          // Fallback navigation
          window.location.href = `/prediction/${prediction.id}`;
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight">
            {prediction.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {prediction.description || 'No description available'}
          </p>
        </div>
        <div className="ml-3 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {prediction.category}
          </span>
        </div>
      </div>

      {/* Options */}
      {prediction.options && prediction.options.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            {prediction.options.slice(0, 2).map((option, optionIndex) => {
              const optionStaked = option.totalStaked || option.total_staked || 0;
              const percentage = poolTotal > 0 ? (optionStaked / poolTotal) * 100 : 0;
              
              return (
                <button
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    onPredict(prediction);
                  }}
                  className="p-3 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600">
                    {percentage.toFixed(1)}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <DollarSign size={14} />
            <span>{formatCurrency(poolTotal)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{participantCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span>{formatTimeRemaining(entryDeadline)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp size={14} className="text-green-500" />
          <span className="text-green-500 font-medium">
            {prediction.status === 'open' ? 'Live' : prediction.status}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(prediction.id);
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Heart size={16} />
            <span className="text-sm">{likesCount}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComment(prediction.id);
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
          >
            <MessageCircle size={16} />
            <span className="text-sm">{commentsCount}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(prediction);
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors"
          >
            <Share2 size={16} />
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPredict(prediction);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
        >
          Predict
        </button>
      </div>
    </motion.div>
  );
};

export default CompactPredictionCard;
