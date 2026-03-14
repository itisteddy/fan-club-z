/**
 * Admin Analytics Routes
 *
 * GET /api/v2/admin/analytics/overview   – time-series daily snapshots
 * GET /api/v2/admin/analytics/referrals  – per-referrer scorecard
 * GET /api/v2/admin/analytics/economy    – wallet / economy breakdown
 * GET /api/v2/admin/analytics/export/csv – CSV download (referrals | users | transactions)
 * POST /api/v2/admin/analytics/backfill  – re-compute snapshots for a date range
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/database';
import { VERSION } from '@fanclubz/shared';
import { logAdminAction, getFallbackAdminActorId } from './audit';
import { upsertDailySnapshot } from '../../cron/analyticsSnapshot';

export const analyticsRouter = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

const VALID_PERIODS = ['7d', '30d', '90d', 'all'] as const;
type Period = typeof VALID_PERIODS[number];

function periodToDays(period: Period): number | null {
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  if (period === '90d') return 90;
  return null; // all
}

function periodToStartDate(period: Period): string | null {
  const days = periodToDays(period);
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isSchemaMismatch(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === '42703' || code === '42P01' || code === 'PGRST200' ||
    msg.includes('does not exist') || msg.includes('schema cache') ||
    msg.includes('could not find the')
  );
}

/** Escape a single CSV cell value (double-quote if needed). */
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvCell(row[h])).join(',')),
  ];
  return lines.join('\r\n');
}

// ─── GET /overview ────────────────────────────────────────────────────────────

const OverviewSchema = z.object({
  period: z.enum(VALID_PERIODS).default('30d'),
});

analyticsRouter.get('/overview', async (req, res) => {
  try {
    const parsed = OverviewSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid period', version: VERSION });
    }
    const { period } = parsed.data;
    const startDate = periodToStartDate(period);

    let query = supabase
      .from('analytics_daily_snapshots')
      .select('*')
      .order('day', { ascending: true });

    if (startDate) {
      query = query.gte('day', startDate);
    }

    const { data: rows, error } = await query;

    if (error) {
      if (isSchemaMismatch(error)) {
        // Table doesn't exist yet (migration not run) – return empty structure
        return res.json({ data: { rows: [], summary: null, period }, version: VERSION });
      }
      console.error('[Analytics/Overview] DB error:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message, version: VERSION });
    }

    const safeRows = rows || [];

    // Compute summary totals over the returned window
    const summary = safeRows.reduce(
      (acc, r: any) => {
        acc.total_new_users        += Number(r.new_users_count || 0);
        acc.total_stakes_count     += Number(r.total_stakes_count || 0);
        acc.total_stake_amount     += Number(r.total_stake_amount || 0);
        acc.total_payout_amount    += Number(r.total_payout_amount || 0);
        acc.total_creator_earnings += Number(r.total_creator_earnings_amount || 0);
        acc.total_comments         += Number(r.total_comments_count || 0);
        acc.total_deposits         += Number(r.total_deposits_amount || 0);
        acc.total_withdrawals      += Number(r.total_withdrawals_amount || 0);
        acc.total_new_referral_signups += Number(r.new_referral_signups || 0);
        // last row's cumulative user count = current total
        acc.cumulative_users        = Number(r.cumulative_users_count || 0);
        return acc;
      },
      {
        total_new_users: 0,
        total_stakes_count: 0,
        total_stake_amount: 0,
        total_payout_amount: 0,
        total_creator_earnings: 0,
        total_comments: 0,
        total_deposits: 0,
        total_withdrawals: 0,
        total_new_referral_signups: 0,
        cumulative_users: 0,
      }
    );

    return res.json({
      data: {
        rows: safeRows,
        summary,
        period,
        rowCount: safeRows.length,
      },
      version: VERSION,
    });
  } catch (err: any) {
    console.error('[Analytics/Overview] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message, version: VERSION });
  }
});

// ─── GET /referrals ──────────────────────────────────────────────────────────

const ReferralsSchema = z.object({
  period: z.enum(['7d', '30d', 'all']).default('30d'),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(['total_signups', 'active_referrals', 'referred_stake_total', 'conversion_rate_pct']).default('total_signups'),
});

analyticsRouter.get('/referrals', async (req, res) => {
  try {
    const parsed = ReferralsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid params', version: VERSION });
    }
    const { period, limit, offset, sort } = parsed.data;

    // Map period → column names in v_referral_performance
    const signupsCol    = period === 'all' ? 'total_signups'         : `signups_${period}`;
    const activeCol     = period === 'all' ? 'active_referrals_all'  : `active_referrals_${period}`;
    const sortCol       = sort === 'active_referrals' ? activeCol : sort;

    const { data, error, count } = await supabase
      .from('v_referral_performance')
      .select('*', { count: 'exact' })
      .order(sortCol, { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (isSchemaMismatch(error)) {
        return res.json({ data: { items: [], total: 0, period }, version: VERSION });
      }
      console.error('[Analytics/Referrals] DB error:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: error.message, version: VERSION });
    }

    const items = (data || []).map((r: any) => ({
      referrerId:            r.referrer_id,
      username:              r.username,
      fullName:              r.full_name,
      avatarUrl:             r.avatar_url,
      referrerJoinedAt:      r.referrer_joined_at,
      totalClicks:           Number(r.total_clicks || 0),
      clicks30d:             Number(r.clicks_30d || 0),
      clicks7d:              Number(r.clicks_7d || 0),
      totalSignups:          Number(r.total_signups || 0),
      signups30d:            Number(r.signups_30d || 0),
      signups7d:             Number(r.signups_7d || 0),
      activeReferralsAll:    Number(r.active_referrals_all || 0),
      activeReferrals30d:    Number(r.active_referrals_30d || 0),
      activeReferrals7d:     Number(r.active_referrals_7d || 0),
      referredStakeTotal:    Number(r.referred_stake_total || 0),
      referredStakesCount:   Number(r.referred_stakes_count || 0),
      conversionRatePct:     Number(r.conversion_rate_pct || 0),
      // Derived convenience fields for the selected period
      signupsInPeriod:       Number(r[signupsCol] || 0),
      activeInPeriod:        Number(r[activeCol] || 0),
    }));

    return res.json({
      data: {
        items,
        total: count || items.length,
        period,
        limit,
        offset,
      },
      version: VERSION,
    });
  } catch (err: any) {
    console.error('[Analytics/Referrals] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message, version: VERSION });
  }
});

// ─── GET /economy ────────────────────────────────────────────────────────────

const EconomySchema = z.object({
  period: z.enum(VALID_PERIODS).default('30d'),
});

analyticsRouter.get('/economy', async (req, res) => {
  try {
    const parsed = EconomySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid period', version: VERSION });
    }
    const { period } = parsed.data;
    const startDate = periodToStartDate(period);

    let query = supabase
      .from('analytics_daily_snapshots')
      .select(
        'day, total_stake_amount, total_payout_amount, total_creator_earnings_amount, ' +
        'total_deposits_amount, total_withdrawals_amount, total_net_flow'
      )
      .order('day', { ascending: true });

    if (startDate) query = query.gte('day', startDate);

    const { data: rows, error } = await query;

    if (error) {
      if (isSchemaMismatch(error)) {
        return res.json({ data: { rows: [], summary: null, period }, version: VERSION });
      }
      return res.status(500).json({ error: 'Internal Server Error', message: error.message, version: VERSION });
    }

    const safeRows = rows || [];
    const summary = safeRows.reduce(
      (acc, r: any) => {
        acc.total_stake_amount     += Number(r.total_stake_amount || 0);
        acc.total_payout_amount    += Number(r.total_payout_amount || 0);
        acc.total_creator_earnings += Number(r.total_creator_earnings_amount || 0);
        acc.total_deposits         += Number(r.total_deposits_amount || 0);
        acc.total_withdrawals      += Number(r.total_withdrawals_amount || 0);
        acc.net_flow               += Number(r.total_net_flow || 0);
        return acc;
      },
      {
        total_stake_amount: 0,
        total_payout_amount: 0,
        total_creator_earnings: 0,
        total_deposits: 0,
        total_withdrawals: 0,
        net_flow: 0,
      }
    );

    // Platform take = total_stake - total_payout - total_creator_earnings
    const platformTake =
      summary.total_stake_amount -
      summary.total_payout_amount -
      summary.total_creator_earnings;

    return res.json({
      data: {
        rows: safeRows,
        summary: { ...summary, platform_take: platformTake },
        period,
      },
      version: VERSION,
    });
  } catch (err: any) {
    console.error('[Analytics/Economy] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message, version: VERSION });
  }
});

// ─── GET /export/csv ──────────────────────────────────────────────────────────

const ExportSchema = z.object({
  type: z.enum(['referrals', 'users', 'snapshots']),
  period: z.enum([...VALID_PERIODS, '7d', '30d', '90d']).default('all'),
  limit: z.coerce.number().min(1).max(10000).default(5000),
});

analyticsRouter.get('/export/csv', async (req, res) => {
  try {
    const parsed = ExportSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid params', version: VERSION });
    }
    const { type, period, limit } = parsed.data;
    const startDate = periodToStartDate(period as Period);
    const actorId = (req.query.actorId as string) || (req.query.userId as string) || getFallbackAdminActorId() || '';

    let rows: Record<string, unknown>[] = [];
    let filename = `fanclubz_${type}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'referrals') {
      const { data, error } = await supabase
        .from('v_referral_performance')
        .select('*')
        .order('total_signups', { ascending: false })
        .limit(limit);
      if (error && !isSchemaMismatch(error)) {
        return res.status(500).json({ error: 'DB Error', message: error.message, version: VERSION });
      }
      rows = (data || []).map((r: any) => ({
        referrer_id:            r.referrer_id,
        username:               r.username,
        full_name:              r.full_name,
        referrer_joined_at:     r.referrer_joined_at,
        total_clicks:           r.total_clicks,
        total_signups:          r.total_signups,
        signups_30d:            r.signups_30d,
        active_referrals_all:   r.active_referrals_all,
        active_referrals_30d:   r.active_referrals_30d,
        referred_stake_total:   r.referred_stake_total,
        referred_stakes_count:  r.referred_stakes_count,
        conversion_rate_pct:    r.conversion_rate_pct,
      }));
    } else if (type === 'users') {
      let q = supabase
        .from('users')
        .select('id, username, full_name, email, created_at, last_login_at, referred_by, referral_code, is_admin')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (startDate) q = q.gte('created_at', startDate);
      const { data, error } = await q;
      if (error && !isSchemaMismatch(error)) {
        return res.status(500).json({ error: 'DB Error', message: error.message, version: VERSION });
      }
      rows = (data || []).map((u: any) => ({
        id:             u.id,
        username:       u.username,
        full_name:      u.full_name,
        email:          u.email,
        created_at:     u.created_at,
        last_login_at:  u.last_login_at,
        referral_code:  u.referral_code,
        referred_by:    u.referred_by,
        is_admin:       u.is_admin,
      }));
    } else if (type === 'snapshots') {
      let q = supabase
        .from('analytics_daily_snapshots')
        .select('*')
        .order('day', { ascending: false })
        .limit(limit);
      if (startDate) q = q.gte('day', startDate);
      const { data, error } = await q;
      if (error && !isSchemaMismatch(error)) {
        return res.status(500).json({ error: 'DB Error', message: error.message, version: VERSION });
      }
      rows = (data || []) as Record<string, unknown>[];
    }

    // Log export action
    if (actorId) {
      await logAdminAction({
        actorId,
        action: `analytics.export.${type}`,
        targetType: 'analytics',
        reason: 'csv_export',
        meta: { type, period, rowCount: rows.length },
      });
    }

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Row-Count', String(rows.length));
    return res.send(csv);
  } catch (err: any) {
    console.error('[Analytics/Export] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message, version: VERSION });
  }
});

// ─── POST /backfill ───────────────────────────────────────────────────────────

const BackfillSchema = z.object({
  startDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  actorId: z.string().uuid().optional(),
});

analyticsRouter.post('/backfill', async (req, res) => {
  try {
    const parsed = BackfillSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'startDay (YYYY-MM-DD) is required',
        details: parsed.error.issues,
        version: VERSION,
      });
    }
    const { startDay, actorId } = parsed.data;
    const endDay = parsed.data.endDay || new Date().toISOString().slice(0, 10);

    // Build list of days
    const days: string[] = [];
    const cursor = new Date(startDay);
    const end    = new Date(endDay);
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    if (days.length > 365) {
      return res.status(400).json({ error: 'Bad Request', message: 'Max 365 days per backfill', version: VERSION });
    }

    const results: { day: string; ok: boolean; error?: string }[] = [];
    for (const day of days) {
      try {
        await upsertDailySnapshot(day);
        results.push({ day, ok: true });
      } catch (e: any) {
        results.push({ day, ok: false, error: e?.message });
      }
    }

    const effectiveActorId = actorId || getFallbackAdminActorId();
    if (effectiveActorId) {
      await logAdminAction({
        actorId: effectiveActorId,
        action: 'analytics.backfill',
        targetType: 'analytics',
        meta: { startDay, endDay, daysProcessed: days.length },
      });
    }

    return res.json({
      ok: true,
      data: { daysProcessed: days.length, results },
      version: VERSION,
    });
  } catch (err: any) {
    console.error('[Analytics/Backfill] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message, version: VERSION });
  }
});
