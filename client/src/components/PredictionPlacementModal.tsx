import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Info, 
  DollarSign,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Prediction, PredictionOption } from '../store/predictionStore';

interface PredictionPlacementModalProps {
  prediction: Prediction;
  isOpen: boolean;
  onClose: () => void;
  onPlacePrediction: (optionId: string, amount: number) => void;
  userBalance?: number;
  preselectedOptionId?: string;
}

const PredictionPlacementModal: React.FC<PredictionPlacementModalProps> = ({
  prediction,
  isOpen,
  onClose,
  onPlacePrediction,
  userBalance = 1000, // Default balance for demo
  preselectedOptionId
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(preselectedOptionId || '');
  const [amount, setAmount] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const totalPool = (prediction.options || []).reduce((sum, option) => sum + option.totalStaked, 0);
  const numericAmount = parseFloat(amount) || 0;
  const selectedOption = (prediction.options || []).find(opt => opt.id === selectedOptionId);

  // Calculate potential payout
  const potentialPayout = useMemo(() => {
    if (!selectedOption || numericAmount <= 0) return 0;
    
    const newOptionTotal = selectedOption.totalStaked + numericAmount;
    const newTotalPool = totalPool + numericAmount;
    const winProbability = newOptionTotal / newTotalPool;
    
    // Simple payout calculation based on risk-reward
    return numericAmount / winProbability;
  }, [selectedOption, numericAmount, totalPool]);

  const getOptionAnalysis = (option: PredictionOption) => {
    const optionsLength = (prediction.options || []).length;
    const percentage = totalPool > 0 ? (option.totalStaked / totalPool * 100) : (100 / optionsLength);
    const isLeading = option.totalStaked === Math.max(...(prediction.options || []).map(o => o.totalStaked));
    const confidence = percentage > 60 ? 'high' : percentage > 30 ? 'medium' : 'low';
    
    return { percentage: Math.round(percentage), isLeading, confidence };
  };

  const getTrendIcon = (option: PredictionOption) => {
    const analysis = getOptionAnalysis(option);
    if (analysis.isLeading && analysis.percentage > 50) {
      return <TrendingUp size={14} className="text-teal-500" />;
    } else if (analysis.percentage < 20) {
      return <TrendingDown size={14} className="text-red-500" />;
    }
    return <Minus size={14} className="text-gray-400" />;
  };

  const handleSubmit = () => {
    if (selectedOptionId && numericAmount > 0 && numericAmount <= userBalance) {
      onPlacePrediction(selectedOptionId, numericAmount);
      onClose();
    }
  };

  const quickAmounts = [10, 25, 50, 100];
  const canAfford = numericAmount <= userBalance;
  const meetsMinimum = numericAmount >= prediction.stakeMin;
  const isValidAmount = canAfford && meetsMinimum && numericAmount > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 prediction-modal"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Place Prediction</h2>
              <p className="text-sm text-gray-500 mt-1">Choose your option and amount</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Prediction Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                {prediction.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <DollarSign size={14} />
                  <span>${totalPool.toLocaleString()} pool</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{prediction.participantCount || 0} predictors</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  <span>{Math.floor((new Date(prediction.entryDeadline).getTime() - Date.now()) / (1000 * 60 * 60))}h left</span>
                </div>
              </div>
            </div>

            {/* Option Selection */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Select Your Prediction</h4>
              {(!prediction.options || prediction.options.length === 0) ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-2" role="status" aria-label="loading">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="text-gray-600 text-sm">Loading prediction options...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {(prediction.options || []).map((option) => {
                  const analysis = getOptionAnalysis(option);
                  const isSelected = selectedOptionId === option.id;
                  
                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedOptionId(option.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        isSelected 
                          ? 'border-teal-400 bg-teal-50 shadow-lg shadow-purple-500/10' 
                          : 'border-gray-200 hover:border-teal-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(option)}
                          <span className={`font-medium ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                            {option.label}
                          </span>
                          {analysis.isLeading && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                              Leading
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${
                            analysis.confidence === 'high' ? 'text-teal-600' :
                            analysis.confidence === 'medium' ? 'text-blue-600' :
                            'text-gray-600'
                          }`}>
                            {analysis.percentage}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            analysis.isLeading ? 'bg-teal-500' :
                            analysis.confidence === 'medium' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${analysis.percentage}%` }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
                </div>
              )}
            </div>

            {/* Amount Input */}
            {selectedOptionId && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Prediction Amount</h4>
                  <span className="text-sm text-gray-500">Balance: ${userBalance.toLocaleString()}</span>
                </div>
                
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full pl-12 pr-4 py-4 text-lg font-semibold border-2 rounded-xl transition-all duration-200 ${
                      amount && !isValidAmount ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-teal-400'
                    } focus:outline-none`}
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-3">
                  {quickAmounts.map((quickAmount) => (
                    <button
                      key={quickAmount}
                      onClick={() => setAmount(quickAmount.toString())}
                      className="flex-1 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-all duration-200"
                    >
                      ${quickAmount}
                    </button>
                  ))}
                </div>

                {/* Validation messages */}
                {amount && !canAfford && (
                  <div className="flex items-center gap-2 mt-2 text-red-600">
                    <AlertTriangle size={16} />
                    <span className="text-sm">Insufficient balance</span>
                  </div>
                )}
                {amount && !meetsMinimum && canAfford && (
                  <div className="flex items-center gap-2 mt-2 text-amber-600">
                    <Info size={16} />
                    <span className="text-sm">Minimum amount: ${prediction.stakeMin}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Payout Preview */}
            {selectedOptionId && numericAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-teal-200"
              >
                <h4 className="font-semibold text-gray-900 mb-3">Potential Payout</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Your Prediction</p>
                    <p className="text-lg font-bold text-gray-900">${numericAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Potential Return</p>
                    <p className="text-lg font-bold text-teal-600">${potentialPayout.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-teal-200">
                  <p className="text-sm text-gray-600">
                    Potential profit: <span className="font-semibold text-teal-600">
                      ${(potentialPayout - numericAmount).toLocaleString()}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Advanced Options */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <Info size={16} />
              <span>Advanced Options</span>
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-gray-50 rounded-xl"
                >
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Pool Impact:</strong> Your prediction will represent {totalPool > 0 ? ((numericAmount / (totalPool + numericAmount)) * 100).toFixed(1) : 0}% of total pool</p>
                    <p><strong>Settlement:</strong> {prediction.settlementMethod === 'auto' ? 'Automatic' : 'Manual'} settlement</p>
                    <p><strong>Category:</strong> {prediction.category}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={!isValidAmount || !selectedOptionId}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                isValidAmount && selectedOptionId
                  ? 'bg-gradient-to-r from-purple-500 to-teal-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {!selectedOptionId ? 'Select an option' : 
               !isValidAmount ? 'Enter valid amount' : 
               'Place Prediction'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PredictionPlacementModal;