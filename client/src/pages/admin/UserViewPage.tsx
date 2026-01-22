import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGet } from '@/lib/adminApi';

type TabKey = 'active' | 'complete' | 'created' | 'activity';

export const UserViewPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('active');

  const [summary, setSummary] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [s, p, a] = await Promise.all([
        adminGet<any>(`/api/v2/admin/users/${userId}/summary`, ''),
        adminGet<any>(`/api/v2/admin/users/${userId}/predictions`, ''),
        adminGet<any>(`/api/v2/admin/users/${userId}/activity`, '', { limit: 100 }),
      ]);
      setSummary(s);
      setPredictions(p);
      setActivity(a.items || []);
    } catch (e: any) {
      console.error('[Admin/UserView] fetch error', e);
      toast.error(e?.message || 'Failed to load user view');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const userLabel = useMemo(() => {
    const u = summary?.user;
    return u?.fullName || u?.username || u?.email || (userId ? `${userId.slice(0, 8)}…` : 'User');
  }, [summary, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!summary?.user) {
    return (
      <div className="text-center py-20">
        <p className="text-white font-medium">User not found</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
        >
          Back to Users
        </button>
      </div>
    );
  }

  const wallet = summary.wallet;

  const tabItems: Array<{ key: TabKey; label: string }> = [
    { key: 'active', label: 'Active' },
    { key: 'complete', label: 'Complete' },
    { key: 'created', label: 'Created' },
    { key: 'activity', label: 'Activity' },
  ];

  const listForTab = (key: TabKey): any[] => {
    if (!predictions) return [];
    if (key === 'active') return predictions.active || [];
    if (key === 'complete') return predictions.complete || [];
    if (key === 'created') return predictions.created || [];
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(`/admin/users/${userId}`)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to User
      </button>

      {/* Banner */}
      <div className="bg-amber-600/20 border border-amber-600/30 rounded-xl p-4 flex items-start gap-3">
        <Eye className="w-5 h-5 text-amber-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-white font-semibold">Admin view (read-only)</p>
          <p className="text-slate-300 text-sm">
            You are viewing the user experience in read-only mode. No staking/cancelling/editing actions are available.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-white font-semibold">{userLabel}</p>
            <p className="text-slate-500 text-xs font-mono">userId: {summary.user.id}</p>
          </div>
          <button
            onClick={() => fetchAll()}
            className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Wallet snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Demo balance</p>
          <p className="text-white text-xl font-bold">${Number(wallet?.availableBalance || 0).toFixed(2)}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Crypto balance</p>
          <p className="text-white text-xl font-bold">—</p>
          <p className="text-slate-500 text-xs mt-1">Placeholder (depends on escrow/chain model)</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Fiat balance</p>
          <p className="text-white text-xl font-bold">—</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabItems.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === t.key ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'activity' ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {activity.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No activity found</div>
          ) : (
            <div className="divide-y divide-slate-700">
              {activity.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{a.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {a.rail?.toUpperCase?.() || '—'} • {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">
                        {typeof a.amount === 'number' ? `$${Math.abs(a.amount).toFixed(2)}` : '—'}
                      </p>
                    </div>
                  </div>
                  {a.href && (
                    <button
                      onClick={() => navigate(a.href)}
                      className="mt-2 text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Open
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {listForTab(tab).length === 0 ? (
            <div className="p-8 text-center text-slate-400">No items</div>
          ) : (
            <div className="divide-y divide-slate-700">
              {listForTab(tab).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/admin/predictions/${p.id}`)}
                  className="w-full px-4 py-3 hover:bg-slate-700/40 transition-colors text-left"
                >
                  <p className="text-white font-medium">{p.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    status: {p.status} • id: {String(p.id).slice(0, 8)}…
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserViewPage;

