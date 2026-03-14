/**
 * Retention + Qualified-Referral Compute Cron
 *
 * Runs daily (after the analytics snapshot cron) to:
 *  1. Compute user_activation_status for users who signed up recently
 *     (handles D1/D7/D30 retention windows that become computable each day)
 *  2. Compute compute_qualified_referrals for recently-attributed referrals
 *
 * Both Postgres functions are idempotent (ON CONFLICT DO UPDATE / UPDATE WHERE).
 * Errors are logged but never crash the server.
 */

import { supabase } from '../config/database';

/** Activation backfill RPC available (migration 346). Skips future runs if migration missing. */
let _activationRpcOk: boolean | null = null;
/** Qualified-referrals RPC available (migration 346). Skips future runs if migration missing. */
let _qualifiedRpcOk: boolean | null = null;

/**
 * Refresh activation/retention for users whose retention windows became
 * computable recently (i.e. signed up in last 31 days).
 */
export async function computeRecentRetention(daysBack = 31): Promise<void> {
  if ((_activationRpcOk as boolean | null) === false) return;

  try {
    const { error } = await supabase.rpc('backfill_user_activation_status', {
      p_days_back: daysBack,
    });

    if (error) {
      const code = String((error as any).code ?? '');
      const msg  = String((error as any).message ?? '').toLowerCase();

      if (code === '42883' || msg.includes('does not exist') || msg.includes('schema cache')) {
        if (_activationRpcOk !== false) {
          console.warn('[Retention] backfill_user_activation_status not available (run migration 346)');
          _activationRpcOk = false;
        }
        return;
      }
      console.error('[Retention] compute_recent_retention error:', error);
    } else {
      _activationRpcOk = true;
      console.log(`[Retention] User activation status updated for last ${daysBack} days`);
    }
  } catch (err: any) {
    console.error('[Retention] Unexpected error in computeRecentRetention:', err?.message ?? err);
  }
}

/**
 * Update qualified/retained flags for attributions within the last N days.
 */
export async function computeQualifiedReferrals(daysBack = 90): Promise<void> {
  if ((_qualifiedRpcOk as boolean | null) === false) return;

  try {
    const { data, error } = await supabase.rpc('compute_qualified_referrals', {
      p_days_back: daysBack,
    });

    if (error) {
      const code = String((error as any).code ?? '');
      const msg  = String((error as any).message ?? '').toLowerCase();

      if (code === '42883' || msg.includes('does not exist') || msg.includes('schema cache')) {
        if (_qualifiedRpcOk !== false) {
          console.warn('[Retention] compute_qualified_referrals not available (run migration 346)');
          _qualifiedRpcOk = false;
        }
        return;
      }
      console.error('[Retention] compute_qualified_referrals error:', error);
    } else {
      _qualifiedRpcOk = true;
      console.log(`[Retention] Qualified referrals computed — newly qualified: ${data ?? 0}`);
    }
  } catch (err: any) {
    console.error('[Retention] Unexpected error in computeQualifiedReferrals:', err?.message ?? err);
  }
}

let _snapshotsConfirmed: boolean | null = null;

/**
 * Refresh per-referrer daily snapshot rows for the last N days.
 * Requires migration 347 (referral_daily_snapshots + backfill_referral_snapshots).
 */
export async function computeReferralSnapshots(daysBack = 90): Promise<void> {
  if ((_snapshotsConfirmed as boolean | null) === false) return;

  try {
    const { data, error } = await supabase.rpc('backfill_referral_snapshots', {
      p_days_back: daysBack,
    });

    if (error) {
      const code = String((error as any).code ?? '');
      const msg  = String((error as any).message ?? '').toLowerCase();

      if (code === '42883' || msg.includes('does not exist') || msg.includes('schema cache')) {
        if (_snapshotsConfirmed !== false) {
          console.warn('[Retention] backfill_referral_snapshots not available (run migration 347)');
          _snapshotsConfirmed = false;
        }
        return;
      }
      console.error('[Retention] backfill_referral_snapshots error:', error);
    } else {
      _snapshotsConfirmed = true;
      console.log(`[Retention] Referral snapshots refreshed — rows: ${data ?? 0}`);
    }
  } catch (err: any) {
    console.error('[Retention] Unexpected error in computeReferralSnapshots:', err?.message ?? err);
  }
}

let _retentionRunning = false;

/**
 * Main cron entry point. Run after analyticsSnapshot.
 * Each step is isolated — one failure does not skip unrelated steps (separate RPC flags).
 */
export async function runRetentionCompute(): Promise<void> {
  if (_retentionRunning) {
    console.warn('[Retention] Skipped (already running)');
    return;
  }
  _retentionRunning = true;
  try {
    console.log('[Retention] Running daily retention + qualification compute');
    await computeRecentRetention(31);
    await computeQualifiedReferrals(90);
    await computeReferralSnapshots(90);
  } catch (e: any) {
    console.error('[Retention] runRetentionCompute unexpected (non-fatal):', e?.message ?? e);
  } finally {
    _retentionRunning = false;
  }
}
