/**
 * Team-Member Referral Composite Scoring
 *
 * The composite score ranks team members by referral QUALITY, not raw volume.
 * It is intentionally structured so that:
 *   - You cannot win by generating clicks or signups that don't convert
 *   - Retention (D30) carries the highest per-unit weight
 *   - Suspicious / low-quality signups subtract from the score
 *
 * ─── HOW TO CHANGE WEIGHTS ───────────────────────────────────────────────────
 * 1. Update DEFAULT_SCORING_WEIGHTS below.
 * 2. Also update the composite_score expression in the SQL view
 *    v_team_referral_scorecard (migration 347) to keep DB-side pre-computation
 *    consistent with the API-side live computation.
 * 3. Re-run the referral snapshot backfill from the admin UI to regenerate
 *    pre-computed scores in referral_daily_snapshots.
 *
 * See docs/analytics/team-referral-scoring.md for full formula documentation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Per-unit weights for the composite score formula. */
export interface ScoringWeights {
  /** Points per qualified referral (≥ 2 active days + ≥ 1 economic action within 14 d) */
  qualifiedReferral: number;
  /** Points per D7-retained referral */
  d7Retained: number;
  /** Points per D30-retained referral (highest weight — strongest signal) */
  d30Retained: number;
  /** Points per activated referral (first stake or first prediction created) */
  activated: number;
  /** Points per $10 of referred stake volume (e.g. $100 stake = 1 point) */
  stakeVolumePerTenDollars: number;
  /** Points per prediction created by a referred user */
  predictionsCreated: number;
  /**
   * Penalty per suspicious-flagged signup.
   * Suspicious = exceeded device-fingerprint or IP rate limit at attribution time.
   * Value should be negative (e.g. -5.0).
   */
  suspiciousPenalty: number;
}

/**
 * Default scoring weights.
 *
 * IMPORTANT: The SQL view v_team_referral_scorecard (migration 347) hard-codes
 * these same values in its composite_score expression. If you change them here,
 * update the view too and re-run the admin backfill.
 */
export const DEFAULT_SCORING_WEIGHTS: Readonly<ScoringWeights> = {
  qualifiedReferral:         3.0,
  d7Retained:                2.0,
  d30Retained:               5.0,
  activated:                 1.5,
  stakeVolumePerTenDollars:  0.1,
  predictionsCreated:        0.5,
  suspiciousPenalty:        -5.0,
} as const;

/** Raw metrics needed to compute the composite score. */
export interface ScorecardMetrics {
  qualifiedCount:              number;
  d7RetainedCount:             number;
  d30RetainedCount:            number;
  activatedCount:              number;
  referredStakeVolume:         number;
  referredPredictionsCreated:  number;
  suspiciousSignupsCount:      number;
}

/**
 * Compute composite score from raw metrics and optional weight overrides.
 *
 * Formula:
 *   score = qualifiedCount           * qualifiedReferral
 *         + d7RetainedCount          * d7Retained
 *         + d30RetainedCount         * d30Retained
 *         + activatedCount           * activated
 *         + (stakeVolume / 10) * stakeVolumePerTenDollars
 *         + predictionsCreated       * predictionsCreated
 *         + suspiciousSignupsCount   * suspiciousPenalty   (suspiciousPenalty is negative)
 *
 * Result is rounded to 2 decimal places.
 */
export function computeCompositeScore(
  metrics: ScorecardMetrics,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): number {
  const raw =
    metrics.qualifiedCount             * weights.qualifiedReferral
  + metrics.d7RetainedCount            * weights.d7Retained
  + metrics.d30RetainedCount           * weights.d30Retained
  + metrics.activatedCount             * weights.activated
  + (metrics.referredStakeVolume / 10) * weights.stakeVolumePerTenDollars
  + metrics.referredPredictionsCreated * weights.predictionsCreated
  + metrics.suspiciousSignupsCount     * weights.suspiciousPenalty;

  return Math.round(raw * 100) / 100;
}

/**
 * Describes each score component for display in the UI.
 * Used by the composite score tooltip.
 */
export interface ScoreBreakdownItem {
  label:      string;
  value:      number;
  weight:     number;
  subtotal:   number;
}

/** Returns a human-readable breakdown of the composite score. */
export function getScoreBreakdown(
  metrics: ScorecardMetrics,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): ScoreBreakdownItem[] {
  return [
    {
      label:    'Qualified referrals',
      value:    metrics.qualifiedCount,
      weight:   weights.qualifiedReferral,
      subtotal: metrics.qualifiedCount * weights.qualifiedReferral,
    },
    {
      label:    'D7-retained referrals',
      value:    metrics.d7RetainedCount,
      weight:   weights.d7Retained,
      subtotal: metrics.d7RetainedCount * weights.d7Retained,
    },
    {
      label:    'D30-retained referrals',
      value:    metrics.d30RetainedCount,
      weight:   weights.d30Retained,
      subtotal: metrics.d30RetainedCount * weights.d30Retained,
    },
    {
      label:    'Activated referrals',
      value:    metrics.activatedCount,
      weight:   weights.activated,
      subtotal: metrics.activatedCount * weights.activated,
    },
    {
      label:    'Referred stake volume ($10 units)',
      value:    Math.round(metrics.referredStakeVolume / 10 * 10) / 10,
      weight:   weights.stakeVolumePerTenDollars,
      subtotal: (metrics.referredStakeVolume / 10) * weights.stakeVolumePerTenDollars,
    },
    {
      label:    'Predictions created',
      value:    metrics.referredPredictionsCreated,
      weight:   weights.predictionsCreated,
      subtotal: metrics.referredPredictionsCreated * weights.predictionsCreated,
    },
    {
      label:    'Suspicious signups (penalty)',
      value:    metrics.suspiciousSignupsCount,
      weight:   weights.suspiciousPenalty,
      subtotal: metrics.suspiciousSignupsCount * weights.suspiciousPenalty,
    },
  ];
}
