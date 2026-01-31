/**
 * Unit tests for pool-based payout math (@fanclubz/shared poolMath).
 * Ensures pool-based estimates are internally consistent and never show impossible payouts.
 * Run: npm run build (from root) then npm --prefix server run test -- poolMath
 */
import { describe, expect, it } from '@jest/globals';
import {
  getPreOddsMultiple,
  getPostOddsMultiple,
  getPayoutPreview,
  type GetPayoutPreviewInput,
} from '@fanclubz/shared';

describe('poolMath', () => {
  describe('getPreOddsMultiple', () => {
    it('returns T/Wi: T=450, Wi=75 => 6.00', () => {
      expect(getPreOddsMultiple(450, 75)).toBe(6);
    });
    it('returns null when optionPool <= 0', () => {
      expect(getPreOddsMultiple(450, 0)).toBeNull();
      expect(getPreOddsMultiple(0, 0)).toBeNull();
    });
    it('handles totalPool 0', () => {
      expect(getPreOddsMultiple(0, 100)).toBe(0);
    });
  });

  describe('getPostOddsMultiple', () => {
    it('T=450, Wi=75, stake=250, fee=0 => multiplePost ≈ 2.1538', () => {
      const m = getPostOddsMultiple({
        totalPool: 450,
        optionPool: 75,
        stake: 250,
        feeBps: 0,
      });
      expect(m).not.toBeNull();
      expect(m!).toBeCloseTo(700 / 325, 2); // T'=700, W'=325
      expect(m!).toBeCloseTo(2.1538, 2);
    });
    it('with fees: distributable reduced, multiplePost lower', () => {
      const m0 = getPostOddsMultiple({
        totalPool: 450,
        optionPool: 75,
        stake: 250,
        feeBps: 0,
      });
      const m350 = getPostOddsMultiple({
        totalPool: 450,
        optionPool: 75,
        stake: 250,
        feeBps: 350, // 3.5%
      });
      expect(m0).not.toBeNull();
      expect(m350).not.toBeNull();
      expect(m350!).toBeLessThan(m0!);
    });
    it('returns null when W\' <= 0', () => {
      expect(
        getPostOddsMultiple({
          totalPool: 0,
          optionPool: 0,
          stake: 0,
          feeBps: 0,
        })
      ).toBeNull();
    });
  });

  describe('getPayoutPreview', () => {
    it('live bug example: T=450, Wi=75, stake=250, fee=0 => expectedReturn ≈ 538.46, NOT 1500', () => {
      const input: GetPayoutPreviewInput = {
        totalPool: 450,
        optionPool: 75,
        stake: 250,
        feeBps: 0,
      };
      const preview = getPayoutPreview(input);
      expect(preview).not.toBeNull();
      expect(preview!.multiplePre).toBe(6); // 450/75
      expect(preview!.multiplePost).toBeCloseTo(700 / 325, 2);
      expect(preview!.expectedReturn).toBeCloseTo(250 * (700 / 325), 0);
      expect(preview!.expectedReturn).toBeCloseTo(538.46, 0);
      expect(preview!.profit).toBeCloseTo(538.46 - 250, 0);
      // Old wrong behavior (stake * preOdds) must never appear
      const wrongReturn = 250 * 6;
      expect(wrongReturn).toBe(1500);
      expect(preview!.expectedReturn).not.toBe(1500);
      expect(preview!.expectedReturn).toBeLessThan(600);
    });

    it('optionPool=0, stake>0: first bettor (W\' = stake)', () => {
      const preview = getPayoutPreview({
        totalPool: 100,
        optionPool: 0,
        stake: 50,
        feeBps: 0,
      });
      expect(preview).not.toBeNull();
      expect(preview!.multiplePre).toBeNull(); // Wi=0
      expect(preview!.multiplePost).toBeCloseTo(150 / 50, 2); // T'=150, W'=50 => 3x
      expect(preview!.expectedReturn).toBeCloseTo(50 * 3, 0);
      expect(preview!.profit).toBeCloseTo(100, 0);
    });

    it('returns null when optionPool<=0 and stake<=0', () => {
      expect(
        getPayoutPreview({
          totalPool: 100,
          optionPool: 0,
          stake: 0,
          feeBps: 0,
        })
      ).toBeNull();
    });

    it('with feeBps: distributable and expectedReturn reduced', () => {
      const noFee = getPayoutPreview({
        totalPool: 500,
        optionPool: 100,
        stake: 100,
        feeBps: 0,
      });
      const withFee = getPayoutPreview({
        totalPool: 500,
        optionPool: 100,
        stake: 100,
        feeBps: 350, // 3.5%
      });
      expect(noFee).not.toBeNull();
      expect(withFee).not.toBeNull();
      expect(withFee!.expectedReturn).toBeLessThan(noFee!.expectedReturn);
      expect(withFee!.distributablePool).toBeLessThan(noFee!.distributablePool);
    });
  });
});
