import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2, BarChart3, Users, Calendar, DollarSign, ArrowLeft, Clock, User } from 'lucide-react';

import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { openAuthGate } from '../auth/authGateAdapter';
import { useAuthSession } from '../providers/AuthSessionProvider';
// TODO: Implement accessibility utils
const prefersReducedMotion = () => false;
const AriaUtils = { announce: (message: string) => console.log('Announce:', message) };

// Import unified header system
import { AppHeader } from '../components/layout/AppHeader';
import PredictionDetailsTabs from '../components/prediction/PredictionDetailsTabs';
import { CommentsSection } from '../features/comments';
import { useMedia } from '../hooks/useMedia';
import LoadingState from '../components/ui/LoadingState';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';

// New compact components
import CreatorByline from '../components/predictions/CreatorByline';
import SignInInline from '../components/auth/SignInInline';
import BetOptions from '../components/predictions/BetOptions';
import PlaceBetSticky from '../components/predictions/PlaceBetSticky';
// TODO: Re-enable share functionality after testing
// import { useShareResult } from '../components/share/useShareResult';

import toast from 'react-hot-toast';
import { formatCurrency } from '@lib/format';

const showSuccessToast = (message: string) => toast.success(message);
const showErrorToast = (message: string) => toast.error(message);

interface PredictionDetailsPageProps {
  predictionId?: string;
}

const PredictionDetailsPage: React.FC<PredictionDetailsPageProps> = ({
  predictionId: propPredictionId
}) => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string; predictionId?: string }>();
  const { user, isAuthenticated: sessionAuth } = useAuthSession();
  const reduceMotion = prefersReducedMotion();
  const { isAuthenticated: storeAuth, user: storeUser } = useAuthStore();
  
  // Use either auth source
  const isAuthenticated = sessionAuth || storeAuth;
  const currentUser = user || storeUser;

  // Debug: Log auth state
  console.log('🔍 PredictionDetailsPageV2 Auth State:', { 
    sessionAuth,
    storeAuth,
    isAuthenticated,
    hasUser: !!currentUser,
    userEmail: currentUser?.email 
  });

  // Get prediction ID from multiple sources (URL params, props)
  const predictionId = propPredictionId || params.id || params.predictionId || '';

  // Local state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [shareUrl, setShareUrl] = useState('');
  
  // TODO: Re-enable share functionality after testing
  // const { SharePreview, share: shareResult } = useShareResult();

  // Store hooks
  const {
    predictions,
    fetchPredictionById,
    placePrediction,
    togglePredictionLike,
    loading,
    error
  } = usePredictionStore();

  const { isAuthenticated: authStoreAuthenticated, user: authStoreUser } = useAuthStore();
  const walletStore = useWalletStore();
  const { getBalance, initializeWallet, balances } = walletStore;
  
  // Get the actual balance value from the store
  const walletBalance = walletStore.balance; // This accesses the getter

  // Get prediction from store
  const prediction = useMemo(() => {
    if (!predictionId) return null;
    return predictions.find(p => p.id === predictionId) || null;
  }, [predictions, predictionId]);

  // Use the unified media system for consistent, relevant images (after prediction is defined)
  const { media, status: mediaStatus } = useMedia(
    prediction?.id || '', 
    prediction ? { 
      id: prediction.id, 
      title: prediction.title, 
      category: prediction.category 
    } : undefined
  );

  // Log for debugging consistency (as requested in acceptance criteria)
  useEffect(() => {
    if (media && prediction && import.meta.env.DEV) {
      console.log(`[PredictionDetailsPageV2] ${prediction.id}: ${media.provider}:${media.id}`);
    }
  }, [media, prediction]);

  // User balance - get balance from wallet store with proper error handling
  const userBalance = useMemo(() => {
    if (!isAuthenticated) {
      console.log('💰 PredictionDetailsPageV2 - Not authenticated, returning 0');
      return 0;
    }
    
    // The wallet store returns balance as a computed property
    // It should be the available balance in dollars
    const balance = typeof walletBalance === 'number' && !isNaN(walletBalance) 
      ? walletBalance 
      : 0;
    
    // Also try getting from balances array as fallback
    const balanceFromArray = balances.find(b => b.currency === 'USD')?.available || 0;
    
    console.log('💰 PredictionDetailsPageV2 - Balance calculation:', { 
      isAuthenticated,
      walletBalance,
      balanceFromArray,
      finalBalance: balance || balanceFromArray,
      balancesArray: balances,
      formatted: `${(balance || balanceFromArray).toLocaleString()}`
    });
    
    return balance || balanceFromArray;
  }, [isAuthenticated, walletBalance, balances]);

  // Initialize wallet when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      console.log('💼 PredictionDetailsPageV2 - Initializing wallet for user:', currentUser.email);
      initializeWallet();
    }
  }, [isAuthenticated, currentUser, initializeWallet]);

  // Load prediction data
  const loadPrediction = useCallback(async () => {
    if (!predictionId) {
      console.log('❌ No prediction ID found');
      navigate('/discover');
      return;
    }

    try {
      console.log('🔍 Loading prediction:', predictionId);
      await fetchPredictionById(predictionId);
    } catch (error) {
      console.error('❌ Error loading prediction:', error);
      showErrorToast('Failed to load prediction details');
    }
  }, [predictionId, fetchPredictionById, navigate]);

  // Load prediction on mount
  useEffect(() => {
    loadPrediction();
  }, [loadPrediction]);

  // Set share URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, [predictionId]);

  // Handle navigation
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/discover');
    }
  };

  // Handle sharing
  const handleShare = async () => {
    if (navigator.share && prediction) {
      try {
        await navigator.share({
          title: prediction.title,
          text: `Check out this prediction: ${prediction.title}`,
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showSuccessToast('Link copied to clipboard!');
      AriaUtils.announce('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      showErrorToast('Failed to copy link');
    }
  };

  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    setSelectedOptionId(optionId === selectedOptionId ? null : optionId);
    if (optionId !== selectedOptionId) {
      setStakeAmount('');
    }
  };

  // Handle placing bet
  const handlePlaceBet = async () => {
    if (!isAuthenticated) {
      openAuthGate({
        intent: 'place_prediction',
        payload: { predictionId }
      });
      return;
    }

    if (!selectedOptionId || !stakeAmount || !prediction) {
      return;
    }

    setIsPlacingBet(true);
    
    try {
      const amount = parseFloat(stakeAmount);
      console.log('🎲 Placing prediction with amount:', { 
        stakeAmount, 
        parsedAmount: amount, 
        isNaN: isNaN(amount), 
        isPositive: amount > 0 
      });
      
      await placePrediction(
        prediction.id,
        selectedOptionId,
        amount,
        currentUser?.id
      );

      showSuccessToast(`Prediction placed! $${stakeAmount} on your choice.`);
      AriaUtils.announce(`Prediction placed successfully for ${stakeAmount} dollars`);
      
      // Reset form
      setSelectedOptionId(null);
      setStakeAmount('');
      setActiveTab('activity'); // Switch to activity tab
      
    } catch (error) {
      console.error('Error placing prediction:', error);
      showErrorToast('Failed to place prediction. Please try again.');
    } finally {
      setIsPlacingBet(false);
    }
  };

  // Handle like toggle
  const handleLike = async () => {
    if (!isAuthenticated) {
      openAuthGate({
        intent: 'like_prediction',
        payload: { predictionId }
      });
      return;
    }

    if (!prediction) return;

    try {
      await togglePredictionLike(prediction.id);
      AriaUtils.announce(
        prediction.isLiked ? 'Prediction unliked' : 'Prediction liked'
      );
    } catch (error) {
      console.error('Error toggling like:', error);
      showErrorToast('Failed to update like');
    }
  };

  // Handle comment navigation
  const handleComment = () => {
    setActiveTab('comments');
    // Scroll to comments after tab change
    setTimeout(() => {
      const commentsSection = document.querySelector('[data-qa="comments-section"]');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Loading state
  if (loading && !prediction) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Consistent Header with AppHeader styling */}
        <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
          <div className="safe-px mx-auto max-w-screen-md">
            <div className="h-12 flex items-center justify-between gap-2 px-4">
              <div className="min-w-[40px] flex items-center">
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-base font-semibold leading-none truncate">Loading...</h1>
              </div>
              <div className="min-w-[40px]" />
            </div>
          </div>
          <div className="border-b border-gray-200" />
        </header>
        
        <LoadingState 
          message="Loading prediction details..."
          className="py-20"
        />
      </div>
    );
  }

  // Error state
  if (error && !prediction) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Consistent Header with AppHeader styling */}
        <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
          <div className="safe-px mx-auto max-w-screen-md">
            <div className="h-12 flex items-center justify-between gap-2 px-4">
              <div className="min-w-[40px] flex items-center">
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-base font-semibold leading-none truncate">Error</h1>
              </div>
              <div className="min-w-[40px]" />
            </div>
          </div>
          <div className="border-b border-gray-200" />
        </header>
        
        <ErrorBanner
          message="Failed to load prediction details"
          onRetry={loadPrediction}
          className="m-4"
        />
      </div>
    );
  }

  // Not found state
  if (!prediction && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Consistent Header with AppHeader styling */}
        <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
          <div className="safe-px mx-auto max-w-screen-md">
            <div className="h-12 flex items-center justify-between gap-2 px-4">
              <div className="min-w-[40px] flex items-center">
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-base font-semibold leading-none truncate">Not Found</h1>
              </div>
              <div className="min-w-[40px]" />
            </div>
          </div>
          <div className="border-b border-gray-200" />
        </header>
        
        <EmptyState
          icon={BarChart3}
          title="Prediction Not Found"
          description="The prediction you're looking for doesn't exist or has been removed."
          primaryAction={{
            label: 'Browse Predictions',
            onClick: () => navigate('/discover')
          }}
          className="py-20"
        />
      </div>
    );
  }

  if (!prediction) return null;

  const participantCount = prediction.participants?.length || 0;
  const totalVolume = prediction.totalVolume || '0.00';

  return (
    <>
      {/* Header - Consistent with AppHeader styling */}
      <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
        <div className="safe-px mx-auto max-w-screen-md">
          <div className="h-12 flex items-center justify-between gap-2 px-4">
            <div className="min-w-[40px] flex items-center">
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-base font-semibold leading-none truncate">Prediction Details</h1>
            </div>
            <div className="min-w-[40px] flex items-center justify-end gap-1">
              <button
                onClick={handleShare}
                className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Share prediction"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <div className="border-b border-gray-200" />
      </header>

      {/* Compact Hero Image - 16:9 aspect ratio as per spec */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-gray-100 aspect-video">
        {mediaStatus === 'ready' && media?.url ? (
          <img
            src={media.url}
            alt={media.alt || prediction?.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : mediaStatus === 'loading' ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
            <div className="text-gray-500 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium capitalize">
                {prediction?.category || 'Prediction'}
              </div>
            </div>
          </div>
        )}
      </div>

      <motion.div
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gray-50"
      >
        <div className="pb-safe">
          <PredictionDetailsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            commentCount={prediction.commentCount}
            participantCount={participantCount}
          >
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? {} : { opacity: 0, x: 20 }}
                  className="p-6"
                >
                  {/* Prediction Title */}
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
                      {prediction.title}
                    </h1>
                    <CreatorByline creator={prediction.creator} className="mt-2" />
                  </div>
                  
                  {/* Prediction Stats */}
                  <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Prediction Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Volume</p>
                          <p className="font-semibold text-gray-900">${totalVolume}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Participants</p>
                          <p className="font-semibold text-gray-900">{participantCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {prediction.description && (
                    <div className="bg-white rounded-2xl p-6 mb-4 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Description
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {prediction.description}
                      </p>
                    </div>
                  )}

                  {/* Prediction Rules */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      How This Works
                    </h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <p>• Choose an outcome you believe will happen</p>
                      <p>• Stake an amount you're comfortable with</p>
                      <p>• If you're right, win based on the current odds</p>
                      <p>• Betting closes when the prediction expires</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'comments' && (
                <motion.div
                  key="comments"
                  initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? {} : { opacity: 0, x: 20 }}
                  data-qa="comments-section"
                  className="p-6"
                >
                  <CommentsSection predictionId={predictionId} />
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? {} : { opacity: 0, x: 20 }}
                  className="p-6"
                >
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Recent Activity
                    </h3>
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Activity feed coming soon</p>
                      <p className="text-sm mt-2">
                        Track predictions and settlements
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </PredictionDetailsTabs>

          {/* Compact Bet Options Section - In Normal Flow */}
          {prediction && (
            <div className="p-6 pb-24">
              {!isAuthenticated ? (
                <SignInInline 
                  message="Sign in to place a bet"
                  description="Create an account or sign in to participate"
                />
              ) : (
                <BetOptions
                  options={prediction.options || []}
                  selected={selectedOptionId || undefined}
                  onSelect={handleOptionSelect}
                  stake={stakeAmount}
                  onStake={setStakeAmount}
                  disabled={isPlacingBet}
                  balance={userBalance}
                />
              )}
            </div>
          )}

          {/* Floating Place Bet Button - Only shows when ready */}
          <PlaceBetSticky
            visible={!!selectedOptionId && !!stakeAmount && parseFloat(stakeAmount) > 0}
            onClick={handlePlaceBet}
            disabled={isPlacingBet || !isAuthenticated || parseFloat(stakeAmount) > userBalance}
            loading={isPlacingBet}
            label="Place Bet"
          />

          {/* TODO: Share Preview will be added later after proper testing
          {prediction && prediction.user_entry && (
            <SharePreview
              title={prediction.title}
              choice={prediction.options?.find(o => o.id === prediction.user_entry?.option_id)?.label || 'Unknown'}
              stake={prediction.user_entry.amount}
              payout={prediction.user_entry.potential_payout}
              result={prediction.user_entry.status === 'won' ? 'won' : prediction.user_entry.status === 'lost' ? 'lost' : 'active'}
              creatorName={prediction.creator?.full_name || prediction.creator?.username}
            />
          )} */}
        </div>
      </motion.div>
    </>
  );
};

export default PredictionDetailsPage;