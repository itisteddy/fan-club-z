import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Heart, MessageCircle, Share2, TrendingUp, ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { useNotificationStore } from '../store/notificationStore';
import { formatTimeRemaining } from '../lib/utils';
import CommentSystem from '../components/CommentSystem';
import { getAuthToken } from '../lib/api';

interface PredictionDetailsPageProps {
  predictionId?: string;
  onNavigateBack?: () => void;
}

const PredictionDetailsPage: React.FC<PredictionDetailsPageProps> = ({ predictionId, onNavigateBack }) => {
  const [, setLocation] = useLocation();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [realCommentsCount, setRealCommentsCount] = useState<number>(0);
  
  // Refs for smooth scrolling
  const commentsRef = useRef<HTMLDivElement>(null);
  const engagementRef = useRef<HTMLDivElement>(null);
  
  const { predictions, fetchPredictions, placePrediction, getPredictionById } = usePredictionStore();
  const { isAuthenticated, user } = useAuthStore();
  const { getBalance } = useWalletStore();
  const { success, error, info } = useNotificationStore();

  // Load comments count from API
  const loadCommentsCount = async (predictionId: string) => {
    try {
      const response = await fetch(`/api/v2/predictions/${predictionId}/comments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.total || data.comments?.length || 0;
        setRealCommentsCount(count);
        console.log('✅ Comments count loaded:', count);
      }
    } catch (err) {
      console.log('Failed to load comments count:', err);
    }
  };

  // Load like status for the current user
  const loadLikeStatus = async (predictionId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v2/predictions/${predictionId}/likes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.user_has_liked || false);
      }
    } catch (err) {
      console.log('Failed to load like status:', err);
    }
  };

  // Get prediction ID from URL or prop
  const getCurrentPredictionId = (): string | null => {
    if (predictionId) return predictionId;
    
    const currentPath = window.location.pathname;
    const match = currentPath.match(/\/prediction\/([^\/]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const loadPrediction = async () => {
      const id = getCurrentPredictionId();
      
      if (!id) {
        console.log('❌ No prediction ID found');
        setLocation('/discover');
        return;
      }

      console.log('🔍 Loading prediction with ID:', id);
      setLoading(true);
      
      try {
        // Use the store method that handles both store lookup and API fallback
        const foundPrediction = getPredictionById(id);
        
        if (foundPrediction) {
          console.log('✅ Found prediction:', foundPrediction.title);
          setPrediction(foundPrediction);
          
          // Load like status for authenticated users
          if (isAuthenticated) {
            loadLikeStatus(id);
          }
          
          // Load comments count
          loadCommentsCount(id);
        } else {
          console.log('📡 Prediction not in store, fetching from API...');
          
          // Try to fetch predictions if not found
          await fetchPredictions();
          
          // Check again after fetch
          const refetchedPrediction = getPredictionById(id);
          if (refetchedPrediction) {
            console.log('✅ Found prediction after fetch:', refetchedPrediction.title);
            setPrediction(refetchedPrediction);
            
            // Load like status for authenticated users
            if (isAuthenticated) {
              loadLikeStatus(id);
            }
          } else {
            console.log('❌ Prediction not found after fetch');
            setPrediction(null);
          }
        }
      } catch (err) {
        console.error('❌ Error loading prediction:', err);
        setPrediction(null);
        error('Error', 'Failed to load prediction. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
  }, [predictionId, getPredictionById, fetchPredictions, setLocation, error, isAuthenticated]);

  const handleBack = () => {
    console.log('🔙 Navigating back');
    
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      // Fallback navigation
      try {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          setLocation('/discover');
        }
      } catch (error) {
        console.error('Navigation error:', error);
        setLocation('/discover');
      }
    }
  };

  const handleOptionSelect = (optionId: string) => {
    console.log('🎯 Option selected:', optionId);
    setSelectedOption(optionId);
  };

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid decimal numbers
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setStakeAmount(value);
    }
  };

  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      error('Authentication Required', 'Please sign in to place a prediction');
      return;
    }

    if (!selectedOption) {
      error('Selection Required', 'Please select an option');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (!amount || amount < prediction.stake_min) {
      error('Invalid Amount', `Minimum stake is $${prediction.stake_min}`);
      return;
    }

    if (prediction.stake_max && amount > prediction.stake_max) {
      error('Amount Too High', `Maximum stake is $${prediction.stake_max}`);
      return;
    }

    const userBalance = getBalance('USD');
    if (amount > userBalance) {
      error('Insufficient Funds', 'Please add funds to your wallet to place this prediction');
      return;
    }

    setIsPlacingBet(true);
    try {
      console.log('🎲 Placing prediction:', { 
        predictionId: prediction.id, 
        optionId: selectedOption, 
        amount,
        userId: user?.id
      });
      
      await placePrediction({
        predictionId: prediction.id,
        optionId: selectedOption,
        amount,
        userId: user?.id || ''
      });
      
      success('Prediction Placed', 'Your prediction was placed successfully!');
      setStakeAmount('');
      setSelectedOption(null);
      
      // Refresh prediction data
      setTimeout(() => {
        fetchPredictions(undefined, true);
      }, 1000);
      
    } catch (err) {
      console.error('❌ Failed to place prediction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to place prediction';
      error('Prediction Failed', errorMessage);
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
        .then(() => info('Link Copied', 'Prediction link copied to clipboard!'))
        .catch(() => error('Copy Failed', 'Failed to copy link'));
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      error('Authentication Required', 'Please sign in to like this prediction');
      return;
    }
    
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    
    try {
      const response = await fetch(`/api/v2/predictions/${prediction.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Update prediction data with new like count
        setPrediction(prev => ({
          ...prev,
          likes_count: data.likes_count || (prev.likes_count || 0) + (wasLiked ? -1 : 1),
          is_liked: data.liked
        }));
        success('Like Updated', data.liked ? 'Liked prediction!' : 'Removed like');
      } else {
        throw new Error('Failed to update like');
      }
    } catch (err) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      console.error('Like error:', err);
      error('Like Failed', 'Failed to update like. Please try again.');
    }
  };

  const handleCommentsToggle = () => {
    console.log('💬 Toggling comments from:', showComments, 'to:', !showComments);
    const newShowComments = !showComments;
    setShowComments(newShowComments);
    
    // Smooth scroll to comments section when opening
    if (newShowComments) {
      setTimeout(() => {
        if (commentsRef.current) {
          commentsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 300); // Wait for animation to start
    } else {
      // Scroll back to engagement section when closing
      if (engagementRef.current) {
        engagementRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
    }
  };

  // Check if user has a bet entry
  const userHasEntry = prediction?.user_entry || prediction?.entries?.some((entry: any) => entry.user_id === user?.id);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading prediction...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!prediction) {
    return (
      <div className="min-h-screen bg-gray-50">
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
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Prediction Not Found</h2>
            <p className="text-gray-600 mb-4">The prediction you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => setLocation('/discover')}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Browse Predictions
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedOptionData = prediction.options?.find((opt: any) => opt.id === selectedOption);
  const potentialPayout = selectedOptionData && stakeAmount ? 
    parseFloat(stakeAmount) * selectedOptionData.current_odds : 0;

  // Determine if betting is still allowed
  const canPlaceBet = prediction.status === 'open' && new Date(prediction.entry_deadline) > new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back</span>
            </button>
            
            <button
              onClick={handleShare}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto pb-24">
        {/* Prediction Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100"
        >
          {/* Creator Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {prediction.creator?.username?.charAt(0)?.toUpperCase() || 'FC'}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-lg">
                {prediction.creator?.username || 'Fan Club Z'}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(prediction.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              prediction.status === 'open' ? 'bg-green-100 text-green-800' :
              prediction.status === 'closed' ? 'bg-amber-100 text-amber-800' :
              prediction.status === 'settled' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {prediction.status.charAt(0).toUpperCase() + prediction.status.slice(1)}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {prediction.title}
          </h1>

          {/* Description */}
          {prediction.description && (
            <p className="text-gray-600 mb-6 leading-relaxed text-base">
              {prediction.description}
            </p>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                ${(prediction.pool_total || prediction.poolTotal || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Pool</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {prediction.participant_count || prediction.participants || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">Participants</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {prediction.options?.length || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">Options</div>
            </div>
          </div>

          {/* Time Display */}
          {prediction.status === 'open' && (
            <div className="flex items-center gap-3 text-orange-600 bg-orange-50 px-4 py-3 rounded-xl">
              <Clock size={20} />
              <div>
                <div className="font-semibold">
                  {formatTimeRemaining(prediction.entry_deadline || prediction.entryDeadline)} remaining
                </div>
                <div className="text-sm text-orange-500">
                  Closes: {new Date(prediction.entry_deadline || prediction.entryDeadline).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Betting Section - Only show if betting is still open */}
        {canPlaceBet && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Place Your Prediction</h2>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {prediction.options?.map((option: any, index: number) => (
                <motion.button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full p-4 rounded-xl border-2 transition-all ${
                    selectedOption === option.id
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left flex-1">
                      <div className="font-semibold text-gray-900 text-lg mb-1">{option.label}</div>
                      <div className="text-sm text-gray-500">
                        {prediction.pool_total > 0 ? 
                          `${((option.total_staked / prediction.pool_total) * 100).toFixed(1)}% of pool` : 
                          '0% of pool'
                        } • ${(option.total_staked || option.totalStaked || 0).toLocaleString()} staked
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-green-600">
                        {(option.current_odds || 1.0).toFixed(2)}x
                      </div>
                      <div className="text-xs text-gray-500">odds</div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Stake Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Stake Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="text"
                  value={stakeAmount}
                  onChange={handleStakeChange}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors text-lg"
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>Min: ${prediction.stake_min}</span>
                <span>Max: ${prediction.stake_max || 'No limit'}</span>
              </div>
            </div>

            {/* Potential Payout */}
            <AnimatePresence>
              {selectedOption && stakeAmount && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-800 font-semibold">Potential Payout:</span>
                    <span className="text-green-800 font-bold text-xl">
                      ${potentialPayout.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-green-700 text-sm">
                    Profit: ${Math.max(0, potentialPayout - parseFloat(stakeAmount)).toFixed(2)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Place Bet Button */}
            <motion.button
              onClick={handlePlaceBet}
              disabled={!selectedOption || !stakeAmount || isPlacingBet}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all text-lg ${
                selectedOption && stakeAmount && !isPlacingBet
                  ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              whileHover={selectedOption && stakeAmount && !isPlacingBet ? { scale: 1.02 } : {}}
              whileTap={selectedOption && stakeAmount && !isPlacingBet ? { scale: 0.98 } : {}}
            >
              {isPlacingBet ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Placing Prediction...
                </div>
              ) : (
                'Place Prediction'
              )}
            </motion.button>
          </motion.div>
        )}

        {/* Show message if betting is closed */}
        {!canPlaceBet && prediction.status === 'open' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6"
          >
            <div className="text-center">
              <Clock className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Betting Closed</h3>
              <p className="text-amber-700">
                This prediction has reached its deadline. No new predictions can be placed.
              </p>
            </div>
          </motion.div>
        )}

        {/* Engagement Section */}
        <motion.div
          ref={engagementRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">Community Engagement</h3>
          <div className="flex items-center gap-6">
            <motion.button
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${
                isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
              <span className="font-medium">
                {(prediction.likes_count || 0)} likes
              </span>
            </motion.button>
            
            <motion.button
              onClick={handleCommentsToggle}
              className={`flex items-center gap-2 transition-colors ${
                showComments ? 'text-blue-500' : 'text-gray-600 hover:text-blue-500'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MessageCircle size={20} />
              <span className="font-medium">
                {realCommentsCount || prediction.comments_count || 0} comments
              </span>
              <ChevronDown 
                size={16} 
                className={`transition-transform ml-1 ${showComments ? 'rotate-180' : ''}`}
              />
            </motion.button>
            
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp size={20} />
              <span className="font-medium">
                {prediction.participant_count || prediction.participants || 0} participants
              </span>
            </div>
          </div>
        </motion.div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              ref={commentsRef}
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6"
            >
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-bold text-gray-900">Comments</h3>
                <p className="text-sm text-gray-600">Join the conversation about this prediction</p>
              </div>
              <div className="min-h-[300px] max-h-[600px] overflow-y-auto">
                <CommentSystem 
                  predictionId={prediction?.id || ''}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PredictionDetailsPage;