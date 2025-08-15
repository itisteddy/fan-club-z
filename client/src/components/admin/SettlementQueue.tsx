import React, { useState, useEffect } from 'react';
import { Clock, Eye, CheckCircle, AlertCircle, ExternalLink, User, DollarSign } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PendingPrediction {
  id: string;
  title: string;
  status: string;
  settlement_method: string;
  created_at: string;
  entry_deadline: string;
  creator: {
    username: string;
    email: string;
  };
  prediction_options: Array<{
    id: string;
    label: string;
    total_staked: number;
  }>;
  prediction_entries: Array<{ count: number }>;
  pool_total?: number;
}

interface SettleModalProps {
  prediction: PendingPrediction;
  onClose: () => void;
  onSettle: (predictionId: string, winningOptionId: string, proofUrl?: string, reason?: string) => void;
}

const SettleModal: React.FC<SettleModalProps> = ({ prediction, onClose, onSettle }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [proofUrl, setProofUrl] = useState('');
  const [reason, setReason] = useState('');
  const [isSettling, setIsSettling] = useState(false);

  const handleSettle = async () => {
    if (!selectedOption || !reason) return;
    
    setIsSettling(true);
    try {
      await onSettle(prediction.id, selectedOption, proofUrl || undefined, reason);
      onClose();
    } catch (error) {
      console.error('Settlement failed:', error);
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Settle Prediction</h2>
              <p className="text-sm text-gray-600 mt-1">Choose the winning outcome</p>
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
          {/* Prediction Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{prediction.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>{prediction.creator.username}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign size={14} />
                <span>${prediction.pool_total?.toFixed(2) || '0.00'} total pool</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Deadline: {new Date(prediction.entry_deadline).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Options Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Winning Option *
            </label>
            <div className="space-y-2">
              {prediction.prediction_options.map((option) => (
                <div
                  key={option.id}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-all
                    ${selectedOption === option.id
                      ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => setSelectedOption(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${selectedOption === option.id
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                        }
                      `}>
                        {selectedOption === option.id && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{option.label}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      ${option.total_staked.toFixed(2)} staked
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proof URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proof URL (Optional)
            </label>
            <input
              type="url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="https://example.com/proof"
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to evidence supporting this outcome (news article, official results, etc.)
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Settlement Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              rows={3}
              placeholder="Explain why this outcome was chosen..."
              minLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters. This will be visible to users.
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
            onClick={handleSettle}
            disabled={!selectedOption || !reason || reason.length < 10 || isSettling}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all
              ${selectedOption && reason && reason.length >= 10 && !isSettling
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSettling ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Settling...</span>
              </div>
            ) : (
              'Settle Prediction'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettlementQueue: React.FC = () => {
  const [predictions, setPredictions] = useState<PendingPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PendingPrediction | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPendingPredictions();
  }, []);

  const fetchPendingPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v2/settlement/pending', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending settlements');
      }

      const data = await response.json();
      setPredictions(data.predictions || []);
    } catch (err) {
      console.error('Error fetching pending predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (predictionId: string, winningOptionId: string, proofUrl?: string, reason?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v2/settlement/settle-manual', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          predictionId,
          winningOptionId,
          proofUrl,
          reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Settlement failed');
      }

      // Refresh the list
      await fetchPendingPredictions();
    } catch (error) {
      console.error('Settlement error:', error);
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
      return 'Just closed';
    }
  };

  const getPriorityLevel = (prediction: PendingPrediction) => {
    const deadlineDate = new Date(prediction.entry_deadline);
    const now = new Date();
    const hoursOverdue = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60));
    
    if (hoursOverdue > 24) return 'high';
    if (hoursOverdue > 12) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/6"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Settlements</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchPendingPredictions}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
        <p className="text-gray-600">No predictions pending settlement right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {predictions.map((prediction) => {
        const priority = getPriorityLevel(prediction);
        const totalEntries = prediction.prediction_entries.reduce((sum, entry) => sum + entry.count, 0);
        const poolTotal = prediction.prediction_options.reduce((sum, option) => sum + option.total_staked, 0);

        return (
          <div
            key={prediction.id}
            className={`
              border rounded-lg p-6 transition-all hover:shadow-md
              ${priority === 'high' ? 'border-red-200 bg-red-50' :
                priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-gray-200 bg-white'
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {prediction.title}
                  </h3>
                  {priority === 'high' && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      URGENT
                    </span>
                  )}
                  {priority === 'medium' && (
                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                      HIGH
                    </span>
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    <span>{prediction.creator.username}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} />
                    <span>${poolTotal.toFixed(2)} pool</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>Closed {formatTimeAgo(prediction.entry_deadline)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={14} />
                    <span>{totalEntries} entries</span>
                  </div>
                </div>

                {/* Options Preview */}
                <div className="space-y-2">
                  {prediction.prediction_options.map((option, index) => (
                    <div key={option.id} className="flex items-center justify-between bg-white bg-opacity-50 rounded px-3 py-2">
                      <span className="font-medium text-gray-900">{option.label}</span>
                      <span className="text-sm text-gray-600">${option.total_staked.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-6">
                <button
                  onClick={() => setSelectedPrediction(prediction)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Settle
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <ExternalLink size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Settlement Modal */}
      {selectedPrediction && (
        <SettleModal
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
          onSettle={handleSettle}
        />
      )}
    </div>
  );
};
