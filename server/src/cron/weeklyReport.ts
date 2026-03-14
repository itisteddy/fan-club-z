/**
 * Weekly Analytics Report Cron
 *
 * Generates a structured JSON summary of the past 7 days and writes it to
 * the admin audit log (audit_log table). This provides a durable,
 * queryable record of weekly platform health without requiring PDF generation
 * or an external reporting service.
 *
 * The report payload can be extended in the future to:
 *  - POST to a Slack webhook (add SLACK_ANALYTICS_WEBHOOK_URL env var)
 *  - Email the operator team via SendGrid/Postmark
 *  - Persist to a dedicated weekly_reports table
 *
 * ── SCHEDULING ────────────────────────────────────────────────────────────────
 * This function is exported for use by the main cron scheduler.
 * Register it as: cron.schedule('0 8 * * 1', runWeeklyReport)  (every Monday 08:00 UTC)
 * See server/src/cron/index.ts (or similar) for the cron registration point.
 *
 * ── DATA SOURCES ──────────────────────────────────────────────────────────────
 * - analytics_daily_snapshots  → 7-day daily aggregates
 * - referral_daily_snapshots   → top-3 team members by composite score
 * - audit_log                  → write report record (self-referential)
 *
 * ── GRACEFUL DEGRADATION ─────────────────────────────────────────────────────
 * If any Supabase query fails (table missing, network error), the function logs
 * a warning and returns early without crashing the server.
 */

import { supabase } from '../config/database';

export interface WeeklyReportPayload {
  generatedAt:         string;   // ISO timestamp
  periodStart:         string;   // YYYY-MM-DD
  periodEnd:           string;   // YYYY-MM-DD
  newUsers:            number;
  activeUsers:         number;   // max single-day active users in period
  totalStakeVolume:    number;   // USD
  totalPayouts:        number;   // USD
  totalCreatorEarnings: number;  // USD
  platformTake:        number;   // USD = stake − payouts − earnings
  platformTakeRatePct: number | null;
  claimSuccessRatePct: number | null;
  referralSignups:     number;
  topReferrer: {
    memberId: string;
    score:    number;
    signups:  number;
  } | null;
  dataQualityNotes:    string[];
}

let _weeklyReportAvailable: boolean | null = null;

/**
 * Compute and persist a weekly report summary.
 * Safe to call multiple times — uses the current UTC week.
 */
export async function runWeeklyReport(): Promise<void> {
  if (_weeklyReportAvailable === false) {
    console.log('[WeeklyReport] Skipped — analytics tables not available');
    return;
  }

  const now = new Date();
  const periodEnd = now.toISOString().slice(0, 10);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const periodStart = sevenDaysAgo.toISOString().slice(0, 10);

  console.log(`[WeeklyReport] Generating weekly report for ${periodStart} → ${periodEnd}`);

  try {
    // ── 1. Fetch 7-day analytics snapshot rows ───────────────────────────────
    const { data: snapshotRows, error: snapshotErr } = await supabase
      .from('analytics_daily_snapshots')
      .select(
        'new_users_count, active_users_count, ' +
        'total_stake_amount, total_payout_amount, total_creator_earnings_amount, ' +
        'claim_completed_count, claim_failed_count, new_referral_signups'
      )
      .gte('day', periodStart)
      .lte('day', periodEnd)
      .order('day', { ascending: true });

    if (snapshotErr) {
      const code = String((snapshotErr as any).code ?? '');
      const msg  = String((snapshotErr as any).message ?? '').toLowerCase();
      if (code === '42P01' || msg.includes('does not exist')) {
        console.warn('[WeeklyReport] analytics_daily_snapshots not found — skipping (run migration 344)');
        _weeklyReportAvailable = false;
        return;
      }
      console.error('[WeeklyReport] snapshot query failed:', snapshotErr);
      return;
    }

    const rows = snapshotRows ?? [];
    const dataQualityNotes: string[] = [];

    if (rows.length === 0) {
      dataQualityNotes.push('No snapshot rows for this period — backfill may be needed.');
    }
    if (rows.length < 7) {
      dataQualityNotes.push(`Only ${rows.length}/7 snapshot days available — partial data.`);
    }

    // ── 2. Aggregate snapshot metrics ───────────────────────────────────────
    let newUsers       = 0;
    let maxActive      = 0;
    let totalStake     = 0;
    let totalPayout    = 0;
    let totalEarnings  = 0;
    let claimDone      = 0;
    let claimFailed    = 0;
    let refSignups     = 0;

    for (const r of rows as any[]) {
      newUsers    += Number(r.new_users_count               ?? 0);
      maxActive    = Math.max(maxActive, Number(r.active_users_count ?? 0));
      totalStake  += Number(r.total_stake_amount             ?? 0);
      totalPayout += Number(r.total_payout_amount            ?? 0);
      totalEarnings += Number(r.total_creator_earnings_amount ?? 0);
      claimDone   += Number(r.claim_completed_count          ?? 0);
      claimFailed += Number(r.claim_failed_count             ?? 0);
      refSignups  += Number(r.new_referral_signups           ?? 0);
    }

    const platformTake       = totalStake - totalPayout - totalEarnings;
    const totalClaims        = claimDone + claimFailed;
    const claimSuccessRate   = totalClaims > 0 ? Math.round((claimDone / totalClaims) * 10000) / 100 : null;
    const platformTakeRatePct = totalStake > 0 ? Math.round((platformTake / totalStake) * 10000) / 100 : null;

    if (claimSuccessRate != null && claimSuccessRate < 95) {
      dataQualityNotes.push(`Claim success rate below threshold: ${claimSuccessRate}% (threshold 95%)`);
    }

    // ── 3. Top team member from referral_daily_snapshots ───────────────────
    let topReferrer: WeeklyReportPayload['topReferrer'] = null;

    const { data: refRows, error: refErr } = await supabase
      .from('referral_daily_snapshots')
      .select('referrer_id, composite_score, signups_count')
      .gte('day', periodStart)
      .lte('day', periodEnd)
      .order('composite_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!refErr && refRows) {
      topReferrer = {
        memberId: (refRows as any).referrer_id,
        score:    Number((refRows as any).composite_score ?? 0),
        signups:  Number((refRows as any).signups_count  ?? 0),
      };
    } else if (refErr) {
      const code = String((refErr as any).code ?? '');
      if (code === '42P01') {
        dataQualityNotes.push('referral_daily_snapshots not found — run migration 347 for team referral data.');
      }
    }

    // ── 4. Build payload ────────────────────────────────────────────────────
    const payload: WeeklyReportPayload = {
      generatedAt:          now.toISOString(),
      periodStart,
      periodEnd,
      newUsers,
      activeUsers:          maxActive,
      totalStakeVolume:     totalStake,
      totalPayouts:         totalPayout,
      totalCreatorEarnings: totalEarnings,
      platformTake,
      platformTakeRatePct,
      claimSuccessRatePct:  claimSuccessRate,
      referralSignups:      refSignups,
      topReferrer,
      dataQualityNotes,
    };

    // ── 5. Persist to audit_log ──────────────────────────────────────────────
    const { error: logErr } = await supabase.from('audit_log').insert({
      actor_id:    '00000000-0000-0000-0000-000000000000', // system actor
      action:      'analytics.weekly_report',
      target_type: 'analytics',
      meta:        payload,
      created_at:  now.toISOString(),
    });

    if (logErr) {
      // Don't crash — just log; the report was computed successfully
      console.warn('[WeeklyReport] Could not persist to audit_log:', logErr.message);
    }

    _weeklyReportAvailable = true;
    console.log(
      `[WeeklyReport] Done — newUsers=${newUsers}, stakeVol=$${totalStake.toFixed(2)}, ` +
      `claimRate=${claimSuccessRate ?? 'n/a'}%, topReferrer=${topReferrer?.memberId ?? 'none'}`
    );

    // ── 6. (Future) Slack / email notification hook ──────────────────────────
    // If SLACK_ANALYTICS_WEBHOOK_URL is set, POST a formatted message here.
    // See docs/analytics/implementation-notes.md §7 for the extension pattern.
    const slackWebhook = process.env.SLACK_ANALYTICS_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        await postToSlack(slackWebhook, payload);
      } catch (slackErr: any) {
        console.warn('[WeeklyReport] Slack notification failed (non-fatal):', slackErr?.message);
      }
    }

  } catch (err: any) {
    console.error('[WeeklyReport] Unexpected error:', err?.message ?? err);
  }
}

/**
 * Post a brief Slack notification.
 * Only called when SLACK_ANALYTICS_WEBHOOK_URL is set.
 * Uses native fetch (Node 18+) — no extra dependency needed.
 */
async function postToSlack(webhookUrl: string, p: WeeklyReportPayload): Promise<void> {
  const body = {
    text: `*Fan Club Z – Weekly Report (${p.periodStart} → ${p.periodEnd})*`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*Fan Club Z – Weekly Report* (${p.periodStart} → ${p.periodEnd})`,
            `• New users: *${p.newUsers}*   Peak active: *${p.activeUsers}*`,
            `• Stake volume: *$${p.totalStakeVolume.toFixed(0)}*   Platform take: *$${p.platformTake.toFixed(0)}* (${p.platformTakeRatePct ?? '—'}%)`,
            `• Claim success: *${p.claimSuccessRatePct ?? '—'}%*   Referral signups: *${p.referralSignups}*`,
            p.topReferrer ? `• Top referrer this week: \`${p.topReferrer.memberId}\` (score ${p.topReferrer.score.toFixed(1)}, ${p.topReferrer.signups} signups)` : '',
            p.dataQualityNotes.length > 0 ? `⚠️ ${p.dataQualityNotes.join(' | ')}` : '',
          ].filter(Boolean).join('\n'),
        },
      },
    ],
  };

  const resp = await fetch(webhookUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Slack webhook returned ${resp.status}`);
  }
}
