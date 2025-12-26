import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2, BarChart3, Users, Calendar, DollarSign, ArrowLeft, Clock, User } from 'lucide-react';

import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { openAuthGate } from '../auth/authGateAdapter';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { selectEscrowAvailableUSD, selectOverviewBalances } from '../lib/balance/balanceSelector';
import DepositUSDCModal from '../components/wallet/DepositUSDCModal';
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
import ActivityFeed from '../components/activity/ActivityFeed';

// New compact components
import CreatorByline from '../components/predictions/CreatorByline';
import SignInCallout from '../components/auth/SignInCallout';
import { TitleAndMeta } from '../components/predictions/TitleAndMeta';
import { OptionsSection } from '../components/predictions/OptionsSection';
import { StickyBetBar } from '../components/predictions/StickyBetBar';
// TODO: Re-enable share functionality after testing
// import { useShareResult } from '../components/share/useShareResult';

import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';

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
  const { user: sessionUser } = useAuthSession();
  const reduceMotion = prefersReducedMotion();
  const { isAuthenticated: storeAuth, user: storeUser } = useAuthStore();
  
  // Use either auth source
  const isAuthenticated = !!sessionUser || storeAuth;
  const currentUser = sessionUser || storeUser;

  // Debug: Log auth state
  console.log('🔍 PredictionDetailsPageV2 Auth State:', { 
    sessionUser: !!sessionUser,
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
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // TODO: Re-enable share functionality after testing
  // const { SharePreview, share: shareResult } = useShareResult();

  // Store hooks
  const {
    predictions,
    fetchPredictionById,
    placePrediction,
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

  const mediaMetadata = useMemo(() => {
    if (!prediction) return undefined;

    const baseKeywords = [
      prediction.category,
      prediction.status,
      prediction.creator?.username ?? undefined,
      prediction.creator?.full_name ?? undefined,
    ].filter((value): value is string => Boolean(value));

    const attributeHints = [
      prediction.settlement_method,
      prediction.creator?.is_verified ? 'verified creator' : undefined,
    ].filter((value): value is string => Boolean(value));

    const poolTotal =
      typeof prediction.pool_total === 'number'
        ? prediction.pool_total
        : typeof prediction.pool_total === 'string'
          ? Number(prediction.pool_total)
          : null;

    const participantCount =
      typeof prediction.participant_count === 'number'
        ? prediction.participant_count
        : typeof prediction.participants === 'number'
          ? prediction.participants
          : null;

    return {
      id: prediction.id,
      title: prediction.title,
      description: prediction.description ?? prediction.question ?? '',
      question: prediction.question ?? undefined,
      category: prediction.category,
      options: prediction.options?.map(option => ({
        label: option?.label ?? option?.title ?? option?.text ?? '',
      })),
      keywords: baseKeywords,
      attributes: attributeHints,
      tags: baseKeywords,
      identity: {
        creator: prediction.creator?.full_name || prediction.creator?.username || null,
        community: prediction.creator?.username
          ? `${prediction.creator.username} community`
          : null,
        personas: attributeHints,
      },
      popularity: {
        pool: poolTotal,
        players: participantCount,
        comments: typeof prediction.comments === 'number' ? prediction.comments : null,
      },
    };
  }, [prediction]);

  // Use the unified media system for consistent, relevant images (after prediction is defined)
  const { media, status: mediaStatus } = useMedia(
    prediction?.id || '', 
    mediaMetadata
  );

  // Log for debugging consistency (as requested in acceptance criteria)
  useEffect(() => {
    if (media && prediction && import.meta.env.DEV) {
      console.log(`[PredictionDetailsPageV2] ${prediction.id}: ${media.provider}:${media.id}`);
    }
  }, [media, prediction]);

  // User balance - use escrow available (escrow - reserved)
  const userBalance = useMemo(() => {
    if (!isAuthenticated) {
      console.log('💰 PredictionDetailsPageV2 - Not authenticated, returning 0');
      return 0;
    }
    
    // Use escrow available (what user can actually stake)
    const escrowAvailable = selectEscrowAvailableUSD(walletStore);
    
    console.log('💰 PredictionDetailsPageV2 - Balance calculation:', { 
      isAuthenticated,
      escrowAvailable,
      formatted: `$${escrowAvailable.toFixed(2)}`
    });
    
    return escrowAvailable;
  }, [isAuthenticated, walletStore]);

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

    // Check if stake amount exceeds available escrow balance
    const amount = parseFloat(stakeAmount);
    if (amount > userBalance) {
      // Open deposit modal instead of placing bet
      setShowDepositModal(true);
      return;
    }

    setIsPlacingBet(true);
    
    try {
      console.log('🎲 Placing prediction with amount:', { 
        stakeAmount, 
        parsedAmount: amount, 
        availableBalance: userBalance,
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

  // Handle like toggle (placeholder - not currently used)
  const handleLike = async () => {
    if (!isAuthenticated) {
      openAuthGate({
        intent: 'like_prediction',
        payload: { predictionId }
      });
      return;
    }
    // TODO: Implement like functionality
    console.log('Like toggled');
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
          error="Failed to load prediction details"
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
          action={{
            label: 'Browse Predictions',
            onClick: () => navigate('/discover')
          }}
          className="py-20"
        />
      </div>
    );
  }

  if (!prediction) return null;

  const participantCount = prediction.participant_count || 0;
  const totalVolume = prediction.pool_total || 0;

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

      {/* Main content with proper bottom padding to avoid overlap with fixed elements */}
      <main className="px-4 pb-[calc(var(--bottom-nav-h,64px)+72px+env(safe-area-inset-bottom))] pt-4 space-y-4 bg-gray-50">
        {/* Title and Creator */}
        <TitleAndMeta title={prediction.title} creator={prediction.creator} />

        {/* Tabs */}
          <PredictionDetailsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            commentCount={prediction.comments_count || 0}
            participantCount={participantCount}
          >
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, x: 20 }}
                className="space-y-4"
              >
                  {/* Prediction Stats */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      Prediction Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Volume</p>
                          <p className="font-semibold text-gray-900">{formatCurrency(totalVolume, { compact: true })}</p>
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
                    <div className="bg-white rounded-2xl p-4 shadow-sm border">
                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        Description
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {prediction.description}
                      </p>
                    </div>
                  )}

                  {/* How This Works Section - Now outside tabs and compact */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">
                      How This Works
                    </h3>
                    <ul className="space-y-1.5 text-sm text-gray-600">
                      <li>• Choose an outcome you believe will happen</li>
                      <li>• Stake an amount you're comfortable with</li>
                      <li>• If you're right, win based on the current odds</li>
                      <li>• Betting closes when the prediction expires</li>
                    </ul>
                  </div>

                  {/* Options Section - Only on Overview tab */}
                  {(!isAuthenticated && String((prediction as any).status || '').toLowerCase() !== 'settled') ? (
                    <SignInCallout
                      onSignIn={() =>
                        openAuthGate({
                          intent: 'place_prediction',
                          payload: { predictionId }
                        })
                      }
                    />
                  ) : (
                    <OptionsSection
                      options={prediction.options || []}
                      selectedId={selectedOptionId || undefined}
                      onSelect={handleOptionSelect}
                      disabled={isPlacingBet || !isAuthenticated || String((prediction as any).status || '').toLowerCase() !== 'open'}
                      winningOptionId={(prediction as any).winning_option_id || (prediction as any).winningOptionId}
                      showWinningIndicator={String((prediction as any).status || '').toLowerCase() === 'settled'}
                    />
                  )}

                  {/* Stake Input - Only shows after option selection */}
                  {isAuthenticated && selectedOptionId && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border space-y-3">
                      <div>
                        <label htmlFor="stake-input" className="block text-sm font-medium text-gray-900 mb-2">
                          Stake Amount (USD)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                          <input
                            id="stake-input"
                            type="number"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            disabled={isPlacingBet}
                            className="w-full rounded-xl border bg-background pl-10 pr-4 py-3 text-lg font-semibold transition-colors border-border focus:border-primary focus:ring-primary/20 focus:outline-none focus:ring-2 disabled:opacity-50"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Available: {formatCurrency(userBalance, { compact: true })}
                        </span>
                        {stakeAmount && parseFloat(stakeAmount) > userBalance && (
                          <span className="text-red-600 font-medium">Insufficient balance</span>
                        )}
                      </div>
                      
                      {/* Quick Amount Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[10, 25, 50, 100, 250, 500].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setStakeAmount(amount.toString())}
                            disabled={isPlacingBet || amount > userBalance}
                            className="rounded-lg border bg-gray-50 px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ${amount}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'comments' && (
                <motion.div
                  key="comments"
                  initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? {} : { opacity: 0, x: 20 }}
                  data-qa="comments-section"
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
                >
                  <ActivityFeed predictionId={predictionId} />
                </motion.div>
              )}
            </AnimatePresence>
          </PredictionDetailsTabs>

      </main>

      {/* Fixed Bet Bar - Above Bottom Navigation - Only on Overview tab */}
      {activeTab === 'overview' && isAuthenticated && selectedOptionId && (
        <StickyBetBar
          canBet={!!stakeAmount && parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) <= userBalance}
          onPlace={handlePlaceBet}
          loading={isPlacingBet}
        />
      )}
      
      {/* Deposit Modal */}
      {showDepositModal && currentUser?.id && (
        <DepositUSDCModal
          open={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => setShowDepositModal(false)}
          availableUSDC={selectOverviewBalances(walletStore).walletUSDC}
          userId={currentUser.id}
        />
      )}
    </>
  );
};

export default PredictionDetailsPage;