/**
 * Admin Analytics Dashboard
 *
 * Unified 5-tab analytics dashboard:
 *   Overview | Growth | Referral | Engagement | Ops
 *
 * All filter state lives in URL search params → fully shareable links.
 * CSV export serialises the in-memory data already shown in each tab,
 * guaranteeing that what the admin sees is exactly what gets exported.
 *
 * Route: /admin/analytics
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  Bookmark,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  DollarSign,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  Trophy,
  Target,
  MessageSquare,
  Clock,
  XCircle,
} from 'lucide-react';
import { adminGet } from '@/lib/adminApi';
import { useAuthSession } from '@/providers/AuthSessionProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';
type Tab = 'overview' | 'growth' | 'referral' | 'engagement' | 'ops';

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

interface OpsData {
  period: string;
  dataFreshness: {
    latestSnapshotDay: string | null;
    latestComputedAt: string | null;
    stalenessMs: number | null;
    stalenessHours: number | null;
  } | null;
  predictionHealth: {
    byStatus: Record<string, number>;
    totalActive: number;
    totalSettled: number;
    totalCancelled: number;
  } | null;
  claimHealth: {
    claimCompleted: number;
    claimFailed: number;
    claimSuccessRatePct: number | null;
    totalClaims: number;
  } | null;
  economyHealth: {
    totalStakeAmount: number;
    totalPayoutAmount: number;
    totalCreatorEarnings: number;
    platformTake: number;
    platformTakeRatePct: number | null;
    totalStakesCount: number;
  } | null;
  eventThroughput: {
    totalEvents: number;
    byEventName: Record<string, number>;
  } | null;
}

interface LeaderboardRow {
  memberId: string;
  username: string;
  fullName: string;
  referralCode: string;
  compositeScore: number;
  totalSignups: number;
  qualifiedCount: number;
  d7RetainedCount: number;
  d30RetainedCount: number;
  activatedCount: number;
  stakeVolume: number;
  suspiciousSignupsCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = {
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  'all': 'All time',
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',        icon: BarChart2 },
  { id: 'growth',      label: 'Growth',          icon: TrendingUp },
  { id: 'referral',    label: 'Referral',        icon: Trophy },
  { id: 'engagement',  label: 'Engagement',      icon: Activity },
  { id: 'ops',         label: 'Ops / Health',    icon: Zap },
];

/** Saved report presets — one-click bookmark to a pre-configured view.
 *  Each preset encodes a tab + period + optional date range.
 *  The URL is fully shareable; copy the address bar after applying a preset.
 */
interface ReportPreset {
  id:          string;
  label:       string;
  description: string;
  tab:         Tab;
  period:      Period;
  dateFrom?:   string;
  dateTo?:     string;
}

const REPORT_PRESETS: ReportPreset[] = [
  {
    id:          'executive',
    label:       'Executive Overview',
    description: 'High-level KPIs for the past 30 days',
    tab:         'overview',
    period:      '30d',
  },
  {
    id:          'growth',
    label:       'Growth Trends',
    description: 'User acquisition and referral funnel — last 90 days',
    tab:         'growth',
    period:      '90d',
  },
  {
    id:          'referral',
    label:       'Referral / Team',
    description: 'Leaderboard ranked by composite quality score',
    tab:         'referral',
    period:      '30d',
  },
  {
    id:          'creator',
    label:       'Creator Economy',
    description: 'Stake volume, payouts, creator earnings — last 30 days',
    tab:         'engagement',
    period:      '30d',
  },
  {
    id:          'ops',
    label:       'Ops / Claim Health',
    description: 'Platform health, data freshness, claim success rate',
    tab:         'ops',
    period:      '7d',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(decimals);
}

function fmtCurrency(n: number): string {
  return `$${fmt(n, 2)}`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\r\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Preset Bar ───────────────────────────────────────────────────────────────

interface PresetBarProps {
  onApply: (preset: ReportPreset) => void;
  activePresetId: string | null;
}

const PresetBar: React.FC<PresetBarProps> = ({ onApply, activePresetId }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
        title="Saved report presets"
      >
        <Bookmark className="w-3.5 h-3.5" />
        Presets
        {activePresetId && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
        <ChevronDown className="w-3 h-3 ml-0.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-700">
            <p className="text-xs font-semibold text-slate-300">Saved Report Presets</p>
            <p className="text-xs text-slate-500 mt-0.5">Pre-configured views. URL updates for sharing.</p>
          </div>
          <div className="py-1">
            {REPORT_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => { onApply(p); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 hover:bg-slate-700/60 transition-colors ${
                  activePresetId === p.id ? 'bg-emerald-900/20' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${activePresetId === p.id ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {p.label}
                  </span>
                  <span className="text-xs text-slate-600">{p.period}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click-outside close */}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
  );
};

// ─── Data Quality Caveats ─────────────────────────────────────────────────────

const DataQualityCaveats: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          Known Data Quality Caveats
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </button>
      {expanded && (
        <ul className="mt-3 space-y-2 text-xs text-slate-400 list-none">
          {[
            'analytics_daily_snapshots are computed once per day by a nightly cron. Today\'s partial data is NOT included until the cron runs (usually ~00:10 UTC).',
            'Active users are counted as users with ≥1 stake or ≥1 comment on that calendar day. Passive browsing (views, clicks) is not counted.',
            'Claim health (claim_completed_count / claim_failed_count) is based on product_events. If the product_events ingestion pipeline has backpressure, counts may lag by up to 1 hour.',
            'Platform take = stake_volume − payouts − creator_earnings. This does not account for on-chain gas fees, Stripe fees, or demo-mode transactions. Demo-mode stakes may inflate volume figures.',
            'Referral click counts are raw (not deduplicated by IP or session). Signups and qualified counts ARE deduplicated. Conversion rate = signups / clicks, which understates true conversion.',
            'D7/D30 retention windows use signup_day + 7/30 as the close date. A user is retained if they were active on any day in the window, not necessarily on day 7/30 exactly.',
            'Composite referral scores are recomputed in real-time from TypeScript weights. Pre-computed SQL scores (referral_daily_snapshots) use the weights hardcoded in migration 347 and may diverge if weights were changed without re-running the backfill.',
            'Wallet-mode segmentation (demo vs real-money) is not yet surfaced as a filter. All economy metrics currently aggregate both modes.',
          ].map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-600 shrink-0">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: Series[];
  height?: number;
}

const LineChart: React.FC<LineChartProps> = ({ labels, series, height = 160 }) => {
  const W = 600;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allValues = series.flatMap(s => s.values);
  const maxVal = allValues.length ? Math.max(...allValues, 1) : 1;
  const minVal = 0;

  const xOf = (i: number) => PAD.left + (i / Math.max(labels.length - 1, 1)) * innerW;
  const yOf = (v: number) => PAD.top + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;

  const path = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`)
      .join(' ');

  // y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => minVal + t * (maxVal - minVal));
  // x-axis labels: show up to 6
  const step = Math.max(1, Math.floor(labels.length / 6));
  const xLabels = labels.filter((_, i) => i % step === 0 || i === labels.length - 1);
  const xLabelIndices = labels
    .map((_, i) => i)
    .filter(i => i % step === 0 || i === labels.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={yOf(t)}
            x2={W - PAD.right} y2={yOf(t)}
            stroke="#334155" strokeWidth="1" strokeDasharray="4 3"
          />
          <text
            x={PAD.left - 4} y={yOf(t) + 4}
            fontSize="10" fill="#94a3b8" textAnchor="end"
          >
            {fmt(t)}
          </text>
        </g>
      ))}

      {/* Series lines */}
      {series.map(s => (
        <path
          key={s.key}
          d={path(s.values)}
          fill="none"
          stroke={s.color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* X labels */}
      {xLabelIndices.map((i, idx) => (
        <text
          key={idx}
          x={xOf(i)} y={H - 6}
          fontSize="9" fill="#64748b" textAnchor="middle"
        >
          {labels[i]?.slice(5)} {/* MM-DD */}
        </text>
      ))}
    </svg>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, icon: Icon, color = 'text-emerald-400', trend }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-bold text-white">{value}</span>
      {trend && trend !== 'neutral' && (
        <ArrowUpRight className={`w-4 h-4 mb-1 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400 rotate-90'}`} />
      )}
    </div>
    {sub && <span className="text-xs text-slate-500">{sub}</span>}
  </div>
);

// ─── Health Badge ──────────────────────────────────────────────────────────────

const HealthBadge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
    ok ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
  }`}>
    {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {label}
  </span>
);

// ─── Global Filter Bar ────────────────────────────────────────────────────────

interface FilterBarProps {
  period: Period;
  dateFrom: string;
  dateTo: string;
  onPeriodChange: (p: Period) => void;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  period, dateFrom, dateTo, onPeriodChange, onDateFromChange, onDateToChange, onRefresh, loading,
}) => {
  const hasCustomRange = !!(dateFrom || dateTo);

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Period pills */}
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => { onPeriodChange(p); onDateFromChange(''); onDateToChange(''); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              period === p && !hasCustomRange
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <input
          type="date"
          value={dateFrom}
          onChange={e => onDateFromChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          placeholder="From"
        />
        <span className="text-slate-600 text-xs">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => onDateToChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          placeholder="To"
        />
        {hasCustomRange && (
          <button
            onClick={() => { onDateFromChange(''); onDateToChange(''); }}
            className="text-xs text-slate-500 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
    </div>
  );
};

// ─── Tab: Overview ────────────────────────────────────────────────────────────

interface OverviewTabProps {
  rows: DailyRow[];
  summary: OverviewSummary | null;
  loading: boolean;
  error: string | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ rows, summary, loading, error }) => {
  const labels = rows.map(r => r.day);
  const newUsersSeries: Series = {
    key: 'new_users', label: 'New Users', color: '#10b981',
    values: rows.map(r => Number(r.new_users_count ?? 0)),
  };
  const activeUsersSeries: Series = {
    key: 'active_users', label: 'Active Users', color: '#3b82f6',
    values: rows.map(r => Number(r.active_users_count ?? 0)),
  };
  const stakesSeries: Series = {
    key: 'stakes', label: 'Stakes', color: '#f59e0b',
    values: rows.map(r => Number(r.total_stakes_count ?? 0)),
  };

  const exportData = useCallback(() => {
    const data = rows.map(r => ({ ...r })) as Record<string, unknown>[];
    downloadCsv(toCsv(data), `fanclubz_overview_${new Date().toISOString().slice(0,10)}.csv`);
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-amber-300 font-medium">Could not load overview data</p>
          <p className="text-amber-500 text-sm mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Users"       value={fmt(summary?.cumulative_users ?? 0)}          sub={`+${fmt(summary?.total_new_users ?? 0)} this period`}   icon={Users}         color="text-emerald-400" />
        <KpiCard label="New Users"         value={fmt(summary?.total_new_users ?? 0)}            sub="signups in period"                                       icon={TrendingUp}    color="text-blue-400" />
        <KpiCard label="Total Stakes"      value={fmt(summary?.total_stakes_count ?? 0)}         sub={fmtCurrency(summary?.total_stake_amount ?? 0) + ' volume'} icon={Target}      color="text-amber-400" />
        <KpiCard label="Referral Signups"  value={fmt(summary?.total_new_referral_signups ?? 0)} sub="via referral links"                                      icon={Trophy}        color="text-purple-400" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Payouts"           value={fmtCurrency(summary?.total_payout_amount ?? 0)}    sub="to winners"               icon={DollarSign}    color="text-green-400" />
        <KpiCard label="Creator Earnings"  value={fmtCurrency(summary?.total_creator_earnings ?? 0)} sub="to prediction creators"   icon={DollarSign}    color="text-indigo-400" />
        <KpiCard label="Comments"          value={fmt(summary?.total_comments ?? 0)}                  sub="engagement events"        icon={MessageSquare} color="text-pink-400" />
        <KpiCard label="Net Flow"          value={fmtCurrency((summary?.total_deposits ?? 0) - (summary?.total_withdrawals ?? 0))} sub="deposits − withdrawals" icon={Activity} color="text-cyan-400" />
      </div>

      {/* Charts */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">User Activity</h3>
              <div className="flex gap-4">
                {[newUsersSeries, activeUsersSeries].map(s => (
                  <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            <LineChart labels={labels} series={[newUsersSeries, activeUsersSeries]} height={160} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Stakes per Day</h3>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-0.5 rounded" style={{ background: stakesSeries.color }} />
                {stakesSeries.label}
              </span>
            </div>
            <LineChart labels={labels} series={[stakesSeries]} height={140} />
          </div>
        </div>
      )}

      {rows.length === 0 && !loading && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <BarChart2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No data for this period.</p>
          <p className="text-slate-500 text-sm mt-1">Run a backfill from the overview page to populate analytics.</p>
        </div>
      )}

      {/* Export */}
      {rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV ({rows.length} rows)
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Growth ──────────────────────────────────────────────────────────────

const GrowthTab: React.FC<OverviewTabProps> = ({ rows, loading, error }) => {
  const labels = rows.map(r => r.day);

  const cumulativeSeries: Series = {
    key: 'cumulative', label: 'Cumulative Users', color: '#10b981',
    values: rows.map(r => Number(r.cumulative_users_count ?? 0)),
  };
  const newUsersSeries: Series = {
    key: 'new', label: 'New Users / Day', color: '#3b82f6',
    values: rows.map(r => Number(r.new_users_count ?? 0)),
  };
  const refSignupSeries: Series = {
    key: 'ref', label: 'Referral Signups / Day', color: '#a855f7',
    values: rows.map(r => Number(r.new_referral_signups ?? 0)),
  };
  const refClickSeries: Series = {
    key: 'refClick', label: 'Referral Clicks / Day', color: '#f59e0b',
    values: rows.map(r => Number(r.new_referral_clicks ?? 0)),
  };

  const exportData = useCallback(() => {
    const data = rows.map(r => ({
      day: r.day,
      new_users: r.new_users_count,
      cumulative_users: r.cumulative_users_count,
      referral_clicks: r.new_referral_clicks,
      referral_signups: r.new_referral_signups,
    })) as Record<string, unknown>[];
    downloadCsv(toCsv(data), `fanclubz_growth_${new Date().toISOString().slice(0,10)}.csv`);
  }, [rows]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6">
      <p className="text-amber-300 font-medium">Could not load growth data</p>
      <p className="text-amber-500 text-sm mt-0.5">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cumulative growth chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Platform User Growth</h3>
          <div className="flex gap-4">
            {[cumulativeSeries, newUsersSeries].map(s => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <LineChart labels={labels} series={[cumulativeSeries, newUsersSeries]} height={180} />
      </div>

      {/* Referral funnel chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Referral Funnel (daily)</h3>
          <div className="flex gap-4">
            {[refClickSeries, refSignupSeries].map(s => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <LineChart labels={labels} series={[refClickSeries, refSignupSeries]} height={160} />
      </div>

      {/* Raw table (last 14 rows) */}
      {rows.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Daily Breakdown (last 14 days)</h3>
            <button
              onClick={exportData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-left">
                  <th className="px-4 py-2.5 font-medium">Day</th>
                  <th className="px-4 py-2.5 font-medium text-right">New Users</th>
                  <th className="px-4 py-2.5 font-medium text-right">Active Users</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ref Clicks</th>
                  <th className="px-4 py-2.5 font-medium text-right">Ref Signups</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cumulative</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(-14).reverse().map(r => (
                  <tr key={r.day} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-mono">{r.day}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.new_users_count)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.active_users_count)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.new_referral_clicks)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.new_referral_signups)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.cumulative_users_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Referral ────────────────────────────────────────────────────────────

interface ReferralTabProps {
  period: Period;
  userId: string;
}

const ReferralTab: React.FC<ReferralTabProps> = ({ period, userId }) => {
  const [rows, setRows]       = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGet<any>(
        `/api/v2/admin/analytics/team/leaderboard`,
        userId,
        { period, limit: 50 }
      );
      const payload = res?.data ?? res;
      setRows((payload?.items ?? []).map((r: any) => ({
        memberId:              r.memberId,
        username:              r.username ?? r.fullName ?? '—',
        fullName:              r.fullName ?? '',
        referralCode:          r.referralCode ?? '—',
        compositeScore:        Number(r.compositeScore ?? 0),
        totalSignups:          Number(r.totalSignups ?? 0),
        qualifiedCount:        Number(r.qualifiedCount ?? 0),
        d7RetainedCount:       Number(r.d7RetainedCount ?? 0),
        d30RetainedCount:      Number(r.d30RetainedCount ?? 0),
        activatedCount:        Number(r.activatedCount ?? 0),
        stakeVolume:           Number(r.stakeVolume ?? 0),
        suspiciousSignupsCount: Number(r.suspiciousSignupsCount ?? 0),
      })));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period, userId]);

  useEffect(() => { load(); }, [load]);

  const exportData = useCallback(() => {
    const data = rows.map(r => ({ ...r })) as Record<string, unknown>[];
    downloadCsv(toCsv(data), `fanclubz_referral_leaderboard_${new Date().toISOString().slice(0,10)}.csv`);
  }, [rows]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6">
      <p className="text-amber-300 font-medium">Could not load referral data</p>
      <p className="text-amber-500 text-sm mt-0.5">{error}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Ranked by composite quality score. Click a member to see their full scorecard.
        </p>
        <div className="flex gap-2">
          <Link
            to="/admin/analytics/team"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            Full Team View
          </Link>
          {rows.length > 0 && (
            <button
              onClick={exportData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
          <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No referral data for this period.</p>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium text-right">Score</th>
                  <th className="px-4 py-3 font-medium text-right">Signups</th>
                  <th className="px-4 py-3 font-medium text-right">Qualified</th>
                  <th className="px-4 py-3 font-medium text-right">D30</th>
                  <th className="px-4 py-3 font-medium text-right">Stake Vol</th>
                  <th className="px-4 py-3 font-medium text-right">⚠️</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.memberId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={`/admin/analytics/team/${r.memberId}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        {r.username}
                      </Link>
                      {r.fullName && r.fullName !== r.username && (
                        <span className="text-slate-500 ml-1">({r.fullName})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{r.referralCode}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-400">{r.compositeScore.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.totalSignups)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.qualifiedCount)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(r.d30RetainedCount)}</td>
                    <td className="px-4 py-2.5 text-right">{fmtCurrency(r.stakeVolume)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.suspiciousSignupsCount > 0 ? (
                        <span className="text-amber-400 font-medium">{r.suspiciousSignupsCount}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Engagement ──────────────────────────────────────────────────────────

const EngagementTab: React.FC<OverviewTabProps> = ({ rows, loading, error }) => {
  const labels = rows.map(r => r.day);

  const stakeAmtSeries: Series = {
    key: 'stake_amt', label: 'Stake Volume ($)', color: '#f59e0b',
    values: rows.map(r => Number(r.total_stake_amount ?? 0)),
  };
  const payoutSeries: Series = {
    key: 'payout', label: 'Payouts ($)', color: '#10b981',
    values: rows.map(r => Number(r.total_payout_amount ?? 0)),
  };
  const earningsSeries: Series = {
    key: 'earnings', label: 'Creator Earnings ($)', color: '#a855f7',
    values: rows.map(r => Number(r.total_creator_earnings_amount ?? 0)),
  };
  const commentsSeries: Series = {
    key: 'comments', label: 'Comments', color: '#ec4899',
    values: rows.map(r => Number(r.total_comments_count ?? 0)),
  };

  const totalStake    = rows.reduce((s, r) => s + Number(r.total_stake_amount ?? 0), 0);
  const totalPayout   = rows.reduce((s, r) => s + Number(r.total_payout_amount ?? 0), 0);
  const totalEarnings = rows.reduce((s, r) => s + Number(r.total_creator_earnings_amount ?? 0), 0);
  const platformTake  = totalStake - totalPayout - totalEarnings;

  const exportData = useCallback(() => {
    const data = rows.map(r => ({
      day:              r.day,
      stake_volume:     r.total_stake_amount,
      payouts:          r.total_payout_amount,
      creator_earnings: r.total_creator_earnings_amount,
      net_deposits:     r.total_deposits_amount,
      net_withdrawals:  r.total_withdrawals_amount,
      net_flow:         r.total_net_flow,
      comments:         r.total_comments_count,
      predictions:      r.new_predictions_count,
    })) as Record<string, unknown>[];
    downloadCsv(toCsv(data), `fanclubz_engagement_${new Date().toISOString().slice(0,10)}.csv`);
  }, [rows]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6">
      <p className="text-amber-300 font-medium">Could not load engagement data</p>
      <p className="text-amber-500 text-sm mt-0.5">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Economy KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Stake Volume"      value={fmtCurrency(totalStake)}    sub="total wagered"        icon={DollarSign}    color="text-amber-400" />
        <KpiCard label="Payouts"           value={fmtCurrency(totalPayout)}   sub="to winners"           icon={DollarSign}    color="text-emerald-400" />
        <KpiCard label="Creator Earnings"  value={fmtCurrency(totalEarnings)} sub="prediction creators"  icon={DollarSign}    color="text-purple-400" />
        <KpiCard label="Platform Take"     value={fmtCurrency(platformTake)}  sub={totalStake > 0 ? `${((platformTake / totalStake) * 100).toFixed(1)}% take rate` : '—'} icon={Activity} color="text-cyan-400" />
      </div>

      {/* Charts */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Economy (daily)</h3>
          <div className="flex gap-4">
            {[stakeAmtSeries, payoutSeries, earningsSeries].map(s => (
              <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <LineChart labels={labels} series={[stakeAmtSeries, payoutSeries, earningsSeries]} height={160} />
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Engagement (daily)</h3>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-3 h-0.5 rounded" style={{ background: commentsSeries.color }} />
            {commentsSeries.label}
          </span>
        </div>
        <LineChart labels={labels} series={[commentsSeries]} height={140} />
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV ({rows.length} rows)
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Ops ─────────────────────────────────────────────────────────────────

interface OpsTabProps {
  ops: OpsData | null;
  loading: boolean;
  error: string | null;
}

const OpsTab: React.FC<OpsTabProps> = ({ ops, loading, error }) => {
  const [showEvents, setShowEvents] = useState(false);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6">
      <p className="text-amber-300 font-medium">Could not load platform health data</p>
      <p className="text-amber-500 text-sm mt-0.5">{error}</p>
    </div>
  );

  if (!ops) return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
      <Zap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
      <p className="text-slate-400">No ops data available.</p>
    </div>
  );

  const staleHours = ops.dataFreshness?.stalenessHours;
  const snapshotHealthy = staleHours != null && staleHours < 26; // 25h = yesterday's snapshot is fine

  const claimSuccessRate = ops.claimHealth?.claimSuccessRatePct;
  const claimHealthy = claimSuccessRate == null || claimSuccessRate >= 95;

  const topEvents = ops.eventThroughput?.byEventName
    ? Object.entries(ops.eventThroughput.byEventName)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  return (
    <div className="space-y-6">
      {/* Health badges */}
      <div className="flex flex-wrap gap-3">
        <HealthBadge ok={snapshotHealthy} label={snapshotHealthy ? 'Snapshots fresh' : 'Snapshots stale'} />
        <HealthBadge ok={claimHealthy}    label={claimHealthy    ? 'Claims healthy'  : 'Claim failures detected'} />
        <HealthBadge ok={(ops.predictionHealth?.totalActive ?? 0) < 10000} label="Prediction count normal" />
      </div>

      {/* Data Freshness */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Data Freshness
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">Latest snapshot day</p>
            <p className="text-white font-mono">{ops.dataFreshness?.latestSnapshotDay ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Computed at</p>
            <p className="text-white">
              {ops.dataFreshness?.latestComputedAt
                ? new Date(ops.dataFreshness.latestComputedAt).toLocaleString()
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Staleness</p>
            <p className={`font-medium ${snapshotHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
              {staleHours != null ? `${staleHours}h ago` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Prediction health */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-slate-400" />
          Prediction Settlement Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Active"     value={fmt(ops.predictionHealth?.totalActive    ?? 0)} icon={Activity}     color="text-blue-400" />
          <KpiCard label="Settled"    value={fmt(ops.predictionHealth?.totalSettled   ?? 0)} icon={CheckCircle}  color="text-emerald-400" />
          <KpiCard label="Cancelled"  value={fmt(ops.predictionHealth?.totalCancelled ?? 0)} icon={XCircle}      color="text-red-400" />
        </div>
        {ops.predictionHealth && Object.keys(ops.predictionHealth.byStatus).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(ops.predictionHealth.byStatus).map(([status, count]) => (
              <span key={status} className="px-2.5 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
                <span className="text-slate-400">{status}:</span> {fmt(count)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Claim health */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-slate-400" />
          Claim Health (period)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Claims Completed" value={fmt(ops.claimHealth?.claimCompleted ?? 0)} icon={CheckCircle} color="text-emerald-400" />
          <KpiCard label="Claims Failed"    value={fmt(ops.claimHealth?.claimFailed    ?? 0)} icon={XCircle}     color="text-red-400" />
          <KpiCard
            label="Success Rate"
            value={claimSuccessRate != null ? `${claimSuccessRate.toFixed(1)}%` : '—'}
            icon={Activity}
            color={claimHealthy ? 'text-emerald-400' : 'text-red-400'}
          />
          <KpiCard label="Total Claims"     value={fmt(ops.claimHealth?.totalClaims    ?? 0)} icon={Activity}    color="text-slate-400" />
        </div>
      </div>

      {/* Economy health */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-slate-400" />
          Economy Health (period)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label="Stake Volume"      value={fmtCurrency(ops.economyHealth?.totalStakeAmount     ?? 0)} icon={DollarSign}   color="text-amber-400" />
          <KpiCard label="Payouts"           value={fmtCurrency(ops.economyHealth?.totalPayoutAmount    ?? 0)} icon={DollarSign}   color="text-emerald-400" />
          <KpiCard label="Creator Earnings"  value={fmtCurrency(ops.economyHealth?.totalCreatorEarnings ?? 0)} icon={DollarSign}   color="text-purple-400" />
          <KpiCard label="Platform Take"     value={fmtCurrency(ops.economyHealth?.platformTake        ?? 0)} icon={Activity}     color="text-cyan-400" />
          <KpiCard
            label="Take Rate"
            value={ops.economyHealth?.platformTakeRatePct != null ? `${ops.economyHealth.platformTakeRatePct.toFixed(2)}%` : '—'}
            icon={Activity}
            color="text-cyan-400"
          />
          <KpiCard label="Stakes Count"      value={fmt(ops.economyHealth?.totalStakesCount ?? 0)}              icon={Target}       color="text-slate-400" />
        </div>
      </div>

      {/* Event throughput */}
      {ops.eventThroughput && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <button
            className="w-full flex items-center justify-between text-sm font-semibold text-white"
            onClick={() => setShowEvents(v => !v)}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-400" />
              Product Event Throughput — {fmt(ops.eventThroughput.totalEvents)} events (period)
            </span>
            {showEvents ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showEvents && topEvents.length > 0 && (
            <div className="mt-4 space-y-2">
              {topEvents.map(([name, count]) => {
                const pct = ops.eventThroughput!.totalEvents > 0
                  ? (count / ops.eventThroughput!.totalEvents) * 100 : 0;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono w-40 truncate">{name}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-300 w-16 text-right">{fmt(count)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Data quality caveats */}
      <DataQualityCaveats />
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const AdminAnalyticsDashboard: React.FC = () => {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state from URL params ──────────────────────────────────────────
  const tab     = (searchParams.get('tab')     as Tab)    || 'overview';
  const period  = (searchParams.get('period')  as Period) || '30d';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo   = searchParams.get('dateTo')   || '';

  const setParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setTab     = (t: Tab)    => setParam('tab',     t);
  const setPeriod  = (p: Period) => setParam('period',  p);
  const setDateFrom = (d: string) => setParam('dateFrom', d);
  const setDateTo   = (d: string) => setParam('dateTo',   d);

  const applyPreset = useCallback((preset: ReportPreset) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab',    preset.tab);
      next.set('period', preset.period);
      if (preset.dateFrom) next.set('dateFrom', preset.dateFrom); else next.delete('dateFrom');
      if (preset.dateTo)   next.set('dateTo',   preset.dateTo);   else next.delete('dateTo');
      next.set('preset', preset.id);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Detect active preset by matching current params
  const activePresetId = (() => {
    const pId = searchParams.get('preset');
    if (pId) return pId;
    const match = REPORT_PRESETS.find(
      p => p.tab === tab && p.period === period && !dateFrom && !dateTo
    );
    return match?.id ?? null;
  })();

  // ── Data state ────────────────────────────────────────────────────────────
  const [overviewRows,    setOverviewRows]    = useState<DailyRow[]>([]);
  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError,   setOverviewError]   = useState<string | null>(null);

  const [opsData,    setOpsData]    = useState<OpsData | null>(null);
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsError,   setOpsError]   = useState<string | null>(null);

  const userId = user?.id ?? '';

  // ── Load overview (used by Overview, Growth, Engagement tabs) ────────────
  const loadOverview = useCallback(async () => {
    if (!userId) return;
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const params: Record<string, string> = { period };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await adminGet<any>('/api/v2/admin/analytics/overview', userId, params);
      const payload = res?.data ?? res;
      setOverviewRows(payload?.rows ?? []);
      setOverviewSummary(payload?.summary ?? null);
    } catch (e: any) {
      setOverviewError(e?.message ?? 'Failed to load overview');
    } finally {
      setOverviewLoading(false);
    }
  }, [userId, period, dateFrom, dateTo]);

  // ── Load ops ──────────────────────────────────────────────────────────────
  const loadOps = useCallback(async () => {
    if (!userId) return;
    setOpsLoading(true);
    setOpsError(null);
    try {
      const params: Record<string, string> = { period };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const res = await adminGet<any>('/api/v2/admin/analytics/ops', userId, params);
      const payload = res?.data ?? res;
      setOpsData(payload ?? null);
    } catch (e: any) {
      setOpsError(e?.message ?? 'Failed to load ops data');
    } finally {
      setOpsLoading(false);
    }
  }, [userId, period, dateFrom, dateTo]);

  // ── Load on mount and when filters change ─────────────────────────────────
  useEffect(() => {
    if (['overview', 'growth', 'engagement'].includes(tab)) {
      loadOverview();
    }
    if (tab === 'ops') {
      loadOps();
    }
  }, [tab, loadOverview, loadOps]);

  const handleRefresh = useCallback(() => {
    if (['overview', 'growth', 'engagement'].includes(tab)) loadOverview();
    if (tab === 'ops') loadOps();
  }, [tab, loadOverview, loadOps]);

  const isLoading = overviewLoading || opsLoading;

  // Never render blank: show loading when session not ready
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-slate-400 mt-3 text-sm">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Platform-wide metrics and performance data</p>
        </div>
        <PresetBar onApply={applyPreset} activePresetId={activePresetId} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-700">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Global filter bar */}
      <FilterBar
        period={period}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onPeriodChange={setPeriod}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRefresh={handleRefresh}
        loading={isLoading}
      />

      {/* Tab content */}
      {tab === 'overview' && (
        <OverviewTab
          rows={overviewRows}
          summary={overviewSummary}
          loading={overviewLoading}
          error={overviewError}
        />
      )}
      {tab === 'growth' && (
        <GrowthTab
          rows={overviewRows}
          summary={overviewSummary}
          loading={overviewLoading}
          error={overviewError}
        />
      )}
      {tab === 'referral' && (
        <ReferralTab period={period} userId={userId} />
      )}
      {tab === 'engagement' && (
        <EngagementTab
          rows={overviewRows}
          summary={overviewSummary}
          loading={overviewLoading}
          error={overviewError}
        />
      )}
      {tab === 'ops' && (
        <OpsTab ops={opsData} loading={opsLoading} error={opsError} />
      )}
    </div>
  );
};

export default AdminAnalyticsDashboard;
