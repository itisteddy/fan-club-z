import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Prediction } from '../../stores/predictionStore';
import { useWalletStore } from '../../stores/walletStore';
import { usePredictionStore } from '../../stores/predictionStore';
import { formatCurrency, calculatePotentialPayout, cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface PlacePredictionModalProps {
  prediction: Prediction;
  isOpen: boolean;
  onClose: () => void;
}

export const PlacePredictionModal: React.FC<PlacePredictionModalProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { balances } = useWalletStore();
  const { placePrediction } = usePredictionStore();

  const ngnBalance = balances.find(b => b.currency === 'NGN')?.available_balance || 0;
  const numAmount = parseFloat(amount) || 0;
  const selectedOption = prediction.options.find(o => o.id === selectedOptionId);
  const potentialPayout = selectedOption ? calculatePotentialPayout(numAmount, selectedOption.current_odds) : 0;

  const quickAmounts = [25, 50, 100, 250, 500, 1000];

  const handleSubmit = async () => {
    if (!selectedOptionId || !numAmount) {
      toast.error('Please select an option and enter an amount');
      return;
    }

    if (numAmount < prediction.stake_min) {
      toast.error(`Minimum stake is ${formatCurrency(prediction.stake_min)}`);
      return;
    }

    if (prediction.stake_max && numAmount > prediction.stake_max) {
      toast.error(`Maximum stake is ${formatCurrency(prediction.stake_max)}`);
      return;
    }

    if (numAmount > ngnBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      await placePrediction(prediction.id, selectedOptionId, numAmount);
      toast.success('Prediction placed successfully!');
      onClose();
      setAmount('');
      setSelectedOptionId('');
    } catch (error) {
      toast.error('Failed to place prediction');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-background rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-hidden"
        >
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Place Prediction</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
            {/* Prediction Title */}
            <div>
              <h3 className="font-semibold mb-2">{prediction.title}</h3>
              <div className="text-sm text-muted-foreground">
                Pool: {formatCurrency(prediction.pool_total)} • {prediction.participant_count} predictors
              </div>
            </div>

            {/* Options */}
            <div>
              <h4 className="font-medium mb-3">Choose your prediction:</h4>
              <div className="space-y-2">
                {prediction.options.map((option) => (
                  <Card
                    key={option.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedOptionId === option.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-muted-foreground/30"
                    )}
                    onClick={() => setSelectedOptionId(option.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.percentage.toFixed(1)}% • {formatCurrency(option.total_staked)} staked
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {option.current_odds.toFixed(2)}x
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            {selectedOptionId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Stake Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₦
                    </span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-8 text-lg"
                      min={prediction.stake_min}
                      max={prediction.stake_max || ngnBalance}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Min: {formatCurrency(prediction.stake_min)}</span>
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
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Potential return</div>
                          <div className="text-lg font-bold text-primary">
                            {formatCurrency(potentialPayout)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Profit</div>
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
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-background border-t border-border p-6">
            <Button
              onClick={handleSubmit}
              disabled={!selectedOptionId || !numAmount || isLoading || numAmount > ngnBalance}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                'Placing...'
              ) : (
                <>
                  <Zap size={16} className="mr-2" />
                  Place Prediction ({formatCurrency(numAmount)})
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
