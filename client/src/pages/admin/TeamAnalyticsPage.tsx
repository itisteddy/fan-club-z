/**
 * Team-Member Referral Analytics Leaderboard
 *
 * Shows all referrers ranked by composite score (quality-first).
 * Supports:
 *  - Date range / period filters
 *  - Team member name search
 *  - Referral code / UTM source filter
 *  - Sort by any metric column
 *  - CSV export
 *  - Pagination
 *  - Composite score breakdown tooltip
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { adminGet, adminPost, buildAdminUrl } from '@/lib/adminApi';
import { getAdminKey } from '@/components/admin/AdminGate';
import { useAdminFilter, ADMIN_PERIOD_LABELS } from '@/hooks/useAdminFilter';
import {
  ChevronDown, ChevronUp, ChevronsUpDown,
  Download, RefreshCw, AlertTriangle, Search, X,
  Info, TrendingUp, Users, Star,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScorecardRow {
  referrerId:                 string;
  username:                   string | null;
  fullName:                   string | null;
  avatarUrl:                  string | null;
  referralCode:               string | null;
  referrerJoinedAt:           string;
  compositeScore:             number;
  totalClicks:                number;
  uniqueSessions:             number;
  clicks7d:                   number;
  clicks30d:                  number;
  totalSignups:               number;
  signups7d:                  number;
  signups30d:                 number;
  onboardingCompletions:      number;
  activatedCount:             number;
  qualifiedCount:             number;
  d7RetainedCount:            number;
  d30RetainedCount:           number;
  activeReferrals30d:         number;
  referredStakeVolume:        number;
  referredPredictionsCreated: number;
  referredCreatorEarnings:    number;
  referredCommentsCount:      number;
  referredLikesCount:         number;
  referredTagsCount:          number;
  suspiciousSignupsCount:     number;
  clickToSignupPct:           number;
  signupToActivationPct:      number;
  qualificationRatePct:       number;
  d7RetentionRatePct:         number;
  d30RetentionRatePct:        number;
  scoreBreakdown:             Array<{ label: string; value: number; weight: number; subtotal: number }>;
}

interface ScoringWeights {
  qualifiedReferral: number;
  d7Retained: number;
  d30Retained: number;
  activated: number;
  stakeVolumePerTenDollars: number;
  predictionsCreated: number;
  suspiciousPenalty: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, dp = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

const fmtUsd = (n: number) =>
  n >= 1000 ? `$${fmt(n / 1000, 1)}k` : `$${fmt(n, 0)}`;

const fmtPct = (n: number) => `${fmt(n, 1)}%`;

type SortKey = string;

function SortIcon({ col, sort, dir }: { col: SortKey; sort: SortKey; dir: 'asc' | 'desc' }) {
  if (col !== sort) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
    : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />;
}

function RateBadge({ pct, good = 20, great = 40 }: { pct: number; good?: number; great?: number }) {
  const color =
    pct >= great ? 'text-emerald-400'
    : pct >= good ? 'text-amber-400'
    : 'text-slate-400';
  return <span className={`text-xs font-mono ${color}`}>{fmtPct(pct)}</span>;
}

// ─── Score tooltip ────────────────────────────────────────────────────────────

function ScoreTooltip({ breakdown, weights }: {
  breakdown: ScorecardRow['scoreBreakdown'];
  weights: ScoringWeights | undefined;
}) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72
                    bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 text-xs">
      <p className="text-slate-300 font-semibold mb-2">Score breakdown</p>
      <table className="w-full">
        <thead>
          <tr className="text-slate-500">
            <th className="text-left font-normal pb-1">Component</th>
            <th className="text-right font-normal pb-1">Value</th>
            <th className="text-right font-normal pb-1">Wt</th>
            <th className="text-right font-normal pb-1">Pts</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((b) => (
            <tr key={b.label} className={b.subtotal < 0 ? 'text-red-400' : 'text-slate-300'}>
              <td className="py-0.5 pr-2 truncate max-w-[130px]">{b.label}</td>
              <td className="text-right font-mono">{fmt(b.value, 1)}</td>
              <td className="text-right font-mono">×{b.weight}</td>
              <td className="text-right font-mono font-semibold">
                {b.subtotal >= 0 ? '+' : ''}{fmt(b.subtotal, 2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {weights && (
        <p className="mt-2 pt-2 border-t border-slate-700 text-slate-500 text-[10px]">
          Weights configurable in server/src/constants/referralScoring.ts
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 50;

const PERIODS = ['7d', '30d', '90d', 'all'] as const;
type Period = typeof PERIODS[number];

export default function TeamAnalyticsPage() {
  const { user } = useAuthSession();
  const [params, setParams] = useSearchParams();
  const { filter, setPeriod } = useAdminFilter();

  const period    = filter.period as Period;
  const sortCol   = params.get('sort')                 ?? 'composite_score';
  const sortDir   = (params.get('dir') as 'asc'|'desc') ?? 'desc';
  const pageParam = Number(params.get('page') ?? '0');
  const search    = params.get('search')               ?? '';
  const refCode   = params.get('refCode')              ?? '';

  const [rows,          setRows]          = useState<ScorecardRow[]>([]);
  const [total,         setTotal]         = useState(0);
  const [weights,       setWeights]       = useState<ScoringWeights | undefined>();
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [exporting,     setExporting]     = useState(false);
  const [backfilling,   setBackfilling]   = useState(false);
  const [backfillMsg,   setBackfillMsg]   = useState<string | null>(null);
  const [tooltipRowId,  setTooltipRowId]  = useState<string | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        period,
        sort:   sortCol,
        sortDir,
        limit:  String(ROWS_PER_PAGE),
        offset: String(pageParam * ROWS_PER_PAGE),
        ...(refCode ? { refCode } : {}),
      });
      const data = await adminGet<any>(`/api/v2/admin/analytics/team/leaderboard?${qs}`, user?.id ?? '');
      const result = data?.data ?? data;
      setRows(result?.items  ?? []);
      setTotal(result?.total ?? 0);
      setWeights(result?.scoringWeights);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [period, sortCol, sortDir, pageParam, refCode, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setParam = (key: string, val: string) => {
    setParams((p) => { const n = new URLSearchParams(p); n.set(key, val); if (key !== 'page') n.set('page', '0'); return n; });
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setParam('dir', sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setParams((p) => { const n = new URLSearchParams(p); n.set('sort', col); n.set('dir', 'desc'); n.set('page', '0'); return n; });
    }
  };

  // Client-side search filter (filtering on already-loaded page)
  const filtered = search
    ? rows.filter((r) =>
        (r.username ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.fullName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.referralCode ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = buildAdminUrl('/api/v2/admin/analytics/team/export/csv', user?.id ?? '', {
        period,
        ...(refCode ? { refCode } : {}),
      });
      const adminKey = getAdminKey();
      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: adminKey ? { 'x-admin-key': adminKey } : {},
      });
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `team-referral-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch (e: any) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const result = await adminPost<any>('/api/v2/admin/analytics/team/backfill', user?.id ?? '', { daysBack: 90 });
      setBackfillMsg(`Backfill complete — ${result?.data?.rowsProcessed ?? '?'} rows recomputed`);
      fetchData();
    } catch (e: any) {
      setBackfillMsg(`Backfill failed: ${e?.message ?? 'Unknown error'}`);
    } finally {
      setBackfilling(false);
    }
  };

  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  // Summary totals across loaded rows
  const summary = rows.reduce(
    (acc, r) => ({
      signups:   acc.signups   + r.totalSignups,
      qualified: acc.qualified + r.qualifiedCount,
      d30:       acc.d30       + r.d30RetainedCount,
      volume:    acc.volume    + r.referredStakeVolume,
      suspicious: acc.suspicious + r.suspiciousSignupsCount,
    }),
    { signups: 0, qualified: 0, d30: 0, volume: 0, suspicious: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400" />
            Team Referral Leaderboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Ranked by composite quality score — rewards retention over raw signup volume
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBackfill}
            disabled={backfilling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${backfilling ? 'animate-spin' : ''}`} />
            {backfilling ? 'Backfilling…' : 'Recompute (90d)'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {backfillMsg && (
        <div className="text-xs text-emerald-300 bg-emerald-900/30 border border-emerald-700 rounded px-3 py-2">
          {backfillMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Period selector */}
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {ADMIN_PERIOD_LABELS[p] ?? p}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search member or code…"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48"
          />
          {search && (
            <button onClick={() => setParam('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        {/* Ref code filter */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter by ref code…"
            value={refCode}
            onChange={(e) => setParam('refCode', e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-40"
          />
          {refCode && (
            <button onClick={() => setParam('refCode', '')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-white" />
            </button>
          )}
        </div>

        {total > 0 && (
          <span className="text-slate-500 text-xs ml-auto">
            {total} referrer{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total signups', value: fmt(summary.signups), icon: <Users className="w-4 h-4" /> },
            { label: 'Qualified', value: fmt(summary.qualified), icon: <Star className="w-4 h-4 text-amber-400" /> },
            { label: 'D30 retained', value: fmt(summary.d30), icon: <TrendingUp className="w-4 h-4 text-blue-400" /> },
            { label: 'Stake volume', value: fmtUsd(summary.volume), icon: null },
            { label: 'Suspicious flags', value: fmt(summary.suspicious),
              icon: summary.suspicious > 0 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : null },
          ].map((c) => (
            <div key={c.label} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                {c.icon}
                {c.label}
              </div>
              <p className="text-white font-semibold text-lg">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-800 rounded p-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Scoring weights info */}
      {weights && (
        <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
          <Info className="w-4 h-4 flex-shrink-0 text-slate-500 mt-0.5" />
          <span>
            Composite score formula: qualified ×{weights.qualifiedReferral} + D7 ×{weights.d7Retained} +
            D30 ×{weights.d30Retained} + activated ×{weights.activated} +
            stake/10 ×{weights.stakeVolumePerTenDollars} + predictions ×{weights.predictionsCreated} +
            suspicious ×{weights.suspiciousPenalty}.{' '}
            <Link to="/admin/analytics" className="text-emerald-400 hover:underline">
              Weights configurable in code
            </Link> — see docs/analytics/team-referral-scoring.md.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 text-xs">
            <tr>
              <th className="text-left px-3 py-2.5 sticky left-0 bg-slate-800 z-10 w-10">#</th>
              <th className="text-left px-3 py-2.5 sticky left-10 bg-slate-800 z-10 min-w-[160px]">Member</th>

              {/* Composite score — always first metric column */}
              {[
                { key: 'composite_score',       label: 'Score',      title: 'Composite quality score (higher = better quality referrals)' },
                { key: 'total_signups',          label: 'Signups',    title: 'Total referred signups all-time' },
                { key: 'activated_count',        label: 'Activated',  title: 'Referred users who placed a stake or created a prediction' },
                { key: 'qualified_count',        label: 'Qualified',  title: '≥2 active days + ≥1 economic action within 14d' },
                { key: 'd7_retained_count',      label: 'D7',         title: 'D7-retained: logged in during days 1–7 after signup' },
                { key: 'd30_retained_count',     label: 'D30',        title: 'D30-retained: logged in during days 1–30 after signup' },
                { key: 'qualification_rate_pct', label: 'Qual%',      title: 'qualified / signups × 100' },
                { key: 'd30_retention_rate_pct', label: 'D30%',       title: 'd30_retained / signups × 100' },
                { key: 'total_clicks',           label: 'Clicks',     title: 'Total link clicks recorded in referral_clicks' },
                { key: 'click_to_signup_pct',    label: 'Click→Sign', title: 'signups / clicks × 100' },
                { key: 'referred_stake_volume',  label: 'Vol',        title: 'Total stake volume by referred users' },
              ].map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-right cursor-pointer select-none whitespace-nowrap hover:text-white"
                  title={col.title}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} sort={sortCol} dir={sortDir} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-center">Anti-gaming</th>
              <th className="px-3 py-2.5 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading && (
              <tr>
                <td colSpan={15} className="text-center py-12 text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={15} className="text-center py-12 text-slate-500">
                  {search ? 'No members match your search.' : 'No referral data yet. Click "Recompute" to backfill.'}
                </td>
              </tr>
            )}
            {!loading && filtered.map((row, i) => {
              const rank = pageParam * ROWS_PER_PAGE + i + 1;
              const isSuspicious = row.suspiciousSignupsCount > 0;

              return (
                <tr
                  key={row.referrerId}
                  className={`hover:bg-slate-800/60 transition-colors ${isSuspicious ? 'bg-red-950/20' : ''}`}
                >
                  <td className="px-3 py-2.5 text-slate-500 sticky left-0 bg-slate-900 z-10">
                    {rank}
                  </td>

                  {/* Member info */}
                  <td className="px-3 py-2.5 sticky left-10 bg-slate-900 z-10">
                    <div className="flex items-center gap-2">
                      {row.avatarUrl ? (
                        <img src={row.avatarUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-slate-300">
                            {(row.username ?? row.fullName ?? '?')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate max-w-[120px]">
                          {row.fullName ?? row.username ?? 'Unknown'}
                        </p>
                        {row.referralCode && (
                          <p className="text-slate-500 text-[10px] font-mono truncate">{row.referralCode}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Composite score — with tooltip */}
                  <td className="px-3 py-2.5 text-right">
                    <div
                      className="relative inline-block"
                      onMouseEnter={() => {
                        clearTimeout(tooltipTimer.current);
                        setTooltipRowId(row.referrerId);
                      }}
                      onMouseLeave={() => {
                        tooltipTimer.current = setTimeout(() => setTooltipRowId(null), 200);
                      }}
                    >
                      <span className={`font-bold font-mono cursor-help ${
                        row.compositeScore >= 20 ? 'text-emerald-400'
                        : row.compositeScore >= 5  ? 'text-amber-400'
                        : 'text-slate-400'
                      }`}>
                        {fmt(row.compositeScore, 1)}
                      </span>
                      {tooltipRowId === row.referrerId && row.scoreBreakdown && (
                        <ScoreTooltip breakdown={row.scoreBreakdown} weights={weights} />
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2.5 text-right text-slate-300 font-mono text-xs">{fmt(row.totalSignups)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-300 font-mono text-xs">{fmt(row.activatedCount)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`font-mono text-xs ${row.qualifiedCount > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                      {fmt(row.qualifiedCount)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-blue-400 font-mono text-xs">{fmt(row.d7RetainedCount)}</td>
                  <td className="px-3 py-2.5 text-right text-indigo-400 font-mono text-xs">{fmt(row.d30RetainedCount)}</td>
                  <td className="px-3 py-2.5 text-right"><RateBadge pct={row.qualificationRatePct} good={10} great={25} /></td>
                  <td className="px-3 py-2.5 text-right"><RateBadge pct={row.d30RetentionRatePct} good={15} great={30} /></td>
                  <td className="px-3 py-2.5 text-right text-slate-400 font-mono text-xs">{fmt(row.totalClicks)}</td>
                  <td className="px-3 py-2.5 text-right"><RateBadge pct={row.clickToSignupPct} good={5} great={15} /></td>
                  <td className="px-3 py-2.5 text-right text-slate-300 font-mono text-xs">{fmtUsd(row.referredStakeVolume)}</td>

                  {/* Anti-gaming */}
                  <td className="px-3 py-2.5 text-center">
                    {isSuspicious ? (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {row.suspiciousSignupsCount}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>

                  {/* Detail link */}
                  <td className="px-3 py-2.5 text-right">
                    <Link
                      to={`/admin/analytics/team/${row.referrerId}`}
                      className="text-emerald-400 hover:text-emerald-300 text-xs hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {pageParam * ROWS_PER_PAGE + 1}–{Math.min((pageParam + 1) * ROWS_PER_PAGE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pageParam === 0}
              onClick={() => setParam('page', String(pageParam - 1))}
              className="px-3 py-1.5 rounded bg-slate-800 disabled:opacity-40 hover:bg-slate-700"
            >
              ← Prev
            </button>
            <button
              disabled={pageParam >= totalPages - 1}
              onClick={() => setParam('page', String(pageParam + 1))}
              className="px-3 py-1.5 rounded bg-slate-800 disabled:opacity-40 hover:bg-slate-700"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-slate-600">
        Data refreshed nightly by the retention cron.{' '}
        <Link to="/admin/analytics" className="text-slate-500 hover:text-slate-400">
          ← Platform overview
        </Link>
        {' · '}
        <Link to="/admin/analytics/referrals" className="text-slate-500 hover:text-slate-400">
          Referral scorecards
        </Link>
      </p>
    </div>
  );
}
