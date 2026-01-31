/**
 * Unit tests for Odds V2 engine (@fanclubz/shared oddsV2).
 * Run: npm run build (from root, builds shared) then npm --prefix server run test -- oddsV2
 */
import { describe, expect, it } from '@jest/globals';
import {
  computeReferenceMultiple,
  computePreview,
  computePayoutMultiple,
  formatMultiple,
} from '@fanclubz/shared';

const PLATFORM_BPS = 250; // 2.5%
const CREATOR_BPS = 100; // 1%
const FEE_BPS = PLATFORM_BPS + CREATOR_BPS;

describe('oddsV2', () => {
  describe('computeReferenceMultiple', () => {
    it('returns null when selectedPoolCents and referenceStakeCents are both 0', () => {
      expect(
        computeReferenceMultiple({
          selectedPoolCents: 0,
          totalPoolCents: 0,
          referenceStakeCents: 0,
          platformFeeBps: PLATFORM_BPS,
          creatorFeeBps: CREATOR_BPS,
        })
      ).toBeNull();
    });

    it('YesPool=37500c, NoPool=0: reference stake 100c on No gives multiple >> 2.0', () => {
      // Scenario from audit: all $375 on Yes, $0 on No. First bettor on No gets high odds.
      const yesPoolCents = 37500;
      const noPoolCents = 0;
      const totalPoolCents = yesPoolCents + noPoolCents;
      const referenceStakeCents = 100;

      const multiple = computeReferenceMultiple({
        selectedPoolCents: noPoolCents,
        totalPoolCents,
        referenceStakeCents,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });

      expect(multiple).not.toBeNull();
      expect(multiple!).toBeGreaterThan(2.0);
      // Exact: selectedPoolAfter=100, totalPoolAfter=37600, otherPoolAfter=37500
      // fees = floor(37500 * 350/10000) = 1312, distributable = 100 + (37500-1312) = 36288, multiple = 362.88
      expect(multiple!).toBeCloseTo(362.88, 1);
    });

    it('symmetric pools: 50/50 gives multiple ~2.0 (minus fees)', () => {
      const selectedPoolCents = 5000;
      const totalPoolCents = 10000;
      const multiple = computeReferenceMultiple({
        selectedPoolCents,
        totalPoolCents,
        referenceStakeCents: 100,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });
      expect(multiple).not.toBeNull();
      // otherPool=5000, fees ~175, distributable 5000+4825=9825, multiple 9825/5100 ~1.93
      expect(multiple!).toBeGreaterThan(1.5);
      expect(multiple!).toBeLessThan(2.5);
    });

    it('empty option with reference stake: first bettor gets very high multiple', () => {
      const multiple = computeReferenceMultiple({
        selectedPoolCents: 0,
        totalPoolCents: 10000,
        referenceStakeCents: 100,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });
      expect(multiple).not.toBeNull();
      expect(multiple!).toBeGreaterThan(10);
    });
  });

  describe('computePreview', () => {
    it('returns null when selectedPoolCents and stakeCents are both 0', () => {
      expect(
        computePreview({
          totalPoolCents: 0,
          selectedPoolCents: 0,
          stakeCents: 0,
          platformFeeBps: PLATFORM_BPS,
          creatorFeeBps: CREATOR_BPS,
        })
      ).toBeNull();
    });

    it('YesPool=37500, NoPool=0: stake 5000c on No gives expectedReturn >> 10000c', () => {
      const totalPoolCents = 37500;
      const selectedPoolCents = 0;
      const stakeCents = 5000;

      const result = computePreview({
        totalPoolCents,
        selectedPoolCents,
        stakeCents,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });

      expect(result).not.toBeNull();
      expect(result!.selectedPoolAfterCents).toBe(5000);
      expect(result!.expectedReturnCents).toBeGreaterThan(10000);
      expect(result!.expectedProfitCents).toBeGreaterThan(5000);
      expect(result!.multiple).toBeGreaterThan(2.0);
    });

    it('first bettor: selectedPool 0, stake 1000 -> selectedPoolAfter 1000, multiple high', () => {
      const result = computePreview({
        totalPoolCents: 20000,
        selectedPoolCents: 0,
        stakeCents: 1000,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });
      expect(result).not.toBeNull();
      expect(result!.selectedPoolAfterCents).toBe(1000);
      expect(result!.multiple).toBeGreaterThan(2);
      expect(result!.expectedReturnCents).toBe(Math.floor(1000 * result!.multiple));
      expect(result!.expectedProfitCents).toBe(result!.expectedReturnCents - 1000);
    });

    it('dominant side: most stake on selected option -> multiple near 1.0', () => {
      const result = computePreview({
        totalPoolCents: 10000,
        selectedPoolCents: 9000,
        stakeCents: 100,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });
      expect(result).not.toBeNull();
      expect(result!.multiple).toBeLessThan(1.5);
      expect(result!.multiple).toBeGreaterThanOrEqual(1.0);
    });

    it('high fees: fees deducted from other pool', () => {
      const result = computePreview({
        totalPoolCents: 10000,
        selectedPoolCents: 5000,
        stakeCents: 100,
        platformFeeBps: 1000, // 10%
        creatorFeeBps: 500,  // 5%
      });
      expect(result).not.toBeNull();
      expect(result!.feesCents).toBeGreaterThan(0);
      expect(result!.distributableCents).toBe(result!.selectedPoolAfterCents + (result!.otherPoolAfterCents - result!.feesCents));
    });
  });

  describe('computePayoutMultiple', () => {
    it('returns null when selectedPoolCents is 0', () => {
      expect(
        computePayoutMultiple({
          selectedPoolCents: 0,
          otherPoolCents: 10000,
          platformFeeBps: PLATFORM_BPS,
          creatorFeeBps: CREATOR_BPS,
        })
      ).toBeNull();
    });

    it('settlement: winning pool 5000, losing 5000 -> multiple ~2 minus fees', () => {
      const multiple = computePayoutMultiple({
        selectedPoolCents: 5000,
        otherPoolCents: 5000,
        platformFeeBps: PLATFORM_BPS,
        creatorFeeBps: CREATOR_BPS,
      });
      expect(multiple).not.toBeNull();
      expect(multiple!).toBeGreaterThan(1.8);
      expect(multiple!).toBeLessThan(2.0);
    });
  });

  describe('formatMultiple', () => {
    it('formats to 2 decimals by default', () => {
      expect(formatMultiple(2.456)).toBe('2.46');
      expect(formatMultiple(1.01)).toBe('1.01');
    });
    it('accepts custom decimals', () => {
      expect(formatMultiple(2.456, 3)).toBe('2.456');
    });
  });
});
