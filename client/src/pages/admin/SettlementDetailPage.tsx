import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  BarChart3,
  ArrowLeft,
  Loader2,
  User,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  ExternalLink,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet, adminPost } from '@/lib/adminApi';

interface SettlementDetail {
  prediction: {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    endDate: string;
    resolutionDate: string | null;
    winningOptionId: string | null;
    platformFee: number;
    creatorFee: number;
  };
  creator: {
    id: string;
    username: string | null;
    fullName: string | null;
    email: string | null;
  } | null;
  options: Array<{
    id: string;
    text: string;
    odds: number;
    probability: number;
  }>;
  entryStats: {
    total: number;
    totalStake: number;
    byOption: Record<string, { count: number; stake: number }>;
    byProvider: Record<string, { count: number; stake: number }>;
  };
  job: {
    id: string;
    status: string;
    tx_hash: string | null;
    error: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  settlement: any;
  payouts: Array<{
    id: string;
    user_id: string;
    amount: number;
    status: string;
    created_at: string;
    channel: string;
    provider: string;
  }>;
}

export const SettlementDetailPage: React.FC = () => {
  const { predictionId } = useParams<{ predictionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [data, setData] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [selectedWinningOption, setSelectedWinningOption] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!predictionId) return;
    setLoading(true);
    try {
      if (!actorId) throw new Error('Missing user');
      const json = await adminGet<any>(`/api/v2/admin/settlements/${predictionId}`, actorId);
      setData(json);
    } catch (e) {
      console.error('[SettlementDetail] Fetch error:', e);
      toast.error('Failed to load settlement');
    } finally {
      setLoading(false);
    }
  }, [predictionId, actorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrigger = async () => {
    if (!predictionId || !actorId || !selectedWinningOption) return;
    setActionLoading(true);
    try {
      await adminPost<any>(`/api/v2/admin/settlements/${predictionId}/trigger`, actorId, {
        winningOptionId: selectedWinningOption,
      });
      toast.success('Settlement triggered');
      setShowTriggerModal(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to trigger settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!predictionId || !actorId) return;
    setActionLoading(true);
    try {
      await adminPost<any>(`/api/v2/admin/settlements/${predictionId}/retry`, actorId, {});
      toast.success('Settlement retry queued');
      fetchData();
    } catch (e) {
      toast.error('Failed to retry settlement');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-white font-medium">Settlement not found</p>
      </div>
    );
  }

  const { prediction, creator, options, entryStats, job, payouts } = data;
  const isPending = prediction.status === 'active' && new Date(prediction.endDate) < new Date();
  const canTrigger = isPending && !prediction.winningOptionId;
  const canRetry = job?.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/settlements')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settlements
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-emerald-500" />
            {prediction.title}
          </h1>
          <p className="text-slate-400 mt-1 font-mono text-sm">{prediction.id}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            prediction.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' :
            prediction.status === 'settled' ? 'bg-blue-600/20 text-blue-400' :
            'bg-slate-600/20 text-slate-400'
          }`}>
            {prediction.status}
          </div>

          {/* Job Status Badge */}
          {job && (
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 ${
              job.status === 'queued' ? 'bg-amber-600/20 text-amber-400' :
              job.status === 'running' ? 'bg-blue-600/20 text-blue-400' :
              job.status === 'finalized' ? 'bg-emerald-600/20 text-emerald-400' :
              'bg-red-600/20 text-red-400'
            }`}>
              {job.status === 'running' && <RefreshCw className="w-3 h-3 animate-spin" />}
              Job: {job.status}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Total Stake</span>
          </div>
          <p className="text-2xl font-bold text-white">${entryStats.totalStake.toFixed(2)}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Entries</span>
          </div>
          <p className="text-2xl font-bold text-white">{entryStats.total}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">End Date</span>
          </div>
          <p className="text-lg font-medium text-white">
            {new Date(prediction.endDate).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <span className="text-sm">Fees</span>
          </div>
          <p className="text-lg font-medium text-white">
            Platform: {prediction.platformFee}% • Creator: {prediction.creatorFee}%
          </p>
        </div>
      </div>

      {/* Options with Stakes */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-700">
          <h2 className="text-white font-semibold">Options & Stakes</h2>
        </div>
        <div className="divide-y divide-slate-700">
          {options.map((opt) => {
            const stats = entryStats.byOption[opt.id] || { count: 0, stake: 0 };
            const isWinner = prediction.winningOptionId === opt.id;
            return (
              <div
                key={opt.id}
                className={`px-4 py-3 flex items-center justify-between ${
                  isWinner ? 'bg-emerald-600/10 border-l-4 border-emerald-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {isWinner && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                  <div>
                    <p className="text-white font-medium">{opt.text}</p>
                    <p className="text-sm text-slate-400">
                      {stats.count} entries • Odds: {opt.odds?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">${stats.stake.toFixed(2)}</p>
                  <p className="text-sm text-slate-400">
                    {entryStats.totalStake > 0 
                      ? ((stats.stake / entryStats.totalStake) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stakes by Provider */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Stakes by Provider</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(entryStats.byProvider).map(([provider, stats]) => (
            <div key={provider} className="bg-slate-900 rounded-lg p-3">
              <p className={`text-xs font-medium uppercase ${
                provider === 'demo-wallet' ? 'text-purple-400' : 'text-blue-400'
              }`}>
                {provider === 'demo-wallet' ? 'Demo' : provider}
              </p>
              <p className="text-white font-bold text-lg mt-1">${stats.stake.toFixed(2)}</p>
              <p className="text-slate-400 text-sm">{stats.count} entries</p>
            </div>
          ))}
        </div>
      </div>

      {/* Job Details */}
      {job && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Settlement Job</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`font-medium ${
                job.status === 'finalized' ? 'text-emerald-400' :
                job.status === 'failed' ? 'text-red-400' :
                'text-amber-400'
              }`}>
                {job.status}
              </span>
            </div>
            {job.tx_hash && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Transaction</span>
                <button
                  onClick={() => copyToClipboard(job.tx_hash!)}
                  className="text-blue-400 font-mono text-sm flex items-center gap-1 hover:text-blue-300"
                >
                  {job.tx_hash.slice(0, 10)}...{job.tx_hash.slice(-8)}
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
            {job.error && (
              <div>
                <span className="text-slate-400 text-sm">Error</span>
                <p className="text-red-400 text-sm mt-1 bg-red-600/10 rounded p-2">
                  {job.error}
                </p>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Created</span>
              <span className="text-slate-300">{new Date(job.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payouts */}
      {payouts.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white font-semibold">Payouts ({payouts.length})</h2>
          </div>
          <div className="divide-y divide-slate-700 max-h-[300px] overflow-y-auto">
            {payouts.map((p) => (
              <div key={p.id} className="px-4 py-2 flex items-center justify-between text-sm">
                <div>
                  <span className="text-white font-mono text-xs">
                    {p.user_id.slice(0, 8)}...
                  </span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    p.channel === 'payout' ? 'bg-emerald-600/20 text-emerald-400' :
                    p.channel === 'creator_fee' ? 'bg-blue-600/20 text-blue-400' :
                    'bg-purple-600/20 text-purple-400'
                  }`}>
                    {p.channel}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-white font-medium">${Number(p.amount).toFixed(2)}</span>
                  <span className={`ml-2 text-xs ${
                    p.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Admin Actions</h3>
        <div className="flex flex-wrap gap-3">
          {canTrigger && (
            <button
              onClick={() => setShowTriggerModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Trigger Settlement
            </button>
          )}

          {canRetry && (
            <button
              onClick={handleRetry}
              disabled={actionLoading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Retry Settlement
            </button>
          )}

          <button
            onClick={() => navigate(`/admin/predictions/${prediction.id}`)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
          >
            View Prediction
            <ExternalLink className="w-4 h-4" />
          </button>

          {creator && (
            <button
              onClick={() => navigate(`/admin/users/${creator.id}`)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              View Creator
            </button>
          )}
        </div>
      </div>

      {/* Trigger Modal */}
      {showTriggerModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Trigger Settlement</h3>
            <p className="text-slate-400 mb-4">
              Select the winning option to settle this prediction.
            </p>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Winning Option
            </label>
            <select
              value={selectedWinningOption}
              onChange={(e) => setSelectedWinningOption(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select option...</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.text}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowTriggerModal(false); setSelectedWinningOption(''); }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleTrigger}
                disabled={!selectedWinningOption || actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Trigger Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementDetailPage;

