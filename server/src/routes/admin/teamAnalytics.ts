/**
 * Team-Member Referral Analytics Routes
 *
 * GET  /api/v2/admin/analytics/team/leaderboard
 *      Full leaderboard with composite score, all metrics, filters, pagination.
 *
 * GET  /api/v2/admin/analytics/team/:memberId/scorecard
 *      Full scorecard for a single team member.
 *
 * GET  /api/v2/admin/analytics/team/:memberId/cohort
 *      Cohort table: referred users grouped by signup week/month,
 *      showing activation and retention rates per cohort.
 *
 * GET  /api/v2/admin/analytics/team/:memberId/trend
 *      Daily snapshot time-series for sparklines / trend charts.
 *
 * GET  /api/v2/admin/analytics/team/export/csv
 *      CSV export of leaderboard data.
 *
 * POST /api/v2/admin/analytics/team/backfill
 *      Trigger (re)computation of referral_daily_snapshots.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../../config/database';
import { logAdminAction } from './audit';
import {
  computeCompositeScore,
  getScoreBreakdown,
  DEFAULT_SCORING_WEIGHTS,
  ScorecardMetrics,
} from '../../constants/referralScoring';

export const teamAnalyticsRouter = Router();

// ─── helpers ──────────────────────────────────────────────────────────────────

let _viewConfirmed: boolean | null = null;

function periodToInterval(period: string): string | null {
  switch (period) {
    case '7d':  return '7 days';
    case '30d': return '30 days';
    case '90d': return '90 days';
    case 'all': return null;
    default:    return '30 days';
  }
}

/** Parse an ISO date from a query string, returning null on invalid input. */
function parseDate(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Build a referral scorecard row from the v_team_referral_scorecard columns,
 *  re-computing composite score with current DEFAULT_SCORING_WEIGHTS. */
function buildScorecardRow(raw: Record<string, any>) {
  const metrics: ScorecardMetrics = {
    qualifiedCount:             Number(raw.qualified_count            ?? 0),
    d7RetainedCount:            Number(raw.d7_retained_count          ?? 0),
    d30RetainedCount:           Number(raw.d30_retained_count         ?? 0),
    activatedCount:             Number(raw.activated_count            ?? 0),
    referredStakeVolume:        Number(raw.referred_stake_volume      ?? 0),
    referredPredictionsCreated: Number(raw.referred_predictions_created ?? 0),
    suspiciousSignupsCount:     Number(raw.suspicious_signups_count   ?? 0),
  };
  const compositeScore = computeCompositeScore(metrics);
  const scoreBreakdown = getScoreBreakdown(metrics);

  return {
    referrerId:                  raw.referrer_id,
    username:                    raw.username,
    fullName:                    raw.full_name,
    avatarUrl:                   raw.avatar_url,
    referralCode:                raw.referral_code,
    referrerJoinedAt:            raw.referrer_joined_at,

    // Click funnel
    totalClicks:                 Number(raw.total_clicks    ?? 0),
    uniqueIps:                   Number(raw.unique_ips      ?? 0),
    uniqueSessions:              Number(raw.unique_sessions ?? 0),
    clicks7d:                    Number(raw.clicks_7d       ?? 0),
    clicks30d:                   Number(raw.clicks_30d      ?? 0),

    // Signup funnel
    totalSignups:                Number(raw.total_signups           ?? 0),
    signups7d:                   Number(raw.signups_7d              ?? 0),
    signups30d:                  Number(raw.signups_30d             ?? 0),
    onboardingCompletions:       Number(raw.onboarding_completions  ?? 0),

    // Quality lifecycle
    activatedCount:              metrics.activatedCount,
    qualifiedCount:              metrics.qualifiedCount,
    d7RetainedCount:             metrics.d7RetainedCount,
    d30RetainedCount:            metrics.d30RetainedCount,
    activeReferrals30d:          Number(raw.active_referrals_30d    ?? 0),
    activeReferrals7d:           Number(raw.active_referrals_7d     ?? 0),

    // Economic impact
    referredStakeVolume:         metrics.referredStakeVolume,
    referredStakesCount:         Number(raw.referred_stakes_count       ?? 0),
    referredPredictionsCreated:  metrics.referredPredictionsCreated,
    referredCreatorEarnings:     Number(raw.referred_creator_earnings    ?? 0),

    // Social engagement
    referredCommentsCount:       Number(raw.referred_comments_count  ?? 0),
    referredLikesCount:          Number(raw.referred_likes_count     ?? 0),
    referredTagsCount:           Number(raw.referred_tags_count      ?? 0),

    // Anti-gaming
    suspiciousSignupsCount:      metrics.suspiciousSignupsCount,

    // Funnel rates (%)
    clickToSignupPct:            Number(raw.click_to_signup_pct      ?? 0),
    signupToActivationPct:       Number(raw.signup_to_activation_pct ?? 0),
    qualificationRatePct:        Number(raw.qualification_rate_pct   ?? 0),
    d7RetentionRatePct:          Number(raw.d7_retention_rate_pct    ?? 0),
    d30RetentionRatePct:         Number(raw.d30_retention_rate_pct   ?? 0),

    // Composite score (always recomputed from current weights)
    compositeScore,
    scoreBreakdown,
    scoringWeights: DEFAULT_SCORING_WEIGHTS,
  };
}

// ─── GET /leaderboard ─────────────────────────────────────────────────────────

teamAnalyticsRouter.get('/leaderboard', async (req: Request, res: Response) => {
  const {
    period   = '30d',
    dateFrom,
    dateTo,
    memberId,
    refCode,
    sort     = 'composite_score',
    sortDir  = 'desc',
    limit    = '50',
    offset   = '0',
  } = req.query as Record<string, string>;

  const parsedLimit  = Math.min(200, Math.max(1, Number(limit)  || 50));
  const parsedOffset = Math.max(0,            Number(offset) || 0);

  // Allowed sort columns (prevent SQL injection)
  const allowedSorts = new Set([
    'composite_score', 'total_signups', 'qualified_count', 'd7_retained_count',
    'd30_retained_count', 'activated_count', 'referred_stake_volume',
    'referred_predictions_created', 'click_to_signup_pct', 'qualification_rate_pct',
    'd30_retention_rate_pct', 'total_clicks',
  ]);
  const safeSort    = allowedSorts.has(sort)              ? sort    : 'composite_score';
  const safeSortDir = sortDir === 'asc'                   ? 'ASC'   : 'DESC';

  try {
    // Check if view exists
    if (_viewConfirmed === false) {
      return res.json({ data: { items: [], total: 0, scoringWeights: DEFAULT_SCORING_WEIGHTS } });
    }

    // Build date filter for signup attribution
    // When dateFrom/dateTo provided, use them; otherwise fall back to period.
    const from = parseDate(dateFrom) ?? (periodToInterval(period)
      ? new Date(Date.now() - Number(periodToInterval(period)!.split(' ')[0]) * 86400000)
          .toISOString().slice(0, 10)
      : null);
    const to   = parseDate(dateTo) ?? new Date().toISOString().slice(0, 10);

    // When date-filtering, we recompute from raw tables so the metrics
    // reflect the chosen cohort window (users who signed up in that window).
    // For "all" with no date filter, use the always-fresh view.
    const useRawQuery = from !== null;

    let items: any[];
    let total: number;

    if (!useRawQuery) {
      // ── All-time: use the pre-computed view ──────────────────────────────
      let query = supabase
        .from('v_team_referral_scorecard')
        .select('*', { count: 'exact' });

      if (memberId) query = query.eq('referrer_id', memberId);
      if (refCode)  query = query.eq('referral_code', refCode);

      // Supabase client doesn't support dynamic order on views perfectly;
      // use raw RPC / direct fetch for complex ordering — handled below.
      const { data, error, count } = await query
        .order(safeSort as any, { ascending: safeSortDir === 'ASC' })
        .range(parsedOffset, parsedOffset + parsedLimit - 1);

      if (error) {
        const code = String((error as any).code ?? '');
        const msg  = String((error as any).message ?? '').toLowerCase();
        if (code === '42P01' || msg.includes('does not exist')) {
          _viewConfirmed = false;
          return res.json({ data: { items: [], total: 0, scoringWeights: DEFAULT_SCORING_WEIGHTS } });
        }
        throw error;
      }

      _viewConfirmed = true;
      items = (data ?? []).map(buildScorecardRow);
      total = count ?? items.length;

    } else {
      // ── Date-filtered: query from raw tables with attribution window ──────
      // Uses referral_attributions WHERE attributed_at BETWEEN from AND to.
      // Metrics reflect referred users who signed up in that window.

      const { data, error } = await supabase.rpc('get_team_scorecard_filtered', {
        p_date_from:  from,
        p_date_to:    to,
        p_member_id:  memberId  || null,
        p_ref_code:   refCode   || null,
        p_sort:       safeSort,
        p_sort_dir:   safeSortDir,
        p_limit:      parsedLimit,
        p_offset:     parsedOffset,
      });

      if (error) {
        // Function might not exist — fall back to unfiltered view
        const code = String((error as any).code ?? '');
        if (code === '42883') {
          // Fall back: use view without date filter, log warning once
          console.warn('[TeamAnalytics] get_team_scorecard_filtered not available; using unfiltered view');
          const { data: fallback, error: fe } = await supabase
            .from('v_team_referral_scorecard')
            .select('*', { count: 'exact' })
            .order(safeSort as any, { ascending: safeSortDir === 'ASC' })
            .range(parsedOffset, parsedOffset + parsedLimit - 1);
          if (fe) throw fe;
          items = (fallback ?? []).map(buildScorecardRow);
          total = items.length;
        } else {
          throw error;
        }
      } else {
        items = ((data as any[]) ?? []).map(buildScorecardRow);
        total = items.length > 0 ? Number((data as any[])[0]?.total_count ?? items.length) : 0;
      }
    }

    // Re-sort by composite_score after re-computation (in case view score differs from TS score)
    if (safeSort === 'composite_score') {
      items.sort((a, b) =>
        safeSortDir === 'DESC'
          ? b.compositeScore - a.compositeScore
          : a.compositeScore - b.compositeScore
      );
    }

    return res.json({
      data: {
        items,
        total,
        period,
        dateFrom: from,
        dateTo:   to,
        limit:    parsedLimit,
        offset:   parsedOffset,
        sort:     safeSort,
        sortDir:  safeSortDir,
        scoringWeights: DEFAULT_SCORING_WEIGHTS,
      },
    });
  } catch (err: any) {
    console.error('[TeamAnalytics] leaderboard error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to load team leaderboard' });
  }
});


// ─── GET /:memberId/scorecard ─────────────────────────────────────────────────

teamAnalyticsRouter.get('/:memberId/scorecard', async (req: Request, res: Response) => {
  const { memberId } = req.params;

  try {
    const { data, error } = await supabase
      .from('v_team_referral_scorecard')
      .select('*')
      .eq('referrer_id', memberId)
      .maybeSingle();

    if (error) {
      const code = String((error as any).code ?? '');
      if (code === '42P01') {
        return res.json({ data: null, message: 'Analytics not yet available — run migration 347' });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Team member not found or has no referral activity' });
    }

    return res.json({ data: buildScorecardRow(data) });
  } catch (err: any) {
    console.error('[TeamAnalytics] scorecard error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to load scorecard' });
  }
});


// ─── GET /:memberId/cohort ────────────────────────────────────────────────────
//
// Returns referred-user cohorts grouped by signup week or month.
// Each cohort shows: size, activation rate, qualification rate,
// D7/D30 retention rate, and stake volume.
// This lets you compare the QUALITY of different acquisition cohorts
// for a single team member.

teamAnalyticsRouter.get('/:memberId/cohort', async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { granularity = 'week' } = req.query as Record<string, string>;

  const truncUnit = granularity === 'month' ? 'month' : 'week';

  try {
    // Query cohort data directly from raw tables
    const { data, error } = await supabase.rpc('get_referral_cohorts', {
      p_referrer_id:  memberId,
      p_trunc_unit:   truncUnit,
    });

    if (error) {
      const code = String((error as any).code ?? '');
      if (code === '42883') {
        // Function not available — run inline query via Supabase
        return res.json({ data: [], message: 'Cohort RPC not available; run migration 347' });
      }
      throw error;
    }

    // Shape the response
    const cohorts = ((data as any[]) ?? []).map((row) => ({
      cohortStart:         row.cohort_start,
      cohortSize:          Number(row.cohort_size          ?? 0),
      activatedCount:      Number(row.activated_count      ?? 0),
      activationRatePct:   Number(row.activation_rate_pct  ?? 0),
      qualifiedCount:      Number(row.qualified_count      ?? 0),
      qualificationRatePct:Number(row.qualification_rate_pct ?? 0),
      d7RetainedCount:     Number(row.d7_retained_count    ?? 0),
      d7RatePct:           Number(row.d7_rate_pct          ?? 0),
      d30RetainedCount:    Number(row.d30_retained_count   ?? 0),
      d30RatePct:          Number(row.d30_rate_pct         ?? 0),
      stakeVolume:         Number(row.stake_volume         ?? 0),
      suspiciousCount:     Number(row.suspicious_count     ?? 0),
    }));

    return res.json({ data: cohorts, granularity: truncUnit, referrerId: memberId });
  } catch (err: any) {
    console.error('[TeamAnalytics] cohort error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to load cohort data' });
  }
});


// ─── GET /:memberId/trend ─────────────────────────────────────────────────────
//
// Returns the daily referral_daily_snapshots for a single team member.
// Used to render sparklines and trend charts on the member detail page.

teamAnalyticsRouter.get('/:memberId/trend', async (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { period = '30d', dateFrom, dateTo } = req.query as Record<string, string>;

  const from = parseDate(dateFrom) ?? (() => {
    const interval = periodToInterval(period);
    if (!interval) return null;
    const days = Number(interval.split(' ')[0]);
    return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  })();
  const to = parseDate(dateTo) ?? new Date().toISOString().slice(0, 10);

  try {
    let query = supabase
      .from('referral_daily_snapshots')
      .select('*')
      .eq('referrer_id', memberId)
      .order('day', { ascending: true });

    if (from) query = query.gte('day', from);
    query = query.lte('day', to);

    const { data, error } = await query;

    if (error) {
      const code = String((error as any).code ?? '');
      if (code === '42P01') {
        return res.json({ data: [], message: 'Snapshots table not yet available' });
      }
      throw error;
    }

    const rows = (data ?? []).map((row) => ({
      day:                  row.day,
      clicksCount:          Number(row.clicks_count           ?? 0),
      uniqueIpsCount:       Number(row.unique_ips_count        ?? 0),
      uniqueSessionsCount:  Number(row.unique_sessions_count   ?? 0),
      signupsCount:         Number(row.signups_count           ?? 0),
      onboardingCompletions:Number(row.onboarding_completions  ?? 0),
      activatedCount:       Number(row.activated_count         ?? 0),
      qualifiedCount:       Number(row.qualified_count         ?? 0),
      d7RetainedCount:      Number(row.d7_retained_count       ?? 0),
      d30RetainedCount:     Number(row.d30_retained_count      ?? 0),
      stakeVolume:          Number(row.stake_volume            ?? 0),
      stakesCount:          Number(row.stakes_count            ?? 0),
      predictionsCreated:   Number(row.predictions_created     ?? 0),
      creatorEarnings:      Number(row.creator_earnings        ?? 0),
      commentsCount:        Number(row.comments_count          ?? 0),
      likesCount:           Number(row.likes_count             ?? 0),
      tagsCount:            Number(row.tags_count              ?? 0),
      suspiciousSignupsCount: Number(row.suspicious_signups_count ?? 0),
      compositeScore:       Number(row.composite_score         ?? 0),
    }));

    return res.json({ data: rows, referrerId: memberId, from, to });
  } catch (err: any) {
    console.error('[TeamAnalytics] trend error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to load trend data' });
  }
});


// ─── GET /export/csv ──────────────────────────────────────────────────────────

teamAnalyticsRouter.get('/export/csv', async (req: Request, res: Response) => {
  const {
    period  = 'all',
    dateFrom,
    dateTo,
    refCode,
    actorId,
  } = req.query as Record<string, string>;

  if (actorId) {
    logAdminAction({
      actorId,
      action: 'export_team_referral_csv',
      meta: { period, dateFrom, dateTo, refCode },
    }).catch(() => {});
  }

  try {
    let query = supabase
      .from('v_team_referral_scorecard')
      .select('*')
      .order('composite_score' as any, { ascending: false })
      .limit(5000);

    if (refCode) query = query.eq('referral_code', refCode);

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []).map(buildScorecardRow);

    const headers = [
      'referrer_id', 'username', 'full_name', 'referral_code', 'referrer_joined_at',
      'composite_score',
      'total_clicks', 'unique_ips', 'unique_sessions', 'clicks_7d', 'clicks_30d',
      'total_signups', 'signups_7d', 'signups_30d', 'onboarding_completions',
      'activated_count', 'qualified_count', 'd7_retained_count', 'd30_retained_count',
      'active_referrals_7d', 'active_referrals_30d',
      'click_to_signup_pct', 'signup_to_activation_pct',
      'qualification_rate_pct', 'd7_retention_rate_pct', 'd30_retention_rate_pct',
      'referred_stake_volume', 'referred_stakes_count',
      'referred_predictions_created', 'referred_creator_earnings',
      'referred_comments_count', 'referred_likes_count', 'referred_tags_count',
      'suspicious_signups_count',
    ];

    const csvLines = [
      headers.join(','),
      ...rows.map((r) => [
        r.referrerId, r.username ?? '', r.fullName ?? '', r.referralCode ?? '',
        r.referrerJoinedAt ?? '',
        r.compositeScore,
        r.totalClicks, r.uniqueIps, r.uniqueSessions, r.clicks7d, r.clicks30d,
        r.totalSignups, r.signups7d, r.signups30d, r.onboardingCompletions,
        r.activatedCount, r.qualifiedCount, r.d7RetainedCount, r.d30RetainedCount,
        r.activeReferrals7d, r.activeReferrals30d,
        r.clickToSignupPct, r.signupToActivationPct,
        r.qualificationRatePct, r.d7RetentionRatePct, r.d30RetentionRatePct,
        r.referredStakeVolume, r.referredStakesCount,
        r.referredPredictionsCreated, r.referredCreatorEarnings,
        r.referredCommentsCount, r.referredLikesCount, r.referredTagsCount,
        r.suspiciousSignupsCount,
      ].join(','))
    ];

    const filename = `team-referral-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvLines.join('\n'));
  } catch (err: any) {
    console.error('[TeamAnalytics] CSV export error:', err?.message ?? err);
    return res.status(500).json({ error: 'Failed to export CSV' });
  }
});


// ─── POST /backfill ────────────────────────────────────────────────────────────
//
// Triggers (re)computation of referral_daily_snapshots.
// Returns number of (referrer, day) rows processed.

teamAnalyticsRouter.post('/backfill', async (req: Request, res: Response) => {
  const { daysBack = 90, actorId } = req.body as { daysBack?: number; actorId?: string };

  const safeDaysBack = Math.min(365, Math.max(1, Number(daysBack) || 90));

  if (actorId) {
    logAdminAction({
      actorId,
      action: 'team_referral_backfill',
      meta: { daysBack: safeDaysBack },
    }).catch(() => {});
  }

  try {
    const { data, error } = await supabase.rpc('backfill_referral_snapshots', {
      p_days_back: safeDaysBack,
    });

    if (error) {
      const code = String((error as any).code ?? '');
      if (code === '42883') {
        return res.status(503).json({
          ok: false,
          error: 'backfill_referral_snapshots not available — run migration 347',
        });
      }
      throw error;
    }

    return res.json({ ok: true, data: { rowsProcessed: Number(data ?? 0), daysBack: safeDaysBack } });
  } catch (err: any) {
    console.error('[TeamAnalytics] backfill error:', err?.message ?? err);
    return res.status(500).json({ ok: false, error: 'Backfill failed' });
  }
});
