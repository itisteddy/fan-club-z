import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, TrendingUp, Clock, Users } from 'lucide-react';
import { Bet } from '../../../shared/schema';

interface BetCardProps {
  bet: Bet;
  variant?: 'default' | 'compact' | 'user-entry';
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onBet?: () => void;
}

const BetCard: React.FC<BetCardProps> = ({
  bet,
  variant = 'default',
  onLike,
  onComment,
  onShare,
  onBet,
}) => {
  if (variant === 'compact') {
    return (
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
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">₦{bet.poolTotal.toLocaleString()}</div>
              <div className="text-sm opacity-90">Total Pool</div>
            </div>
            <motion.button
              onClick={onBet}
              className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Quick Bet
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'user-entry') {
    return (
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-50/80 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Your Investment</div>
            <div className="text-lg font-bold text-gray-900">₦{(bet.stakeMin * 2).toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">
              {bet.status === 'settled' ? 'Final Return' : 'Potential Return'}
            </div>
            <div className="text-lg font-bold text-green-700">₦{(bet.stakeMin * 3.5).toLocaleString()}</div>
            <div className="text-xs text-green-600 font-medium">+75% gain</div>
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={onBet}
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
    );
  }

  // Default variant
  return (
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
              {bet.creator?.slice(0, 2) || 'FC'}
            </div>
            <div>
              <div className="font-medium text-gray-900">@{bet.creator || 'creator'}</div>
              <div className="text-sm text-gray-500">2 hours ago</div>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            bet.category === 'sports' ? 'bg-red-100 text-red-700' :
            bet.category === 'pop_culture' ? 'bg-purple-100 text-purple-700' :
            bet.category === 'politics' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {bet.category?.replace('_', ' ') || 'General'}
          </span>
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

      {/* Betting Options */}
      <div className="px-6 mb-4">
        <div className="grid grid-cols-2 gap-3">
          {bet.options?.map((option, index) => (
            <motion.button
              key={option.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                index === 0 
                  ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100'
                  : 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onBet}
            >
              <div className="text-center">
                <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                <div className={`text-2xl font-bold ${
                  index === 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {option.currentOdds?.toFixed(2) || '2.5'}x
                </div>
                <div className="text-sm text-gray-600">
                  {Math.round((option.totalStaked / bet.poolTotal) * 100) || 45}% backing
                </div>
              </div>
            </motion.button>
          )) || (
            <>
              <motion.button
                className="p-4 rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBet}
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
                onClick={onBet}
              >
                <div className="text-center">
                  <div className="font-semibold text-gray-900 mb-1">No</div>
                  <div className="text-2xl font-bold text-red-700">2.8x</div>
                  <div className="text-sm text-gray-600">45% backing</div>
                </div>
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50/80 to-blue-50/30 border-t border-gray-100/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-600">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">₦</span>
              </div>
              <span className="font-semibold text-gray-900">₦{bet.poolTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{Math.floor(Math.random() * 50) + 10} participants</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>2 days left</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">+12%</span>
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
              <span className="text-sm font-medium">{Math.floor(Math.random() * 20) + 5}</span>
            </motion.button>
            <motion.button
              onClick={onComment}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{Math.floor(Math.random() * 15) + 2}</span>
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
            onClick={onBet}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
            whileHover={{ scale: 1.02, boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)' }}
            whileTap={{ scale: 0.98 }}
          >
            Place Bet
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default BetCard;