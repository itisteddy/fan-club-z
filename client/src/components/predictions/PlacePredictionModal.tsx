import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Wallet as WalletIcon, ArrowUpRight, Banknote } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Prediction } from '../../store/predictionStore';
import { usePredictionStore } from '../../store/predictionStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { formatTimeRemaining } from '@/lib/utils';
import { useUnifiedBalance } from '@/hooks/useUnifiedBalance';
import DepositUSDCModal from '@/components/wallet/DepositUSDCModal';
import { useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import { invalidateAfterBet } from '@/utils/queryInvalidation';
import { cn } from '@/lib/utils';
import { ensureWalletReady, WalletStateError } from '@/services/onchainTransactionService';
import { useWeb3Recovery } from '@/providers/Web3Provider';
import { useFundingModeStore, FundingMode } from '@/store/fundingModeStore';
import { getApiUrl } from '@/config';
import { setCooldown } from '@/lib/cooldowns';
import { usePaystackStatus, useFiatSummary } from '@/hooks/useFiatWallet';
import { getPayoutPreview, getPreOddsMultiple } from '@fanclubz/shared';
import { isCryptoEnabledForClient } from '@/lib/cryptoFeatureFlags';
import { apiClient } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/format';
import { ZaurumMark } from '@/components/currency/ZaurumMark';

interface PlacePredictionModalProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
}

type StakeQuoteView = {
  current: { userStake: number; oddsOrPrice: number; estPayout: number };
  after: { userStake: number; oddsOrPrice: number; estPayout: number };
  disclaimer?: string;
};

export const PlacePredictionModal: React.FC<PlacePredictionModalProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  // Early return if no prediction
  if (!prediction || !isOpen) return null;
  
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [stakeQuote, setStakeQuote] = useState<StakeQuoteView | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  const { placePrediction, placeFiatPrediction } = usePredictionStore();
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useAccount();
  const { sessionHealthy } = useWeb3Recovery();
  const walletAddressLower = address?.toLowerCase() ?? null;
  const { wallet: walletUSDC, available: escrowAvailable, refetch: refetchBalances } = useUnifiedBalance();
  const { mode, setMode, isDemoEnabled, isFiatEnabled, setFiatEnabled } = useFundingModeStore();
  
  // Fiat-related hooks
  const { data: paystackStatus } = usePaystackStatus();
  const { data: fiatData, refetch: refetchFiat } = useFiatSummary(user?.id);
  
  // Update fiat enabled state from API
  useEffect(() => {
    if (paystackStatus?.enabled !== undefined) {
      setFiatEnabled(paystackStatus.enabled);
    }
  }, [paystackStatus?.enabled, setFiatEnabled]);
  
  const isFiatMode = isFiatEnabled && mode === 'fiat';
  const isDemoMode = isDemoEnabled && mode === 'demo';

  const cryptoAllowed = isCryptoEnabledForClient();
  const BASE_BETS_ENABLED =
    cryptoAllowed &&
    (import.meta.env.VITE_FCZ_BASE_BETS === '1' ||
      import.meta.env.ENABLE_BASE_BETS === '1' ||
      import.meta.env.VITE_FCZ_BASE_ENABLE === '1');
  const isCryptoMode = !isDemoMode && !isFiatMode && cryptoAllowed;

  const [demoSummary, setDemoSummary] = useState<null | { available: number; reserved: number; total: number }>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const fetchDemoSummary = useCallback(async () => {
    if (!user?.id) return;
    try {
      setDemoLoading(true);
      setDemoError(null);
      const resp = await fetch(`${getApiUrl()}/api/demo-wallet/summary?userId=${user.id}`);
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(json?.message || 'Failed to load Zaurum balance');
      setDemoSummary(json?.summary ?? null);
    } catch (e: any) {
      setDemoError(e?.message || 'Failed to load Zaurum balance');
      setDemoSummary(null);
    } finally {
      setDemoLoading(false);
    }
  }, [user?.id]);

  const faucetDemo = useCallback(async () => {
    if (!user?.id) return;
    try {
      setDemoLoading(true);
      setDemoError(null);
      const resp = await fetch(`${getApiUrl()}/api/demo-wallet/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(json?.message || 'Failed to claim Zaurum');
      setDemoSummary(json?.summary ?? null);
      if (json?.nextEligibleAt) {
        setCooldown(`fcz_demo_credits_next_at:${user.id}`, String(json.nextEligibleAt));
      }
      if (json?.alreadyGranted) {
        toast.error('Demo credits not yet available. Please try again later.');
      } else {
        toast.success('Demo credits added.');
      }
    } catch (e: any) {
      setDemoError(e?.message || 'Failed to claim Zaurum');
    } finally {
      setDemoLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isDemoMode && isOpen) {
      void fetchDemoSummary();
    }
  }, [isDemoMode, isOpen, fetchDemoSummary]);

  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction?.options?.find(o => o.id === selectedOptionId);
  // Total pool: prefer sum(option pools) so Total Volume matches math; fallback to prediction.pool_total
  const sumOptionPools = (prediction?.options ?? []).reduce(
    (sum: number, o: any) => sum + (Number((o as any).total_staked) || 0),
    0
  );
  const totalPool =
    (prediction?.options?.length ?? 0) > 0
      ? sumOptionPools
      : (typeof prediction?.pool_total === 'number' ? prediction.pool_total : 0);
  const platformFeeBpsRaw = Number((prediction as any)?.platformFeeBps);
  const creatorFeeBpsRaw = Number((prediction as any)?.creatorFeeBps);
  const platformFeePct = Number((prediction as any)?.platform_fee_percentage);
  const creatorFeePct = Number((prediction as any)?.creator_fee_percentage);
  const platformFeeBps = Number.isFinite(platformFeeBpsRaw)
    ? platformFeeBpsRaw
    : (Number.isFinite(platformFeePct) ? Math.round(platformFeePct * 100) : 250);
  const creatorFeeBps = Number.isFinite(creatorFeeBpsRaw)
    ? creatorFeeBpsRaw
    : (Number.isFinite(creatorFeePct) ? Math.round(creatorFeePct * 100) : 100);
  const feeBps = platformFeeBps + creatorFeeBps;
  const optionPoolUSD = selectedOption
    ? Number((selectedOption as any).total_staked) || 0
    : 0;
  const poolPreview =
    selectedOption && numAmount > 0
      ? getPayoutPreview({
          totalPool,
          optionPool: optionPoolUSD,
          stake: numAmount,
          feeBps,
        })
      : null;
  const expectedReturn = poolPreview ? poolPreview.expectedReturn : 0;
  const potentialProfit = poolPreview ? poolPreview.profit : 0;
  const demoAvailable = demoSummary?.available ?? 0;
  const fiatAvailable = fiatData?.summary?.availableNgn ?? 0;
  
  // Display balance depends on mode
  const displayBalance = isFiatMode ? fiatAvailable : (isCryptoMode ? escrowAvailable : demoAvailable);
  const displayCurrency: 'USD' | 'NGN' = isFiatMode ? 'NGN' : 'USD';
  const needsDeposit = isCryptoMode && numAmount > escrowAvailable;
  const insufficientBalance = numAmount > displayBalance;

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    if (!isOpen || !prediction?.id || !selectedOptionId || !user?.id || !numAmount || numAmount <= 0 || isFiatMode) {
      setStakeQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    timer = window.setTimeout(async () => {
      try {
        setQuoteLoading(true);
        setQuoteError(null);
        const modeParam = isDemoMode ? 'demo' : 'real';
        const resp = await apiClient.get(
          `predictions/${encodeURIComponent(prediction.id)}/quote?outcomeId=${encodeURIComponent(selectedOptionId)}&amount=${encodeURIComponent(String(numAmount))}&mode=${modeParam}`
        );
        const quote = resp?.quote;
        if (!cancelled && quote) {
          setStakeQuote({
            current: quote.current,
            after: quote.after,
            disclaimer: quote.disclaimer,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setStakeQuote(null);
          setQuoteError(e?.message || 'Failed to load quote');
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isOpen, prediction?.id, selectedOptionId, user?.id, numAmount, isFiatMode, isDemoMode]);

  const ensureCryptoWalletReady = useCallback(() => {
    if (!isCryptoMode) return true;
    try {
      ensureWalletReady({
        address,
        chainId,
        expectedChainId: baseSepolia.id,
        isConnected,
        sessionHealthy,
      });
      return true;
    } catch (err) {
      const message = err instanceof WalletStateError ? err.message : 'Wallet is not ready. Please reconnect and switch to Base Sepolia.';
      toast.error(message);
      return false;
    }
  }, [address, chainId, isConnected, isCryptoMode, sessionHealthy]);

  // Different quick amounts for fiat (NGN) vs USD
  const quickAmountsUsd = [5, 10, 25, 50, 100, 250];
  const quickAmountsNgn = [500, 1000, 2500, 5000, 10000, 25000];
  const quickAmounts = isFiatMode ? quickAmountsNgn : quickAmountsUsd;

  const handleSubmit = async () => {
    if (!selectedOptionId) {
      toast.error('Please select a prediction option (Yes or No)');
      return;
    }

    if (!numAmount) {
      toast.error('Please enter an amount to stake');
      return;
    }

    // For fiat, we may have different min/max rules (skip USD-based checks)
    if (!isFiatMode) {
      if (numAmount < prediction.stake_min) {
        toast.error(`Minimum stake is ${formatCurrency(prediction.stake_min)}. Please increase your amount.`);
        return;
      }

      if (prediction.stake_max && numAmount > prediction.stake_max) {
        toast.error(`Maximum stake is ${formatCurrency(prediction.stake_max)}. Please reduce your amount.`);
        return;
      }
    } else {
      // Fiat minimum check (e.g., NGN 100)
      const fiatMin = 100;
      if (numAmount < fiatMin) {
        toast.error(`Minimum stake is ${formatCurrency(fiatMin, 'NGN')}. Please increase your amount.`);
        return;
      }
    }

    if (!user?.id) {
      toast.error('You must be logged in to place predictions');
      return;
    }

    if (needsDeposit) {
      toast.error(`Insufficient escrow balance. You have ${formatCurrency(escrowAvailable)}, but tried to stake ${formatCurrency(numAmount)}.`);
      setShowDepositModal(true);
      return;
    }

    if (isDemoMode && numAmount > demoAvailable) {
      toast.error(`Insufficient balance. You have ${formatCurrency(demoAvailable)} available, but tried to stake ${formatCurrency(numAmount)}.`);
      return;
    }

    if (isFiatMode && numAmount > fiatAvailable) {
      toast.error(`Insufficient fiat balance. You have ${formatCurrency(fiatAvailable, 'NGN')} available, but tried to stake ${formatCurrency(numAmount, 'NGN')}.`);
      return;
    }

    // Only check crypto wallet for crypto mode
    if (isCryptoMode && !ensureCryptoWalletReady()) {
      return;
    }

    setIsLoading(true);
    try {
      if (isFiatMode) {
        // Use the fiat-specific stake flow
        await placeFiatPrediction(
          prediction.id,
          selectedOptionId,
          numAmount, // This is in NGN
          user.id
        );
        toast.success(`Prediction placed successfully! You staked ${formatCurrency(numAmount, 'NGN')} on ${selectedOption?.label}.`);
      } else {
        const result = await placePrediction(
          prediction.id,
          selectedOptionId,
          numAmount,
          user.id,
          isCryptoMode ? (address ?? undefined) : undefined
        );
        const submitQuote = result?.quoteUsed?.after;
        if (submitQuote && typeof submitQuote.estPayout === 'number') {
          toast.success(
            `Prediction placed. Position: ${formatCurrency(Number(submitQuote.userStake || 0))} • Est payout: ${formatCurrency(Number(submitQuote.estPayout || 0))}`
          );
        } else {
          toast.success(`Prediction placed successfully! You staked ${formatCurrency(numAmount)} on ${selectedOption?.label}.`);
        }
      }
      
      onClose();
      setAmount('');
      setSelectedOptionId('');
      setStakeQuote(null);
      setQuoteError(null);

      // Invalidate queries & refresh balances
      invalidateAfterBet(queryClient, { userId: user.id, predictionId: prediction.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.walletSummary(user.id, walletAddressLower) }),
        queryClient.invalidateQueries({ queryKey: QK.walletActivity(user.id) }),
        queryClient.invalidateQueries({ queryKey: ['readContract'] }),
        queryClient.invalidateQueries({ queryKey: ['fiat'] }),
      ]);
      await refetchBalances();
      if (isDemoMode) {
        await fetchDemoSummary();
      }
      if (isFiatMode) {
        await refetchFiat();
      }
      window.dispatchEvent(new CustomEvent('fcz:balance:refresh'));
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to place prediction: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="prediction-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onClose}
            style={{ zIndex: 8000 }}
          />
          
          {/* Modal Content - Mobile optimized positioning with safe area */}
          <div 
            className="fixed inset-0 flex items-end justify-center p-4 pb-20"
            style={{ zIndex: 8500, pointerEvents: 'none' }}
          >
            <motion.div
              key="prediction-modal-content"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[75vh]"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Place Prediction</h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Close modal"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {(isDemoEnabled || isFiatEnabled) && (
                  <div className="inline-flex rounded-lg bg-gray-100 p-1 flex-wrap gap-1">
                    <button
                      onClick={() => setMode('crypto')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        isCryptoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Crypto
                    </button>
                    {isDemoEnabled && (
                      <button
                        onClick={() => setMode('demo')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          isDemoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Zaurum
                      </button>
                    )}
                    {isFiatEnabled && (
                      <button
                        onClick={() => setMode('fiat')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          isFiatMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Fiat (NGN)
                      </button>
                    )}
                  </div>
                )}

                {/* Prediction Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-base">{prediction.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{formatCurrency(totalPool)} Total volume</span>
                    <span>•</span>
                    <span>{prediction.participant_count || 0} Players</span>
                    <span>•</span>
                  <span>
                    {(() => {
                      const timeLabel = formatTimeRemaining(prediction.entry_deadline || prediction.entryDeadline || '');
                      if (!timeLabel) return '';
                      return timeLabel === 'Ended' ? 'Closed' : `Ends in ${timeLabel}`;
                    })()}
                  </span>
                  </div>
                </div>

                {isCryptoMode && (
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 text-xs text-purple-900">
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Available to stake</p>
                        <p className="text-purple-700">{formatCurrency(escrowAvailable, { compact: false })}</p>
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-purple-800 hover:text-purple-900"
                      onClick={() => {
                        if (!user?.id) {
                          toast.error('Sign in to deposit funds.');
                          return;
                        }
                        if (!ensureCryptoWalletReady()) {
                          return;
                        }
                        setShowDepositModal(true);
                      }}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Add funds
                    </button>
                  </div>
                )}
                
                {isDemoMode && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Zaurum available</p>
                        <p className="text-emerald-700">{formatCurrency(demoAvailable, { compact: false })}</p>
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 disabled:opacity-60"
                      onClick={() => void faucetDemo()}
                      disabled={!user?.id || demoLoading}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Get Zaurum
                    </button>
                  </div>
                )}
                
                {isFiatMode && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Fiat available</p>
                        <p className="text-amber-700">{formatCurrency(fiatAvailable, 'NGN')}</p>
                      </div>
                    </div>
                    <a
                      href="/wallet"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Deposit NGN
                    </a>
                  </div>
                )}

                {!isCryptoMode && demoError && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    {demoError}
                  </div>
                )}

                {/* Options — current odds only (pre-stake); Total Volume = totalPool */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Select your prediction:</h4>
                  <div className="space-y-2">
                    {(prediction.options || []).map((option) => {
                      const optionPool = Number((option as any).total_staked) || 0;
                      const percentage =
                        totalPool > 0 ? Math.min((optionPool / totalPool) * 100, 100) : 50;
                      const currentOdds = getPreOddsMultiple(totalPool, optionPool);

                      return (
                        <Card
                          key={option.id || Math.random()}
                          className={cn(
                            "cursor-pointer transition-all border-2",
                            selectedOptionId === option.id
                              ? "border-teal-500 bg-teal-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => setSelectedOptionId(option.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{option.label}</div>
                                <div className="text-sm text-gray-500">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-teal-600" title="Current odds (before your stake)">
                                  {currentOdds != null ? `${currentOdds.toFixed(2)}x` : '—'}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input - Fixed positioning */}
                <AnimatePresence mode="wait">
                  {selectedOptionId && (
                    <motion.div
                      key={`amount-input-${selectedOptionId}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stake amount {isFiatMode ? '(NGN)' : '(ZAU)'}
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-8 pr-4 h-12 text-lg font-medium"
                            min={isFiatMode ? 100 : prediction.stake_min}
                            max={isFiatMode ? displayBalance : (prediction.stake_max || displayBalance)}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            {isFiatMode ? '₦' : <ZaurumMark className="h-4 w-4 text-amber-500" />}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span>Balance: {formatCurrency(displayBalance, displayCurrency)}</span>
                          <button
                            onClick={() => setAmount(Math.floor(displayBalance).toString())}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Max
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Your stake moves the odds in this pool.</p>
                      </div>

                      {/* Quick amounts */}
                      <div>
                        <div className="grid grid-cols-3 gap-2">
                          {quickAmounts.map((quickAmount) => (
                            <Button
                              key={quickAmount}
                              variant="outline"
                              size="sm"
                              onClick={() => setAmount(quickAmount.toString())}
                              disabled={quickAmount > displayBalance}
                              className="text-sm h-10"
                            >
                              {isFiatMode ? `₦${quickAmount.toLocaleString()}` : formatCurrency(quickAmount, { compact: false })}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Payout preview — server quote for demo/crypto; local pool preview fallback */}
                      {numAmount > 0 && (
                        <Card className="bg-teal-50 border-teal-200">
                          <CardContent className="p-3 space-y-2">
                            <div className="text-sm font-medium text-gray-700">Payout preview</div>
                            {(isDemoMode || isCryptoMode) && (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Current position</span>
                                  <span className="font-medium text-gray-900">
                                    {quoteLoading
                                      ? 'Loading...'
                                      : stakeQuote
                                        ? `${formatCurrency(Number(stakeQuote.current.userStake || 0))} • ${formatCurrency(Number(stakeQuote.current.estPayout || 0))} est`
                                        : '—'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">After this stake</span>
                                  <span className="font-semibold text-teal-600">
                                    {quoteLoading
                                      ? 'Loading...'
                                      : stakeQuote
                                        ? `${formatCurrency(Number(stakeQuote.after.userStake || 0))} • ${formatCurrency(Number(stakeQuote.after.estPayout || 0))} est`
                                        : '—'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Estimated odds</span>
                                  <span className="font-medium text-teal-600">
                                    {quoteLoading
                                      ? 'Loading...'
                                      : stakeQuote
                                        ? `${Number(stakeQuote.after.oddsOrPrice || 0).toFixed(2)}x`
                                        : '—'}
                                  </span>
                                </div>
                                {stakeQuote && (
                                  <div className="text-xs text-gray-500">
                                    Current odds: {Number(stakeQuote.current.oddsOrPrice || 0).toFixed(2)}x
                                  </div>
                                )}
                                {quoteError && (
                                  <div className="text-xs text-amber-700">
                                    {quoteError}
                                  </div>
                                )}
                              </>
                            )}
                            {(!isDemoMode && !isCryptoMode) && (
                              <>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs text-gray-500">Stake</div>
                                    <div className="font-semibold text-gray-900">
                                      {formatCurrency(numAmount, displayCurrency)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500">Estimated return</div>
                                    <div className="font-semibold text-teal-600">
                                      {poolPreview
                                        ? formatCurrency(poolPreview.expectedReturn, displayCurrency)
                                        : '—'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Potential profit</span>
                                  <span className={cn(
                                    "font-semibold",
                                    potentialProfit >= 0 ? "text-teal-600" : "text-red-600"
                                  )}>
                                    {poolPreview
                                      ? `${potentialProfit >= 0 ? '+' : ''}${formatCurrency(potentialProfit, displayCurrency)}`
                                      : '—'}
                                  </span>
                                </div>
                              </>
                            )}
                            {poolPreview && (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Estimated odds (with your stake)</span>
                                  <span className="font-medium text-teal-600">
                                    {poolPreview.multiplePost != null ? `${poolPreview.multiplePost.toFixed(2)}x` : '—'}
                                  </span>
                                </div>
                                {poolPreview.multiplePre != null && (
                                  <div className="text-xs text-gray-500">
                                    Current odds: {poolPreview.multiplePre.toFixed(2)}x
                                  </div>
                                )}
                              </>
                            )}
                            <p className="text-xs text-gray-500 pt-1 border-t border-teal-100">
                              {(stakeQuote?.disclaimer || 'Odds update as stake size changes. Final payout depends on the pool at close.')}
                            </p>
                            {feeBps > 0 && (
                              <p className="text-xs text-gray-500">
                                Fees included: {(feeBps / 100).toFixed(1)}%
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer - Fixed positioning above mobile navigation */}
              <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOptionId || !numAmount || isLoading || insufficientBalance}
                  className="w-full h-12 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Placing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap size={16} />
                      <span>Place Prediction ({formatCurrency(numAmount, displayCurrency)})</span>
                    </div>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>

          {showDepositModal && user?.id && (
            <DepositUSDCModal
              open={showDepositModal}
              onClose={() => setShowDepositModal(false)}
              onSuccess={() => {
                setShowDepositModal(false);
                refetchBalances();
              }}
              availableUSDC={walletUSDC}
              userId={user.id}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};
