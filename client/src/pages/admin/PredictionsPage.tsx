import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config';
import { useAuthStore } from '../../store/authStore';
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

interface PredictionResult {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  endDate: string | null;
  creatorUsername: string | null;
  creatorName: string | null;
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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [results, setResults] = useState<PredictionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      if (!user?.id) throw new Error('Missing user');
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      params.set('limit', '50');
      params.set('actorId', user.id);

      const res = await fetch(`${getApiUrl()}/api/v2/admin/predictions?${params.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('[PredictionsPage] Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, user?.id]);

  useEffect(() => {
    fetchPredictions();
  }, [statusFilter]);

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
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="settled">Settled</option>
            <option value="voided">Voided</option>
            <option value="cancelled">Cancelled</option>
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
              const config = statusConfig[p.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/predictions/${p.id}`)}
                  className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{p.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      by {p.creatorName || p.creatorUsername || 'Unknown'} •{' '}
                      {new Date(p.createdAt).toLocaleDateString()}
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

