import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle, DollarSign, Users, Trophy } from 'lucide-react';
import { Prediction } from '../../store/predictionStore';
import useSettlement from '../../hooks/useSettlement';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import toast from 'react-hot-toast';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: Prediction;
  onSettlementComplete?: () => void;
}

const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  prediction,
  onSettlementComplete
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [proofUrl, setProofUrl] = useState('');
  const [reason, setReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { settleManually, isSettling, settlementError, clearError } = useSettlement();

  const handleSubmit = async () => {
    if (!selectedOptionId) {
      toast.error('Please select a winning option');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for settlement');
      return;
    }

    try {
      const result = await settleManually({
        predictionId: prediction.id,
        winningOptionId: selectedOptionId,
        proofUrl: proofUrl.trim() || undefined,
        reason: reason.trim(),
        userId: prediction.creator_id || '325343a7-0a32-4565-8059-7c0d9d3fed1b' // Fallback for demo
      });

      if (result) {
        toast.success('Prediction settled successfully!');
        setShowConfirmation(false);
        onClose();
        if (onSettlementComplete) {
          onSettlementComplete();
        }
      }
    } catch (error) {
      console.error('Settlement error:', error);
    }
  };

  const handleClose = () => {
    setSelectedOptionId('');
    setProofUrl('');
    setReason('');
    setShowConfirmation(false);
    clearError();
    onClose();
  };

  const selectedOption = prediction.options?.find(opt => opt.id === selectedOptionId);
  const totalPool = prediction.pool_total || 0;
  const participantCount = prediction.participant_count || 0;
  const platformFee = (totalPool * 2.5) / 100;
  const creatorFee = (totalPool * 1.0) / 100;
  const payoutPool = totalPool - platformFee - creatorFee;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {!showConfirmation ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  Settle Prediction
                </h2>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Prediction Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                    {prediction.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>${totalPool.toFixed(2)} pool</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{participantCount} participants</span>
                    </div>
                  </div>
                </div>

                {/* Select Winning Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Winning Option *
                  </label>
                  <div className="space-y-2">
                    {prediction.options?.map((option) => {
                      const isSelected = selectedOptionId === option.id;
                      const optionStaked = option.total_staked || 0;
                      const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : 0;

                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`font-medium ${
                                isSelected ? 'text-teal-700' : 'text-gray-900'
                              }`}>
                                {option.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {percentage.toFixed(0)}% • ${optionStaked.toFixed(2)} staked
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-teal-500" />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Proof URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof URL (optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/proof"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link to evidence supporting this outcome (news article, official result, etc.)
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Settlement Reason *
                  </label>
                  <Textarea
                    placeholder="Explain why this option is the winner..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-20 resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {reason.length}/500 characters
                  </p>
                </div>

                {/* Error Display */}
                {settlementError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{settlementError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSettling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmation(true)}
                  disabled={!selectedOptionId || !reason.trim() || isSettling}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Screen */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirm Settlement
                </h2>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isSettling}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Settlement Summary */}
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-teal-600" />
                    <h3 className="font-medium text-gray-900">Settlement Summary</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Winning Option:</span>
                      <span className="font-medium text-gray-900">{selectedOption?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Pool:</span>
                      <span className="font-medium text-gray-900">${totalPool.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform Fee (2.5%):</span>
                      <span className="text-gray-900">${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creator Fee (1.0%):</span>
                      <span className="text-gray-900">${creatorFee.toFixed(2)}</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between">
                      <span className="text-gray-600">Winner Payout:</span>
                      <span className="font-semibold text-teal-600">${payoutPool.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants:</span>
                      <span className="text-gray-900">{participantCount}</span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-amber-800 text-sm">
                      <strong>Warning:</strong> This action cannot be undone. All participants will be notified of the settlement result.
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {settlementError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{settlementError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSettling}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSettling}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {isSettling ? 'Settling...' : 'Confirm Settlement'}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettlementModal;