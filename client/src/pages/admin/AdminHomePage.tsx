import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import {
  Users,
  Wallet,
  Target,
  Gavel,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
} from 'lucide-react';
import { adminGet } from '@/lib/adminApi';

interface QuickStats {
  totalUsers?: number;
  activePredictions?: number;
  pendingSettlements?: number;
  totalVolume?: number;
}

export const AdminHomePage: React.FC = () => {
  const [stats, setStats] = useState<QuickStats>({});
  const [recentActions, setRecentActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Admin-key-only mode should work even without a logged-in session userId.
        const [overview, audit] = await Promise.all([
          adminGet<any>(`/api/v2/admin/overview`, actorId),
          adminGet<{ items?: any[] }>(`/api/v2/admin/audit`, actorId, { limit: 5 }),
        ]);
        setStats({
          totalUsers: overview.totalUsers,
          activePredictions: overview.activePredictions,
          pendingSettlements: overview.pendingSettlements,
          totalVolume: overview.totalVolume,
        });
        setRecentActions(audit.items || []);
      } catch (e) {
        console.error('[AdminHome] Failed to fetch data:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [actorId]);

  const quickActions = [
    { label: 'Search Users', path: '/admin/users', icon: Users, color: 'bg-blue-600' },
    { label: 'View Wallets', path: '/admin/wallets', icon: Wallet, color: 'bg-emerald-600' },
    { label: 'Predictions', path: '/admin/predictions', icon: Target, color: 'bg-purple-600' },
    { label: 'Settlements', path: '/admin/settlements', icon: Gavel, color: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 mt-1">Welcome to the Fan Club Z admin panel</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors group"
          >
            <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-medium">{action.label}</p>
          </Link>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalUsers ?? '—'}</p>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Active Predictions</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.activePredictions ?? '—'}</p>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Pending Settlements</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.pendingSettlements ?? '—'}</p>
        </div>
        
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Volume</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.totalVolume != null ? `$${stats.totalVolume.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      {/* Recent Admin Actions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-semibold">Recent Admin Actions</h2>
          <Link to="/admin/audit" className="text-sm text-emerald-400 hover:text-emerald-300">
            View All
          </Link>
        </div>
        
        <div className="divide-y divide-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 mt-2 text-sm">Loading...</p>
            </div>
          ) : recentActions.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No recent admin actions</p>
            </div>
          ) : (
            recentActions.map((action) => (
              <div key={action.id} className="px-4 py-3 hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{action.action}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      by {action.actorName} • {action.targetType && `${action.targetType}: `}
                      {action.targetId?.slice(0, 8)}...
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(action.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h2 className="text-white font-semibold mb-3">System Status</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-300 text-sm">All systems operational</span>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;

