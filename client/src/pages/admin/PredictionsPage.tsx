import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  Target,
  Search,
  Loader2,
  ArrowRight,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Ban,
} from 'lucide-react';
import { adminGet } from '@/lib/adminApi';
import { getPredictionStatusUi } from '@/lib/predictionStatusUi';

interface PredictionResult {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  endDate: string | null;
  closesAt?: string | null;
  settledAt?: string | null;
  creatorUsername: string | null;
  creatorName: string | null;
  railsSummary?: { hasDemo: boolean; hasCrypto: boolean };
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  active: { icon: Clock, color: 'text-emerald-400 bg-emerald-600/20', label: 'Active' },
  pending: { icon: Clock, color: 'text-amber-400 bg-amber-600/20', label: 'Pending' },
  settled: { icon: CheckCircle, color: 'text-blue-400 bg-blue-600/20', label: 'Settled' },
  voided: { icon: XCircle, color: 'text-red-400 bg-red-600/20', label: 'Voided' },
  cancelled: { icon: Ban, color: 'text-slate-400 bg-slate-600/20', label: 'Cancelled' },
};

export const PredictionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [railFilter, setRailFilter] = useState<string>('all');
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGet<{ items?: PredictionResult[]; total?: number }>(
        `/api/v2/admin/predictions`,
        actorId,
        {
          q: query || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          rail: railFilter !== 'all' ? railFilter : undefined,
          limit: 50,
        }
      );
      setResults(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('[PredictionsPage] Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, railFilter, actorId]);

  useEffect(() => {
    fetchPredictions();
  }, [statusFilter, railFilter, fetchPredictions]);

  const handleSearch = () => {
    fetchPredictions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchPredictions();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Target className="w-7 h-7 text-emerald-500" />
          Prediction Management
        </h1>
        <p className="text-slate-400 mt-1">Search and manage predictions</p>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by title or prediction ID..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active (Open)</option>
            <option value="closed">Closed</option>
            <option value="settled">Settled</option>
            <option value="voided">Voided</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={railFilter}
            onChange={(e) => setRailFilter(e.target.value)}
            className="pl-10 pr-8 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Rails</option>
            <option value="demo">Demo</option>
            <option value="crypto">Crypto</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          Search
        </button>
      </div>

      {/* Results Count */}
      {!loading && (
        <p className="text-slate-400 text-sm">{total} prediction{total !== 1 ? 's' : ''} found</p>
      )}

      {/* Results */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-slate-400 mt-3">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">No predictions found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different search term or filter</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {results.map((p) => {
              const fallback = statusConfig.pending ?? {
                icon: Clock,
                color: 'text-amber-400 bg-amber-600/20',
                label: 'Pending',
              };
              const config = statusConfig[p.status] ?? fallback;
              const StatusIcon = config.icon;
              const rails = p.railsSummary || { hasDemo: false, hasCrypto: false };
              const railLabel = rails.hasDemo && rails.hasCrypto ? 'Hybrid' : rails.hasCrypto ? 'Crypto' : rails.hasDemo ? 'Demo' : '—';
              const statusUi = getPredictionStatusUi({
                status: p.status,
                closedAt: p.closesAt || p.endDate || null,
                settledAt: p.settledAt || null,
              });
              const statusTone =
                statusUi.tone === 'success' ? 'text-emerald-400 bg-emerald-600/20' :
                statusUi.tone === 'danger' ? 'text-red-400 bg-red-600/20' :
                statusUi.tone === 'warning' ? 'text-amber-400 bg-amber-600/20' :
                'text-slate-400 bg-slate-600/20';
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/predictions/${p.id}`)}
                  className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{p.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusTone}`}>
                        {statusUi.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-slate-300 bg-slate-700/50">
                        {railLabel}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      by {p.creatorName || p.creatorUsername || 'Unknown'} •{' '}
                      closes {new Date((p.closesAt || p.endDate || p.createdAt) as string).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-3" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionsPage;

