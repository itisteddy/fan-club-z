import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share, TrendingUp, Clock, Users } from 'lucide-react';
import { Prediction, PredictionEntry } from '../stores/types';

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
  onLike,
  onComment,
  onShare,
  onPredict,
  className = ''
}) => {
  const isLiked = false; // TODO: Connect to state
  const timeRemaining = Math.max(0, new Date(prediction.entryDeadline).getTime() - Date.now());
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isClosingSoon = hoursRemaining < 24;

  // Calculate percentages for options
  const totalPool = prediction.options.reduce((sum, option) => sum + option.totalStaked, 0);
  
  if (variant === 'compact') {
    return (
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
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-3">
            {prediction.title}
          </h3>
          
          {/* Quick stats */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{prediction.participantCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>₦{totalPool.toLocaleString()}</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            {prediction.options.slice(0, 2).map((option) => {
              const percentage = totalPool > 0 ? (option.totalStaked / totalPool * 100) : 50;
              return (
                <div key={option.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{option.label}</span>
                  <span className="text-sm font-bold text-green-600">{percentage.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'user-entry' && entry) {
    const isWinning = entry.status === 'won';
    const isPending = entry.status === 'active';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-2xl border-l-4 ${isWinning ? 'border-l-green-500' : isPending ? 'border-l-blue-500' : 'border-l-gray-300'} shadow-lg shadow-gray-900/5 overflow-hidden ${className}`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-1">
                {prediction.title}
              </h3>
              <span className="text-sm text-gray-500">
                Your prediction: {prediction.options.find(o => o.id === entry.optionId)?.label}
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

          {/* Investment details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl mb-4">
            <div>
              <p className="text-sm text-gray-600">Invested</p>
              <p className="text-lg font-bold text-gray-900">₦{entry.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {entry.status === 'won' ? 'Won' : 'Potential Return'}
              </p>
              <p className={`text-lg font-bold ${isWinning ? 'text-green-600' : 'text-gray-900'}`}>
                ₦{(entry.actualPayout || entry.potentialPayout || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress or result */}
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl shadow-gray-900/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gray-900/10 ${className}`}
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
          
          <div className="ml-4">
            <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
              {prediction.category}
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-semibold">₦{totalPool.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{prediction.participantCount || 0} predictors</span>
            </div>
          </div>
          
          <div className={`flex items-center gap-1 ${isClosingSoon ? 'text-amber-600' : 'text-gray-600'}`}>
            <Clock size={14} />
            <span>{hoursRemaining}h left</span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {prediction.options.map((option, index) => {
            const percentage = totalPool > 0 ? (option.totalStaked / totalPool * 100) : 50;
            const odds = totalPool > 0 ? (totalPool / option.totalStaked || 1).toFixed(2) : '2.00';
            
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
              onClick={onLike}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">24</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onComment}
              className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
            >
              <MessageCircle size={18} />
              <span className="text-sm font-medium">12</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onShare}
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
  );
};

export default PredictionCard;