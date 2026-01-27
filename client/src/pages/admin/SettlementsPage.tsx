import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  BarChart3,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet, adminPost } from '@/lib/adminApi';

interface QueueItem {
  predictionId: string;
  title: string;
  status: string;
  closesAt: string | null;
  closedAt: string | null;
  settledAt: string | null;
  settlementStatus: string | null;
  rails: { hasDemo: boolean; hasCrypto: boolean };
  needs: {
    needsOutcome: boolean;
    needsOffchainSettlement: boolean;
    needsOnchainFinalize: boolean;
  };
  job: {
    status: string;
    txHash: string | null;
    error: string | null;
    updatedAt: string | null;
  } | null;
}

interface Stats {
  predictions: {
    active: number;
    pendingSettlement: number;
    settled: number;
    voided: number;
  };
  jobs: {
    queued: number;
    running: number;
    finalized: number;
    failed: number;
  };
  totalStake: number;
  recentSettlements: number;
}

type FilterType = 'all' | 'pending' | 'settled' | 'active';

export const SettlementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [queueData, statsData] = await Promise.all([
        adminGet<any>(`/api/v2/admin/settlements/queue`, actorId),
        adminGet<any>(`/api/v2/admin/settlements/stats`, actorId),
      ]);
      setQueue(queueData.items || []);
      setStats(statsData || null);
    } catch (e) {
      console.error('[SettlementsPage] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    fetchData();
    
    // Listen for settlement completion events from detail page
    const handleSettlementComplete = () => {
      setTimeout(() => fetchData(), 1000); // Refresh after a short delay
    };
    window.addEventListener('settlement-complete', handleSettlementComplete);
    return () => window.removeEventListener('settlement-complete', handleSettlementComplete);
  }, [fetchData]);

  const handleSync = async (predictionId: string) => {
    setActionLoading(predictionId);
    try {
      await adminPost<any>(`/api/v2/admin/settlements/${predictionId}/sync`, actorId, actorId ? { actorId } : {});
      toast.success('Sync queued');
      fetchData();
    } catch (e) {
      toast.error((e as any)?.message || 'Failed to sync');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalize = async (predictionId: string) => {
    if (!window.confirm('Finalize on-chain? This may submit a relayer transaction.')) return;
    setActionLoading(predictionId);
    try {
      await adminPost<any>(`/api/v2/admin/settlements/${predictionId}/finalize`, actorId, actorId ? { actorId } : {});
      toast.success('Finalize submitted');
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to finalize');
    } finally {
      setActionLoading(null);
    }
  };

  const getNeedsChips = (item: QueueItem) => {
    const chips: Array<{ label: string; cls: string }> = [];
    if (item.needs.needsOutcome) chips.push({ label: 'Outcome', cls: 'bg-amber-600/20 text-amber-400' });
    if (item.needs.needsOffchainSettlement) chips.push({ label: 'Offchain', cls: 'bg-blue-600/20 text-blue-400' });
    if (item.needs.needsOnchainFinalize) chips.push({ label: 'Finalize', cls: 'bg-red-600/20 text-red-400' });
    if (chips.length === 0) chips.push({ label: 'OK', cls: 'bg-emerald-600/20 text-emerald-400' });
    return chips;
  };

  const getJobStatusBadge = (job: QueueItem['job']) => {
    if (!job) return null;
    
    const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
      queued: { icon: Clock, color: 'text-amber-400 bg-amber-600/20' },
      running: { icon: RefreshCw, color: 'text-blue-400 bg-blue-600/20' },
      finalized: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-600/20' },
      failed: { icon: XCircle, color: 'text-red-400 bg-red-600/20' },
    };

    const fallback = statusConfig.queued ?? { icon: Clock, color: 'text-amber-400 bg-amber-600/20' };
    const config = statusConfig[job.status] ?? fallback;
    const Icon = config.icon;

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
        <Icon className={`w-3 h-3 ${job.status === 'running' ? 'animate-spin' : ''}`} />
        {job.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-emerald-500" />
          Settlements
        </h1>
        <p className="text-slate-400 mt-1">Manage prediction settlements and finalization</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm">Pending Settlement</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{stats.predictions.pendingSettlement}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">Settled</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{stats.predictions.settled}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm">Failed Jobs</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.jobs.failed}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Total Staked</span>
            </div>
            <p className="text-2xl font-bold text-white">${stats.totalStake.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="text-slate-400 text-sm">
        Finalize Queue — items needing Outcome, Offchain sync, or Onchain finalize.
      </div>

      {/* Finalize Queue List */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-slate-400 mt-3">Loading queue...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">Queue is empty</p>
            <p className="text-slate-400 text-sm mt-1">
              No predictions need admin settlement attention.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {queue.map((s) => (
              <div
                key={s.predictionId}
                className="px-4 py-3 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium truncate">{s.title}</p>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-600/20 text-slate-300">
                        {s.status}
                      </span>
                      {getJobStatusBadge(s.job)}
                      {getNeedsChips(s).map((c) => (
                        <span key={c.label} className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Rails: {s.rails.hasDemo && s.rails.hasCrypto ? 'Hybrid' : s.rails.hasCrypto ? 'Crypto' : s.rails.hasDemo ? 'Demo' : '—'} •
                      Closes: {s.closesAt ? new Date(s.closesAt).toLocaleDateString() : '—'}
                    </p>
                    {s.job?.error && (
                      <p className="text-xs text-red-400 mt-1 truncate">
                        Error: {s.job.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleSync(s.predictionId)}
                      disabled={actionLoading === s.predictionId || s.needs.needsOutcome}
                      title={s.needs.needsOutcome ? 'Set outcome first (use Details → Set Outcome)' : 'Sync settlement'}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                        s.needs.needsOutcome
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                      }`}
                    >
                      {actionLoading === s.predictionId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Sync
                    </button>

                    {s.needs.needsOnchainFinalize && (
                      <button
                        onClick={() => handleFinalize(s.predictionId)}
                        disabled={actionLoading === s.predictionId}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        Finalize
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/admin/predictions/${s.predictionId}`)}
                      className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 flex items-center gap-1"
                    >
                      Details
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettlementsPage;

