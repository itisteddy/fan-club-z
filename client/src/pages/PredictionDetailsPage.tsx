import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Heart, MessageCircle, Share2, TrendingUp, ChevronDown, User } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { useSettlementStore } from '../store/settlementStore';
import { useLikeStore } from '../store/likeStore';
import { useUnifiedCommentStore, useCommentsForPrediction } from '../store/unifiedCommentStore';
import { formatTimeRemaining } from '../lib/utils';
import CommentSystem from '../components/CommentSystem';
import TappableUsername from '../components/TappableUsername';
import {
  SettlementBadge,
  SettlementPanel,
  SettlementRuleModal,
  AcceptanceBar,
  ProofRow,
  AuditTimeline,
  DisputeCard,
  DisputeModal,
  TimezoneChip
} from '../components/settlement';
import toast from 'react-hot-toast';

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

  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [showAuditTimeline, setShowAuditTimeline] = useState(false);
  
  // Refs for smooth scrolling
  const commentsRef = useRef<HTMLDivElement>(null);
  const engagementRef = useRef<HTMLDivElement>(null);
  
  const { predictions, fetchPredictions, fetchPredictionById, placePrediction } = usePredictionStore();
  const { isAuthenticated, user } = useAuthStore();
  const { getBalance } = useWalletStore();
  const { checkIfLiked, getLikeCount, toggleLike } = useLikeStore();
  const { 
    settlements, 
    disputes, 
    auditTimeline,
    fetchSettlement, 
    fetchDisputes, 
    fetchAuditTimeline,
    disputeModalOpen,
    setDisputeModalOpen
  } = useSettlementStore();

  // Get prediction ID from URL or prop - memoized to prevent unnecessary re-renders
  const currentPredictionId = useMemo((): string | null => {
    if (predictionId) return predictionId;
    
    const currentPath = window.location.pathname;
    const match = currentPath.match(/\/prediction\/([^\/]+)/);
    return match ? match[1] : null;
  }, [predictionId]); // Only re-compute when predictionId prop changes

  // Stable prediction ID for comment system
  const stablePredictionId = useMemo(() => currentPredictionId || '', [currentPredictionId]);

  // Get the live prediction from store (reactive to updates)
  const livePrediction = useMemo(() => {
    if (!currentPredictionId) return null;
    return predictions.find(p => p.id === currentPredictionId) || null;
  }, [predictions, currentPredictionId]);
  
  // Initialize comment store after prediction ID is available
  const { commentCount } = useCommentsForPrediction(stablePredictionId);

  useEffect(() => {
    const loadPrediction = async () => {
      if (!currentPredictionId) {
        console.log('❌ No prediction ID found');
        setLocation('/discover');
        return;
      }

      console.log('🔍 Loading prediction with ID:', currentPredictionId);
      setLoading(true);
      
      try {
        // Use the new fetchPredictionById method for better deep-link support
        const foundPrediction = await fetchPredictionById(currentPredictionId);
        
        if (foundPrediction) {
          console.log('✅ Found prediction:', foundPrediction.title);
          setPrediction(foundPrediction);
          
          // Load settlement data if needed
          if (['locked', 'settling', 'settled', 'voided', 'disputed', 'resolved'].includes(foundPrediction.status)) {
            await fetchSettlement(currentPredictionId);
            await fetchDisputes(currentPredictionId);
            await fetchAuditTimeline(currentPredictionId);
          }
        } else {
          console.log('❌ Prediction not found:', currentPredictionId);
          setPrediction(null);
        }
      } catch (error) {
        console.error('❌ Error loading prediction:', error);
        setPrediction(null);
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
  }, [currentPredictionId, fetchPredictionById, setLocation, fetchSettlement, fetchDisputes, fetchAuditTimeline]);

  // Update local prediction state when store prediction changes (for real-time updates)
  useEffect(() => {
    if (livePrediction && prediction?.id === livePrediction.id) {
      console.log('🔄 Updating prediction with latest data from store');
      setPrediction(livePrediction);
    }
  }, [livePrediction, prediction?.id]);

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
      toast.error('Please sign in to place a prediction');
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
      console.log('🎲 Placing prediction:', { predictionId: prediction.id, optionId: selectedOption, amount });
      
      await placePrediction({
        predictionId: prediction.id,
        optionId: selectedOption,
        amount: amount,
        userId: user?.id || ''
      });
      
      toast.success('Prediction placed successfully!');
      setStakeAmount('');
      setSelectedOption(null);
      
      // Refresh prediction data
      setTimeout(() => {
        fetchPredictions();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to place prediction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to place prediction';
      toast.error(errorMessage);
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleShare = async () => {
    if (!prediction) {
      toast.error('No prediction to share');
      return;
    }

    const shareUrl = `${window.location.origin}/prediction/${prediction.id}`;
    const shareText = `${prediction.title}\n\nMake your prediction on Fan Club Z!`;
    
    // Try native sharing first (mobile devices)
    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: prediction.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // User cancelled or sharing failed, fall back to clipboard
        console.log('Native sharing cancelled or failed:', error);
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      // Final fallback for older browsers
      console.error('Clipboard API failed:', error);
      
      // Create a temporary textarea to copy text
      const textArea = document.createElement('textarea');
      textArea.value = `${shareText}\n${shareUrl}`;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        toast.success('Link copied to clipboard!');
      } catch (execError) {
        toast.error('Failed to copy link');
        console.error('execCommand failed:', execError);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like this prediction');
      return;
    }
    
    try {
      await toggleLike(prediction.id);
      toast.success(checkIfLiked(prediction.id) ? 'Liked prediction!' : 'Removed like');
    } catch (error) {
      toast.error('Failed to update like');
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

  // Get creator info with fallbacks for different data structures
  const getCreatorInfo = () => {
    // Handle different possible creator data structures
    if (prediction?.creator) {
      return {
        id: prediction.creator.id || prediction.creator_id,
        username: prediction.creator.username || prediction.creator.full_name || 'creator',
        displayName: prediction.creator.full_name || prediction.creator.username,
        avatar_url: prediction.creator.avatar_url
      };
    } else if (prediction?.creator_id) {
      return {
        id: prediction.creator_id,
        username: 'creator',
        displayName: 'Creator'
      };
    }
    
    return {
      id: 'unknown',
      username: 'Fan Club Z',
      displayName: 'Fan Club Z'
    };
  };

  // Check if user has a bet entry
  const userHasEntry = prediction?.user_entry || prediction?.entries?.some((entry: any) => entry.user_id === user?.id);
  
  // Get settlement data
  const settlementData = settlements[prediction?.id];
  const disputeList = disputes[prediction?.id] || [];
  const auditEvents = auditTimeline[prediction?.id] || [];

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
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
              className="bg-teal-500 text-white px-6 py-2 rounded-lg hover:bg-teal-600 transition-colors"
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

  // Get creator info
  const creatorInfo = getCreatorInfo();

  return (
    <>
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
            {/* Creator Info - Fixed with TappableUsername */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-teal-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {creatorInfo.username?.charAt(0)?.toUpperCase() || 'FC'}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <TappableUsername 
                    username={creatorInfo.username}
                    userId={creatorInfo.id}
                    displayName={creatorInfo.displayName}
                    className="font-semibold text-gray-900 text-lg hover:text-teal-600 transition-colors"
                    showAt={false}
                  />
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(prediction.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
              
              {/* Settlement Badge */}
              {prediction.settlement?.method && (
                <SettlementBadge 
                  method={prediction.settlement.method}
                  badges={prediction.settlement.badges}
                />
              )}
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

            {/* Settlement Rule Info */}
            {prediction.settlement && (
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Settlement Rule:</span>
                  <button
                    onClick={() => setShowSettlementModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View full rule
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {prediction.settlement.rule_text}
                </p>
              </div>
            )}

            {/* Stats Grid - Using real data */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-teal-50 rounded-xl">
                <div className="text-2xl font-bold text-teal-600">
                  ${(prediction.pool_total || 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-medium">Total Pool</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">
                  {prediction.participant_count || 0}
                </div>
                <div className="text-sm text-gray-600 font-medium whitespace-nowrap text-center">Participants</div>
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
                    {formatTimeRemaining(prediction.entry_deadline)} remaining
                  </div>
                  <div className="text-sm text-orange-500">
                    <TimezoneChip 
                      timezone={prediction.settlement?.timezone || 'UTC'}
                      timestamp={prediction.entry_deadline}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Lock Time Display */}
            {prediction.lock_time && prediction.status !== 'open' && (
              <div className="flex items-center gap-3 text-gray-600 bg-gray-50 px-4 py-3 rounded-xl">
                <Clock size={20} />
                <div>
                  <div className="font-semibold">
                    Locked at
                  </div>
                  <div className="text-sm">
                    <TimezoneChip 
                      timezone={prediction.settlement?.timezone || 'UTC'}
                      timestamp={prediction.lock_time}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Settlement Panel */}
          {['settling', 'settled', 'voided', 'disputed', 'resolved'].includes(prediction.status) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-6"
            >
              <SettlementPanel 
                predictionId={prediction.id}
                state={prediction.status}
                userHasEntry={userHasEntry}
              />
            </motion.div>
          )}

          {/* Settlement Proof */}
          {prediction.status === 'settled' && settlementData?.proof && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Settlement Proof</h3>
                  <button
                    onClick={() => setShowProofDetails(!showProofDetails)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showProofDetails ? 'Hide details' : 'Show details'}
                  </button>
                </div>
                
                <ProofRow proof={settlementData.proof} />
                
                {showProofDetails && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Technical Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div><strong>Content Hash:</strong> {settlementData.proof.content_hash}</div>
                      <div><strong>Fetched At:</strong> {new Date(settlementData.proof.fetched_at).toLocaleString()}</div>
                      {settlementData.proof.parser_note && (
                        <div><strong>Parser Note:</strong> {settlementData.proof.parser_note}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Disputes */}
          {disputeList.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-6"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Disputes</h3>
                <div className="space-y-4">
                  {disputeList.map((dispute) => (
                    <DisputeCard key={dispute.id} dispute={dispute} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Audit Timeline */}
          {auditEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Audit Timeline</h3>
                  <button
                    onClick={() => setShowAuditTimeline(!showAuditTimeline)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {showAuditTimeline ? 'Hide timeline' : 'Show timeline'}
                  </button>
                </div>
                
                {showAuditTimeline && (
                  <AuditTimeline events={auditEvents} />
                )}
              </div>
            </motion.div>
          )}

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
                        ? 'border-teal-500 bg-teal-50 shadow-lg'
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
                          } • ${(option.total_staked || 0).toLocaleString()} staked
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-teal-600">
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
                    className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-lg"
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
                    className="bg-teal-50 border-2 border-teal-200 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-teal-800 font-semibold">Potential Payout:</span>
                      <span className="text-teal-800 font-bold text-xl">
                        ${potentialPayout.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-teal-700 text-sm">
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
                    ? 'bg-teal-500 hover:bg-teal-600 active:bg-green-700 shadow-lg'
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

          {/* Engagement Section - Using real like/comment counts */}
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
                  checkIfLiked(prediction.id) ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Heart size={20} fill={checkIfLiked(prediction.id) ? 'currentColor' : 'none'} />
                <span className="font-medium">{getLikeCount(prediction.id)} likes</span>
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
                <span className="font-medium">{commentCount} comments</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ml-1 ${showComments ? 'rotate-180' : ''}`}
                />
              </motion.button>
              
              <div className="flex items-center gap-2 text-gray-600">
                <TrendingUp size={20} />
                <span className="font-medium">{prediction.participant_count || 0} participants</span>
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
                    predictionId={stablePredictionId}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Settlement Rule Modal */}
      <SettlementRuleModal
        predictionId={prediction?.id}
        settlement={prediction?.settlement}
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
      />

      {/* Dispute Modal */}
      <DisputeModal
        predictionId={prediction?.id || ''}
        isOpen={disputeModalOpen}
        onClose={() => setDisputeModalOpen(false)}
      />

      {/* Acceptance Bar - Fixed at bottom */}
      {prediction.status === 'settled' && userHasEntry && settlementData && (
        <AcceptanceBar
          predictionId={prediction.id}
          settlementData={settlementData}
          userHasEntry={userHasEntry}
        />
      )}
    </>
  );
};

export default PredictionDetailsPage;