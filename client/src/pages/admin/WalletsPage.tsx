import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config';
import { Wallet, Search, Loader2, User, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface UserResult {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
}

export const WalletsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    if (!user?.id) return;
    
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `${getApiUrl()}/api/v2/admin/users/search?q=${encodeURIComponent(query.trim())}&limit=25&actorId=${encodeURIComponent(user.id)}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.items || []);
    } catch (e) {
      console.error('[WalletsPage] Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, user?.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Wallet className="w-7 h-7 text-emerald-500" />
          Wallet Management
        </h1>
        <p className="text-slate-400 mt-1">Search users to view their wallet details</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by email, username, or user ID..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          Search
        </button>
      </div>

      {/* Results */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {!searched ? (
          <div className="p-12 text-center">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">Search for a user</p>
            <p className="text-slate-400 text-sm mt-1">
              Enter an email, username, or user ID to view their wallet
            </p>
          </div>
        ) : loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-slate-400 mt-3">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">No users found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => navigate(`/admin/wallets/${user.id}`)}
                className="w-full px-4 py-3 hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {user.fullName || user.username || 'Unknown User'}
                    </p>
                    <p className="text-sm text-slate-400">
                      {user.email || user.id.slice(0, 8) + '...'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletsPage;

