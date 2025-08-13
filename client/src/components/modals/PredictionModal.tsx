import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, TrendingUp, Users, Clock } from 'lucide-react';
import { useWalletStore } from '../../store/walletStore';
import { usePredictionStore } from '../../store/predictionStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { Prediction } from '../../../../shared/schema';

interface PredictionModalProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
}

const PredictionModal: React.FC<PredictionModalProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();
  const { balance } = useWalletStore();
  const { placePrediction } = usePredictionStore();
  
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedOption('');
      setStakeAmount('');
    }
  }, [isOpen, prediction]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeRemaining = (deadline: string | Date) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Ending soon';
  };

  const calculatePotentialPayout = () => {
    if (!prediction || !selectedOption || !stakeAmount) return 0;
    
    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake <= 0) return 0;
    
    const option = prediction.options?.find(opt => opt.id === selectedOption);
    if (!option) return 0;
    
    // Simple 2x payout for demo - in real app this would be dynamic odds
    return stake * 2;
  };

  const handleSubmit = async () => {
    if (!prediction || !selectedOption || !stakeAmount || !user) {
      toast.error('Please fill in all fields');
      return;
    }

    const stake = parseFloat(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      toast.error('Please enter a valid stake amount');
      return;
    }

    if (stake > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setLoading(true);
    
    try {
      await placePrediction({
        predictionId: prediction.id,
        optionId: selectedOption,
        amount: stake,
        userId: user.id
      });
      
      toast.success('Prediction placed successfully!');
      onClose();
    } catch (error: any) {
      console.error('Failed to place prediction:', error);
      toast.error(error.message || 'Failed to place prediction');
    } finally {
      setLoading(false);
    }
  };

  if (!prediction) return null;

  // Handle different property naming conventions
  const poolTotal = prediction.poolTotal || prediction.pool_total || 0;
  const entryDeadline = prediction.entryDeadline || prediction.entry_deadline || new Date();
  const participantCount = prediction.participant_count || prediction.entries?.length || 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-overlay fixed inset-0 bg-black bg-opacity-50"
            style={{ zIndex: 8000 }}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="prediction-modal modal-container fixed inset-x-4 top-20 bottom-20 bg-white rounded-2xl overflow-hidden flex flex-col max-w-md mx-auto"
            style={{ zIndex: 8500 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Place Prediction</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Prediction Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {prediction.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {prediction.description || 'No description available'}
                </p>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign size={16} className="text-gray-500" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(poolTotal)}
                    </div>
                    <div className="text-xs text-gray-600">Pool</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users size={16} className="text-gray-500" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {participantCount}
                    </div>
                    <div className="text-xs text-gray-600">Players</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock size={16} className="text-gray-500" />
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatTimeRemaining(entryDeadline)}
                    </div>
                    <div className="text-xs text-gray-600">Left</div>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Select your prediction
                </label>
                <div className="space-y-2">
                  {prediction.options?.map((option) => {
                    const optionStaked = option.totalStaked || option.total_staked || 0;
                    const percentage = poolTotal > 0 ? (optionStaked / poolTotal) * 100 : 0;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedOption(option.id)}
                        className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                          selectedOption === option.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {option.label}
                          </span>
                          <span className="text-sm text-gray-600">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stake Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Stake amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-600">
                    Balance: {formatCurrency(balance)}
                  </span>
                  <button
                    onClick={() => setStakeAmount(balance.toString())}
                    className="text-green-600 hover:text-green-700 font-medium"
                  >
                    Max
                  </button>
                </div>
                
                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[5, 10, 25, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setStakeAmount(amount.toString())}
                      className="py-2 px-3 border border-gray-200 rounded-lg text-sm font-medium hover:border-green-500 hover:text-green-600 transition-colors"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Potential Payout */}
              {selectedOption && stakeAmount && (
                <div className="mb-6 p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">
                      Potential Payout
                    </span>
                    <span className="text-green-900 font-bold text-lg">
                      {formatCurrency(calculatePotentialPayout())}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    Profit: {formatCurrency(calculatePotentialPayout() - parseFloat(stakeAmount || '0'))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedOption || !stakeAmount}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Placing Prediction...' : 'Place Prediction'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PredictionModal;
