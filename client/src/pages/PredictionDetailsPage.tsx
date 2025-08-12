import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, User, Heart, MessageCircle, Share2, TrendingUp, DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { formatTimeRemaining } from '../lib/utils';
import toast from 'react-hot-toast';

interface PredictionDetailsPageProps {
  predictionId?: string;
}

const PredictionDetailsPage: React.FC<PredictionDetailsPageProps> = ({ predictionId }) => {
  const [, setLocation] = useLocation();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { predictions, fetchPredictions } = usePredictionStore();
  const { isAuthenticated } = useAuthStore();
  const { getBalance } = useWalletStore();

  // Get prediction ID from URL if not passed as prop
  const getPredictionIdFromUrl = () => {
    if (predictionId) return predictionId;
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  useEffect(() => {
    const loadPrediction = async () => {
      const id = getPredictionIdFromUrl();
      if (!id) {
        console.log('No prediction ID found in URL');
        setLocation('/discover');
        return;
      }

      console.log('Loading prediction:', id);
      
      // First check if we already have this prediction in store
      let foundPrediction = predictions.find(p => p.id === id);
      
      if (foundPrediction) {
        console.log('Prediction found in store:', foundPrediction.title);
        setPrediction(foundPrediction);
        setLoading(false);
        return;
      }

      // If not in store, check if we have any predictions loaded
      if (predictions.length === 0) {
        console.log('No predictions in store, fetching...');
        setLoading(true);
        try {
          await fetchPredictions();
          foundPrediction = predictions.find(p => p.id === id);
          
          if (foundPrediction) {
            console.log('Prediction found after fetch:', foundPrediction.title);
            setPrediction(foundPrediction);
          } else {
            console.log('Prediction not found after fetch');
            setPrediction(null);
          }
        } catch (error) {
          console.error('Failed to fetch predictions:', error);
          setPrediction(null);
        } finally {
          setLoading(false);
        }
      } else {
        // We have predictions but not this one - it might not exist
        console.log('Prediction not found in available predictions');
        setPrediction(null);
        setLoading(false);
      }
    };

    loadPrediction();
  }, [predictionId, predictions, fetchPredictions]);

  const handleBack = () => {
    console.log('🔙 Back button clicked');
    // Use browser history for faster navigation
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/discover');
    }
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setStakeAmount(value);
    }
  };

  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to place a bet');
      return;
    }

    if (!selectedOption) {
      toast.error('Please select an option');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (!amount || amount < prediction.stake_min) {
      toast.error(`Minimum stake is $${prediction.stake_min}`);
      return;
    }

    if (prediction.stake_max && amount > prediction.stake_max) {
      toast.error(`Maximum stake is $${prediction.stake_max}`);
      return;
    }

    const userBalance = getBalance('USD');
    if (amount > userBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setIsPlacingBet(true);
    try {
      // TODO: Implement actual bet placement logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Bet placed successfully!');
      setStakeAmount('');
      setSelectedOption(null);
    } catch (error) {
      toast.error('Failed to place bet. Please try again.');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/prediction/${prediction?.id}`;
    const shareText = `${prediction?.title}\n\nMake your prediction on Fan Club Z!`;
    
    if (navigator.share) {
      navigator.share({
        title: prediction?.title,
        text: shareText,
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prediction...</p>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Prediction Not Found</h2>
          <p className="text-gray-600 mb-4">The prediction you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const selectedOptionData = prediction.options?.find((opt: any) => opt.id === selectedOption);
  const potentialPayout = selectedOptionData ? parseFloat(stakeAmount) * selectedOptionData.current_odds : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back</span>
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Prediction Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100"
        >
          {/* Creator Info */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => {
                console.log('👤 Navigating to creator profile from details:', prediction.creator?.id);
                setLocation(`/profile/${prediction.creator?.id}`);
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {prediction.creator?.username?.charAt(0)?.toUpperCase() || 'FC'}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 hover:text-primary transition-colors">
                  {prediction.creator?.username || 'Fan Club Z'}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(prediction.created_at).toLocaleDateString()}
                </div>
              </div>
            </button>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {prediction.title}
          </h1>

          {/* Description */}
          {prediction.description && (
            <p className="text-gray-600 mb-4 leading-relaxed">
              {prediction.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${prediction.pool_total?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-500">Total Pool</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {prediction.participant_count || 0}
              </div>
              <div className="text-sm text-gray-500">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {prediction.options?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Options</div>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
            <Clock size={16} />
            <span className="font-medium">
              {formatTimeRemaining(prediction.entry_deadline)} left
            </span>
          </div>
        </motion.div>

        {/* Betting Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Place Your Bet</h2>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {prediction.options?.map((option: any) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  selectedOption === option.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">
                      {option.total_staked > 0 ? `${((option.total_staked / prediction.pool_total) * 100).toFixed(1)}%` : '0%'} of pool
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {option.current_odds.toFixed(2)}x
                    </div>
                    <div className="text-sm text-gray-500">
                      ${option.total_staked?.toLocaleString() || '0'} staked
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Stake Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stake Amount (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="text"
                value={stakeAmount}
                onChange={handleStakeChange}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>Min: ${prediction.stake_min}</span>
              <span>Max: ${prediction.stake_max || 'No limit'}</span>
            </div>
          </div>

          {/* Potential Payout */}
          {selectedOption && stakeAmount && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-green-800 font-medium">Potential Payout:</span>
                <span className="text-green-800 font-bold text-lg">
                  ${potentialPayout.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!selectedOption || !stakeAmount || isPlacingBet}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
              selectedOption && stakeAmount && !isPlacingBet
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isPlacingBet ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </motion.div>

        {/* Engagement Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">Engagement</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-600">
              <Heart size={20} />
              <span>{prediction.likes_count || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageCircle size={20} />
              <span>{prediction.comments_count || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp size={20} />
              <span>{prediction.participant_count || 0} participants</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PredictionDetailsPage;
