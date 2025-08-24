import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, DollarSign, Users, Clock } from 'lucide-react';
import { getApiUrl } from '../../config';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

interface SettlementValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictionId: string;
  predictionTitle: string;
}

interface SettlementStatus {
  prediction: {
    id: string;
    title: string;
    status: string;
    pool_total: number;
  };
  userEntry: {
    id: string;
    option_id: string;
    amount: number;
    status: string;
    actual_payout: number;
  };
  settlement: {
    winning_option_id: string;
    total_payout: number;
    settlement_time: string;
  } | null;
  canValidate: boolean;
  needsSettlement: boolean;
}

const SettlementValidationModal: React.FC<SettlementValidationModalProps> = ({
  isOpen,
  onClose,
  predictionId,
  predictionTitle
}) => {
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchSettlementStatus();
    }
  }, [isOpen, user?.id, predictionId]);

  const fetchSettlementStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${getApiUrl()}/api/v2/settlement/${predictionId}/status?userId=${user?.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch settlement status');
      }

      const data = await response.json();
      setSettlementStatus(data.data);
    } catch (error) {
      console.error('Error fetching settlement status:', error);
      toast.error('Failed to load settlement information');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (action: 'accept' | 'dispute') => {
    try {
      setValidating(true);
      
      const response = await fetch(
        `${getApiUrl()}/api/v2/settlement/${predictionId}/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user?.id,
            action,
            reason: action === 'dispute' ? disputeReason : undefined
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} settlement`);
      }

      toast.success(
        action === 'accept' 
          ? 'Settlement accepted successfully!' 
          : 'Dispute submitted successfully!'
      );
      
      onClose();
    } catch (error) {
      console.error(`Error ${action}ing settlement:`, error);
      toast.error(`Failed to ${action} settlement`);
    } finally {
      setValidating(false);
    }
  };

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
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              Settlement Validation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : settlementStatus ? (
              <div className="space-y-6">
                {/* Prediction Info */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">{predictionTitle}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Pool: ${settlementStatus.prediction.pool_total.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        settlementStatus.prediction.status === 'settled' 
                          ? 'bg-emerald-100 text-emerald-800'
                          : settlementStatus.prediction.status === 'disputed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {settlementStatus.prediction.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Your Entry */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Your Entry</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Staked:</span>
                      <span className="font-medium">${settlementStatus.userEntry.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${
                        settlementStatus.userEntry.status === 'won' ? 'text-emerald-600' :
                        settlementStatus.userEntry.status === 'lost' ? 'text-red-600' :
                        settlementStatus.userEntry.status === 'refunded' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {settlementStatus.userEntry.status}
                      </span>
                    </div>
                    {settlementStatus.userEntry.actual_payout > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payout:</span>
                        <span className="font-medium text-emerald-600">
                          ${settlementStatus.userEntry.actual_payout.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Settlement Info */}
                {settlementStatus.settlement ? (
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Settlement Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Payout:</span>
                        <span className="font-medium">${settlementStatus.settlement.total_payout.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Settled At:</span>
                        <span className="font-medium">
                          {new Date(settlementStatus.settlement.settlement_time).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : settlementStatus.needsSettlement ? (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <h4 className="font-medium text-yellow-900">Awaiting Settlement</h4>
                    </div>
                    <p className="text-sm text-yellow-800">
                      This prediction is waiting for the creator to provide settlement details.
                    </p>
                  </div>
                ) : null}

                {/* Validation Actions */}
                {settlementStatus.canValidate && settlementStatus.settlement && !showDisputeForm && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Validate Settlement</h4>
                    <p className="text-sm text-gray-600">
                      Do you agree with this settlement outcome?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleValidation('accept')}
                        disabled={validating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => setShowDisputeForm(true)}
                        disabled={validating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Dispute
                      </button>
                    </div>
                  </div>
                )}

                {/* Dispute Form */}
                {showDisputeForm && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Dispute Settlement</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Dispute
                      </label>
                      <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Please explain why you disagree with this settlement..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDisputeForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleValidation('dispute')}
                        disabled={validating || !disputeReason.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Submit Dispute
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Failed to load settlement information</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettlementValidationModal;
