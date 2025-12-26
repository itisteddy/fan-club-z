import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config';
import { useAuthStore } from '../../store/authStore';
import {
  BarChart3,
  Search,
  Loader2,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Filter,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SettlementItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  endDate: string;
  resolutionDate: string | null;
  winningOptionId: string | null;
  creatorUsername: string | null;
  entryCount: number;
  settlementJob: {
    id: string;
    status: string;
    tx_hash: string | null;
    error: string | null;
    created_at: string;
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
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) throw new Error('Missing user');
      const [settlementsRes, statsRes] = await Promise.all([
        fetch(`${getApiUrl()}/api/v2/admin/settlements?status=${filter}&limit=50&actorId=${encodeURIComponent(user.id)}`),
        fetch(`${getApiUrl()}/api/v2/admin/settlements/stats?actorId=${encodeURIComponent(user.id)}`),
      ]);

      if (settlementsRes.ok) {
        const data = await settlementsRes.json();
        setSettlements(data.items || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (e) {
      console.error('[SettlementsPage] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [filter, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (predictionId: string) => {
    if (!user?.id) return;
    setActionLoading(predictionId);
    try {
      const res = await fetch(`${getApiUrl()}/api/v2/admin/settlements/${predictionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: user.id }),
      });
      if (!res.ok) throw new Error('Retry failed');
      toast.success('Settlement retry queued');
      fetchData();
    } catch (e) {
      toast.error('Failed to retry settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const getJobStatusBadge = (job: SettlementItem['settlementJob']) => {
    if (!job) return null;
    
    const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
      queued: { icon: Clock, color: 'text-amber-400 bg-amber-600/20' },
      running: { icon: RefreshCw, color: 'text-blue-400 bg-blue-600/20' },
      finalized: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-600/20' },
      failed: { icon: XCircle, color: 'text-red-400 bg-red-600/20' },
    };

    const config = statusConfig[job.status] || statusConfig.queued;
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
      <div className="flex gap-2">
        {(['pending', 'settled', 'active', 'all'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f === 'pending' ? 'Pending Settlement' : f}
          </button>
        ))}
      </div>

      {/* Settlements List */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-slate-400 mt-3">Loading settlements...</p>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">No settlements found</p>
            <p className="text-slate-400 text-sm mt-1">
              {filter === 'pending' ? 'No predictions pending settlement' : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {settlements.map((s) => (
              <div
                key={s.id}
                className="px-4 py-3 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium truncate">{s.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' :
                        s.status === 'settled' ? 'bg-blue-600/20 text-blue-400' :
                        'bg-slate-600/20 text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                      {getJobStatusBadge(s.settlementJob)}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {s.entryCount} entries • by {s.creatorUsername || 'Unknown'} •
                      End: {new Date(s.endDate).toLocaleDateString()}
                    </p>
                    {s.settlementJob?.error && (
                      <p className="text-xs text-red-400 mt-1 truncate">
                        Error: {s.settlementJob.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {s.settlementJob?.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(s.id)}
                        disabled={actionLoading === s.id}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/admin/settlements/${s.id}`)}
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

