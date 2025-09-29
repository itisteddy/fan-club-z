import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, DollarSign } from 'lucide-react';

interface PredictionOption {
  id: string;
  label: string;
  odds?: number;
}

interface PredictionActionPanelProps {
  prediction: {
    id: string;
    status: string;
    options: PredictionOption[];
    likeCount?: number;
    commentCount?: number;
    isLiked?: boolean;
  };
  selectedOptionId: string | null;
  stakeAmount: string;
  isPlacingBet: boolean;
  userBalance: number;
  onOptionSelect: (optionId: string) => void;
  onStakeChange: (amount: string) => void;
  onPlaceBet: () => void;
  onLike: () => void;
  onComment: () => void;
}

const PredictionActionPanel: React.FC<PredictionActionPanelProps> = ({
  prediction,
  selectedOptionId,
  stakeAmount,
  isPlacingBet,
  userBalance,
  onOptionSelect,
  onStakeChange,
  onPlaceBet,
  onLike,
  onComment
}) => {
  const canPlaceBet = prediction.status === 'open';

  if (!canPlaceBet) {
    // Show engagement actions only
    return (
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-center space-x-8 max-w-md mx-auto">
          <button
            onClick={onLike}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              prediction.isLiked
                ? 'bg-red-50 text-red-600'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-5 h-5 ${prediction.isLiked ? 'fill-current' : ''}`} />
            <span>{prediction.likeCount || 0}</span>
          </button>
          
          <button
            onClick={onComment}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{prediction.commentCount || 0}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4 space-y-4">
      {/* Options */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Choose an option:</h3>
        <div className="grid gap-2">
          {prediction.options.map((option) => (
            <button
              key={option.id}
              onClick={() => onOptionSelect(option.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedOptionId === option.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.label}</span>
                <span className="text-sm text-gray-600">
                  {option.odds ? `${option.odds.toFixed(2)}x` : '1.00x'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stake Input */}
      {selectedOptionId && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stake Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => onStakeChange(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                min="0"
                step="0.01"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Balance: ${userBalance.toLocaleString()}
            </p>
          </div>

          <button
            onClick={onPlaceBet}
            disabled={!stakeAmount || isPlacingBet || parseFloat(stakeAmount) > userBalance}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              !stakeAmount || isPlacingBet || parseFloat(stakeAmount) > userBalance
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isPlacingBet ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Placing Bet...</span>
              </div>
            ) : (
              `Place Bet - $${stakeAmount || '0.00'}`
            )}
          </button>
        </motion.div>
      )}

      {/* Engagement Actions */}
      <div className="flex items-center justify-center space-x-8 pt-2 border-t border-gray-100">
        <button
          onClick={onLike}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            prediction.isLiked
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Heart className={`w-4 h-4 ${prediction.isLiked ? 'fill-current' : ''}`} />
          <span>{prediction.likeCount || 0}</span>
        </button>
        
        <button
          onClick={onComment}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{prediction.commentCount || 0}</span>
        </button>
      </div>
    </div>
  );
};

export default PredictionActionPanel;