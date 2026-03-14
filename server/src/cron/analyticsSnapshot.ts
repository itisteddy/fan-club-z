/**
 * Analytics Snapshot Cron Job
 *
 * Runs daily (after the achievements recompute) to populate
 * analytics_daily_snapshots with platform-wide aggregates.
 *
 * Exported: upsertDailySnapshot(day) – also used by the /admin/analytics/backfill route.
 */

import { supabase } from '../config/database';

/**
 * Upsert the analytics snapshot for a single calendar day (YYYY-MM-DD).
 * Calls the upsert_analytics_snapshot Postgres function defined in migration 344.
 */
export async function upsertDailySnapshot(day: string): Promise<void> {
  const { error } = await supabase.rpc('upsert_analytics_snapshot', { p_day: day });
  if (error) {
    // If the function/table doesn't exist yet (migration not run), warn but don't crash.
    const msg = String(error?.message || '');
    if (
      msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      String(error?.code || '') === '42883' // undefined_function
    ) {
      console.warn('[Analytics] upsert_analytics_snapshot not available (migration 344 not run?):', msg);
      return;
    }
    throw error;
  }
  console.log(`[Analytics] Snapshot upserted for ${day}`);
}

/**
 * Main cron entry point.
 * Upserts yesterday's snapshot (safe to re-run; idempotent ON CONFLICT DO UPDATE).
 */
export async function runAnalyticsSnapshot(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);

  console.log(`[Analytics] Running daily snapshot for ${day}`);
  try {
    await upsertDailySnapshot(day);
  } catch (err: any) {
    console.error(`[Analytics] Snapshot failed for ${day}:`, err?.message || err);
  }
}
