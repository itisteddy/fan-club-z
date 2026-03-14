/**
 * Team Member Referral Detail Page
 *
 * Shows a full scorecard + cohort table + daily trend sparkline
 * for a single team member.
 *
 * Routes to: /admin/analytics/team/:memberId
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAuthSession } from '../../providers/AuthSessionProvider';
import { adminGet } from '@/lib/adminApi';
import {
  ArrowLeft, TrendingUp, Users, AlertTriangle,
  Star, Info, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scorecard {
  referrerId:                 string;
  username:                   string | null;
  fullName:                   string | null;
  avatarUrl:                  string | null;
  referralCode:               string | null;
  referrerJoinedAt:           string;
  compositeScore:             number;
  totalClicks:                number;
  uniqueIps:                  number;
  uniqueSessions:             number;
  totalSignups:               number;
  onboardingCompletions:      number;
  activatedCount:             number;
  qualifiedCount:             number;
  d7RetainedCount:            number;
  d30RetainedCount:           number;
  activeReferrals30d:         number;
  referredStakeVolume:        number;
  referredStakesCount:        number;
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

interface CohortRow {
  cohortStart:          string;
  cohortSize:           number;
  activatedCount:       number;
  activationRatePct:    number;
  qualifiedCount:       number;
  qualificationRatePct: number;
  d7RetainedCount:      number;
  d7RatePct:            number;
  d30RetainedCount:     number;
  d30RatePct:           number;
  stakeVolume:          number;
  suspiciousCount:      number;
}

interface TrendRow {
  day:                    string;
  clicksCount:            number;
  uniqueIpsCount:         number;
  signupsCount:           number;
  activatedCount:         number;
  qualifiedCount:         number;
  d7RetainedCount:        number;
  d30RetainedCount:       number;
  stakeVolume:            number;
  predictionsCreated:     number;
  commentsCount:          number;
  likesCount:             number;
  suspiciousSignupsCount: number;
  compositeScore:         number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt  = (n: number, dp = 0) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtUsd = (n: number) => n >= 1000 ? `$${fmt(n / 1000, 1)}k` : `$${fmt(n, 2)}`;
const fmtPct = (n: number) => `${fmt(n, 1)}%`;

function RateBadge({ pct, good = 20, great = 40 }: { pct: number; good?: number; great?: number }) {
  const color = pct >= great ? 'text-emerald-400' : pct >= good ? 'text-amber-400' : 'text-slate-400';
  return <span className={`font-mono text-sm ${color}`}>{fmtPct(pct)}</span>;
}

// Minimal SVG sparkline for a numeric series
function Sparkline({ values, color = '#34d399', height = 32 }: { values: number[]; color?: string; height?: number }) {
  if (values.length < 2) return <span className="text-slate-600 text-xs">—</span>;
  const max = Math.max(...values, 1);
  const w = 120;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${height - (v / max) * height}`).join(' ');
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Funnel bar ───────────────────────────────────────────────────────────────

function FunnelBar({
  label, count, total, color = 'bg-emerald-600',
}: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400 font-mono">{fmt(count)} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-2 ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PERIODS = ['7d', '30d', '90d', 'all'] as const;
type Period = typeof PERIODS[number];

export default function TeamMemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { user } = useAuthSession();
  const [params, setParams] = useSearchParams();

  const period      = (params.get('period') as Period) ?? '30d';
  const granularity = params.get('granularity') ?? 'week';

  const [scorecard,     setScorecard]     = useState<Scorecard | null>(null);
  const [cohorts,       setCohorts]       = useState<CohortRow[]>([]);
  const [trend,         setTrend]         = useState<TrendRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    setError(null);
    try {
      const [scRes, cohortRes, trendRes] = await Promise.all([
        adminGet<any>(`/api/v2/admin/analytics/team/${memberId}/scorecard`, user?.id ?? ''),
        adminGet<any>(`/api/v2/admin/analytics/team/${memberId}/cohort?granularity=${granularity}`, user?.id ?? ''),
        adminGet<any>(`/api/v2/admin/analytics/team/${memberId}/trend?period=${period}`, user?.id ?? ''),
      ]);
      setScorecard(scRes?.data ?? null);
      setCohorts(cohortRes?.data ?? []);
      setTrend(trendRes?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load member data');
    } finally {
      setLoading(false);
    }
  }, [memberId, period, granularity, user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const setParam = (key: string, val: string) => {
    setParams((p) => { const n = new URLSearchParams(p); n.set(key, val); return n; });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3" />
        Loading member data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm flex gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
      </div>
    );
  }

  if (!scorecard) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p>No referral activity found for this member.</p>
        <Link to="/admin/analytics/team" className="text-emerald-400 text-sm mt-2 inline-block hover:underline">
          ← Back to leaderboard
        </Link>
      </div>
    );
  }

  const sc = scorecard;
  const isSuspicious = sc.suspiciousSignupsCount > 0;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        to="/admin/analytics/team"
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Team Leaderboard
      </Link>

      {/* Member header */}
      <div className="flex items-start gap-4 flex-wrap">
        {sc.avatarUrl ? (
          <img src={sc.avatarUrl} alt="" className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center">
            <span className="text-xl text-slate-300">{(sc.username ?? sc.fullName ?? '?')[0].toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{sc.fullName ?? sc.username ?? 'Unknown'}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400 mt-1 flex-wrap">
            {sc.username && <span>@{sc.username}</span>}
            {sc.referralCode && (
              <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">
                code: {sc.referralCode}
              </span>
            )}
            <span>joined {new Date(sc.referrerJoinedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold font-mono ${
            sc.compositeScore >= 20 ? 'text-emerald-400'
            : sc.compositeScore >= 5  ? 'text-amber-400'
            : 'text-slate-400'
          }`}>
            {fmt(sc.compositeScore, 1)}
          </div>
          <div className="text-slate-500 text-xs">composite score</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50"
        >
          <span className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            Composite score breakdown
          </span>
          {showBreakdown
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </button>
        {showBreakdown && sc.scoreBreakdown && (
          <div className="px-4 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-slate-700">
                  <th className="text-left py-2 font-normal">Component</th>
                  <th className="text-right py-2 font-normal">Raw value</th>
                  <th className="text-right py-2 font-normal">Weight</th>
                  <th className="text-right py-2 font-normal">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sc.scoreBreakdown.map((b) => (
                  <tr key={b.label} className={b.subtotal < 0 ? 'text-red-400' : 'text-slate-300'}>
                    <td className="py-2">{b.label}</td>
                    <td className="text-right font-mono">{fmt(b.value, 2)}</td>
                    <td className="text-right font-mono text-slate-500">×{b.weight}</td>
                    <td className="text-right font-mono font-semibold">
                      {b.subtotal >= 0 ? '+' : ''}{fmt(b.subtotal, 2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-600 text-white font-semibold">
                  <td className="py-2 pt-3">Total</td>
                  <td />
                  <td />
                  <td className="text-right font-mono pt-3">
                    {fmt(sc.compositeScore, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Weights configurable in server/src/constants/referralScoring.ts — see docs/analytics/team-referral-scoring.md
            </p>
          </div>
        )}
      </div>

      {/* Anti-gaming alert */}
      {isSuspicious && (
        <div className="flex items-center gap-2 bg-red-950/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{sc.suspiciousSignupsCount} suspicious signup{sc.suspiciousSignupsCount > 1 ? 's' : ''}</strong> detected
            (device/IP rate limits exceeded at attribution time). These carry a –5 point penalty each in the composite score.
          </span>
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setParam('period', p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {(['week', 'month'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setParam('granularity', g)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                granularity === g ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              By {g}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Link clicks',      value: fmt(sc.totalClicks),          sub: `${fmt(sc.uniqueSessions)} unique sessions` },
          { label: 'Signups',          value: fmt(sc.totalSignups),         sub: `${fmtPct(sc.clickToSignupPct)} click→signup` },
          { label: 'Onboarding done',  value: fmt(sc.onboardingCompletions),sub: `${fmtPct(sc.signupToActivationPct)} → activated` },
          { label: 'Activated',        value: fmt(sc.activatedCount),       sub: 'first stake or prediction' },
          { label: 'Qualified',        value: fmt(sc.qualifiedCount),       sub: `${fmtPct(sc.qualificationRatePct)} of signups` },
          { label: 'D7 retained',      value: fmt(sc.d7RetainedCount),      sub: `${fmtPct(sc.d7RetentionRatePct)} rate` },
          { label: 'D30 retained',     value: fmt(sc.d30RetainedCount),     sub: `${fmtPct(sc.d30RetentionRatePct)} rate` },
          { label: 'Stake volume',     value: fmtUsd(sc.referredStakeVolume), sub: `${fmt(sc.referredStakesCount)} stakes` },
          { label: 'Predictions',      value: fmt(sc.referredPredictionsCreated), sub: 'created by referred' },
          { label: 'Creator earnings', value: fmtUsd(sc.referredCreatorEarnings), sub: 'earned by referred' },
          { label: 'Comments / likes', value: `${fmt(sc.referredCommentsCount)} / ${fmt(sc.referredLikesCount)}`, sub: `${fmt(sc.referredTagsCount)} tags` },
          { label: 'Unique IPs',       value: fmt(sc.uniqueIps),            sub: 'on referral clicks (anti-gaming)' },
        ].map((m) => (
          <div key={m.label} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">{m.label}</p>
            <p className="text-white font-semibold text-xl">{m.value}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Funnel visualization */}
      <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 space-y-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Referral Funnel (all-time)
        </h2>
        <FunnelBar label="Clicks"              count={sc.totalClicks}             total={sc.totalClicks}          color="bg-slate-500" />
        <FunnelBar label="Signups"             count={sc.totalSignups}            total={sc.totalClicks}          color="bg-blue-600" />
        <FunnelBar label="Onboarding complete" count={sc.onboardingCompletions}   total={sc.totalSignups}         color="bg-indigo-600" />
        <FunnelBar label="Activated"           count={sc.activatedCount}          total={sc.totalSignups}         color="bg-violet-600" />
        <FunnelBar label="Qualified (14d)"     count={sc.qualifiedCount}          total={sc.totalSignups}         color="bg-emerald-600" />
        <FunnelBar label="D7 retained"         count={sc.d7RetainedCount}         total={sc.totalSignups}         color="bg-teal-600" />
        <FunnelBar label="D30 retained"        count={sc.d30RetainedCount}        total={sc.totalSignups}         color="bg-cyan-600" />
      </div>

      {/* Trend sparklines */}
      {trend.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <h2 className="text-white font-semibold mb-4">Daily Trend ({period})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[
              { label: 'Signups / day',    key: 'signupsCount',    color: '#60a5fa' },
              { label: 'Qualified / day',  key: 'qualifiedCount',  color: '#34d399' },
              { label: 'Stake vol / day',  key: 'stakeVolume',     color: '#f59e0b' },
              { label: 'Clicks / day',     key: 'clicksCount',     color: '#a78bfa' },
              { label: 'D7 retained / day',key: 'd7RetainedCount', color: '#38bdf8' },
              { label: 'Score / day',      key: 'compositeScore',  color: '#fb923c' },
            ].map(({ label, key, color }) => {
              const vals = trend.map((r) => Number((r as any)[key] ?? 0));
              const total = vals.reduce((s, v) => s + v, 0);
              return (
                <div key={key}>
                  <p className="text-slate-400 text-xs mb-2">{label}</p>
                  <Sparkline values={vals} color={color} />
                  <p className="text-slate-500 text-[10px] mt-1">total: {fmt(total, 1)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cohort table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h2 className="text-white font-semibold">
            Referred-User Cohorts (by signup {granularity})
          </h2>
        </div>
        {cohorts.length === 0 ? (
          <p className="text-center py-8 text-slate-500 text-sm">No cohort data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-900/50 text-slate-400">
                <tr>
                  <th className="text-left px-4 py-2.5 whitespace-nowrap">
                    Cohort ({granularity === 'week' ? 'week of' : 'month'})
                  </th>
                  <th className="text-right px-3 py-2.5">Signups</th>
                  <th className="text-right px-3 py-2.5" title="Activated / cohort size">Activated</th>
                  <th className="text-right px-3 py-2.5">Act%</th>
                  <th className="text-right px-3 py-2.5" title="Qualified (≥2 active days + ≥1 economic action)">Qualified</th>
                  <th className="text-right px-3 py-2.5">Qual%</th>
                  <th className="text-right px-3 py-2.5">D7</th>
                  <th className="text-right px-3 py-2.5">D7%</th>
                  <th className="text-right px-3 py-2.5">D30</th>
                  <th className="text-right px-3 py-2.5">D30%</th>
                  <th className="text-right px-3 py-2.5">Stake vol</th>
                  <th className="text-right px-3 py-2.5 text-red-500" title="Suspicious-flagged signups">⚠ Suspicious</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {cohorts.map((c) => (
                  <tr key={c.cohortStart} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-2.5 text-slate-300 font-mono whitespace-nowrap">
                      {c.cohortStart
                        ? new Date(c.cohortStart).toLocaleDateString('en-US', {
                            month: 'short', day: granularity === 'week' ? 'numeric' : undefined,
                            year: granularity === 'month' ? 'numeric' : undefined,
                          })
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmt(c.cohortSize)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmt(c.activatedCount)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <RateBadge pct={c.activationRatePct} good={10} great={30} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-mono ${c.qualifiedCount > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                        {fmt(c.qualifiedCount)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <RateBadge pct={c.qualificationRatePct} good={10} great={25} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-blue-400 font-mono">{fmt(c.d7RetainedCount)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <RateBadge pct={c.d7RatePct} good={15} great={30} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-indigo-400 font-mono">{fmt(c.d30RetainedCount)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <RateBadge pct={c.d30RatePct} good={10} great={20} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{fmtUsd(c.stakeVolume)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {c.suspiciousCount > 0 ? (
                        <span className="text-red-400 font-mono font-semibold">{fmt(c.suspiciousCount)}</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Cohort data: D7 and D30 retention rates are only meaningful once the window has elapsed.
        Cohorts from the last 30 days may show 0% D30 retention until the window closes.
        <br />
        <Link to="/admin/analytics/team" className="text-slate-500 hover:text-slate-400 mt-1 inline-block">
          ← Team Leaderboard
        </Link>
      </p>
    </div>
  );
}
