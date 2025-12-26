import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, DollarSign, Users, Clock } from 'lucide-react';
import { getApiUrl } from '../../config';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { toast } from 'react-hot-toast';

interface SettlementValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictionId: string;
  predictionTitle: string;
  onValidated?: () => void;
}

interface SettlementStatus {
  prediction: {
    id: string;
    title: string;
    status: string;
    pool_total: number;
    creator_id?: string;
  };
  userEntry: {
    id: string;
    option_id: string;
    amount: number;
    status: string;
    actual_payout: number;
    provider?: string | null;
  };
  settlement: {
    winning_option_id: string;
    total_payout: number;
    settlement_time: string;
  } | null;
  canValidate: boolean;
  needsSettlement: boolean;
}

type FinalizeJobStatus = 'queued' | 'running' | 'finalized' | 'failed';
type FinalizeStatusResponse = {
  success: boolean;
  data: {
    status: FinalizeJobStatus | null;
    txHash: string | null;
    error: string | null;
    job: any | null;
  };
};

const SettlementValidationModal: React.FC<SettlementValidationModalProps> = ({
  isOpen,
  onClose,
  predictionId,
  predictionTitle,
  onValidated,
}) => {
  const [settlementStatus, setSettlementStatus] = useState<SettlementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [history, setHistory] = useState<null | { items: any[]; summary: { accepts: number; disputes: number; pendingDisputes: number; lastActionAt: string | null } }>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [finalizeStatus, setFinalizeStatus] = useState<FinalizeStatusResponse['data'] | null>(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [finalizeSubmitting, setFinalizeSubmitting] = useState(false);
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const userId = sessionUser?.id || user?.id;

  useEffect(() => {
    if (isOpen && userId) {
      fetchSettlementStatus();
      fetchHistory();
      fetchFinalizeStatus();
    }
  }, [isOpen, userId, predictionId]);

  const fetchSettlementStatus = async () => {
    try {
      setLoading(true);
      setStatusError(null);
      const response = await fetch(
        `${getApiUrl()}/api/v2/settlement/${predictionId}/status?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 403) {
        setSettlementStatus(null);
        setStatusError('You are not a participant in this prediction, so you cannot validate this settlement.');
        return;
      }

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || 'Failed to fetch settlement status');
      }

      const data = await response.json();
      setSettlementStatus(data.data);
    } catch (error) {
      console.error('Error fetching settlement status:', error);
      const message = error instanceof Error ? error.message : 'Failed to load settlement information';
      setSettlementStatus(null);
      setStatusError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await fetch(
        `${getApiUrl()}/api/v2/settlement/${predictionId}/history?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 403) {
        setHistory(null);
        setHistoryError('Only participants can view settlement history.');
        return;
      }

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || 'Failed to fetch settlement history');
      }

      const data = await response.json();
      setHistory(data.data || null);
    } catch (error) {
      console.error('Error fetching settlement history:', error);
      const message = error instanceof Error ? error.message : 'Failed to load settlement history';
      setHistory(null);
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchFinalizeStatus = async () => {
    if (!userId) return;
    try {
      setFinalizeLoading(true);
      const res = await fetch(`${getApiUrl()}/api/v2/settlement/${predictionId}/finalize/status?userId=${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to load finalization status');
      }
      const data: FinalizeStatusResponse = await res.json();
      setFinalizeStatus(data.data);
    } catch (e) {
      console.warn('Error fetching finalization status:', e);
      setFinalizeStatus(null);
    } finally {
      setFinalizeLoading(false);
    }
  };

  const handleRequestFinalize = async () => {
    if (!userId) return;
    try {
      setFinalizeSubmitting(true);
      const res = await fetch(`${getApiUrl()}/api/v2/settlement/${predictionId}/request-finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to request finalization');
      }
      toast.success('Submitted. Admin will finalize on-chain.');
      await fetchFinalizeStatus();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit for finalization');
    } finally {
      setFinalizeSubmitting(false);
    }
  };

  const handleAdminFinalize = async () => {
    if (!userId) return;
    try {
      setFinalizeSubmitting(true);
      let adminKey = localStorage.getItem('fcz_admin_key') || '';
      if (!adminKey) {
        const entered = window.prompt('Enter admin key');
        if (!entered) {
          setFinalizeSubmitting(false);
          return;
        }
        adminKey = entered.trim();
        localStorage.setItem('fcz_admin_key', adminKey);
      }

      const res = await fetch(`${getApiUrl()}/api/v2/admin/settlement/${predictionId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({ actorId: userId }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Finalization failed');
      }
      toast.success('Finalized on-chain.');
      await Promise.all([fetchFinalizeStatus(), fetchSettlementStatus()]);
      onValidated?.();
    } catch (e: any) {
      toast.error(e?.message || 'Finalization failed, admin retry required.');
      await fetchFinalizeStatus();
    } finally {
      setFinalizeSubmitting(false);
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
            userId,
            action,
            reason: action === 'dispute' ? disputeReason : undefined
          }),
        }
      );

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Failed to ${action} settlement`);
      }

      toast.success(
        action === 'accept' 
          ? 'Settlement accepted successfully!' 
          : 'Dispute submitted successfully!'
      );

      // Refresh modal state (status + timeline) so changes reflect immediately
      await Promise.all([fetchSettlementStatus(), fetchHistory()]);

      onValidated?.();
      onClose();
    } catch (error) {
      console.error(`Error ${action}ing settlement:`, error);
      const message = error instanceof Error ? error.message : `Failed to ${action} settlement`;
      toast.error(message);
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
            ) : statusError && !settlementStatus ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">{statusError}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
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

                {/* Finalization Status */}
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2">Finalization Status</h4>
                  {finalizeLoading ? (
                    <div className="text-sm text-gray-600">Loading finalization status…</div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-gray-900">
                          {finalizeStatus?.status ?? '—'}
                        </span>
                      </div>
                      {!!finalizeStatus?.txHash && (
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-600">Tx Hash:</span>
                          <span className="font-medium text-gray-900 truncate">
                            {finalizeStatus.txHash}
                          </span>
                        </div>
                      )}
                      {finalizeStatus?.status === 'failed' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-900">Finalization failed, admin retry required.</p>
                        </div>
                      )}
                      <div className="text-xs text-gray-600">
                        {settlementStatus.userEntry.provider === 'demo-wallet'
                          ? 'Demo payouts are credited instantly after settlement is finalized.'
                          : 'Crypto payouts are claimed on-chain after finalization. Connect wallet to claim.'}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    {settlementStatus.prediction.creator_id && settlementStatus.prediction.creator_id === userId && (
                      <button
                        onClick={handleRequestFinalize}
                        disabled={finalizeSubmitting}
                        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Submit Settlement for Finalization
                      </button>
                    )}

                    {/* Admin-only: shown when an admin key exists (or prompt on click) */}
                    <button
                      onClick={handleAdminFinalize}
                      disabled={finalizeSubmitting}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Finalize On-Chain
                    </button>
                  </div>
                </div>

                {/* Status History */}
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <h4 className="font-medium text-gray-900 mb-2">Status History</h4>

                  {historyLoading ? (
                    <div className="text-sm text-gray-600">Loading history…</div>
                  ) : historyError ? (
                    <div className="text-sm text-gray-700">{historyError}</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
                        <span>Accepts: <span className="font-semibold text-gray-900">{history?.summary?.accepts ?? 0}</span></span>
                        <span>Disputes: <span className="font-semibold text-gray-900">{history?.summary?.disputes ?? 0}</span> (Pending: <span className="font-semibold text-gray-900">{history?.summary?.pendingDisputes ?? 0}</span>)</span>
                        <span>Last action: <span className="font-semibold text-gray-900">{history?.summary?.lastActionAt ? new Date(history.summary.lastActionAt).toLocaleString() : '—'}</span></span>
                      </div>

                      {Array.isArray(history?.items) && history.items.length > 0 ? (
                        <div className="space-y-2">
                          {history.items.map((item: any) => {
                            const isDispute = item.action === 'dispute';
                            const name =
                              item?.user?.full_name ||
                              item?.user?.username ||
                              (typeof item.user_id === 'string' && item.user_id.length > 10
                                ? `${item.user_id.slice(0, 6)}…${item.user_id.slice(-4)}`
                                : item.user_id);
                            return (
                              <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        isDispute ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {isDispute ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                        {isDispute ? 'Disputed' : 'Accepted'}
                                      </span>
                                      {item.status && (
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                          item.status === 'pending' ? 'bg-gray-100 text-gray-800' : 'bg-emerald-50 text-emerald-800'
                                        }`}>
                                          {item.status}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-900 font-medium truncate mt-1">{name || 'Unknown user'}</div>
                                    <div className="text-xs text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</div>
                                    {isDispute && item.reason && (
                                      <p
                                        className="text-xs text-gray-700 mt-2"
                                        style={{
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical' as any,
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {item.reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">No actions yet.</div>
                      )}
                    </>
                  )}
                </div>

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
