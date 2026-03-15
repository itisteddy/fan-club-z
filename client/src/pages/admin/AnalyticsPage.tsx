/**
 * Admin Analytics Page
 *
 * Displays platform-wide daily metrics with filterable time-period selector.
 * Filterable URL: /admin/analytics?period=30d
 * CSV export buttons trigger /api/v2/admin/analytics/export/csv downloads.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAdminFilter } from '@/hooks/useAdminFilter';
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  MessageSquare,
  Download,
  RefreshCw,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { adminGet } from '@/lib/adminApi';
import { getApiUrl } from '@/config';
import { getAdminKey } from '@/components/admin/AdminGate';
import { useAuthStore } from '@/store/authStore';
import { useAuthSession } from '@/providers/AuthSessionProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';

interface DailyRow {
  day: string;
  new_users_count: number;
  active_users_count: number;
  cumulative_users_count: number;
  new_predictions_count: number;
  settled_predictions_count: number;
  total_stakes_count: number;
  total_stake_amount: number;
  total_payout_amount: number;
  total_creator_earnings_amount: number;
  total_comments_count: number;
  total_deposits_amount: number;
  total_withdrawals_amount: number;
  total_net_flow: number;
  new_referral_clicks: number;
  new_referral_signups: number;
}

interface OverviewSummary {
  total_new_users: number;
  total_stakes_count: number;
  total_stake_amount: number;
  total_payout_amount: number;
  total_creator_earnings: number;
  total_comments: number;
  total_deposits: number;
  total_withdrawals: number;
  total_new_referral_signups: number;
  cumulative_users: number;
}

interface OverviewData {
  rows: DailyRow[];
  summary: OverviewSummary | null;
  period: Period;
  rowCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  'all': 'All time',
};

function fmt(n: number | undefined | null, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function fmtCurrency(n: number | undefined | null): string {
  if (n == null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sub?: string;
  trend?: number; // percent change vs prior period (optional)
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, sub, trend }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      {trend != null && (
        <span className={`text-xs flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
    <p className="text-slate-400 text-sm mt-0.5">{label}</p>
    {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
  </div>
);

// Mini sparkline using SVG path (no chart library needed)
const Sparkline: React.FC<{ values: number[]; color?: string }> = ({ values, color = '#10b981' }) => {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 32;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - (v / max) * h,
  ]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { user: sessionUser } = useAuthSession();
  const actorId = sessionUser?.id || user?.id || '';
  const { filter, setPeriod } = useAdminFilter();

  const period = filter.period as Period;

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const result = await adminGet<{ data: OverviewData }>(
        '/api/v2/admin/analytics/overview',
        actorId,
        { period }
      );
      setData(result.data);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [actorId, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── CSV export helper ────────────────────────────────────────────────────────
  const handleExport = useCallback(async (type: 'referrals' | 'users' | 'snapshots') => {
    const base = getApiUrl();
    const adminKey = getAdminKey();
    const params = new URLSearchParams({ type, period, actorId });
    const url = `${base}/api/v2/admin/analytics/export/csv?${params}`;
    const headers: HeadersInit = {};
    if (adminKey) headers['x-admin-key'] = adminKey;
    try {
      const res = await fetch(url, { headers, credentials: 'include' });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `fanclubz_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (e: any) {
      alert(`Export error: ${e?.message}`);
    }
  }, [actorId, period]);

  // ── Backfill helper ──────────────────────────────────────────────────────────
  const handleBackfill = useCallback(async () => {
    if (!window.confirm('Backfill last 90 days of analytics snapshots? This may take a few seconds.')) return;
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const startDay = start.toISOString().slice(0, 10);
      const res = await adminGet<any>('/api/v2/admin/analytics/backfill', actorId);
      // POST not GET – use fetch directly
      const base = getApiUrl();
      const adminKey = getAdminKey();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (adminKey) headers['x-admin-key'] = adminKey;
      const body = JSON.stringify({ startDay, actorId });
      const r = await fetch(`${base}/api/v2/admin/analytics/backfill?actorId=${encodeURIComponent(actorId)}`, {
        method: 'POST', headers, credentials: 'include', body,
      });
      const json = await r.json();
      setBackfillMsg(`Backfill complete: ${json.data?.daysProcessed ?? 0} days processed`);
      fetchData();
    } catch (e: any) {
      setBackfillMsg(`Backfill error: ${e?.message}`);
    } finally {
      setBackfilling(false);
    }
  }, [actorId, fetchData]);

  // ── Derived sparkline data ───────────────────────────────────────────────────
  const sparkUsers    = (data?.rows || []).map(r => Number(r.new_users_count || 0));
  const sparkStakes   = (data?.rows || []).map(r => Number(r.total_stake_amount || 0));
  const sparkDeposits = (data?.rows || []).map(r => Number(r.total_deposits_amount || 0));

  const s = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">Platform-wide metrics from daily snapshots</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
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
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {/* Export menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors text-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 hidden group-hover:block min-w-[160px]">
              {(['snapshots', 'referrals', 'users'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => handleExport(t)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white first:rounded-t-lg last:rounded-b-lg capitalize"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Backfill banner */}
      {backfillMsg && (
        <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg px-4 py-2 text-emerald-300 text-sm flex justify-between">
          {backfillMsg}
          <button onClick={() => setBackfillMsg(null)} className="text-emerald-500 hover:text-emerald-300">✕</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
          {error.includes('not available') && (
            <span className="block mt-1 text-xs text-red-400">
              Run migration 344 (analytics_daily_snapshots) and click "Backfill" to populate historical data.
            </span>
          )}
        </div>
      )}

      {/* Summary stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="New Users"
              value={fmt(s?.total_new_users)}
              icon={Users}
              color="bg-blue-600"
              sub={`${fmt(s?.cumulative_users)} total`}
            />
            <StatCard
              label="Stakes"
              value={fmt(s?.total_stakes_count)}
              icon={Activity}
              color="bg-purple-600"
              sub={fmtCurrency(s?.total_stake_amount)}
            />
            <StatCard
              label="Payouts"
              value={fmtCurrency(s?.total_payout_amount)}
              icon={TrendingUp}
              color="bg-emerald-600"
              sub={`Creator: ${fmtCurrency(s?.total_creator_earnings)}`}
            />
            <StatCard
              label="Deposits"
              value={fmtCurrency(s?.total_deposits)}
              icon={DollarSign}
              color="bg-amber-600"
              sub={`Withdrawals: ${fmtCurrency(s?.total_withdrawals)}`}
            />
            <StatCard
              label="Comments"
              value={fmt(s?.total_comments)}
              icon={MessageSquare}
              color="bg-indigo-600"
            />
            <StatCard
              label="Referral Signups"
              value={fmt(s?.total_new_referral_signups)}
              icon={Users}
              color="bg-cyan-600"
            />
            <StatCard
              label={PERIOD_LABELS[period]}
              value={`${data?.rowCount ?? 0} days`}
              icon={BarChart2}
              color="bg-slate-600"
              sub="data points"
            />
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
              <p className="text-slate-400 text-sm mb-2">Net Flow (deposits − withdrawals)</p>
              {s != null && (
                <p className={`text-xl font-bold ${(s.total_deposits - s.total_withdrawals) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtCurrency(s.total_deposits - s.total_withdrawals)}
                </p>
              )}
            </div>
          </div>

          {/* Sparkline trends */}
          {(data?.rows?.length ?? 0) > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'New Users / day', vals: sparkUsers, color: '#3b82f6' },
                { label: 'Stake Volume / day', vals: sparkStakes, color: '#8b5cf6' },
                { label: 'Deposits / day', vals: sparkDeposits, color: '#f59e0b' },
              ].map(({ label, vals, color }) => (
                <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-2">{label}</p>
                  <Sparkline values={vals} color={color} />
                </div>
              ))}
            </div>
          )}

          {/* Daily table */}
          {(data?.rows?.length ?? 0) > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">Daily Breakdown</h2>
                <span className="text-slate-500 text-xs">{PERIOD_LABELS[period]}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {['Day', 'New Users', 'Active', 'Stakes', 'Volume', 'Payouts', 'Deposits', 'Withdrawals', 'Comments'].map(h => (
                        <th key={h} className="text-left text-slate-400 font-medium px-4 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {[...(data?.rows || [])].reverse().slice(0, 60).map((row) => (
                      <tr key={row.day} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-2 text-slate-300 font-mono text-xs">{row.day}</td>
                        <td className="px-4 py-2 text-white">{fmt(row.new_users_count)}</td>
                        <td className="px-4 py-2 text-slate-300">{fmt(row.active_users_count)}</td>
                        <td className="px-4 py-2 text-slate-300">{fmt(row.total_stakes_count)}</td>
                        <td className="px-4 py-2 text-slate-300">{fmtCurrency(row.total_stake_amount)}</td>
                        <td className="px-4 py-2 text-emerald-400">{fmtCurrency(row.total_payout_amount)}</td>
                        <td className="px-4 py-2 text-amber-400">{fmtCurrency(row.total_deposits_amount)}</td>
                        <td className="px-4 py-2 text-red-400">{fmtCurrency(row.total_withdrawals_amount)}</td>
                        <td className="px-4 py-2 text-slate-300">{fmt(row.total_comments_count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && (data?.rows?.length ?? 0) === 0 && !error && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <BarChart2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-white font-medium mb-1">No snapshot data yet</p>
              <p className="text-slate-400 text-sm mb-4">
                The daily cron will populate data starting tonight. Run a backfill to load historical data immediately.
              </p>
              <button
                onClick={handleBackfill}
                disabled={backfilling}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {backfilling ? 'Backfilling…' : 'Backfill Last 90 Days'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
