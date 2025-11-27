import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, CheckCircle, XCircle, ExternalLink, User, Calendar, FileText } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { getApiUrl } from '@/utils/environment';

interface Dispute {
  id: string;
  reason: string;
  evidence_url: string | null;
  created_at: string;
  status: string;
  user: {
    username: string;
    email: string;
  };
  prediction: {
    id: string;
    title: string;
  };
}

interface DisputeModalProps {
  dispute: Dispute;
  onClose: () => void;
  onResolve: (disputeId: string, resolution: 'approved' | 'rejected', reason: string, newWinningOptionId?: string) => void;
}

const DisputeModal: React.FC<DisputeModalProps> = ({ dispute, onClose, onResolve }) => {
  const [resolution, setResolution] = useState<'approved' | 'rejected'>('rejected');
  const [resolutionReason, setResolutionReason] = useState('');
  const [newWinningOptionId, setNewWinningOptionId] = useState('');
  const [predictionOptions, setPredictionOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (resolution === 'approved') {
      fetchPredictionOptions();
    }
  }, [resolution, dispute.prediction.id]);

  const fetchPredictionOptions = async () => {
    try {
      setLoadingOptions(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v2/predictions/${dispute.prediction.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPredictionOptions(data.prediction?.options || []);
      }
    } catch (error) {
      console.error('Error fetching prediction options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleResolve = async () => {
    if (!resolutionReason || (resolution === 'approved' && !newWinningOptionId)) return;
    
    setIsResolving(true);
    try {
      await onResolve(dispute.id, resolution, resolutionReason, newWinningOptionId || undefined);
      onClose();
    } catch (error) {
      console.error('Resolution failed:', error);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resolve Dispute</h2>
              <p className="text-sm text-gray-600 mt-1">Review and decide on this dispute</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Dispute Details */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Dispute Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-red-600" />
                    <span className="text-red-800">Submitted by: {dispute.user.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-red-600" />
                    <span className="text-red-800">
                      {new Date(dispute.created_at).toLocaleDateString()} at {new Date(dispute.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-red-600" />
                    <span className="text-red-800">Prediction: {dispute.prediction.title}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dispute Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dispute Reason
            </label>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-900">
              {dispute.reason}
            </div>
          </div>

          {/* Evidence */}
          {dispute.evidence_url && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence Provided
              </label>
              <a
                href={dispute.evidence_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <ExternalLink size={14} />
                View Evidence
              </a>
            </div>
          )}

          {/* Resolution Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Resolution Decision *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all
                  ${resolution === 'rejected'
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => setResolution('rejected')}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${resolution === 'rejected'
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300'
                    }
                  `}>
                    {resolution === 'rejected' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Reject Dispute</div>
                    <div className="text-sm text-gray-600">Maintain current settlement</div>
                  </div>
                </div>
              </div>

              <div
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all
                  ${resolution === 'approved'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => setResolution('approved')}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${resolution === 'approved'
                      ? 'border-teal-500 bg-teal-500'
                      : 'border-gray-300'
                    }
                  `}>
                    {resolution === 'approved' && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Approve Dispute</div>
                    <div className="text-sm text-gray-600">Re-settle with new outcome</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Winning Option (if approved) */}
          {resolution === 'approved' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Winning Option *
              </label>
              {loadingOptions ? (
                <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                  Loading options...
                </div>
              ) : (
                <div className="space-y-2">
                  {predictionOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`
                        border rounded-lg p-3 cursor-pointer transition-all
                        ${newWinningOptionId === option.id
                          ? 'border-teal-500 bg-teal-50 ring-2 ring-green-200'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      onClick={() => setNewWinningOptionId(option.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-4 h-4 rounded-full border-2 flex items-center justify-center
                          ${newWinningOptionId === option.id
                            ? 'border-teal-500 bg-teal-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {newWinningOptionId === option.id && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{option.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resolution Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution Explanation *
            </label>
            <textarea
              value={resolutionReason}
              onChange={(e) => setResolutionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-teal-500"
              rows={4}
              placeholder="Explain your decision and any actions taken..."
              minLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              This explanation will be shared with the disputing user.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={
              !resolutionReason || 
              resolutionReason.length < 10 || 
              (resolution === 'approved' && !newWinningOptionId) ||
              isResolving
            }
            className={`
              px-6 py-2 rounded-lg font-medium transition-all
              ${resolutionReason && resolutionReason.length >= 10 && 
                (resolution === 'rejected' || newWinningOptionId) && !isResolving
                ? (resolution === 'approved' 
                   ? 'bg-teal-600 hover:bg-green-700 text-white'
                   : 'bg-red-600 hover:bg-red-700 text-white')
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isResolving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              `${resolution === 'approved' ? 'Approve' : 'Reject'} Dispute`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const DisputeResolution: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiBase = getApiUrl();
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBase}/api/v2/settlement/disputes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch disputes');
      }

      const data = await response.json();
      setDisputes(data.disputes || []);
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async (
    disputeId: string, 
    resolution: 'approved' | 'rejected', 
    reason: string, 
    newWinningOptionId?: string
  ) => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = getApiUrl();
      const response = await fetch(`${apiBase}/api/v2/settlement/resolve-dispute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disputeId,
          resolution,
          resolutionReason: reason,
          newWinningOptionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Resolution failed');
      }

      // Refresh the list
      await fetchDisputes();
    } catch (error) {
      console.error('Resolution error:', error);
      throw error;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just submitted';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Disputes</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchDisputes}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (disputes.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-teal-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Open Disputes</h3>
        <p className="text-gray-600">All disputes have been resolved. Great work!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => (
        <div
          key={dispute.id}
          className="border border-red-200 bg-red-50 rounded-lg p-6 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-red-500" size={20} />
                <h3 className="text-lg font-semibold text-gray-900">
                  Dispute: {dispute.prediction.title}
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  OPEN
                </span>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>By {dispute.user.username}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{formatTimeAgo(dispute.created_at)}</span>
                </div>
                {dispute.evidence_url && (
                  <div className="flex items-center gap-1">
                    <FileText size={14} />
                    <span>Evidence provided</span>
                  </div>
                )}
              </div>

              {/* Dispute Reason Preview */}
              <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                <p className="text-gray-900 line-clamp-3">
                  {dispute.reason}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-6">
              <button
                onClick={() => setSelectedDispute(dispute)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Resolve
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <DisputeModal
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolve={handleResolveDispute}
        />
      )}
    </div>
  );
};
