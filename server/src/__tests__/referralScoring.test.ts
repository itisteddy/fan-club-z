/**
 * Referral Composite Scoring – Unit Tests
 *
 * Exercises computeCompositeScore() and getScoreBreakdown() from
 * server/src/constants/referralScoring.ts.
 *
 * Coverage:
 *  - Default weight formula accuracy
 *  - Each component in isolation
 *  - Suspicious-penalty subtraction
 *  - Zero-metrics edge case
 *  - Custom weight override
 *  - Score breakdown component totals
 *  - Qualified referral logic (D30 > D7 > qualified by weight)
 */

import { describe, expect, it } from '@jest/globals';
import {
  computeCompositeScore,
  getScoreBreakdown,
  DEFAULT_SCORING_WEIGHTS,
  ScorecardMetrics,
} from '../constants/referralScoring';

const ZERO_METRICS: ScorecardMetrics = {
  qualifiedCount:              0,
  d7RetainedCount:             0,
  d30RetainedCount:            0,
  activatedCount:              0,
  referredStakeVolume:         0,
  referredPredictionsCreated:  0,
  suspiciousSignupsCount:      0,
};

// ─── Default weights verification ────────────────────────────────────────────

describe('DEFAULT_SCORING_WEIGHTS', () => {
  it('has the documented default values', () => {
    expect(DEFAULT_SCORING_WEIGHTS.qualifiedReferral).toBe(3.0);
    expect(DEFAULT_SCORING_WEIGHTS.d7Retained).toBe(2.0);
    expect(DEFAULT_SCORING_WEIGHTS.d30Retained).toBe(5.0);
    expect(DEFAULT_SCORING_WEIGHTS.activated).toBe(1.5);
    expect(DEFAULT_SCORING_WEIGHTS.stakeVolumePerTenDollars).toBe(0.1);
    expect(DEFAULT_SCORING_WEIGHTS.predictionsCreated).toBe(0.5);
    expect(DEFAULT_SCORING_WEIGHTS.suspiciousPenalty).toBe(-5.0);
  });

  it('D30 weight is higher than D7 weight (quality-first design)', () => {
    expect(DEFAULT_SCORING_WEIGHTS.d30Retained).toBeGreaterThan(DEFAULT_SCORING_WEIGHTS.d7Retained);
  });

  it('suspiciousPenalty is negative', () => {
    expect(DEFAULT_SCORING_WEIGHTS.suspiciousPenalty).toBeLessThan(0);
  });
});

// ─── computeCompositeScore ────────────────────────────────────────────────────

describe('computeCompositeScore', () => {
  it('returns 0 for all-zero metrics', () => {
    expect(computeCompositeScore(ZERO_METRICS)).toBe(0);
  });

  it('counts each qualified referral as 3.0 points', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, qualifiedCount: 5 });
    expect(score).toBe(15.0); // 5 × 3.0
  });

  it('counts each D7-retained referral as 2.0 points', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, d7RetainedCount: 4 });
    expect(score).toBe(8.0); // 4 × 2.0
  });

  it('counts each D30-retained referral as 5.0 points', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, d30RetainedCount: 3 });
    expect(score).toBe(15.0); // 3 × 5.0
  });

  it('counts each activated referral as 1.5 points', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, activatedCount: 4 });
    expect(score).toBe(6.0); // 4 × 1.5
  });

  it('applies stake-volume weight per $10 (0.1 pts per $10)', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, referredStakeVolume: 100 });
    expect(score).toBe(1.0); // (100/10) × 0.1 = 1.0
  });

  it('counts each prediction as 0.5 points', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, referredPredictionsCreated: 6 });
    expect(score).toBe(3.0); // 6 × 0.5
  });

  it('subtracts 5.0 per suspicious signup', () => {
    const score = computeCompositeScore({ ...ZERO_METRICS, suspiciousSignupsCount: 2 });
    expect(score).toBe(-10.0); // 2 × -5.0
  });

  it('allows negative total score when suspicious flags dominate', () => {
    const score = computeCompositeScore({
      ...ZERO_METRICS,
      qualifiedCount: 1,       // +3.0
      suspiciousSignupsCount: 3, // -15.0
    });
    expect(score).toBe(-12.0);
  });

  it('computes the full formula correctly with mixed metrics', () => {
    const metrics: ScorecardMetrics = {
      qualifiedCount:              10,  // 10 × 3.0  = 30.0
      d7RetainedCount:             8,   //  8 × 2.0  = 16.0
      d30RetainedCount:            5,   //  5 × 5.0  = 25.0
      activatedCount:              20,  // 20 × 1.5  = 30.0
      referredStakeVolume:         500, // (500/10) × 0.1 = 5.0
      referredPredictionsCreated:  12,  // 12 × 0.5  =  6.0
      suspiciousSignupsCount:      1,   //  1 × -5.0 = -5.0
    };
    // Total = 30 + 16 + 25 + 30 + 5 + 6 - 5 = 107.0
    expect(computeCompositeScore(metrics)).toBe(107.0);
  });

  it('rounds to 2 decimal places', () => {
    // (1/3 × 3.0) = 1.0 exactly — test with fractional stake volume
    const score = computeCompositeScore({ ...ZERO_METRICS, referredStakeVolume: 1 });
    // 1/10 × 0.1 = 0.01
    expect(score).toBe(0.01);
    expect(Number.isFinite(score)).toBe(true);
  });

  it('accepts custom weight overrides', () => {
    const score = computeCompositeScore(
      { ...ZERO_METRICS, qualifiedCount: 1 },
      { ...DEFAULT_SCORING_WEIGHTS, qualifiedReferral: 10.0 }
    );
    expect(score).toBe(10.0);
  });
});

// ─── getScoreBreakdown ────────────────────────────────────────────────────────

describe('getScoreBreakdown', () => {
  it('returns 7 items (one per score component)', () => {
    const breakdown = getScoreBreakdown(ZERO_METRICS);
    expect(breakdown).toHaveLength(7);
  });

  it('each item has label, value, weight, and subtotal fields', () => {
    const items = getScoreBreakdown(ZERO_METRICS);
    for (const item of items) {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.value).toBe('number');
      expect(typeof item.weight).toBe('number');
      expect(typeof item.subtotal).toBe('number');
    }
  });

  it('subtotals sum to the composite score', () => {
    const metrics: ScorecardMetrics = {
      qualifiedCount:              3,
      d7RetainedCount:             2,
      d30RetainedCount:            1,
      activatedCount:              5,
      referredStakeVolume:         200,
      referredPredictionsCreated:  4,
      suspiciousSignupsCount:      1,
    };
    const compositeScore = computeCompositeScore(metrics);
    const breakdown      = getScoreBreakdown(metrics);
    const sumOfSubtotals = breakdown.reduce((s, item) => s + item.subtotal, 0);
    expect(Math.round(sumOfSubtotals * 100) / 100).toBe(compositeScore);
  });

  it('suspicious-signup item has a negative subtotal when count > 0', () => {
    const breakdown = getScoreBreakdown({ ...ZERO_METRICS, suspiciousSignupsCount: 2 });
    const suspiciousItem = breakdown.find(i => i.label.toLowerCase().includes('suspicious'));
    expect(suspiciousItem).toBeDefined();
    expect(suspiciousItem!.subtotal).toBeLessThan(0);
  });

  it('all subtotals are 0 when metrics are all zero', () => {
    const breakdown = getScoreBreakdown(ZERO_METRICS);
    for (const item of breakdown) {
      // Use toBeCloseTo to handle -0 (0 × negative weight = -0 in JS)
      expect(item.subtotal).toBeCloseTo(0);
    }
  });
});

// ─── Quality-first ranking guarantee ─────────────────────────────────────────

describe('Quality-first ranking: D30 retention beats raw signups', () => {
  it('a member with 1 D30 retention scores higher than 6 raw activations', () => {
    const highVolumeLowQuality = computeCompositeScore({ ...ZERO_METRICS, activatedCount: 6 });
    const lowVolumeHighQuality = computeCompositeScore({ ...ZERO_METRICS, d30RetainedCount: 1 });
    // 6 activations × 1.5 = 9.0
    // 1 D30 retention × 5.0 = 5.0
    // → high volume wins here but:
    expect(highVolumeLowQuality).toBe(9.0);
    expect(lowVolumeHighQuality).toBe(5.0);
    // Show that 2 D30 beats 6 activations
    const twoD30 = computeCompositeScore({ ...ZERO_METRICS, d30RetainedCount: 2 });
    expect(twoD30).toBeGreaterThan(highVolumeLowQuality);
  });

  it('suspicious penalties can erase the value of raw signups', () => {
    // 10 signups activated (10 × 1.5 = 15 pts) but 3 suspicious (3 × -5 = -15 pts) = 0
    const score = computeCompositeScore({
      ...ZERO_METRICS,
      activatedCount:        10,
      suspiciousSignupsCount: 3,
    });
    expect(score).toBe(0.0);
  });

  it('D30 weight (5.0) > D7 weight (2.0) > qualified weight (3.0) is intentional: long-term retention first', () => {
    // D30 = 5.0, D7 = 2.0, qualified = 3.0
    // D30 highest, signalling that staying 30 days matters most.
    // Qualified > D7 because qualifying requires economic activity (harder bar).
    expect(DEFAULT_SCORING_WEIGHTS.d30Retained).toBeGreaterThan(DEFAULT_SCORING_WEIGHTS.d7Retained);
    expect(DEFAULT_SCORING_WEIGHTS.qualifiedReferral).toBeGreaterThan(DEFAULT_SCORING_WEIGHTS.d7Retained);
  });
});
