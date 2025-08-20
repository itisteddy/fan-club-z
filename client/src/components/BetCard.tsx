import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, TrendingUp, Clock, Users, ChevronDown } from 'lucide-react';
import { Prediction } from '../store/predictionStore';
import { useUnifiedCommentStore } from '../store/unifiedCommentStore';
import CommentModal from './modals/CommentModal';
import TappableUsername from './TappableUsername';

interface BetCardProps {
  bet: Prediction;
  variant?: 'default' | 'compact' | 'user-entry';
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBet?: (optionId?: string) => void;
}

const BetCard: React.FC<BetCardProps> = ({
  bet,
  variant = 'default',
  onLike,
  onComment,
  onShare,
  onBet,
}) => {
  const [showAllOptions, setShowAllOptions] = React.useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const { getCommentCount, updateCommentCount, initialize } = useUnifiedCommentStore();
  
  // Initialize comment store and sync comment count from bet data
  useEffect(() => {
    initialize();
    
    // If bet has a comment count, sync it to the comment store
    if (bet.comments_count !== undefined || bet.comments !== undefined) {
      const count = bet.comments_count || bet.comments || 0;
      updateCommentCount(bet.id, count);
      console.log(`🔄 Synced comment count for bet ${bet.id}: ${count}`);
    }
  }, [bet.id, bet.comments_count, bet.comments, updateCommentCount, initialize]);
  
  // Get comment count for this bet
  const commentCount = getCommentCount(bet.id);
  
  // Calculate display logic for options
  const options = bet.options || [];
  const hasMultipleOptions = options.length > 2;
  const displayOptions = showAllOptions ? options : options.slice(0, 3); // Show 3 instead of 2
  const hiddenOptionsCount = Math.max(0, options.length - 3);

  // Calculate total pool and percentages
  const totalPool = bet.pool_total || bet.poolTotal || options.reduce((sum, option) => sum + (option.total_staked || option.totalStaked || 0), 0);

  const handleCommentClick = () => {
    setIsCommentModalOpen(true);
    // Call the optional onComment prop if provided
    if (onComment) {
      onComment();
    }
  };

  if (variant === 'compact') {
    return (
      <>
      <motion.div
        className="relative w-[320px] h-[180px] rounded-2xl overflow-hidden shadow-lg"
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        style={{
          background: `linear-gradient(135deg, 
            ${bet.category === 'sports' ? '#FF6B6B, #FF8E53' : 
              bet.category === 'pop_culture' ? '#6C5CE7, #A29BFE' :
              bet.category === 'politics' ? '#0984e3, #74b9ff' :
              '#00D084, #00B894'})`,
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative p-6 h-full flex flex-col justify-between text-white">
          <div>
            <div className="text-sm font-medium opacity-90 mb-2">
              {bet.category?.replace('_', ' ').toUpperCase()}
            </div>
            <h3 className="text-lg font-bold leading-tight">{bet.title}</h3>
              {hasMultipleOptions && (
                <div className="text-xs opacity-75 mt-1">
                  {options.length} options available
                </div>
              )}
          </div>
          
          <div className="flex items-center justify-between">
            <div>
                <div className="text-2xl font-bold">${totalPool.toLocaleString('en-US')}</div>
              <div className="text-sm opacity-90">Total Pool</div>
            </div>
            <motion.button
                onClick={() => onBet && onBet()}
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
                View Options
            </motion.button>
          </div>
        </div>
      </motion.div>
        <CommentModal
          prediction={bet}
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
        />
      </>
    );
  }

  if (variant === 'user-entry') {
    return (
      <>
      <motion.div
        className="bg-white rounded-xl shadow-sm border border-gray-100/50 p-4 mb-3"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fffe 100%)',
          borderLeft: `4px solid ${bet.status === 'settled' ? '#00D084' : '#FFB020'}`,
        }}
        whileHover={{ scale: 1.01, y: -2 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">{bet.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                bet.status === 'settled' ? 'bg-green-100 text-green-700' :
                bet.status === 'open' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {bet.status.toUpperCase()}
              </span>
              <Clock className="w-3 h-3" />
              <span className="text-xs">2 days ago</span>
                {hasMultipleOptions && (
                  <span className="text-xs text-gray-500">
                    • {options.length} options
                  </span>
                )}
              </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50/80 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Your Investment</div>
              <div className="text-lg font-bold text-gray-900">${(bet.stake_min * 2).toLocaleString('en-US')}</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">
              {bet.status === 'settled' ? 'Final Return' : 'Potential Return'}
            </div>
              <div className="text-lg font-bold text-green-700">${(bet.stake_min * 3.5).toLocaleString('en-US')}</div>
            <div className="text-xs text-green-600 font-medium">+75% gain</div>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
              onClick={() => onBet && onBet()}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            View Details
          </motion.button>
          <motion.button
            onClick={onShare}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
        <CommentModal
          prediction={bet}
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
        />
      </>
    );
  }

  // Default variant - Enhanced for better option visibility
  return (
    <>
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-gray-100/50 overflow-hidden mb-6"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fdfdff 100%)',
      }}
      whileHover={{ scale: 1.01, y: -2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          {bet.creator?.username?.slice(0, 2) || 'FC'}
          </div>
          <div>
          <TappableUsername 
          username={bet.creator?.username || 'creator'}
          userId={bet.creator_id}
          className="font-medium text-gray-900 hover:text-blue-600"
          showAt={true}
          />
          <div className="text-sm text-gray-500">2 hours ago</div>
          </div>
          </div>
            <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            bet.category === 'sports' ? 'bg-red-100 text-red-700' :
            bet.category === 'pop_culture' ? 'bg-purple-100 text-purple-700' :
            bet.category === 'politics' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {bet.category?.replace('_', ' ') || 'General'}
          </span>
              {options.length > 0 && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                  {options.length} options
                </span>
              )}
            </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-3 leading-tight">
          {bet.title}
        </h3>
        
        {bet.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {bet.description}
          </p>
        )}
      </div>

        {/* Betting Options - Always Visible with Enhanced Layout */}
      <div className="px-6 mb-4">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Available Predictions</h4>
              <span className="text-xs text-gray-500">{options.length} options</span>
            </div>
            
            {options.length === 0 ? (
              // Fallback for binary betting (backward compatibility)
        <div className="grid grid-cols-2 gap-3">
              <motion.button
                className="p-4 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                  onClick={() => onBet && onBet('yes')}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900 mb-1">Yes</div>
                  <div className="text-2xl font-bold text-green-700">2.1x</div>
                  <div className="text-sm text-gray-600">55% backing</div>
                </div>
              </motion.button>
              <motion.button
                className="p-4 rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                  onClick={() => onBet && onBet('no')}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900 mb-1">No</div>
                  <div className="text-2xl font-bold text-red-700">2.8x</div>
                  <div className="text-sm text-gray-600">45% backing</div>
                </div>
              </motion.button>
              </div>
            ) : options.length === 2 ? (
              // Two options - Grid layout
              <div className="grid grid-cols-2 gap-3">
                {options.map((option, index) => {
                  const optionStaked = option.total_staked || option.totalStaked || 0;
                  const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : 25;
                  const odds = optionStaked > 0 ? totalPool / optionStaked : 2.0;
                  
                  return (
                    <motion.button
                      key={option.id}
                      className={`p-4 rounded-xl border-2 transition-all group ${
                        index === 0 
                          ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 hover:border-green-300'
                          : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onBet && onBet(option.id)}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-gray-800">
                          {option.label}
                        </div>
                        <div className={`text-2xl font-bold mb-1 ${
                          index === 0 ? 'text-green-700' : 'text-blue-700'
                        }`}>
                          {odds.toFixed(1)}x
                        </div>
                        <div className="text-sm text-gray-600">
                          {percentage.toFixed(0)}% backing
                        </div>
                        <div className="mt-2">
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                index === 0 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              // Multiple options - Enhanced list layout
              <div className="space-y-2">
                {displayOptions.map((option, index) => {
                  const optionStaked = option.total_staked || option.totalStaked || 0;
                  const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : Math.random() * 30 + 10;
                  const odds = optionStaked > 0 ? totalPool / optionStaked : (Math.random() * 3 + 1.5);
                  
                  const colors = [
                    { bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200 hover:border-emerald-300', text: 'text-emerald-700', bar: 'bg-emerald-500' },
                    { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200 hover:border-blue-300', text: 'text-blue-700', bar: 'bg-blue-500' },
                    { bg: 'from-purple-50 to-violet-50', border: 'border-purple-200 hover:border-purple-300', text: 'text-purple-700', bar: 'bg-purple-500' },
                    { bg: 'from-amber-50 to-yellow-50', border: 'border-amber-200 hover:border-amber-300', text: 'text-amber-700', bar: 'bg-amber-500' },
                  ];
                  const colorScheme = colors[index % colors.length];
                  
                  return (
                    <motion.button
                      key={option.id}
                      className={`w-full p-4 rounded-lg border-2 bg-gradient-to-r ${colorScheme.bg} ${colorScheme.border} transition-all group`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => onBet && onBet(option.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 line-clamp-1 mb-1 group-hover:text-gray-800">
                            {option.label}
                          </div>
                          <div className="text-sm text-gray-600">
                            {percentage.toFixed(0)}% backing • ${optionStaked?.toLocaleString('en-US') || '0'}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`text-xl font-bold ${colorScheme.text}`}>
                              {odds.toFixed(1)}x
                            </div>
                            <div className="text-xs text-gray-500">odds</div>
                          </div>
                          <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${colorScheme.bar} transition-all duration-700`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                
                {/* Show more/less options button */}
                {hasMultipleOptions && hiddenOptionsCount > 0 && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllOptions(!showAllOptions);
                    }}
                    className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 transition-all"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <span className="text-sm font-medium">
                        {showAllOptions ? 'Show Less Options' : `View ${hiddenOptionsCount} More Option${hiddenOptionsCount > 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAllOptions ? 'rotate-180' : ''}`} />
                    </div>
                  </motion.button>
                )}
              </div>
          )}
        </div>
      </div>

        {/* Quick Action Bar - New Addition */}
        <div className="px-6 py-3 bg-gradient-to-r from-gray-50/80 to-indigo-50/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">$</span>
                </div>
                <span className="font-semibold text-gray-900">${totalPool.toLocaleString('en-US')}</span>
                <span className="text-gray-500">pool</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Users className="w-4 h-4" />
                <span>{0}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>2 days left</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="w-4 h-4" />
              <span className="font-medium">Trending</span>
            </div>
        </div>
      </div>

      {/* Social Actions */}
      <div className="px-6 py-4 border-t border-gray-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={onLike}
              className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">{0}</span>
            </motion.button>
            <motion.button
                onClick={handleCommentClick}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{commentCount}</span>
            </motion.button>
            <motion.button
              onClick={onShare}
              className="flex items-center gap-2 text-gray-600 hover:text-green-500 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </motion.button>
          </div>
          <motion.button
              onClick={() => onBet && onBet()}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm"
            whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)' }}
            whileTap={{ scale: 0.98 }}
          >
              Quick Predict
          </motion.button>
        </div>
      </div>
    </motion.div>
      
      {/* Comment Modal */}
      <CommentModal
        prediction={bet}
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
      />
    </>
  );
};

export default BetCard;