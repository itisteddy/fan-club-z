import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Share2, BarChart3, Users, Calendar, DollarSign, ArrowLeft, Clock, User, Banknote, Flag } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import { useAccount } from 'wagmi';

import { usePredictionStore } from '../store/predictionStore';
import { useAuthStore } from '../store/authStore';
import { useUnifiedCommentStore } from '../store/unifiedCommentStore';
// DISABLED: useWalletStore reads from wallets table (demo/mock data)
// import { useWalletStore } from '../stores/walletStore';
import { openAuthGate } from '../auth/authGateAdapter';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { useUnifiedBalance } from '../hooks/useUnifiedBalance';
import { useFundingModeStore } from '../store/fundingModeStore';
import { getApiUrl } from '../config';
import DepositUSDCModal from '../components/wallet/DepositUSDCModal';
import { usePaystackStatus, useFiatSummary } from '@/hooks/useFiatWallet';
import { Runtime } from '@/config/runtime';
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
import SettlementValidationModal from '../components/modals/SettlementValidationModal';
import { EditPredictionSheet } from '../components/prediction/EditPredictionSheet';
import { CancelPredictionSheet } from '../components/prediction/CancelPredictionSheet';
import { getCategoryLabel } from '@/lib/categoryUi';
import { isFeatureEnabled } from '@/config/featureFlags';
import { computePreview } from '@fanclubz/shared';
import { ReportContentModal } from '@/components/ugc/ReportContentModal';
// TODO: Re-enable share functionality after testing
// import { useShareResult } from '../components/share/useShareResult';

import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/format';
import { t } from '@/lib/lexicon';
import { useMerkleProof } from '@/hooks/useMerkleProof';
import { useMerkleClaim } from '@/hooks/useMerkleClaim';
import { usePredictionActivity } from '@/hooks/useActivityFeed';

const showSuccessToast = (message: string) => toast.success(message);
const showErrorToast = (message: string) => toast.error(message);

interface PredictionDetailsPageProps {
  predictionId?: string;
}

type DetailsLocationState = { from?: string } | null;

const PredictionDetailsPage: React.FC<PredictionDetailsPageProps> = ({
  predictionId: propPredictionId
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; predictionId?: string }>();
  const locationState = (location.state as DetailsLocationState) ?? null;
  const preservedStateRef = useRef<DetailsLocationState>(locationState);
  const returnToRef = useRef<string | null>(locationState?.from ?? null);
  const { user: sessionUser, session } = useAuthSession();
  const reduceMotion = prefersReducedMotion();
  const { isAuthenticated: storeAuth, user: storeUser } = useAuthStore();
  
  // Use either auth source
  const isAuthenticated = !!sessionUser || storeAuth;
  const currentUser = sessionUser || storeUser;

  // Auth state logging removed - excessive logging issue

  // Get prediction ID from multiple sources (URL params, props)
  const predictionId = propPredictionId || params.id || params.predictionId || '';
  const getCommentCount = useUnifiedCommentStore((s) => s.getCommentCount);
  const liveCommentCount = predictionId ? getCommentCount(predictionId) : 0;

  // Local state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  // Check URL for tab query param on mount
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Update tab when query param changes
  useEffect(() => {
    const currentSearchParams = new URLSearchParams(location.search);
    const tabFromUrl = currentSearchParams.get('tab');
    if (tabFromUrl && ['overview', 'comments', 'activity'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [location.search]);
  const [shareUrl, setShareUrl] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [justPlaced, setJustPlaced] = useState<{ amount: number; optionLabel: string } | null>(null);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeOutcomeModal, setShowDisputeOutcomeModal] = useState(false);
  const [disputeOutcomeReason, setDisputeOutcomeReason] = useState('');
  const [disputeOutcomeSubmitting, setDisputeOutcomeSubmitting] = useState(false);

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
  
  // DISABLED: Wallet store refresh - use query invalidation instead
  // const { refresh: refreshWallet } = useWalletStore();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Unified balance hook - SINGLE SOURCE OF TRUTH
  const { 
    wallet: walletUSDC,
    available: escrowAvailableUSD,
    locked: escrowLockedUSD,
    total: escrowTotalUSD,
    isLoading: isLoadingBalance,
    refetch: refetchBalances
  } = useUnifiedBalance();
  
  // Wallet address for additional checks
  const { address: walletAddress } = useAccount();
  const lowerWallet = walletAddress?.toLowerCase();
  // Only request proof when prediction is actually settled
  const isSettled = useMemo(() => {
    const p = predictions.find(p => p.id === predictionId);
    return Boolean(p?.settledAt);
  }, [predictions, predictionId]);
  const { data: merkle, isLoading: loadingProof } = useMerkleProof(isSettled ? predictionId : undefined, walletAddress);
  const { claim, isClaiming } = useMerkleClaim();
  
  // Server snapshot for database locks (if still needed)
  // Available to stake = on-chain available balance
  const availableToStake = escrowAvailableUSD;

  // Funding mode (crypto vs demo) — demo is UI-gated by env via fundingModeStore
  const { mode, setMode, isDemoEnabled, isFiatEnabled, setFiatEnabled } = useFundingModeStore();
  const capabilities = Runtime.capabilities;
  const showDemo = isDemoEnabled && capabilities.allowDemo;
  // Gate fiat/crypto modes by capabilities
  const effectiveFiatEnabled = isFiatEnabled && capabilities.allowFiat;
  const effectiveCryptoEnabled = capabilities.allowCrypto;
  const { data: paystackStatus } = usePaystackStatus();
  const { data: fiatData, isLoading: loadingFiat } = useFiatSummary(currentUser?.id);
  useEffect(() => {
    if (paystackStatus?.enabled !== undefined) {
      setFiatEnabled(paystackStatus.enabled);
    }
  }, [paystackStatus?.enabled, setFiatEnabled]);
  const isDemoMode = showDemo && mode === 'demo';
  const isFiatMode = effectiveFiatEnabled && mode === 'fiat';
  const isCryptoMode = effectiveCryptoEnabled && !isDemoMode && !isFiatMode;

  // Demo wallet summary (DB-backed)
  const [demoSummary, setDemoSummary] = useState<null | { currency: string; available: number; reserved: number; total: number; lastUpdated: string }>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const fetchDemoSummary = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setDemoLoading(true);
      const resp = await fetch(`${getApiUrl()}/api/demo-wallet/summary?userId=${currentUser.id}`);
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(json?.message || 'Failed to load demo wallet');
      setDemoSummary(json?.summary ?? null);
    } catch (e: any) {
      console.error('[DEMO] summary error', e);
      setDemoSummary(null);
    } finally {
      setDemoLoading(false);
    }
  }, [currentUser?.id]);

  const faucetDemo = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setDemoLoading(true);
      const resp = await fetch(`${getApiUrl()}/api/demo-wallet/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(json?.message || 'Failed to faucet demo credits');
      setDemoSummary(json?.summary ?? null);
      // Persist cooldown timestamp for consistent UX across the app
      if (json?.nextEligibleAt) {
        try {
          localStorage.setItem(
            `fcz_demo_credits_next_at:${currentUser.id}`,
            String(Date.parse(String(json.nextEligibleAt)))
          );
        } catch {}
      }
      if (json?.alreadyGranted && json?.nextEligibleAt) {
        const nextMs = Date.parse(String(json.nextEligibleAt));
        const remaining = Math.max(0, nextMs - Date.now());
        showErrorToast(`Not yet available. Next request in ${Math.ceil(remaining / 60000)} min.`);
      }
    } catch (e: any) {
      console.error('[DEMO] faucet error', e);
      showErrorToast(e?.message || 'Failed to get demo credits');
    } finally {
      setDemoLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isAuthenticated && isDemoMode) {
      void fetchDemoSummary();
    }
  }, [isAuthenticated, isDemoMode, fetchDemoSummary]);
  
  // Get prediction from store
  const prediction = useMemo(() => {
    if (!predictionId) return null;
    return predictions.find(p => p.id === predictionId) || null;
  }, [predictions, predictionId]);

  // Check if current user is creator
  const isCreator = useMemo(() => {
    return !!(currentUser?.id && prediction?.creator_id && currentUser.id === prediction.creator_id);
  }, [currentUser?.id, prediction?.creator_id]);
  const isClosedOrSettled = useMemo(() => {
    if (!prediction) return false;
    const status = (prediction.status || '').toLowerCase();
    return isSettled || status === 'closed' || status === 'settled' || status === 'cancelled';
  }, [prediction, isSettled]);
  const isSettledStatus = (prediction?.status || '').toString().toLowerCase() === 'settled';
  const ugcModerationEnabled = isFeatureEnabled('UGC_MODERATION');
  const disputesEnabled = isFeatureEnabled('DISPUTES');
  const oddsV2Enabled = isFeatureEnabled('ODDS_V2');

  const mediaMetadata = useMemo(() => {
    if (!prediction) return undefined;

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

    const baseKeywords = [
      prediction.category,
      prediction.status,
      prediction.type,
      prediction.creator?.username ?? undefined,
      prediction.creator?.full_name ?? undefined,
    ].filter((value): value is string => Boolean(value));

    const attributeHints = [
      prediction.settlement_method,
      prediction.settlement_criteria,
      prediction.creator?.is_verified ? 'verified creator' : undefined,
    ].filter((value): value is string => Boolean(value));

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
        totalVolume: typeof prediction.total_volume === 'number' ? prediction.total_volume : null,
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

  const demoAvailable = Number(demoSummary?.available ?? 0);
  const fiatAvailable = Number(fiatData?.summary?.availableNgn ?? 0);
  const displayAvailable = isFiatMode ? fiatAvailable : (isDemoMode ? demoAvailable : availableToStake);

  // User balance - source depends on funding mode
  const userBalance = isAuthenticated ? displayAvailable : 0;

  // Log balance for debugging
  useEffect(() => {
    if (isAuthenticated) {
      console.log('💰 PredictionDetailsPageV2 - Balance:', { 
        escrowTotal: escrowAvailableUSD,
        availableToStake,
        userBalance,
        isLoadingBalance,
        formatted: `${userBalance.toFixed(2)}`
      });
    }
  }, [isAuthenticated, escrowAvailableUSD, availableToStake, userBalance, isLoadingBalance]);

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

  // Activity feed for count badge
  const { items: activityItems, refresh: refreshActivity } = usePredictionActivity(predictionId, { limit: 25, autoLoad: true });

  // Set share URL (canonical slug) and gently rewrite URL to SEO path
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const title = prediction?.title || prediction?.question || '';
    // Avoid rewriting/navigating while the prediction is still loading.
    // In particular, an empty title would produce an empty slug and redirect to `/predictions`,
    // which breaks deep links (opens the Stakes tab instead of details).
    if (!title.trim()) {
      setShareUrl(`${window.location.origin}/prediction/${predictionId}`);
      return;
    }
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
    if (!slug) {
      setShareUrl(`${window.location.origin}/prediction/${predictionId}`);
      return;
    }
    const canonical = `${window.location.origin}/predictions/${slug}`;
    setShareUrl(canonical);
    // Inject/replace canonical link
    try {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    } catch {}
    // NOTE: We intentionally do NOT auto-navigate/replace the URL to the slug path here.
    // Auto-rewriting has caused deep-link overrides on initial load (sending users to `/predictions`).
  }, [prediction?.title, predictionId, navigate, locationState]);

  // Handle navigation
  const handleBack = () => {
    const returnTo = returnToRef.current;
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }
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

    if (!selectedOptionId || !stakeAmount || !prediction || !currentUser?.id) {
      if (!currentUser?.id) {
        showErrorToast('User not authenticated. Please sign in.');
      }
      return;
    }

    // Check if stake amount exceeds available balance
    const amount = parseFloat(stakeAmount);
    const BASE_BETS_ENABLED = import.meta.env.VITE_FCZ_BASE_BETS === '1';
    
    // Funding source:
    // - crypto: on-chain availableToStake
    // - demo: demo ledger available
    // - fiat: fiat ledger available (NGN)
    const maxAvailable = isFiatMode ? fiatAvailable : (isDemoMode ? demoAvailable : availableToStake);
    
    if (amount > maxAvailable) {
      // Open deposit modal instead of placing bet (crypto mode)
      if (isCryptoMode) {
        setShowDepositModal(true);
        return;
      }
      if (isFiatMode) {
        showErrorToast(`Insufficient fiat balance. Available: ₦${maxAvailable.toFixed(0)}`);
        navigate('/wallet');
        return;
      }
      showErrorToast(`Insufficient balance. Available: $${maxAvailable.toFixed(2)}`);
      return;
    }

    setIsPlacingBet(true);
    
    try {
      console.log('🎲 Placing prediction with amount:', { 
        stakeAmount, 
        parsedAmount: amount, 
        availableBalance: userBalance,
        userId: currentUser.id,
        isNaN: isNaN(amount), 
        isPositive: amount > 0 
      });
      
      await placePrediction(
        prediction.id,
        selectedOptionId,
        amount,
        currentUser.id,
        walletAddress
      );

      showSuccessToast(`Stake placed: ${isFiatMode ? `₦${Number(stakeAmount).toLocaleString()}` : `$${stakeAmount}`} | lock consumed`);
      AriaUtils.announce(`Prediction placed successfully for ${stakeAmount} ${isFiatMode ? 'naira' : 'dollars'}`);
      
      // IMPORTANT: Keep user on prediction details page - do not navigate away
      // Inline confirmation chip (keep user on overview)
      const optionLabel = prediction.options.find(o => o.id === selectedOptionId)?.label || `Your ${t('bet')}`;
      setJustPlaced({ amount, optionLabel });
      setTimeout(() => setJustPlaced(null), 6000);
      
      // Reset form
      setSelectedOptionId(null);
      setStakeAmount('');

      // Invalidate all related queries using unified query keys
      const userId = currentUser?.id;
      if (userId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: QK.walletSummary(userId, lowerWallet) }),
          queryClient.invalidateQueries({ queryKey: QK.walletActivity(userId) }),
          queryClient.invalidateQueries({ queryKey: QK.escrowBalance(userId) }),
          queryClient.invalidateQueries({ queryKey: QK.onchainActivity(userId) }),
          queryClient.invalidateQueries({ queryKey: QK.prediction(predictionId) }),
          queryClient.invalidateQueries({ queryKey: QK.predictionEntries(predictionId) }),
        ]);
      if (isDemoMode) {
        await fetchDemoSummary();
      }
      }
      
      // Also invalidate contract reads
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
      
      // Refresh escrow balances (on-chain and snapshot)
      await refetchBalances();
      
      // Reload the prediction to get updated pool totals
      await loadPrediction();
      
      // Explicitly ensure we stay on this page - no navigation
      // The user should remain on the prediction details page to see their bet
      
    } catch (error) {
      console.error('[FCZ-BET] Error placing prediction:', error);
      
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === 'INSUFFICIENT_ESCROW') {
          setShowDepositModal(true);
          showErrorToast('Insufficient escrow balance. Opening deposit modal...');
          return;
        }
        showErrorToast(error.message || 'Failed to place prediction. Please try again.');
      } else {
        showErrorToast('Failed to place prediction. Please try again.');
      }
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

  const handleDisputeOutcomeSubmit = useCallback(async () => {
    if (!predictionId || !currentUser?.id || !disputeOutcomeReason.trim()) return;
    setDisputeOutcomeSubmitting(true);
    try {
      const token = session?.access_token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const res = await fetch(`${getApiUrl()}/api/v2/settlement/${predictionId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: currentUser.id, reason: disputeOutcomeReason.trim(), evidence: [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as any)?.message || 'Failed to submit dispute');
        return;
      }
      toast.success('Dispute submitted. We will review and follow up.');
      setShowDisputeOutcomeModal(false);
      setDisputeOutcomeReason('');
    } catch (e) {
      toast.error((e as Error)?.message || 'Failed to submit dispute');
    } finally {
      setDisputeOutcomeSubmitting(false);
    }
  }, [predictionId, currentUser?.id, disputeOutcomeReason, session?.access_token]);

  // ---------------- ODDS_V2 preview (keep hooks above early returns) ----------------
  // React minified error #310 = "Rendered more hooks than during the previous render."
  // This happens if we call hooks (useMemo) after early returns (loading/error/not-found).
  const poolTotal = typeof prediction?.pool_total === 'number' ? prediction.pool_total : Number(prediction?.pool_total) || 0;
  const selectedOption = prediction && selectedOptionId ? prediction.options?.find((o: any) => o.id === selectedOptionId) : null;
  const numStake = parseFloat(stakeAmount || '0') || 0;
  const isPoolV2 = oddsV2Enabled && (prediction as any)?.odds_model === 'pool_v2';
  const totalPoolCents = Math.round((typeof (prediction as any)?.totalPoolCents === 'number' ? (prediction as any).totalPoolCents : (poolTotal || 0) * 100));
  const platformFeeBps = typeof (prediction as any)?.platformFeeBps === 'number' ? (prediction as any).platformFeeBps : 250;
  const creatorFeeBps = typeof (prediction as any)?.creatorFeeBps === 'number' ? (prediction as any).creatorFeeBps : 100;
  const selectedPoolCents = selectedOption
    ? (typeof (selectedOption as any).totalStakedCents === 'number'
        ? (selectedOption as any).totalStakedCents
        : Math.round((Number((selectedOption as any).total_staked) || 0) * 100))
    : 0;
  const stakeCents = Math.round(numStake * 100);

  const payoutPreviewV2 = useMemo(() => {
    if (!isPoolV2 || !selectedOption || stakeCents <= 0) return null;
    return computePreview({
      totalPoolCents,
      selectedPoolCents,
      stakeCents,
      platformFeeBps,
      creatorFeeBps,
    });
  }, [isPoolV2, selectedOption, totalPoolCents, selectedPoolCents, stakeCents, platformFeeBps, creatorFeeBps]);

  const selectedOptionOdds = useMemo(() => {
    if (!selectedOption) return 1;
    if (payoutPreviewV2?.multiple != null) return payoutPreviewV2.multiple;
    if (isPoolV2 && typeof (selectedOption as any).referenceMultiple === 'number') return (selectedOption as any).referenceMultiple;
    const co = selectedOption.current_odds ?? (selectedOption as any).currentOdds ?? (selectedOption as any).odds;
    if (typeof co === 'number' && co > 0) return co;
    const optStaked = (selectedOption as any).total_staked ?? (selectedOption as any).totalStaked ?? 0;
    if (poolTotal > 0 && optStaked > 0) return poolTotal / optStaked;
    return 2;
  }, [selectedOption, poolTotal, isPoolV2, payoutPreviewV2]);

  const expectedReturn = payoutPreviewV2 ? payoutPreviewV2.expectedReturnCents / 100 : numStake * selectedOptionOdds;
  const potentialProfit = expectedReturn - numStake;

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

  // From here on, prediction should exist (keeps TS happy).
  if (!prediction) return null;

  const participantCount = prediction?.participant_count ?? 0;
  const totalVolume = prediction?.pool_total ?? 0;

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
              {ugcModerationEnabled && !isCreator && (
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  aria-label="Report prediction"
                >
                  <Flag className="w-5 h-5" />
                </button>
              )}
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
        <div className="space-y-2">
          <TitleAndMeta title={prediction.title} creator={prediction.creator} />
          {/* Category chip */}
          {(() => {
            const categoryLabel = getCategoryLabel(prediction);
            return categoryLabel ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {categoryLabel}
                </span>
              </div>
            ) : null;
          })()}
        </div>

        {/* Tabs */}
          <PredictionDetailsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            commentCount={liveCommentCount || prediction.comments_count || 0}
            activityCount={activityItems.length}
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
                    {isAuthenticated && predictionId && String(prediction.status || '').toLowerCase() !== 'open' && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setSettlementModalOpen(true)}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                        >
                          Review Settlement
                        </button>
                      </div>
                    )}
                    {/* Creator actions */}
                    {isCreator && !isClosedOrSettled && (
                      <div className="mt-3 space-y-2">
                        <button
                          type="button"
                          onClick={() => setEditSheetOpen(true)}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelSheetOpen(true)}
                          className="w-full px-4 py-2 rounded-xl border border-red-200 bg-white text-red-600 font-semibold hover:bg-red-50 transition-colors"
                        >
                          Cancel prediction
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Closed/Settled callout */}
                  {isClosedOrSettled && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
                      <div className="text-sm text-yellow-900 font-medium">This prediction is closed.</div>
                      <div className="text-xs text-yellow-800 mt-1">
                        {isSettled ? 'Results are finalized.' : `No new ${t('bets')} can be placed.`}
                      </div>
                    </div>
                  )}

                  {/* Resolution section (Phase 9: winning option, timestamp, optional source/reasoning) */}
                  {isSettled && (() => {
                    const winningId = (prediction as any).winning_option_id || (prediction as any).winningOptionId;
                    const winningOption = winningId ? prediction.options?.find((o: any) => o.id === winningId) : null;
                    const settledAt = (prediction as any).settledAt ?? (prediction as any).settled_at ?? (prediction as any).resolution_date;
                    const resolutionReason = (prediction as any).resolution_reason ?? (prediction as any).resolutionReason;
                    const sourceUrl = (prediction as any).resolution_source_url ?? (prediction as any).source_url;
                    if (!winningOption && !settledAt && !resolutionReason && !sourceUrl) return null;
                    return (
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
                        <h3 className="text-base font-semibold text-gray-900 mb-3">Resolution</h3>
                        <div className="space-y-2 text-sm">
                          {winningOption && (
                            <div>
                              <span className="text-gray-500">Winning outcome</span>
                              <p className="font-medium text-gray-900 mt-0.5">{winningOption.label}</p>
                            </div>
                          )}
                          {settledAt && (
                            <div>
                              <span className="text-gray-500">Settled</span>
                              <p className="font-medium text-gray-900 mt-0.5">
                                {new Date(settledAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} at {new Date(settledAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                              </p>
                            </div>
                          )}
                          {resolutionReason && (
                            <div>
                              <span className="text-gray-500">Reasoning</span>
                              <p className="text-gray-700 mt-0.5">{resolutionReason}</p>
                            </div>
                          )}
                          {sourceUrl && (
                            <div>
                              <a
                                href={sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 font-medium underline"
                              >
                                Source
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

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

                  {/* Claim Winnings - shown when a connected wallet has a claimable amount and not locally claimed */}
                  {!!walletAddress && !!merkle && Number(merkle.amountUnits) > 0 && !(() => {
                    try {
                      return Boolean(localStorage.getItem(`fcz:claimed:${predictionId}:${walletAddress.toLowerCase()}`));
                    } catch { return false; }
                  })() && (
                    <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            You have {t('winnings').toLowerCase()} to claim
                          </h3>
                          <p className="text-sm text-gray-600 mt-0.5">
                            Connected: <span className="font-mono">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isClaiming || loadingProof}
                          onClick={async () => {
                            const units = BigInt(merkle.amountUnits);
                            await claim({
                              predictionId,
                              amountUnits: units,
                              proof: merkle.proof as `0x${string}`[],
                            });
                          }}
                        >
                          {isClaiming ? 'Claiming…' : `Claim ${formatCurrency(merkle.amountUSD, { compact: false })}`}
                        </button>
                      </div>
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

                  {justPlaced && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="text-sm text-emerald-800 font-medium">
                        You staked {isFiatMode ? `₦${justPlaced.amount.toFixed(0)}` : `$${justPlaced.amount.toFixed(2)}`} on “{justPlaced.optionLabel}”.
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('activity')}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
                      >
                        View activity
                      </button>
                    </div>
                  )}

                  {/* Stake Input - Only shows after option selection */}
                  {isAuthenticated && selectedOptionId && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border space-y-3">
                      {/* Funding mode toggle (Demo/Fiat gated by feature flags + store-safe mode) */}
                      {(showDemo || effectiveFiatEnabled || effectiveCryptoEnabled) && (
                        <div className="inline-flex rounded-lg bg-gray-100 p-1 flex-wrap gap-1">
                          {effectiveCryptoEnabled && (
                            <button
                              onClick={() => setMode('crypto')}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                isCryptoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                              }`}
                              type="button"
                            >
                              Crypto (USDC)
                            </button>
                          )}
                          {showDemo && (
                            <button
                              onClick={() => setMode('demo')}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                isDemoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                              }`}
                              type="button"
                            >
                              Demo Credits
                            </button>
                          )}
                          {effectiveFiatEnabled && (
                            <button
                              onClick={() => setMode('fiat')}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                isFiatMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                              }`}
                              type="button"
                            >
                              Fiat (NGN)
                            </button>
                          )}
                        </div>
                      )}

                      <div>
                        <label htmlFor="stake-input" className="block text-sm font-medium text-gray-900 mb-2">
                          Stake Amount ({isFiatMode ? 'NGN' : 'USD'})
                        </label>
                        <div className="relative">
                          {isFiatMode ? (
                            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                          ) : (
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                          )}
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
                          Available: {(isFiatMode ? loadingFiat : (isDemoMode ? demoLoading : isLoadingBalance)) ? 'Loading…' : formatCurrency(userBalance, { compact: true, currency: isFiatMode ? 'NGN' : 'USD' })}
                        </span>
                        {stakeAmount && !(isFiatMode ? loadingFiat : (isDemoMode ? demoLoading : isLoadingBalance)) && parseFloat(stakeAmount) > userBalance && (
                          <span className="text-red-600 font-medium">Insufficient balance</span>
                        )}
                      </div>

                      {isDemoMode && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={faucetDemo}
                            disabled={demoLoading}
                            className="w-full rounded-xl border bg-gray-50 px-4 py-2.5 text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            Get Demo Credits
                          </button>
                        </div>
                      )}
                      
                      {/* Quick Amount Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {(isFiatMode ? [500, 1000, 2500, 5000, 10000, 25000] : [10, 25, 50, 100, 250, 500]).map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setStakeAmount(amount.toString())}
                            disabled={isPlacingBet || amount > userBalance}
                            className="rounded-lg border bg-gray-50 px-3 py-2 text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isFiatMode ? `₦${amount.toLocaleString()}` : `$${amount}`}
                          </button>
                        ))}
                      </div>

                      {/* ODDS_V2: Stake, expected return, and potential profit */}
                      {oddsV2Enabled && selectedOptionId && numStake > 0 && (
                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Payout preview</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-600">Stake</p>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(numStake, { compact: false, currency: isFiatMode ? 'NGN' : 'USD' })}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Expected return</p>
                              <p className="font-semibold text-emerald-700">
                                {formatCurrency(expectedReturn, { compact: false, currency: isFiatMode ? 'NGN' : 'USD' })}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-emerald-200/60">
                            <p className="text-gray-600 text-sm">Potential profit</p>
                            <p className={`font-semibold ${potentialProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(potentialProfit, { compact: false, currency: isFiatMode ? 'NGN' : 'USD', showSign: true })}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {isPoolV2 ? 'Est. ' : ''}{selectedOptionOdds.toFixed(2)}x odds
                            </p>
                            {isPoolV2 && (
                              <p className="text-xs text-gray-400 mt-0.5">Estimate; payout changes as others stake.</p>
                            )}
                          </div>
                        </div>
                      )}
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
      {activeTab === 'overview' && !isClosedOrSettled && (
        (() => {
          const amt = parseFloat(stakeAmount || '0');
          const availableNow = isFiatMode ? fiatAvailable : (isDemoMode ? demoAvailable : availableToStake);
          const need = Math.max(0, amt - availableNow);
          const computedLabel = !amt || amt <= 0
            ? t('betVerb')
            : (need > 0
                ? (isDemoMode
                    ? `Get demo credits (need $${need.toFixed(2)})`
                    : (isFiatMode ? `Deposit NGN (need ₦${need.toFixed(0)})` : `Add funds (need $${need.toFixed(2)})`))
                : `${t('betVerb')}: ${isFiatMode ? `₦${amt.toFixed(0)}` : `$${amt.toFixed(2)}`}`);
          const canBet = !!stakeAmount && amt > 0;
          return (
            <StickyBetBar
              canBet={canBet}
              onPlace={async () => {
                if (isDemoMode && need > 0) {
                  await faucetDemo();
                  return;
                }
                if (isFiatMode && need > 0) {
                  navigate('/wallet');
                  return;
                }
                await handlePlaceBet();
              }}
              loading={isPlacingBet}
              label={computedLabel}
            />
          );
        })()
      )}
      
      {/* Deposit Modal */}
      {showDepositModal && currentUser?.id && (
        <DepositUSDCModal
          open={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => setShowDepositModal(false)}
          availableUSDC={walletUSDC}
          userId={currentUser.id}
        />
      )}

      <SettlementValidationModal
        isOpen={settlementModalOpen}
        onClose={() => setSettlementModalOpen(false)}
        predictionId={predictionId}
        predictionTitle={prediction?.title ?? 'Prediction'}
        onValidated={() => {
          queryClient.invalidateQueries({ queryKey: QK.prediction(predictionId) });
          queryClient.invalidateQueries({ queryKey: QK.predictionEntries(predictionId) });
        }}
      />

      {prediction && (
        <>
          <EditPredictionSheet
            open={editSheetOpen}
            onOpenChange={setEditSheetOpen}
            prediction={prediction}
            onSaved={(updated) => {
              queryClient.invalidateQueries({ queryKey: QK.prediction(predictionId) });
              fetchPredictionById(predictionId);
            }}
            userId={currentUser?.id}
          />
          <CancelPredictionSheet
            open={cancelSheetOpen}
            onOpenChange={setCancelSheetOpen}
            prediction={prediction}
            onCancelled={(updated) => {
              queryClient.invalidateQueries({ queryKey: QK.prediction(predictionId) });
              fetchPredictionById(predictionId);
            }}
            userId={currentUser?.id}
          />
          {ugcModerationEnabled && (
            <ReportContentModal
              open={showReportModal}
              targetType="prediction"
              targetId={predictionId}
              label="this prediction"
              accessToken={session?.access_token}
              onClose={() => setShowReportModal(false)}
              onSuccess={() => toast.success('Report submitted. Our team will review it.')}
            />
          )}
        </>
      )}
    </>
  );
};

export default PredictionDetailsPage;
