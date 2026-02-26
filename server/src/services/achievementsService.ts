import { VERSION } from '@fanclubz/shared';
import { supabase } from '../config/database';
import { ensureDbPool } from '../utils/dbPool';

export type AwardWindow = '7d' | '30d' | 'all';
export type AwardDefinition = {
  key: string;
  title: string;
  description: string;
  metric: AwardMetric;
  direction: 'DESC';
  iconKey: string | null;
  isEnabled: boolean;
  sortOrder?: number;
};

export type AwardMetric =
  | 'creator_earnings_amount'
  | 'payouts_amount'
  | 'net_profit'
  | 'comments_count'
  | 'stakes_count'
  | 'markets_participated_count';

export type UserAwardCurrent = {
  awardKey: string;
  title: string;
  description: string;
  iconKey: string | null;
  metric: AwardMetric;
  window: AwardWindow;
  rank: number;
  score: number;
  computedAt: string;
};

export type UserBadge = {
  badgeKey: string;
  title: string;
  description: string;
  iconKey: string | null;
  earnedAt: string;
  metadata: Record<string, unknown>;
};

export type BadgeDefinition = {
  key: string;
  title: string;
  description: string;
  iconKey: string | null;
  isEnabled: boolean;
  sortOrder: number;
  isKey: boolean;
  progressMetric?: 'stakes_count' | 'comments_count' | 'creator_earnings_amount' | null;
  goalValue?: number | null;
};

export type AchievementsResponse = {
  userId: string;
  awardDefinitions: Array<{
    key: string;
    title: string;
    description: string;
    iconKey: string | null;
    metric: AwardMetric;
    metricLabel: string;
    sortOrder: number;
  }>;
  awards: UserAwardCurrent[];
  badgeDefinitions: Array<{
    key: string;
    title: string;
    description: string;
    iconKey: string | null;
    sortOrder: number;
    isKey: boolean;
    progressMetric?: 'stakes_count' | 'comments_count' | 'creator_earnings_amount' | null;
    goalValue?: number | null;
    currentValue?: number;
    progressPct?: number;
    progressLabel?: string;
    isEarned?: boolean;
  }>;
  badgesEarned: Array<{
    badgeKey: string;
    earnedAt: string;
    metadata: Record<string, unknown>;
  }>;
  // Back-compat (legacy clients)
  badges: UserBadge[];
  version: string;
};

const AWARD_METRICS: AwardMetric[] = [
  'creator_earnings_amount',
  'payouts_amount',
  'net_profit',
  'comments_count',
  'stakes_count',
  'markets_participated_count',
];

const BADGE_KEYS = ['FIRST_STAKE', 'TEN_STAKES', 'FIRST_COMMENT', 'FIRST_CREATOR_EARNING'] as const;
type BadgeProgressMetric = 'stakes_count' | 'comments_count' | 'creator_earnings_amount';

function assertAwardMetric(metric: string): AwardMetric {
  if (!AWARD_METRICS.includes(metric as AwardMetric)) {
    throw new Error(`Unsupported award metric: ${metric}`);
  }
  return metric as AwardMetric;
}

function metricLabelFor(metric: AwardMetric): string {
  switch (metric) {
    case 'creator_earnings_amount':
      return 'Creator earnings';
    case 'payouts_amount':
      return 'Payout total';
    case 'net_profit':
      return 'Net profit';
    case 'comments_count':
      return 'Comments';
    case 'markets_participated_count':
      return 'Markets participated';
    case 'stakes_count':
      return 'Stake actions';
    default:
      return 'Score';
  }
}

export function parseDateOnly(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export function rankAwardScores(rows: Array<{ userId: string; score: number }>): Array<{ userId: string; score: number; rank: number }> {
  const sorted = [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.userId.localeCompare(b.userId);
  });
  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

export function computeBadgeEligibility(rows: Array<{ userId: string; stakesCount: number; commentsCount: number; creatorEarningsAmount: number }>) {
  const out: Array<{ userId: string; badgeKey: typeof BADGE_KEYS[number] }> = [];
  for (const row of rows) {
    if (row.stakesCount > 0) out.push({ userId: row.userId, badgeKey: 'FIRST_STAKE' });
    if (row.stakesCount >= 10) out.push({ userId: row.userId, badgeKey: 'TEN_STAKES' });
    if (row.commentsCount >= 100) out.push({ userId: row.userId, badgeKey: 'FIRST_COMMENT' });
    if (row.creatorEarningsAmount >= 10) out.push({ userId: row.userId, badgeKey: 'FIRST_CREATOR_EARNING' });
  }
  return out;
}

type UserBadgeProgressStats = {
  userId: string;
  stakesCount: number;
  commentsCount: number;
  creatorEarningsAmount: number;
};

type BadgeEligibilityDefinition = {
  key: string;
  progressMetric: BadgeProgressMetric | null;
  goalValue: number | null;
};

function currentProgressValue(stats: UserBadgeProgressStats, metric: BadgeProgressMetric): number {
  switch (metric) {
    case 'stakes_count':
      return stats.stakesCount;
    case 'comments_count':
      return stats.commentsCount;
    case 'creator_earnings_amount':
      return stats.creatorEarningsAmount;
    default:
      return 0;
  }
}

function computeBadgeEligibilityFromDefinitions(
  rows: UserBadgeProgressStats[],
  definitions: BadgeEligibilityDefinition[],
): Array<{ userId: string; badgeKey: string }> {
  const out: Array<{ userId: string; badgeKey: string }> = [];
  for (const row of rows) {
    for (const def of definitions) {
      if (!def.progressMetric || def.goalValue == null || !Number.isFinite(def.goalValue)) continue;
      const current = currentProgressValue(row, def.progressMetric);
      if (current >= def.goalValue) out.push({ userId: row.userId, badgeKey: def.key });
    }
  }
  return out;
}

function formatBadgeProgressLabel(metric: BadgeProgressMetric | null | undefined, current: number, target: number): string {
  const safeCurrent = Math.max(0, current);
  const safeTarget = Math.max(0, target);
  if (metric === 'creator_earnings_amount') {
    return `${safeCurrent.toFixed(2)}/${safeTarget.toFixed(2)}`;
  }
  return `${Math.floor(safeCurrent)}/${Math.floor(safeTarget)}`;
}

function utcDayRange(day: string): { startIso: string; endIso: string } {
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function listDaysInclusive(startDay: string, endDay: string): string[] {
  const out: string[] = [];
  const d = new Date(`${startDay}T00:00:00.000Z`);
  const end = new Date(`${endDay}T00:00:00.000Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function requirePgPool() {
  const pool = await ensureDbPool();
  if (!pool) {
    throw new Error('DATABASE_URL not configured: achievements recompute requires direct PostgreSQL access');
  }
  return pool;
}

export async function recomputeUserStatsDaily(params?: { startDay?: string; endDay?: string; daysBack?: number }) {
  const today = new Date().toISOString().slice(0, 10);
  const endDay = parseDateOnly(params?.endDay) || today;
  const daysBack = Math.max(0, Math.min(params?.daysBack ?? 1, 365));
  const startDay = parseDateOnly(params?.startDay) || (() => {
    const d = new Date(`${endDay}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - daysBack);
    return d.toISOString().slice(0, 10);
  })();

  const days = listDaysInclusive(startDay, endDay);
  const pool = await requirePgPool();
  const client = await pool.connect();
  let processedDays = 0;
  try {
    await client.query('BEGIN');

    for (const day of days) {
      const { startIso, endIso } = utcDayRange(day);
      await client.query(
        `WITH stake_agg AS (
           SELECT
             user_id,
             COUNT(*)::numeric AS stakes_count,
             COUNT(DISTINCT prediction_id)::numeric AS markets_participated_count,
             COALESCE(SUM(amount), 0)::numeric AS stake_amount
           FROM position_stake_events
           WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
           GROUP BY user_id
         ),
         payout_agg AS (
           SELECT
             user_id,
             COALESCE(SUM(amount), 0)::numeric AS payouts_amount
           FROM wallet_transactions
           WHERE created_at >= $1::timestamptz
             AND created_at < $2::timestamptz
             AND COALESCE(direction, '') = 'credit'
             AND COALESCE(status, 'completed') = 'completed'
             AND (
               COALESCE(type, '') = 'payout'
               OR COALESCE(channel, '') IN ('payout', 'settlement_payout')
             )
           GROUP BY user_id
         ),
         creator_agg AS (
           SELECT
             user_id,
             COALESCE(SUM(amount), 0)::numeric AS creator_earnings_amount
           FROM wallet_transactions
           WHERE created_at >= $1::timestamptz
             AND created_at < $2::timestamptz
             AND COALESCE(direction, 'credit') = 'credit'
             AND COALESCE(status, 'completed') = 'completed'
             AND (
               COALESCE(to_account, '') = 'CREATOR_EARNINGS'
               OR UPPER(COALESCE(type, '')) = 'CREATOR_EARNING_CREDIT'
               OR COALESCE(channel, '') = 'creator_fee'
             )
             AND NOT (
               COALESCE(from_account, '') = 'CREATOR_EARNINGS'
               AND COALESCE(to_account, '') = 'STAKE'
             )
           GROUP BY user_id
         ),
         comment_agg AS (
           SELECT
             user_id,
             COUNT(*)::numeric AS comments_count
           FROM comments
           WHERE created_at >= $1::timestamptz
             AND created_at < $2::timestamptz
             AND COALESCE(is_deleted, false) = false
           GROUP BY user_id
         ),
         all_users AS (
           SELECT user_id FROM stake_agg
           UNION SELECT user_id FROM payout_agg
           UNION SELECT user_id FROM creator_agg
           UNION SELECT user_id FROM comment_agg
         )
         INSERT INTO user_stats_daily (
           user_id, day, stakes_count, markets_participated_count, stake_amount,
           payouts_amount, net_profit, creator_earnings_amount, comments_count, updated_at
         )
         SELECT
           u.user_id,
           $3::date AS day,
           COALESCE(s.stakes_count, 0),
           COALESCE(s.markets_participated_count, 0),
           COALESCE(s.stake_amount, 0),
           COALESCE(p.payouts_amount, 0),
           COALESCE(p.payouts_amount, 0) - COALESCE(s.stake_amount, 0),
           COALESCE(c.creator_earnings_amount, 0),
           COALESCE(cm.comments_count, 0),
           NOW()
         FROM all_users u
         LEFT JOIN stake_agg s ON s.user_id = u.user_id
         LEFT JOIN payout_agg p ON p.user_id = u.user_id
         LEFT JOIN creator_agg c ON c.user_id = u.user_id
         LEFT JOIN comment_agg cm ON cm.user_id = u.user_id
         ON CONFLICT (user_id, day)
         DO UPDATE SET
           stakes_count = EXCLUDED.stakes_count,
           markets_participated_count = EXCLUDED.markets_participated_count,
           stake_amount = EXCLUDED.stake_amount,
           payouts_amount = EXCLUDED.payouts_amount,
           net_profit = EXCLUDED.net_profit,
           creator_earnings_amount = EXCLUDED.creator_earnings_amount,
           comments_count = EXCLUDED.comments_count,
           updated_at = NOW()`,
        [startIso, endIso, day]
      );
      processedDays += 1;
    }

    await client.query('COMMIT');
    return { startDay, endDay, processedDays };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadAwardDefinitionsPg(client: any): Promise<AwardDefinition[]> {
  let rows: any[] = [];
  try {
    ({ rows } = await client.query(
      `SELECT key, title, description, metric, direction, icon_key, is_enabled, COALESCE(sort_order, 999) AS sort_order
       FROM award_definitions
       WHERE is_enabled = true
       ORDER BY COALESCE(sort_order, 999) ASC, key ASC`
    ));
  } catch (err: any) {
    if (String(err?.message || '').includes('sort_order')) {
      ({ rows } = await client.query(
        `SELECT key, title, description, metric, direction, icon_key, is_enabled
         FROM award_definitions
         WHERE is_enabled = true
         ORDER BY key ASC`
      ));
    } else {
      throw err;
    }
  }
  return rows.map((r: any) => ({
    key: String(r.key),
    title: String(r.title),
    description: String(r.description),
    metric: assertAwardMetric(String(r.metric)),
    direction: 'DESC',
    iconKey: r.icon_key ? String(r.icon_key) : null,
    isEnabled: Boolean(r.is_enabled),
    sortOrder: Number(r.sort_order ?? 999),
  }));
}

function isMissingColumnError(error: any, column: string): boolean {
  const msg = String(error?.message || '');
  const details = String(error?.details || '');
  return error?.code === '42703' || msg.includes(column) || details.includes(column);
}

function startDayForWindow(window: AwardWindow): string | null {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (window === 'all') return null;
  const days = window === '7d' ? 6 : 29;
  today.setUTCDate(today.getUTCDate() - days);
  return today.toISOString().slice(0, 10);
}

export async function computeAwardsCurrent(params?: { windows?: AwardWindow[]; topN?: number }) {
  const windows = (params?.windows?.length ? params.windows : ['7d', '30d', 'all']) as AwardWindow[];
  const topN = Math.max(1, Math.min(params?.topN ?? 50, 500));
  const pool = await requirePgPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const defs = await loadAwardDefinitionsPg(client);
    const computedAt = new Date().toISOString();
    let insertedRows = 0;

    for (const def of defs) {
      for (const window of windows) {
        const minDay = startDayForWindow(window);
        const metric = def.metric;
        const { rows } = await client.query(
          `SELECT user_id, COALESCE(SUM(${metric}), 0)::numeric AS score
           FROM user_stats_daily
           WHERE ($1::date IS NULL OR day >= $1::date)
           GROUP BY user_id
           HAVING COALESCE(SUM(${metric}), 0) > 0
           ORDER BY score DESC, user_id ASC
           LIMIT $2`,
          [minDay, topN]
        );

        const ranked = rankAwardScores(
          rows.map((r: any) => ({ userId: String(r.user_id), score: Number(r.score || 0) }))
        );

        await client.query('DELETE FROM user_awards_current WHERE award_key = $1 AND time_window = $2', [def.key, window]);

        for (const row of ranked) {
          await client.query(
            `INSERT INTO user_awards_current (award_key, time_window, user_id, rank, score, computed_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [def.key, window, row.userId, row.rank, row.score, computedAt]
          );
          insertedRows += 1;
        }
      }
    }

    await client.query('COMMIT');
    return { windows, topN, insertedRows, computedAt };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function evaluateAndAwardBadges() {
  const pool = await requirePgPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT
         user_id,
         COALESCE(SUM(stakes_count), 0)::numeric AS stakes_count,
         COALESCE(SUM(comments_count), 0)::numeric AS comments_count,
         COALESCE(SUM(creator_earnings_amount), 0)::numeric AS creator_earnings_amount
       FROM user_stats_daily
       GROUP BY user_id`
    );

    const aggregatedRows: UserBadgeProgressStats[] = rows.map((r: any) => ({
      userId: String(r.user_id),
      stakesCount: Number(r.stakes_count || 0),
      commentsCount: Number(r.comments_count || 0),
      creatorEarningsAmount: Number(r.creator_earnings_amount || 0),
    }));

    let eligible: Array<{ userId: string; badgeKey: string }> = [];
    try {
      const defsRes = await client.query(
        `SELECT key, progress_metric, goal_value
         FROM badge_definitions
         WHERE COALESCE(is_enabled, true) = true`
      );
      const defs: BadgeEligibilityDefinition[] = (defsRes.rows || []).map((r: any) => ({
        key: String(r.key),
        progressMetric: r.progress_metric ? String(r.progress_metric) as BadgeProgressMetric : null,
        goalValue: r.goal_value == null ? null : Number(r.goal_value),
      }));
      eligible = computeBadgeEligibilityFromDefinitions(aggregatedRows, defs);
    } catch (err: any) {
      // Compatibility fallback when migration 117 has not been applied yet.
      if (String(err?.message || '').includes('progress_metric') || String(err?.message || '').includes('goal_value')) {
        eligible = computeBadgeEligibility(aggregatedRows);
      } else {
        throw err;
      }
    }

    let inserted = 0;
    for (const row of eligible) {
      const result = await client.query(
        `INSERT INTO user_badges (user_id, badge_key, earned_at, metadata)
         VALUES ($1, $2, NOW(), $3::jsonb)
         ON CONFLICT (user_id, badge_key) DO NOTHING`,
        [row.userId, row.badgeKey, JSON.stringify({ source: 'user_stats_daily' })]
      );
      inserted += result.rowCount || 0;
    }

    await client.query('COMMIT');
    return { inserted, evaluatedUsers: rows.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function recomputeStatsAndAwards(params?: {
  startDay?: string;
  endDay?: string;
  daysBack?: number;
  windows?: AwardWindow[];
  topN?: number;
}) {
  const stats = await recomputeUserStatsDaily({
    startDay: params?.startDay,
    endDay: params?.endDay,
    daysBack: params?.daysBack,
  });
  const awards = await computeAwardsCurrent({ windows: params?.windows, topN: params?.topN });
  const badges = await evaluateAndAwardBadges();
  return { stats, awards, badges };
}

export async function getUserAchievements(userId: string): Promise<AchievementsResponse> {
  const windowSortRank: Record<AwardWindow, number> = { '7d': 0, '30d': 1, all: 2 };
  const awardsResPromise = supabase
    .from('user_awards_current')
    .select('award_key, time_window, rank, score, computed_at')
    .eq('user_id', userId)
    .order('time_window', { ascending: true })
    .order('rank', { ascending: true });

  const awardDefsResPromise = (async () => {
    const withSort = await supabase
      .from('award_definitions')
      .select('key, title, description, metric, icon_key, is_enabled, sort_order')
      .eq('is_enabled', true);
    if (!withSort.error) return withSort;
    if (!isMissingColumnError(withSort.error, 'sort_order')) return withSort;
    return supabase
      .from('award_definitions')
      .select('key, title, description, metric, icon_key, is_enabled')
      .eq('is_enabled', true);
  })();

  const userBadgesResPromise = supabase
    .from('user_badges')
    .select('badge_key, earned_at, metadata')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  const badgeDefsResPromise = (async () => {
    const withFields = await supabase
      .from('badge_definitions')
      .select('key, title, description, icon_key, is_enabled, sort_order, is_key, progress_metric, goal_value')
      .eq('is_enabled', true);
    if (!withFields.error) return withFields;
    if (
      !isMissingColumnError(withFields.error, 'sort_order') &&
      !isMissingColumnError(withFields.error, 'is_key') &&
      !isMissingColumnError(withFields.error, 'progress_metric') &&
      !isMissingColumnError(withFields.error, 'goal_value')
    ) {
      return withFields;
    }
    return supabase
      .from('badge_definitions')
      .select('key, title, description, icon_key, is_enabled')
      .eq('is_enabled', true);
  })();

  const userProgressResPromise = supabase
    .from('user_stats_daily')
    .select('stakes_count, comments_count, creator_earnings_amount')
    .eq('user_id', userId);

  const [awardsRes, awardDefsRes, userBadgesRes, badgeDefsRes, userProgressRes] = await Promise.all([
    awardsResPromise,
    awardDefsResPromise,
    userBadgesResPromise,
    badgeDefsResPromise,
    userProgressResPromise,
  ]);

  if (awardsRes.error) throw awardsRes.error;
  if (awardDefsRes.error) throw awardDefsRes.error;
  if (userBadgesRes.error) throw userBadgesRes.error;
  if (badgeDefsRes.error) throw badgeDefsRes.error;
  if (userProgressRes.error) throw userProgressRes.error;

  const awardDefByKey = new Map(
    (awardDefsRes.data || []).map((d: any) => [String(d.key), d])
  );
  const badgeDefByKey = new Map(
    (badgeDefsRes.data || []).map((d: any) => [String(d.key), d])
  );

  const awards: UserAwardCurrent[] = (awardsRes.data || [])
    .map((row: any) => {
      const def = awardDefByKey.get(String(row.award_key));
      if (!def) return null;
      return {
        awardKey: String(row.award_key),
        title: String(def.title),
        description: String(def.description),
        iconKey: def.icon_key ? String(def.icon_key) : null,
        metric: assertAwardMetric(String(def.metric)),
        window: row.time_window as AwardWindow,
        rank: Number(row.rank || 0),
        score: Number(row.score || 0),
        computedAt: String(row.computed_at),
      };
    })
    .filter(Boolean) as UserAwardCurrent[];

  awards.sort((a, b) => {
    const windowDiff = (windowSortRank[a.window] ?? 99) - (windowSortRank[b.window] ?? 99);
    if (windowDiff !== 0) return windowDiff;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.awardKey.localeCompare(b.awardKey);
  });

  const badges: UserBadge[] = (userBadgesRes.data || [])
    .map((row: any) => {
      const def = badgeDefByKey.get(String(row.badge_key));
      if (!def) return null;
      return {
        badgeKey: String(row.badge_key),
        title: String(def.title),
        description: String(def.description),
        iconKey: def.icon_key ? String(def.icon_key) : null,
        earnedAt: String(row.earned_at),
        metadata: (row.metadata || {}) as Record<string, unknown>,
      };
    })
    .filter(Boolean) as UserBadge[];

  const awardDefinitions = (awardDefsRes.data || [])
    .map((d: any) => {
      const metric = assertAwardMetric(String(d.metric));
      return {
        key: String(d.key),
        title: String(d.title),
        description: String(d.description),
        iconKey: d.icon_key ? String(d.icon_key) : null,
        metric,
        metricLabel: metricLabelFor(metric),
        sortOrder: Number(d.sort_order ?? 999),
      };
    })
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.key.localeCompare(b.key));

  const badgeDefinitions = (badgeDefsRes.data || [])
    .map((d: any) => ({
      key: String(d.key),
      title: String(d.title),
      description: String(d.description),
      iconKey: d.icon_key ? String(d.icon_key) : null,
      sortOrder: Number(d.sort_order ?? 999),
      isKey: d.is_key == null ? true : Boolean(d.is_key),
      progressMetric: d.progress_metric ? String(d.progress_metric) as BadgeProgressMetric : null,
      goalValue: d.goal_value == null ? null : Number(d.goal_value),
    }))
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.key.localeCompare(b.key));

  const badgesEarned = badges.map((b) => ({
    badgeKey: b.badgeKey,
    earnedAt: b.earnedAt,
    metadata: b.metadata,
  }));

  const progressRows = (userProgressRes.data || []) as Array<{
    stakes_count?: number | string | null;
    comments_count?: number | string | null;
    creator_earnings_amount?: number | string | null;
  }>;
  const userProgressStats: UserBadgeProgressStats = progressRows.reduce<UserBadgeProgressStats>(
    (acc, row) => {
      acc.stakesCount += Number(row.stakes_count || 0);
      acc.commentsCount += Number(row.comments_count || 0);
      acc.creatorEarningsAmount += Number(row.creator_earnings_amount || 0);
      return acc;
    },
    { userId, stakesCount: 0, commentsCount: 0, creatorEarningsAmount: 0 },
  );
  const earnedKeySet = new Set(badgesEarned.map((b) => b.badgeKey));
  const badgeDefinitionsWithProgress = badgeDefinitions.map((def) => {
    const currentValue = def.progressMetric ? currentProgressValue(userProgressStats, def.progressMetric) : 0;
    const goalValue = def.goalValue == null ? null : Number(def.goalValue);
    const isEarned = earnedKeySet.has(def.key);
    const progressPct = goalValue && goalValue > 0
      ? Math.max(0, Math.min(100, (currentValue / goalValue) * 100))
      : undefined;
    const progressLabel = goalValue && def.progressMetric
      ? formatBadgeProgressLabel(def.progressMetric, currentValue, goalValue)
      : undefined;
    return {
      ...def,
      currentValue,
      goalValue,
      progressPct,
      progressLabel,
      isEarned,
    };
  });

  return {
    userId,
    awardDefinitions,
    awards,
    badgeDefinitions: badgeDefinitionsWithProgress,
    badgesEarned,
    badges,
    version: VERSION,
  };
}
