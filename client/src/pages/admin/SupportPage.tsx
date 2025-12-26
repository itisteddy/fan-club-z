import React, { useState, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  HeadphonesIcon,
  Search,
  Loader2,
  User,
  Target,
  Receipt,
  ArrowRight,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet } from '@/lib/adminApi';

interface SearchResults {
  users: Array<{ id: string; username: string | null; full_name: string | null; email: string | null }>;
  predictions: Array<{ id: string; title: string; status: string; created_at: string }>;
  transactions: Array<{ id: string; user_id: string; amount: number; channel: string; tx_hash: string }>;
}

export const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.length < 2) {
      toast.error('Query must be at least 2 characters');
      return;
    }
    if (!actorId) return;

    setLoading(true);
    setSearched(true);
    try {
      const data = await adminGet<any>(`/api/v2/admin/support/search`, actorId, { q: query.trim() });
      setResults(data.results);
    } catch (e) {
      console.error('[SupportPage] Search error:', e);
      toast.error('Search failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [query, actorId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const totalResults = results 
    ? results.users.length + results.predictions.length + results.transactions.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <HeadphonesIcon className="w-7 h-7 text-emerald-500" />
          Support Center
        </h1>
        <p className="text-slate-400 mt-1">Search users, predictions, and transactions for investigation</p>
      </div>

      {/* Search */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Global Search</h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by user ID, email, username, prediction ID, tx hash..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || query.length < 2}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            Search
          </button>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          Tip: You can search by UUID, email address, username, prediction title, or transaction hash (0x...)
        </p>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
              <p className="text-slate-400 mt-3">Searching...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-medium">No results found</p>
              <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-sm">{totalResults} result{totalResults !== 1 ? 's' : ''} found</p>

              {/* Users */}
              {results?.users && results.users.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <h3 className="text-white font-semibold">Users ({results.users.length})</h3>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {results.users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                        className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {user.full_name || user.username || 'Unknown'}
                          </p>
                          <p className="text-sm text-slate-400">{user.email || user.id}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions */}
              {results?.predictions && results.predictions.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-semibold">Predictions ({results.predictions.length})</h3>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {results.predictions.map((pred) => (
                      <button
                        key={pred.id}
                        onClick={() => navigate(`/admin/predictions/${pred.id}`)}
                        className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium">{pred.title}</p>
                          <p className="text-sm text-slate-400 flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              pred.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' :
                              pred.status === 'settled' ? 'bg-blue-600/20 text-blue-400' :
                              'bg-slate-600/20 text-slate-400'
                            }`}>
                              {pred.status}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(pred.created_at).toLocaleDateString()}
                            </span>
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              {results?.transactions && results.transactions.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-400" />
                    <h3 className="text-white font-semibold">Transactions ({results.transactions.length})</h3>
                  </div>
                  <div className="divide-y divide-slate-700">
                    {results.transactions.map((tx) => (
                      <button
                        key={tx.id}
                        onClick={() => navigate(`/admin/wallets/${tx.user_id}`)}
                        className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between"
                      >
                        <div>
                          <p className="text-white font-medium">
                            ${Number(tx.amount).toFixed(2)} - {tx.channel}
                          </p>
                          <p className="text-sm text-slate-400 font-mono">
                            {tx.tx_hash?.slice(0, 20)}...
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick Links */}
      {!searched && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:bg-slate-700/50 transition-colors text-left"
          >
            <User className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold">User Management</h3>
            <p className="text-slate-400 text-sm mt-1">Search and manage user accounts</p>
          </button>

          <button
            onClick={() => navigate('/admin/settlements')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:bg-slate-700/50 transition-colors text-left"
          >
            <Target className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="text-white font-semibold">Settlements</h3>
            <p className="text-slate-400 text-sm mt-1">View and manage prediction settlements</p>
          </button>

          <button
            onClick={() => navigate('/admin/wallets')}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:bg-slate-700/50 transition-colors text-left"
          >
            <Receipt className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-white font-semibold">Wallets</h3>
            <p className="text-slate-400 text-sm mt-1">Investigate wallet transactions</p>
          </button>
        </div>
      )}
    </div>
  );
};

export default SupportPage;

