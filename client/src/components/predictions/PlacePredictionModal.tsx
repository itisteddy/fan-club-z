import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Prediction } from '../../stores/predictionsStore';
import { useWalletStore } from '../../stores/walletStore';
import { usePredictionsStore } from '../../stores/predictionsStore';
import toast from 'react-hot-toast';

interface PlacePredictionModalProps {
  prediction: Prediction;
  isOpen: boolean;
  onClose: () => void;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
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
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { getBalance, makePrediction } = useWalletStore();
  const { placeBet } = usePredictionsStore();

  const ngnBalance = getBalance('NGN') || 10000; // Default for demo
  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction.options.find(o => o.id === selectedOptionId);
  const potentialPayout = selectedOption ? calculatePotentialPayout(numAmount, selectedOption.currentOdds) : 0;

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

  const handleSubmit = async () => {
    if (!selectedOptionId) {
      toast.error('Please select a prediction option (Yes or No)');
      return;
    }

    if (!numAmount) {
      toast.error('Please enter an amount to stake');
      return;
    }

    if (numAmount < prediction.stakeMin) {
      toast.error(`Minimum stake is ${formatCurrency(prediction.stakeMin)}. Please increase your amount.`);
      return;
    }

    if (prediction.stakeMax && numAmount > prediction.stakeMax) {
      toast.error(`Maximum stake is ${formatCurrency(prediction.stakeMax)}. Please reduce your amount.`);
      return;
    }

    if (numAmount > ngnBalance) {
      toast.error(`Insufficient balance. You have ${formatCurrency(ngnBalance)} available, but tried to stake ${formatCurrency(numAmount)}.`);
      return;
    }

    setIsLoading(true);
    try {
      // Use wallet store to make prediction
      await makePrediction(numAmount, `Prediction on: ${prediction.title}`, prediction.id, 'NGN');
      
      // Also update the predictions store
      await placeBet(prediction.id, selectedOptionId, numAmount);
      
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

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isOpen && (
        <>
          {/* Backdrop - Separate layer with proper z-index */}
          <motion.div
            key="prediction-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              pointerEvents: 'auto'
            }}
            onClick={onClose}
          />
          
          {/* Modal Content - Separate layer with higher z-index */}
          <div className="prediction-modal" style={{ position: 'fixed', inset: 0, zIndex: 1001, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <motion.div
              key="prediction-modal-content"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="modal-container"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Place Prediction</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X size={20} />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="modal-body">
              <div className="space-y-6">
                {/* Prediction Title */}
                <div>
                  <h3 className="font-semibold mb-2">{prediction.title}</h3>
                  <div className="text-sm text-gray-500">
                    Pool: {formatCurrency(prediction.poolTotal)} • {prediction.participantCount} predictors
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h4 className="font-medium mb-3">Choose your prediction:</h4>
                  <div className="space-y-2">
                    {prediction.options.map((option) => {
                      const totalStaked = option.totalStaked || 0;
                      const poolTotal = prediction.poolTotal || 1;
                      const percentage = poolTotal > 0 ? Math.min((totalStaked / poolTotal * 100), 100) : 50;
                      
                      return (
                        <Card
                          key={option.id}
                          className={cn(
                            "cursor-pointer transition-all",
                            selectedOptionId === option.id 
                              ? "border-green-500 bg-green-50" 
                              : "hover:border-gray-300"
                          )}
                          onClick={() => setSelectedOptionId(option.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{option.label}</div>
                                <div className="text-sm text-gray-500">
                                  {percentage.toFixed(1)}% • {formatCurrency(totalStaked)} staked
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                  {option.currentOdds.toFixed(2)}x
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
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
                      <label className="block text-sm font-medium mb-2">
                        Stake Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          ₦
                        </span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="force-visible force-white-bg pl-8 text-lg text-gray-900"
                          min={prediction.stakeMin}
                          max={prediction.stakeMax || ngnBalance}
                          style={{
                            backgroundColor: '#ffffff !important',
                            color: '#111827 !important',
                            opacity: '1 !important',
                            visibility: 'visible !important'
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>Min: {formatCurrency(prediction.stakeMin)}</span>
                        <span>Balance: {formatCurrency(ngnBalance)}</span>
                      </div>
                    </div>

                    {/* Quick amounts */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Quick amounts:</label>
                      <div className="grid grid-cols-3 gap-2">
                        {quickAmounts.map((quickAmount) => (
                          <Button
                            key={quickAmount}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(quickAmount.toString())}
                            disabled={quickAmount > ngnBalance}
                            className="text-sm"
                          >
                            ₦{quickAmount}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Potential payout */}
                    {numAmount > 0 && (
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
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
            </div>

            {/* Submit Button - Fixed visibility */}
            <div className="modal-footer">
              <button
                onClick={handleSubmit}
                disabled={!selectedOptionId || !numAmount || isLoading || numAmount > ngnBalance}
                className="force-visible force-green-button modal-bottom-button w-full h-12 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center"
                style={{
                  backgroundColor: '#22c55e !important',
                  opacity: '1 !important',
                  visibility: 'visible !important',
                  zIndex: 52,
                  position: 'relative',
                  display: 'flex !important'
                }}
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
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};