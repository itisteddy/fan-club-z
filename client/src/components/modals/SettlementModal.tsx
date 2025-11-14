import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle, DollarSign, Users, Trophy } from 'lucide-react';
import { Prediction, PredictionOption, usePredictionStore } from '../../store/predictionStore';
import useSettlement from '../../hooks/useSettlement';
import useSettlementMerkle from '../../hooks/useSettlementMerkle';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import toast from 'react-hot-toast';
import { useNotificationStore } from '../../store/notificationStore';

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
  const [options, setOptions] = useState<PredictionOption[]>(prediction.options || []);

  const { settleManually, isSettling, settlementError, clearError } = useSettlement();
  const { settleWithMerkle, isSubmitting: isPostingRoot, error: merkleError } = useSettlementMerkle();
  const { notifySettlementReady } = useNotificationStore();

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
      // Merkle-based on-chain settlement. Creator signs the tx to post the root.
      const tx = await settleWithMerkle({
        predictionId: prediction.id,
        winningOptionId: selectedOptionId,
        reason: reason.trim(),
        userId: prediction.creator_id || '',
      });
      if (tx) {
        toast.success('Settlement root posted on-chain!');
        setShowConfirmation(false);
        onClose();
        if (onSettlementComplete) onSettlementComplete();
      }
    } catch (error) {
      console.error('Settlement submit error:', error);
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

  // Ensure options are loaded even if parent did not pass them yet
  const { fetchPredictionById } = usePredictionStore();
  React.useEffect(() => {
    let isMounted = true;
    const ensureOptions = async () => {
      try {
        if (prediction.options && prediction.options.length > 0) {
          if (!isMounted) return;
          setOptions(prediction.options);
          console.log('✅ SettlementModal: Using options from props:', prediction.options.length);
          return;
        }
        const full = await fetchPredictionById(String(prediction.id));
        if (isMounted && full?.options?.length) {
          setOptions(full.options);
          console.log('✅ SettlementModal: Loaded options via fetch:', full.options.length);
        } else if (isMounted) {
          console.warn('⚠️ SettlementModal: No options available for prediction:', prediction.id);
        }
      } catch (err) {
        console.warn('⚠️ SettlementModal: Failed to ensure options:', err);
      }
    };
    ensureOptions();
    return () => { isMounted = false; };
  }, [prediction.id]);
  
  const selectedOption = options.find(opt => opt.id === selectedOptionId);
  const totalPool = prediction.pool_total || 0;
  const participantCount = prediction.participant_count || 0;
  // Determine total staked on the selected (winning) option
  const selectedStake = (() => {
    if (!selectedOption) return 0;
    return Number(
      // Try multiple possible field names used across app versions
      (selectedOption as any).total_staked ||
      (selectedOption as any).staked_amount ||
      (selectedOption as any).amount_staked ||
      (selectedOption as any).total_amount ||
      (selectedOption as any).totalStaked ||
      0
    ) || 0;
  })();
  // House take applies ONLY to losing stakes (round to cents deterministically)
  const totalLosingStake = Math.max(0, totalPool - selectedStake);
  const platformFeeCents = Math.round(totalLosingStake * 100 * 2.5 / 100);
  const creatorFeeCents = Math.round(totalLosingStake * 100 * 1.0 / 100);
  const platformFee = platformFeeCents / 100;
  const creatorFee = creatorFeeCents / 100;
  // Winners receive their stake back plus proportional share of (losing stakes - fees)
  const payoutPool = Math.max(0, selectedStake + Math.max(0, (totalLosingStake * 100 - platformFeeCents - creatorFeeCents) / 100));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
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
              <div className="p-6 space-y-6 pb-40" style={{ paddingBottom: 'max(10rem, env(safe-area-inset-bottom))' }}>
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
                    {options.length === 0 ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          <p className="text-yellow-800 font-medium">No Options Available</p>
                        </div>
                        <p className="text-yellow-700 text-sm mb-3">
                          This prediction doesn't have any options to select from. This might be because:
                        </p>
                        <ul className="text-yellow-700 text-sm space-y-1 ml-4">
                          <li>• The prediction data is still loading</li>
                          <li>• The prediction was created without options</li>
                          <li>• There was an error fetching the prediction details</li>
                        </ul>
                        <p className="text-yellow-600 text-xs mt-3">
                          Please close this modal and try opening it again. If the problem persists, contact support.
                        </p>
                      </div>
                    ) : (
                      options.map((option) => {
                      const isSelected = selectedOptionId === option.id;
                      // Try multiple possible field names for staked amount
                      const optionStaked = Number(
                        option.total_staked || 
                        option.staked_amount || 
                        option.amount_staked || 
                        option.total_amount ||
                        option.totalStaked ||
                        0
                      );
                      
                      // Debug: Log to see what data is available
                      if (import.meta.env.DEV) {
                        console.log('SettlementModal option data:', {
                          id: option.id,
                          label: option.label,
                          optionStaked,
                          availableFields: Object.keys(option)
                        });
                      }
                      
                      const percentage = totalPool > 0 ? (optionStaked / totalPool) * 100 : 0;
                      const optionOdds = option.current_odds || (totalPool > 0 && optionStaked > 0 ? totalPool / optionStaked : 2.00);

                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className={`font-medium ${
                                isSelected ? 'text-emerald-700' : 'text-gray-900'
                              }`}>
                                {option.label}
                              </div>
                              <div className="text-sm text-gray-500">
                                {percentage.toFixed(1)}% • ${optionStaked.toFixed(2)} staked • {optionOdds.toFixed(2)}x odds
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-emerald-500" />
                            )}
                          </div>
                        </motion.button>
                      );
                    }))}
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
                {(settlementError || merkleError) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 text-sm">{settlementError || merkleError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer - sticky above bottom nav */}
              <div className="sticky left-0 right-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-t border-gray-100 p-4 flex items-center justify-end gap-3" style={{ bottom: 'max(4rem, env(safe-area-inset-bottom))' }}>
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
                  className="bg-emerald-600 hover:bg-emerald-700"
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
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-emerald-600" />
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
                      <span className="font-semibold text-emerald-600">${payoutPool.toFixed(2)}</span>
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

              {/* Footer - sticky above bottom nav */}
              <div className="sticky left-0 right-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-t border-gray-100 p-4 flex items-center justify-end gap-3" style={{ bottom: 'max(4rem, env(safe-area-inset-bottom))' }}>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSettling || isPostingRoot}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSettling || isPostingRoot}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isPostingRoot ? 'Submitting...' : isSettling ? 'Settling...' : 'Confirm Settlement'}
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