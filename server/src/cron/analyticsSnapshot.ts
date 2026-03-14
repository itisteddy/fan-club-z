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
    // Fail-open: never throw — cron and admin backfill must not break core API if analytics DB hiccups.
    const msg = String(error?.message || '');
    if (
      msg.includes('does not exist') ||
      msg.includes('schema cache') ||
      String(error?.code || '') === '42883'
    ) {
      console.warn('[Analytics] upsert_analytics_snapshot not available (migration 344 not run?):', msg);
      return;
    }
    console.error(`[Analytics] Snapshot RPC failed for ${day} (non-fatal):`, error);
    return;
  }
  console.log(`[Analytics] Snapshot upserted for ${day}`);
}

let _snapshotRunning = false;

/**
 * Main cron entry point.
 * Upserts yesterday's snapshot (safe to re-run; idempotent ON CONFLICT DO UPDATE).
 */
export async function runAnalyticsSnapshot(): Promise<void> {
  if (_snapshotRunning) {
    console.warn('[Analytics] Snapshot skipped (already running)');
    return;
  }
  _snapshotRunning = true;
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = yesterday.toISOString().slice(0, 10);

    console.log(`[Analytics] Running daily snapshot for ${day}`);
    await upsertDailySnapshot(day);
  } catch (err: any) {
    console.error('[Analytics] Snapshot unexpected error (non-fatal):', err?.message || err);
  } finally {
    _snapshotRunning = false;
  }
}
