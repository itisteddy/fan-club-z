/**
 * Admin Referral Scorecards Page
 *
 * Per-referrer performance table with period filter, sort, and CSV export.
 * Filterable URL: /admin/analytics/referrals?period=30d&sort=total_signups
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Users,
  MousePointerClick,
  TrendingUp,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { adminGet } from '@/lib/adminApi';
import { getApiUrl } from '@/config';
import { getAdminKey } from '@/components/admin/AdminGate';
import { useAuthStore } from '@/store/authStore';
import { useAuthSession } from '@/providers/AuthSessionProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | 'all';
type SortKey = 'total_signups' | 'active_referrals' | 'referred_stake_total' | 'conversion_rate_pct';

interface ReferralRow {
  referrerId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  referrerJoinedAt: string;
  totalClicks: number;
  clicks30d: number;
  clicks7d: number;
  totalSignups: number;
  signups30d: number;
  signups7d: number;
  activeReferralsAll: number;
  activeReferrals30d: number;
  activeReferrals7d: number;
  referredStakeTotal: number;
  referredStakesCount: number;
  conversionRatePct: number;
  signupsInPeriod: number;
  activeInPeriod: number;
}

interface ReferralsData {
  items: ReferralRow[];
  total: number;
  period: Period;
  limit: number;
  offset: number;
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

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)}%`;
}

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  'all': 'All time',
};

const SORT_LABELS: Record<SortKey, string> = {
  total_signups: 'Signups',
  active_referrals: 'Active',
  referred_stake_total: 'Stake Volume',
  conversion_rate_pct: 'Conversion %',
};

const PAGE_SIZE = 50;

// ─── Main Page ────────────────────────────────────────────────────────────────

export const ReferralScorecardsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';

  const period = (searchParams.get('period') as Period) || '30d';
  const sort = (searchParams.get('sort') as SortKey) || 'total_signups';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const [data, setData] = useState<ReferralsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set(key, value);
        if (key !== 'page') next.set('page', '0'); // reset page on filter change
        return next;
      });
    },
    [setSearchParams]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminGet<{ data: ReferralsData }>(
        '/api/v2/admin/analytics/referrals',
        actorId,
        { period, sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      );
      setData(result.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, [actorId, period, sort, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = useCallback(async () => {
    const base = getApiUrl();
    const adminKey = getAdminKey();
    const params = new URLSearchParams({ type: 'referrals', period, actorId });
    const url = `${base}/api/v2/admin/analytics/export/csv?${params}`;
    const headers: HeadersInit = {};
    if (adminKey) headers['x-admin-key'] = adminKey;
    try {
      const res = await fetch(url, { headers, credentials: 'include' });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fanclubz_referrals_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (e: any) {
      alert(`Export error: ${e?.message}`);
    }
  }, [actorId, period]);

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const SortHeader: React.FC<{ colSort: SortKey; label: string }> = ({ colSort, label }) => (
    <th
      className="text-left text-slate-400 font-medium px-4 py-2 whitespace-nowrap cursor-pointer hover:text-white select-none"
      onClick={() => setParam('sort', colSort)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sort === colSort
          ? <ChevronDown className="w-3 h-3 text-emerald-400" />
          : <ChevronUp className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/analytics" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Referral Scorecards</h1>
          </div>
          <p className="text-slate-400 text-sm">Performance of each referral link holder</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {(['7d', '30d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setParam('period', p)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {p === 'all' ? 'All' : p}
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
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary row */}
      {data && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Referrers', value: fmt(data.total), icon: Users, color: 'bg-blue-600' },
            { label: 'Total Signups', value: fmt(data.items.reduce((s, r) => s + r.signupsInPeriod, 0)), icon: TrendingUp, color: 'bg-emerald-600' },
            { label: 'Active', value: fmt(data.items.reduce((s, r) => s + r.activeInPeriod, 0)), icon: Users, color: 'bg-purple-600' },
            { label: 'Total Clicks', value: fmt(data.items.reduce((s, r) => s + r.totalClicks, 0)), icon: MousePointerClick, color: 'bg-amber-600' },
            { label: 'Referred Stakes', value: fmtCurrency(data.items.reduce((s, r) => s + r.referredStakeTotal, 0)), icon: TrendingUp, color: 'bg-indigo-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <div className={`w-7 h-7 ${color} rounded-md flex items-center justify-center mb-2`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-white font-bold text-lg">{value}</p>
              <p className="text-slate-400 text-xs">{label} · {PERIOD_LABELS[period]}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">
            Scorecards — {PERIOD_LABELS[period]}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-xs">Sort:</span>
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setParam('sort', k)}
                className={`text-xs px-2 py-1 rounded ${sort === k ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (data?.items?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No referral data found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left text-slate-400 font-medium px-4 py-2">#</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-2">Referrer</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-2">Clicks</th>
                  <SortHeader colSort="total_signups" label="Signups" />
                  <SortHeader colSort="active_referrals" label="Active" />
                  <SortHeader colSort="referred_stake_total" label="Stake Vol." />
                  <SortHeader colSort="conversion_rate_pct" label="Conv. %" />
                  <th className="text-left text-slate-400 font-medium px-4 py-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {(data?.items || []).map((row, idx) => (
                  <tr key={row.referrerId} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{page * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/users/${row.referrerId}`}
                        className="flex items-center gap-2 group"
                      >
                        {row.avatarUrl ? (
                          <img src={row.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs text-slate-300">
                            {(row.username || row.fullName || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white group-hover:text-emerald-400 transition-colors font-medium text-xs">
                            @{row.username || 'unknown'}
                          </p>
                          {row.fullName && (
                            <p className="text-slate-500 text-xs">{row.fullName}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{fmt(row.totalClicks)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-white font-medium">{fmt(row.signupsInPeriod)}</span>
                        {period !== 'all' && (
                          <span className="text-slate-500 text-xs ml-1">/ {fmt(row.totalSignups)} all</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-medium">{fmt(row.activeInPeriod)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{fmtCurrency(row.referredStakeTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`${row.conversionRatePct >= 10 ? 'text-emerald-400' : row.conversionRatePct >= 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {fmtPct(row.conversionRatePct)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                      {row.referrerJoinedAt ? new Date(row.referrerJoinedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
            <span className="text-slate-400 text-sm">
              Page {page + 1} of {totalPages} · {data?.total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setParam('page', String(page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded disabled:opacity-40 hover:bg-slate-600"
              >
                Prev
              </button>
              <button
                onClick={() => setParam('page', String(page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded disabled:opacity-40 hover:bg-slate-600"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralScorecardsPage;
