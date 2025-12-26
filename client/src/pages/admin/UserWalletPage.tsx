import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../config';
import { useAuthStore } from '../../store/authStore';
import {
  Wallet,
  ArrowLeft,
  Download,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Lock,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface WalletData {
  id: string;
  currency: string;
  availableBalance: number;
  reservedBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  updatedAt: string;
}

interface Transaction {
  id: string;
  created_at: string;
  type: string;
  direction: string;
  channel: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  external_ref: string | null;
  prediction_id: string | null;
}

interface EscrowLock {
  id: string;
  amount: number;
  status: string;
  prediction_id: string;
  created_at: string;
  expires_at: string | null;
}

export const UserWalletPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [cryptoTx, setCryptoTx] = useState<Transaction[]>([]);
  const [demoTx, setDemoTx] = useState<Transaction[]>([]);
  const [escrowLocks, setEscrowLocks] = useState<EscrowLock[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<'all' | 'crypto' | 'demo'>('all');
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/api/v2/admin/wallets/user/${userId}?actorId=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error('Failed to fetch wallet data');
      const data = await res.json();
      setWallets(data.wallets || []);
      setCryptoTx(data.recentTransactions?.crypto || []);
      setDemoTx(data.recentTransactions?.demo || []);
      setEscrowLocks(data.escrowLocks || []);
      setAddresses(data.addresses || []);
    } catch (e) {
      console.error('[UserWallet] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    if (!userId) return;
    if (!user?.id) return;
    setExporting(true);
    try {
      const url = `${getApiUrl()}/api/v2/admin/wallets/transactions/export.csv?userId=${userId}&provider=${providerFilter}&limit=500&actorId=${encodeURIComponent(user.id)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `transactions_${userId.slice(0, 8)}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error('[UserWallet] Export error:', e);
    } finally {
      setExporting(false);
    }
  };

  const filteredTx = providerFilter === 'crypto' ? cryptoTx 
    : providerFilter === 'demo' ? demoTx 
    : [...cryptoTx, ...demoTx].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const usdWallet = wallets.find(w => w.currency === 'USD');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/wallets')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Wallets
      </button>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wallet className="w-7 h-7 text-emerald-500" />
            User Wallet
          </h1>
          <p className="text-slate-400 mt-1 font-mono text-sm">{userId}</p>
        </div>
        <button
          onClick={() => navigate(`/admin/users/${userId}`)}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center gap-2"
        >
          View User Profile
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Available</span>
          </div>
          <p className="text-2xl font-bold text-white">
            ${usdWallet?.availableBalance?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm">Reserved</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            ${usdWallet?.reservedBalance?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Deposited</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            ${usdWallet?.totalDeposited?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm">Total Withdrawn</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            ${usdWallet?.totalWithdrawn?.toFixed(2) || '0.00'}
          </p>
        </div>
      </div>

      {/* Crypto Addresses */}
      {addresses.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Crypto Addresses</h3>
          <div className="space-y-2">
            {addresses.map((addr, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-slate-900 rounded-lg px-3 py-2">
                <span className="font-mono text-slate-300">{addr.address}</span>
                <span className="text-slate-500">Chain {addr.chain_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-white font-semibold">Transactions</h2>
          <div className="flex items-center gap-3">
            {/* Filter Chips */}
            <div className="flex gap-1">
              {(['all', 'crypto', 'demo'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProviderFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    providerFilter === filter
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-slate-600 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-700 max-h-[400px] overflow-y-auto">
          {filteredTx.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No transactions found</p>
            </div>
          ) : (
            filteredTx.map((tx) => (
              <div key={tx.id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.direction === 'credit' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                    }`}>
                      {tx.direction === 'credit' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {tx.direction === 'credit' ? '+' : '-'}${Math.abs(Number(tx.amount)).toFixed(2)}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          tx.provider === 'demo-wallet' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                        }`}>
                          {tx.provider === 'demo-wallet' ? 'Demo' : 'Crypto'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tx.channel} • {tx.description || tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      tx.status === 'success' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Escrow Locks */}
      {escrowLocks.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <div className="px-4 py-3 border-b border-slate-700">
            <h2 className="text-white font-semibold">Escrow Locks</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {escrowLocks.map((lock) => (
              <div key={lock.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">${Number(lock.amount).toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{lock.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-mono">
                    {lock.prediction_id?.slice(0, 8)}...
                  </p>
                  {lock.expires_at && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(lock.expires_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserWalletPage;

