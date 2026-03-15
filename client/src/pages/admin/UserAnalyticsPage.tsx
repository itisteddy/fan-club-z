/**
 * Admin User Analytics Drilldown Page
 *
 * Per-user analytics: identity, engagement, economy, recent events.
 * Route: /admin/analytics/user/:userId
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Users,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Activity,
  Shield,
  BadgeCheck,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Calendar,
  Star,
} from 'lucide-react';
import { adminGet } from '@/lib/adminApi';
import { useAuthStore } from '@/store/authStore';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useAdminFilter, ADMIN_PERIOD_LABELS, ADMIN_PERIODS } from '@/hooks/useAdminFilter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserAnalyticsData {
  period: string;
  identity: {
    id: string;
    username: string | null;
    fullName: string | null;
    email: string | null;
    avatarUrl: string | null;
    bio: string | null;
    role: string;
    isAdmin: boolean;
    isVerified: boolean;
    joinedAt: string;
    lastActiveAt: string | null;
    referralCode: string | null;
    referredBy: string | null;
    referrer: {
      id: string;
      username: string | null;
      fullName: string | null;
      avatarUrl: string | null;
    } | null;
  };
  engagement: {
    stakesCount: number;
    totalStakeAmount: number;
    predictionsCreated: number;
    commentsCount: number;
    referralsMade: number;
  };
  economy: {
    availableBalance: number;
    reservedBalance: number;
    totalDeposited: number;
    totalWithdrawn: number;
    totalWon: number;
  };
  recentEvents: Array<{
    eventName: string;
    occurredAt: string;
    properties: Record<string, any> | null;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

function fmtCurrency(n: number | undefined | null): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export const UserAnalyticsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || authUser?.id || '';
  const { filter, setPeriod } = useAdminFilter();
  const period = filter.period;

  const [data, setData] = useState<UserAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminGet<{ data: UserAnalyticsData }>(
        `/api/v2/admin/analytics/user/${userId}`,
        actorId,
        { period }
      );
      setData(res?.data ?? res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load user analytics');
    } finally {
      setLoading(false);
    }
  }, [userId, actorId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const identity = data?.identity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/analytics" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-white">User Analytics</h1>
          </div>
          {identity && (
            <p className="text-slate-400 text-sm">
              @{identity.username || 'unknown'}{identity.fullName ? ` · ${identity.fullName}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {ADMIN_PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {ADMIN_PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {userId && (
            <Link
              to={`/admin/users/${userId}`}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white text-sm transition-colors"
            >
              User Detail
            </Link>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading user analytics…</span>
        </div>
      )}

      {data && (
        <>
          {/* Identity card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Identity &amp; Attribution
            </h2>
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {identity?.avatarUrl ? (
                  <img src={identity.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Username</p>
                  <p className="text-white">@{identity?.username || 'none'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Full Name</p>
                  <p className="text-white">{identity?.fullName || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Email</p>
                  <p className="text-slate-300 truncate">{identity?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Joined</p>
                  <p className="text-slate-300">{fmtDate(identity?.joinedAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Last Active</p>
                  <p className="text-slate-300">{fmtDate(identity?.lastActiveAt)}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Role</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 capitalize">{identity?.role || 'user'}</span>
                    {identity?.isAdmin && <Shield className="w-3.5 h-3.5 text-amber-400" />}
                    {identity?.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Referral Code</p>
                  <p className="text-slate-300 font-mono">{identity?.referralCode || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Referred By</p>
                  {identity?.referrer ? (
                    <Link
                      to={`/admin/analytics/user/${identity.referrer.id}`}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      @{identity.referrer.username || identity.referrer.fullName || identity.referrer.id.slice(0, 8)}
                    </Link>
                  ) : (
                    <p className="text-slate-500">Organic</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 text-xs">User ID</p>
                  <p className="text-slate-500 font-mono text-xs">{identity?.id?.slice(0, 12)}…</p>
                </div>
              </div>
            </div>
          </div>

          {/* Engagement + Economy grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Engagement */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Engagement · {ADMIN_PERIOD_LABELS[period]}
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Stakes / Entries', value: fmt(data.engagement.stakesCount), icon: TrendingUp, color: 'text-blue-400' },
                  { label: 'Stake Volume', value: fmtCurrency(data.engagement.totalStakeAmount), icon: DollarSign, color: 'text-emerald-400' },
                  { label: 'Predictions Created', value: fmt(data.engagement.predictionsCreated), icon: Star, color: 'text-amber-400' },
                  { label: 'Comments', value: fmt(data.engagement.commentsCount), icon: MessageSquare, color: 'text-purple-400' },
                  { label: 'Referrals Made', value: fmt(data.engagement.referralsMade), icon: Users, color: 'text-indigo-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-slate-400 text-sm">{label}</span>
                    </div>
                    <span className="text-white font-medium text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Economy */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Economy · All Time
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'Available Balance', value: fmtCurrency(data.economy.availableBalance), color: 'text-emerald-400' },
                  { label: 'Reserved (in-play)', value: fmtCurrency(data.economy.reservedBalance), color: 'text-amber-400' },
                  { label: 'Total Deposited', value: fmtCurrency(data.economy.totalDeposited), color: 'text-blue-400' },
                  { label: 'Total Withdrawn', value: fmtCurrency(data.economy.totalWithdrawn), color: 'text-red-400' },
                  { label: 'Total Won', value: fmtCurrency(data.economy.totalWon), color: 'text-purple-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{label}</span>
                    <span className={`font-medium text-sm font-mono ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Recent Activity
              </h2>
            </div>
            {data.recentEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No recent product events recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {data.recentEvents.map((ev, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="text-slate-300 text-sm font-mono">{ev.eventName}</span>
                    </div>
                    <span className="text-slate-500 text-xs whitespace-nowrap">{fmtDateTime(ev.occurredAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserAnalyticsPage;
