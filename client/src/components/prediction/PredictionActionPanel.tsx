import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, TrendingUp } from 'lucide-react';
import { useAccount, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import AuthRequiredState from '../ui/empty/AuthRequiredState';
import { selectEscrowAvailableUSD } from '@/lib/balance/balanceSelector';
import { useWalletStore } from '@/store/walletStore';
import { t } from '@/lib/lexicon';
import { formatZaurumNumber } from '@/lib/format';
import { ZaurumMark } from '@/components/currency/ZaurumMark';

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
  isAuthenticated?: boolean;
  onOptionSelect: (optionId: string) => void;
  onStakeChange: (amount: string) => void;
  onPlaceBet: () => void;
  onLike: () => void;
  onComment: () => void;
  onAddFunds?: () => void;
}

const PredictionActionPanel: React.FC<PredictionActionPanelProps> = ({
  prediction,
  selectedOptionId,
  stakeAmount,
  isPlacingBet,
  userBalance,
  isAuthenticated = true,
  onOptionSelect,
  onStakeChange,
  onPlaceBet,
  onLike,
  onComment,
  onAddFunds
}) => {
  const canPlaceBet = prediction.status === 'open';
  const walletStore = useWalletStore();
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // Feature flags
  const BASE_ENABLED = import.meta.env.VITE_FCZ_BASE_ENABLE === '1';
  const BETS_ONCHAIN = import.meta.env.VITE_FCZ_BASE_BETS === '1';
  const BASE_CHAIN_ID = baseSepolia.id as 84532;

  // Real escrow-available balance
  const escrowAvailable = useMemo(
    () => selectEscrowAvailableUSD(walletStore),
    [walletStore]
  );

  const stakeValue = parseFloat(stakeAmount) || 0;
  const needsFunds = stakeValue > 0 && escrowAvailable < stakeValue;
  const onBase = chainId === BASE_CHAIN_ID;

  // Auth state logging removed - excessive logging issue
  // React.useEffect(() => {
  //   console.log('🔐 PredictionActionPanel - Auth State:', { 
  //     isAuthenticated, 
  //     canPlaceBet,
  //     userBalance,
  //     escrowAvailable,
  //     BASE_ENABLED,
  //     BETS_ONCHAIN,
  //     isConnected,
  //     onBase,
  //     predictionId: prediction.id 
  //   });
  // }, [isAuthenticated, canPlaceBet, userBalance, escrowAvailable, BASE_ENABLED, BETS_ONCHAIN, isConnected, onBase, prediction.id]);

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
      {/* Show auth required state immediately if not authenticated */}
      {!isAuthenticated ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
          <AuthRequiredState
            icon={<TrendingUp />}
            title={`Sign in to ${t('bet')}`}
            description="Create an account or sign in to make predictions and win rewards."
            intent="place_prediction"
            payload={{ predictionId: prediction.id }}
            className="py-0"
          />
        </div>
      ) : (
        <>
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
                  Stake Amount (Zaurum)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"><ZaurumMark className="h-4 w-4" /></span>
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
                <p className="text-sm text-gray-600 mt-1 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <span>{BASE_ENABLED && BETS_ONCHAIN ? 'Available in escrow:' : 'Available:'}</span>
                    <span className="inline-flex items-center gap-1">
                      <ZaurumMark className="h-3.5 w-3.5" />
                      <span>{formatZaurumNumber(BASE_ENABLED && BETS_ONCHAIN ? Math.max(0, escrowAvailable) : (userBalance || 0), { compact: false })}</span>
                    </span>
                  </span>
                  {(BASE_ENABLED && BETS_ONCHAIN ? needsFunds : parseFloat(stakeAmount) > userBalance) && (
                    <span className="text-red-600 font-medium">Insufficient funds</span>
                  )}
                </p>
              </div>

              {/* CTA Button with Gating Logic */}
              {BASE_ENABLED && BETS_ONCHAIN && !isConnected ? (
                <button
                  onClick={() => {
                    // Trigger wallet connect - you can customize this
                    console.log('[FCZ-PAY] ui: Connect wallet requested');
                    // TODO: Open your wallet connect modal
                  }}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all transform bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] shadow-lg hover:shadow-xl"
                  style={{ position: 'relative', zIndex: 10 }}
                >
                  Connect Wallet
                </button>
              ) : BASE_ENABLED && BETS_ONCHAIN && !onBase ? (
                <button
                  onClick={async () => {
                    try {
                      await switchChainAsync?.({ chainId: BASE_CHAIN_ID });
                    } catch (err) {
                      console.error('[FCZ-PAY] Chain switch failed:', err);
                    }
                  }}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all transform bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] shadow-lg hover:shadow-xl"
                  style={{ position: 'relative', zIndex: 10 }}
                >
                  Switch to Base
                </button>
              ) : BASE_ENABLED && BETS_ONCHAIN && needsFunds ? (
                <button
                  onClick={() => {
                    // Open deposit modal
                    console.log('[FCZ-PAY] ui: Add funds requested');
                    if (onAddFunds) {
                      onAddFunds();
                    } else {
                      console.log('[FCZ-PAY] ui: Add funds requested');
                    }
                  }}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all transform bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 active:scale-[0.98] shadow-lg hover:shadow-xl"
                  style={{ position: 'relative', zIndex: 10 }}
                >
                  <span className="inline-flex items-center gap-1">
                    <span>Add funds (need</span>
                    <ZaurumMark className="h-4 w-4" />
                    <span>{formatZaurumNumber(Math.max(0, stakeValue - escrowAvailable), { compact: false })})</span>
                  </span>
                </button>
              ) : (
                <button
                  onClick={onPlaceBet}
                  disabled={!stakeAmount || isPlacingBet || (BASE_ENABLED && BETS_ONCHAIN ? needsFunds : parseFloat(stakeAmount) > userBalance) || parseFloat(stakeAmount) <= 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform ${
                    !stakeAmount || isPlacingBet || (BASE_ENABLED && BETS_ONCHAIN ? needsFunds : parseFloat(stakeAmount) > userBalance) || parseFloat(stakeAmount) <= 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] shadow-lg hover:shadow-xl'
                  }`}
                  style={{
                    position: 'relative',
                    zIndex: 10
                  }}
                >
                  {isPlacingBet ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('betVerb')}…</span>
                    </div>
                  ) : (BASE_ENABLED && BETS_ONCHAIN ? needsFunds : parseFloat(stakeAmount) > userBalance) ? (
                    'Insufficient Balance'
                  ) : parseFloat(stakeAmount) <= 0 || !stakeAmount ? (
                    'Enter Amount'
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <span>{t('betVerb')}:</span>
                      <ZaurumMark className="h-4 w-4" />
                      <span>{formatZaurumNumber(parseFloat(stakeAmount), { compact: false })}</span>
                    </span>
                  )}
                </button>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

export default PredictionActionPanel;
