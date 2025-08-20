import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Prediction } from '../../store/predictionStore';
import { useWalletStore } from '../../store/walletStore';
import { usePredictionStore } from '../../store/predictionStore';
import toast from 'react-hot-toast';

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

const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
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
  
  const { getBalance, makePrediction } = useWalletStore();
  const { placePrediction } = usePredictionStore();

  const usdBalance = getBalance('USD') || 0; // Use real balance, no mock data
  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction?.options?.find(o => o.id === selectedOptionId);
  const selectedOptionOdds = selectedOption?.current_odds || (selectedOption?.total_staked ? (prediction?.pool_total / selectedOption.total_staked) : 2.0);
  const potentialPayout = selectedOption ? calculatePotentialPayout(numAmount, selectedOptionOdds) : 0;

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

    if (numAmount > usdBalance) {
      toast.error(`Insufficient balance. You have ${formatCurrency(usdBalance)} available, but tried to stake ${formatCurrency(numAmount)}.`);
      return;
    }

    setIsLoading(true);
    try {
      // Use wallet store to make prediction
      await makePrediction(numAmount, `Prediction on: ${prediction.title}`, prediction.id, 'USD');
      
      // Also update the predictions store
      await placePrediction(prediction.id, selectedOptionId, numAmount);
      
      toast.success(`Prediction placed successfully! You staked ${formatCurrency(numAmount)} on ${selectedOption?.label}.`);
      onClose();
      setAmount('');
      setSelectedOptionId('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      toast.error(`Failed to place prediction: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Component logic continues here...

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
                    <span>{formatCurrency(prediction.pool_total || 0)} Pool</span>
                    <span>•</span>
                    <span>{prediction.participant_count || 0} Players</span>
                    <span>•</span>
                    <span>{formatTimeRemaining()}</span>
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
                              ? "border-green-500 bg-green-50" 
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
                                <div className="text-lg font-bold text-green-600">
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
                            max={prediction.stake_max || usdBalance}
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                            $
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span>Balance: {formatCurrency(usdBalance)}</span>
                          <button
                            onClick={() => setAmount(usdBalance.toString())}
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
                              disabled={quickAmount > usdBalance}
                              className="text-sm h-10"
                            >
                              ${quickAmount}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Potential payout */}
                      {numAmount > 0 && (
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm text-gray-500">Potential return</div>
                                <div className="text-lg font-bold text-green-600">
                                  {formatCurrency(potentialPayout)}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500">Profit</div>
                                <div className={cn(
                                  "font-semibold",
                                  potentialPayout > numAmount ? "text-green-600" : "text-red-600"
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
                  disabled={!selectedOptionId || !numAmount || isLoading || numAmount > usdBalance}
                  className="w-full h-12 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center"
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
        </>
      )}
    </AnimatePresence>
  );
};

// Helper function for time remaining
const formatTimeRemaining = () => {
  // This should be calculated based on prediction.end_date
  // For now, returning a placeholder
  return "3d 16h Left";
};