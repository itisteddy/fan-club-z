import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Clock, MessageSquare, Gavel, Users } from 'lucide-react';
import { getApiUrl } from '../../config';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'react-hot-toast';

interface DisputeResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictionId: string;
  predictionTitle: string;
  onResolutionComplete?: () => void;
}

interface Dispute {
  id: string;
  user_id: string;
  user: {
    username: string;
    full_name: string;
  };
  reason: string;
  created_at: string;
  status: 'pending' | 'resolved' | 'rejected';
}

interface DisputeData {
  disputes: Dispute[];
  totalDisputes: number;
  pendingDisputes: number;
}

const DisputeResolutionModal: React.FC<DisputeResolutionModalProps> = ({
  isOpen,
  onClose,
  predictionId,
  predictionTitle,
  onResolutionComplete
}) => {
  const [disputeData, setDisputeData] = useState<DisputeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [selectedAction, setSelectedAction] = useState<'accept' | 'reject' | 'revise' | null>(null);
  const [resolutionReason, setResolutionReason] = useState('');
  const [newWinningOption, setNewWinningOption] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetchDisputes();
    }
  }, [isOpen, predictionId]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/api/v2/settlement/${predictionId}/disputes`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }
      
      const data = await response.json();
      setDisputeData(data.data);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolution = async () => {
    if (!selectedAction || !resolutionReason.trim()) {
      toast.error('Please select an action and provide a reason');
      return;
    }

    try {
      setResolving(true);
      
      const response = await fetch(`${getApiUrl()}/api/v2/settlement/${predictionId}/resolve-disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: selectedAction,
          reason: resolutionReason,
          newWinningOption: selectedAction === 'revise' ? newWinningOption : undefined,
          creatorId: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve disputes');
      }

      toast.success('Disputes resolved successfully!');
      onClose();
      if (onResolutionComplete) {
        onResolutionComplete();
      }
    } catch (error) {
      console.error('Error resolving disputes:', error);
      toast.error('Failed to resolve disputes');
    } finally {
      setResolving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dispute Resolution</h2>
                <p className="text-sm text-gray-600">{predictionTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : disputeData ? (
              <div className="space-y-6">
                {/* Dispute Summary */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">Dispute Summary</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-red-700">Total Disputes:</span>
                      <span className="font-medium ml-2">{disputeData.totalDisputes}</span>
                    </div>
                    <div>
                      <span className="text-red-700">Pending:</span>
                      <span className="font-medium ml-2">{disputeData.pendingDisputes}</span>
                    </div>
                  </div>
                </div>

                {/* Individual Disputes */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Individual Disputes</h3>
                  {disputeData.disputes.map((dispute) => (
                    <div key={dispute.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {dispute.user.full_name || dispute.user.username}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(dispute.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dispute.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          dispute.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {dispute.status}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                          <p className="text-sm text-gray-700">{dispute.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resolution Actions */}
                {disputeData.pendingDisputes > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Resolution Actions</h3>
                    
                    {/* Action Selection */}
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => setSelectedAction('reject')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedAction === 'reject'
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <X className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="font-medium text-gray-900">Reject Disputes</p>
                            <p className="text-sm text-gray-600">Maintain original settlement</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedAction('revise')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedAction === 'revise'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Gavel className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">Revise Settlement</p>
                            <p className="text-sm text-gray-600">Change the winning option</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setSelectedAction('accept')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedAction === 'accept'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-gray-900">Accept Disputes & Refund</p>
                            <p className="text-sm text-gray-600">Refund all participants</p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* New Winning Option (if revising) */}
                    {selectedAction === 'revise' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Winning Option ID
                        </label>
                        <input
                          type="text"
                          value={newWinningOption}
                          onChange={(e) => setNewWinningOption(e.target.value)}
                          placeholder="Enter the correct winning option ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {/* Resolution Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resolution Reason
                      </label>
                      <textarea
                        value={resolutionReason}
                        onChange={(e) => setResolutionReason(e.target.value)}
                        placeholder="Explain your resolution decision..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleResolution}
                        disabled={resolving || !selectedAction || !resolutionReason.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resolving ? 'Resolving...' : 'Resolve Disputes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No dispute data available</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DisputeResolutionModal;
