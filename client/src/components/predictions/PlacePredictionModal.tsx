import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Prediction } from '../../store/predictionStore';
import { usePredictionStore } from '../../store/predictionStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { formatTimeRemaining } from '@/lib/utils';
import { useUnifiedBalance } from '@/hooks/useUnifiedBalance';
import { useQueryClient } from '@tanstack/react-query';
import { QK } from '@/lib/queryKeys';
import { invalidateAfterBet } from '@/utils/queryInvalidation';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { formatZaurumNumber } from '@/lib/format';
import { ZaurumMark } from '@/components/currency/ZaurumMark';
import { ZaurumAmount } from '@/components/currency/ZaurumAmount';

interface PlacePredictionModalProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
}

type StakeQuoteSide = {
  userStake: number;
  oddsOrPrice: number | null;
  estPayout: number;
};

type StakeQuoteResponse = {
  marketId: string;
  outcomeId: string;
  amount: number;
  pricingModel: string;
  current: StakeQuoteSide;
  after: StakeQuoteSide;
  disclaimer: string;
};

// Utility functions
const calculatePotentialPayout = (amount: number, odds: number) => {
  return amount * odds;
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
  const [quote, setQuote] = useState<StakeQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  
  const { user } = useAuthStore();
  const { placePrediction } = usePredictionStore();
  const queryClient = useQueryClient();
  const { available: escrowAvailable, refetch: refetchBalances } = useUnifiedBalance();

  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction?.options?.find(o => o.id === selectedOptionId);
  const selectedOptionOdds = selectedOption?.current_odds || (selectedOption?.total_staked ? (prediction?.pool_total / selectedOption.total_staked) : 2.0);
  const potentialPayout = selectedOption ? calculatePotentialPayout(numAmount, selectedOptionOdds) : 0;
  const displayBalance = escrowAvailable;
  const insufficientBalance = numAmount > displayBalance;
  const quoteCurrent = quote?.current;
  const quoteAfter = quote?.after;
  const displayCurrentOdds = quoteCurrent?.oddsOrPrice ?? selectedOptionOdds ?? 0;

  useEffect(() => {
    if (!isOpen) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }
    if (!prediction?.id || !selectedOptionId || !user?.id || !(numAmount > 0)) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const params = new URLSearchParams({
          outcomeId: selectedOptionId,
          amount: String(numAmount),
          mode: 'demo',
        });
        const data = await apiClient.get(`predictions/${prediction.id}/quote?${params.toString()}`);
        if (cancelled) return;
        setQuote((data as any)?.quote || null);
      } catch (err: any) {
        if (cancelled) return;
        const msg =
          err?.responseData?.message ||
          err?.message ||
          'Unable to load live quote right now.';
        setQuote(null);
        setQuoteError(String(msg));
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isOpen, prediction?.id, selectedOptionId, user?.id, numAmount]);

  const quickAmounts = [5, 10, 25, 50, 100, 250];

  const handleSubmit = async () => {
    if (!selectedOptionId) {
      toast.error('Please select a prediction option (Yes or No)');
      return;
    }

    if (!numAmount) {
      toast.error('Please enter an amount to stake');
      return;
    }

    if (numAmount < prediction.stake_min) {
      toast.error(`Minimum stake is ${formatZaurumNumber(prediction.stake_min, { compact: false })} Zaurum. Please increase your amount.`);
      return;
    }

    if (prediction.stake_max && numAmount > prediction.stake_max) {
      toast.error(`Maximum stake is ${formatZaurumNumber(prediction.stake_max, { compact: false })} Zaurum. Please reduce your amount.`);
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to place predictions');
      return;
    }

    if (numAmount > displayBalance) {
      toast.error(
        `Insufficient balance. You have ${formatZaurumNumber(displayBalance, { compact: false })} Zaurum available, but tried to stake ${formatZaurumNumber(numAmount, { compact: false })} Zaurum.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const result = await placePrediction(
        prediction.id,
        selectedOptionId,
        numAmount,
        user.id
      );
      const submitQuote = result?.quoteUsed as StakeQuoteResponse | undefined;
      
      toast.success(
        submitQuote?.after
          ? `Prediction placed. New position ${formatZaurumNumber(submitQuote.after.userStake, { compact: false })} Zaurum · est. payout ${formatZaurumNumber(submitQuote.after.estPayout, { compact: false })} Zaurum`
          : `Prediction placed successfully! You staked ${formatZaurumNumber(numAmount, { compact: false })} Zaurum on ${selectedOption?.label}.`
      );
      onClose();
      setAmount('');
      setSelectedOptionId('');
      setQuote(null);
      setQuoteError(null);

      // Invalidate queries & refresh balances
      invalidateAfterBet(queryClient, { userId: user.id, predictionId: prediction.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.walletSummary(user.id, null) }),
        queryClient.invalidateQueries({ queryKey: QK.walletActivity(user.id) }),
        queryClient.invalidateQueries({ queryKey: ['readContract'] }),
      ]);
      await refetchBalances();
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
                {/* Prediction Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-base">{prediction.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <ZaurumAmount value={prediction.pool_total || 0} compact markSize="xs" />
                      <span>Pool</span>
                    </span>
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

                {/* Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Select your prediction:</h4>
                  <div className="space-y-2">
                    {(prediction.options || []).map((option) => {
                      const totalStaked = option.total_staked || 0;
                      const poolTotal = prediction.pool_total || 1;
                      const percentage = poolTotal > 0 ? Math.min((totalStaked / poolTotal * 100), 100) : 50;
                      const currentOdds = option.current_odds || (totalStaked > 0 ? (poolTotal / totalStaked) : 2.0);
                      
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
                                <div className="text-lg font-bold text-teal-600">
                                  {currentOdds.toFixed(2)}x
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
                          Stake amount
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-8 pr-4 h-12 text-lg font-medium"
                            min={prediction.stake_min}
                            max={prediction.stake_max || displayBalance}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            <ZaurumMark className="h-4 w-4" />
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span className="inline-flex items-center gap-1">
                            <span>Balance:</span>
                            <ZaurumAmount value={displayBalance} compact markSize="xs" />
                          </span>
                          <button
                            onClick={() => setAmount(displayBalance.toString())}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Max
                          </button>
                        </div>
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
                              <ZaurumAmount value={quickAmount} markSize="xs" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Potential payout */}
                      {numAmount > 0 && (
                        <Card className="bg-teal-50 border-teal-200">
                          <CardContent className="p-3">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm text-gray-500">Current market odds</div>
                                  <div className="text-lg font-bold text-teal-600">
                                    {quoteLoading ? 'Updating…' : `${displayCurrentOdds.toFixed(2)}x`}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-500">Estimated return</div>
                                  <div className="text-lg font-bold text-teal-600">
                                    <ZaurumAmount value={quoteAfter?.estPayout ?? potentialPayout} markSize="sm" />
                                  </div>
                                </div>
                              </div>

                              {(quoteCurrent || quoteAfter) && (
                                <div className="rounded-lg bg-white/80 border border-teal-100 p-3 space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Your current position</span>
                                    <span className="font-medium text-gray-900">
                                      <ZaurumAmount value={quoteCurrent?.userStake ?? 0} markSize="xs" />
                                      {' · '}
                                      <span className="inline-flex items-center gap-1">Est. <ZaurumAmount value={quoteCurrent?.estPayout ?? 0} markSize="xs" /></span>
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">After this stake</span>
                                    <span className="font-semibold text-teal-700">
                                      <ZaurumAmount value={quoteAfter?.userStake ?? numAmount} markSize="xs" />
                                      {' · '}
                                      <span className="inline-flex items-center gap-1">Est. <ZaurumAmount value={quoteAfter?.estPayout ?? potentialPayout} markSize="xs" /></span>
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {quoteAfter?.oddsOrPrice != null && (
                                      <span className="mr-2">
                                        After your stake odds: {quoteAfter.oddsOrPrice.toFixed(2)}x
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {quote?.disclaimer || 'Estimated; final payout depends on final pools at close.'}
                                  </div>
                                </div>
                              )}

                              {quoteError && (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                                  {quoteError}
                                </div>
                              )}
                            </div>
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
                      <span className="inline-flex items-center gap-1">
                        <span>Place Prediction (</span>
                        <ZaurumAmount value={numAmount} markSize="xs" />
                        <span>)</span>
                      </span>
                    </div>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
