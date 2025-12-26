import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Wallet as WalletIcon, ArrowUpRight } from 'lucide-react';
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
import { useFundingModeStore } from '@/store/fundingModeStore';
import { getApiUrl } from '@/config';

interface PlacePredictionModalProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

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
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  const { user } = useAuthStore();
  const { placePrediction } = usePredictionStore();
  const queryClient = useQueryClient();
  const { address, chainId, isConnected } = useAccount();
  const { sessionHealthy } = useWeb3Recovery();
  const walletAddressLower = address?.toLowerCase() ?? null;
  const { wallet: walletUSDC, available: escrowAvailable, refetch: refetchBalances } = useUnifiedBalance();
  const { mode, setMode, isDemoEnabled } = useFundingModeStore();
  const isDemoMode = isDemoEnabled && mode === 'demo';

  const BASE_BETS_ENABLED =
    import.meta.env.VITE_FCZ_BASE_BETS === '1' ||
    import.meta.env.ENABLE_BASE_BETS === '1' ||
    import.meta.env.VITE_FCZ_BASE_ENABLE === '1';
  const isCryptoMode = !isDemoMode;

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
      if (!resp.ok) throw new Error(json?.message || 'Failed to load demo credits');
      setDemoSummary(json?.summary ?? null);
    } catch (e: any) {
      setDemoError(e?.message || 'Failed to load demo credits');
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
      if (!resp.ok) throw new Error(json?.message || 'Failed to get demo credits');
      setDemoSummary(json?.summary ?? null);
    } catch (e: any) {
      setDemoError(e?.message || 'Failed to get demo credits');
    } finally {
      setDemoLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isDemoMode) {
      void fetchDemoSummary();
    }
  }, [isDemoMode, fetchDemoSummary]);

  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction?.options?.find(o => o.id === selectedOptionId);
  const selectedOptionOdds = selectedOption?.current_odds || (selectedOption?.total_staked ? (prediction?.pool_total / selectedOption.total_staked) : 2.0);
  const potentialPayout = selectedOption ? calculatePotentialPayout(numAmount, selectedOptionOdds) : 0;
  const demoAvailable = demoSummary?.available ?? 0;
  const displayBalance = isCryptoMode ? escrowAvailable : demoAvailable;
  const needsDeposit = isCryptoMode && numAmount > escrowAvailable;
  const insufficientBalance = numAmount > displayBalance;

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
      toast.error(`Minimum stake is ${formatCurrency(prediction.stake_min)}. Please increase your amount.`);
      return;
    }

    if (prediction.stake_max && numAmount > prediction.stake_max) {
      toast.error(`Maximum stake is ${formatCurrency(prediction.stake_max)}. Please reduce your amount.`);
      return;
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

    if (!isCryptoMode && numAmount > demoAvailable) {
      toast.error(`Insufficient balance. You have ${formatCurrency(demoAvailable)} available, but tried to stake ${formatCurrency(numAmount)}.`);
      return;
    }

    if (!ensureCryptoWalletReady()) {
      return;
    }

    setIsLoading(true);
    try {
      await placePrediction(
        prediction.id,
        selectedOptionId,
        numAmount,
        user.id,
        isCryptoMode ? (address ?? undefined) : undefined
      );
      
      toast.success(`Prediction placed successfully! You staked ${formatCurrency(numAmount)} on ${selectedOption?.label}.`);
      onClose();
      setAmount('');
      setSelectedOptionId('');

      // Invalidate queries & refresh balances
      invalidateAfterBet(queryClient, { userId: user.id, predictionId: prediction.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QK.walletSummary(user.id, walletAddressLower) }),
        queryClient.invalidateQueries({ queryKey: QK.walletActivity(user.id) }),
        queryClient.invalidateQueries({ queryKey: ['readContract'] }),
      ]);
      await refetchBalances();
      if (!isCryptoMode) {
        await fetchDemoSummary();
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
                {isDemoEnabled && (
                  <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    <button
                      onClick={() => setMode('crypto')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        isCryptoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Crypto (USDC)
                    </button>
                    <button
                      onClick={() => setMode('demo')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        !isCryptoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Demo Credits
                    </button>
                  </div>
                )}

                {/* Prediction Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-base">{prediction.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{formatCurrency(prediction.pool_total || 0)} Pool</span>
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

                {isCryptoMode ? (
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-3 py-2 text-xs text-purple-900">
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Available to stake</p>
                        <p className="text-purple-700">${escrowAvailable.toFixed(2)} USDC</p>
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
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <WalletIcon className="w-4 h-4" />
                      <div>
                        <p className="font-semibold">Demo available</p>
                        <p className="text-emerald-700">${demoAvailable.toFixed(2)}</p>
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 disabled:opacity-60"
                      onClick={() => void faucetDemo()}
                      disabled={!user?.id || demoLoading}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Get credits
                    </button>
                  </div>
                )}

                {!isCryptoMode && demoError && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    {demoError}
                  </div>
                )}

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
                            $
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span>Balance: {formatCurrency(displayBalance)}</span>
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
                              ${quickAmount}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Potential payout */}
                      {numAmount > 0 && (
                        <Card className="bg-teal-50 border-teal-200">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-500">Potential return</div>
                                <div className="text-lg font-bold text-teal-600">
                                  {formatCurrency(potentialPayout)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500">Profit</div>
                                <div className={cn(
                                  "font-semibold",
                                  potentialPayout > numAmount ? "text-teal-600" : "text-red-600"
                                )}>
                                  {formatCurrency(potentialPayout - numAmount)}
                                </div>
                              </div>
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
                      <span>Place Prediction ({formatCurrency(numAmount)})</span>
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