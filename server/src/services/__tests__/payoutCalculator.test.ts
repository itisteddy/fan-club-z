/**
 * Tests for payout calculator
 * 
 * Covers:
 * - Demo-only rail
 * - Crypto-only rail
 * - Hybrid (demo + crypto) rails
 */

import { describe, it, expect } from '@jest/globals';
import { calculatePayouts } from '../payoutCalculator';

const DEMO_PROVIDER = 'demo-wallet';
const CRYPTO_PROVIDER = 'crypto-base-usdc';

describe('payoutCalculator', () => {
  const defaultFeeConfig = {
    platformFeeBps: 250, // 2.5%
    creatorFeeBps: 100, // 1.0%
  };

  describe('Demo-only rail', () => {
    it('should calculate fees and payouts correctly for 2 winners and 1 loser', () => {
      const entries = [
        { userId: 'user1', optionId: 'option-a', amount: 50, provider: DEMO_PROVIDER }, // Winner
        { userId: 'user2', optionId: 'option-a', amount: 30, provider: DEMO_PROVIDER }, // Winner
        { userId: 'user3', optionId: 'option-b', amount: 20, provider: DEMO_PROVIDER }, // Loser
      ];

      const result = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      // Total pot = 50 + 30 + 20 = 100
      expect(result.totalPot).toBe(100);
      expect(result.winnersStakeTotal).toBe(80); // 50 + 30
      expect(result.losersStakeTotal).toBe(20); // 20

      // Fees on losing stakes only: 20 * 2.5% = 0.5, 20 * 1.0% = 0.2
      expect(result.platformFee).toBe(0.5);
      expect(result.creatorFee).toBe(0.2);

      // Prize pool = 20 - 0.5 - 0.2 = 19.3
      // Distributable pot = 80 + 19.3 = 99.3
      expect(result.distributablePot).toBe(99.3);

      // User1 gets: (50/80) * 99.3 = 62.0625 ≈ 62.06
      // User2 gets: (30/80) * 99.3 = 37.2375 ≈ 37.24
      // Total: 62.06 + 37.24 = 99.3 (with rounding)
      expect(result.payoutsByUserId['user1']).toBeCloseTo(62.06, 2);
      expect(result.payoutsByUserId['user2']).toBeCloseTo(37.24, 2);
      expect(result.payoutsByUserId['user3']).toBeUndefined(); // Loser gets nothing

      // Verify sum of payouts <= distributablePot
      const totalPayouts = Object.values(result.payoutsByUserId).reduce((sum, p) => sum + p, 0);
      expect(totalPayouts).toBeLessThanOrEqual(result.distributablePot + 0.01);

      // Verify winner stakes are recorded
      expect(result.winnerStakesByUserId['user1']).toBe(50);
      expect(result.winnerStakesByUserId['user2']).toBe(30);
    });

    it('should handle case with no winners (all entries lose)', () => {
      const entries = [
        { userId: 'user1', optionId: 'option-b', amount: 50, provider: DEMO_PROVIDER },
        { userId: 'user2', optionId: 'option-b', amount: 30, provider: DEMO_PROVIDER },
      ];

      const result = calculatePayouts({
        entries,
        winningOptionId: 'option-a', // No entries match this
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      expect(result.totalPot).toBe(80);
      expect(result.winnersStakeTotal).toBe(0);
      expect(result.losersStakeTotal).toBe(80);

      // Fees still calculated on losing stakes
      expect(result.platformFee).toBe(2.0); // 80 * 2.5% = 2.0
      expect(result.creatorFee).toBe(0.8); // 80 * 1.0% = 0.8

      expect(result.distributablePot).toBe(0);
      expect(Object.keys(result.payoutsByUserId).length).toBe(0);
    });
  });

  describe('Crypto-only rail', () => {
    it('should calculate fees and payouts correctly for crypto entries', () => {
      const entries = [
        { userId: 'user1', optionId: 'option-a', amount: 100, provider: CRYPTO_PROVIDER }, // Winner
        { userId: 'user2', optionId: 'option-a', amount: 50, provider: CRYPTO_PROVIDER }, // Winner
        { userId: 'user3', optionId: 'option-b', amount: 50, provider: CRYPTO_PROVIDER }, // Loser
      ];

      const result = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'crypto',
        providerMatch: (p) => p === CRYPTO_PROVIDER,
      });

      expect(result.totalPot).toBe(200);
      expect(result.winnersStakeTotal).toBe(150);
      expect(result.losersStakeTotal).toBe(50);

      // Fees on losing stakes: 50 * 2.5% = 1.25, 50 * 1.0% = 0.5
      expect(result.platformFee).toBe(1.25);
      expect(result.creatorFee).toBe(0.5);

      // Prize pool = 50 - 1.25 - 0.5 = 48.25
      // Distributable pot = 150 + 48.25 = 198.25
      expect(result.distributablePot).toBe(198.25);

      // User1: (100/150) * 198.25 = 132.166... ≈ 132.17
      // User2: (50/150) * 198.25 = 66.083... ≈ 66.08
      expect(result.payoutsByUserId['user1']).toBeCloseTo(132.17, 2);
      expect(result.payoutsByUserId['user2']).toBeCloseTo(66.08, 2);
      expect(result.payoutsByUserId['user3']).toBeUndefined();

      const totalPayouts = Object.values(result.payoutsByUserId).reduce((sum, p) => sum + p, 0);
      expect(totalPayouts).toBeLessThanOrEqual(result.distributablePot + 0.01);
    });
  });

  describe('Hybrid rail (demo + crypto)', () => {
    it('should calculate demo and crypto rails independently', () => {
      const entries = [
        // Demo entries
        { userId: 'user1', optionId: 'option-a', amount: 40, provider: DEMO_PROVIDER }, // Demo winner
        { userId: 'user2', optionId: 'option-b', amount: 20, provider: DEMO_PROVIDER }, // Demo loser
        // Crypto entries
        { userId: 'user3', optionId: 'option-a', amount: 60, provider: CRYPTO_PROVIDER }, // Crypto winner
        { userId: 'user4', optionId: 'option-b', amount: 30, provider: CRYPTO_PROVIDER }, // Crypto loser
      ];

      // Calculate demo rail
      const demoResult = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      // Calculate crypto rail
      const cryptoResult = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'crypto',
        providerMatch: (p) => p === CRYPTO_PROVIDER,
      });

      // Demo rail checks
      expect(demoResult.totalPot).toBe(60); // 40 + 20
      expect(demoResult.winnersStakeTotal).toBe(40);
      expect(demoResult.losersStakeTotal).toBe(20);
      // Demo fees: 20 * 2.5% = 0.5, 20 * 1.0% = 0.2
      expect(demoResult.platformFee).toBe(0.5);
      expect(demoResult.creatorFee).toBe(0.2);
      // Demo distributable: 40 + (20 - 0.5 - 0.2) = 59.3
      expect(demoResult.distributablePot).toBe(59.3);
      expect(demoResult.payoutsByUserId['user1']).toBeCloseTo(59.3, 2); // Only winner
      expect(demoResult.payoutsByUserId['user3']).toBeUndefined(); // Crypto user not in demo result

      // Crypto rail checks
      expect(cryptoResult.totalPot).toBe(90); // 60 + 30
      expect(cryptoResult.winnersStakeTotal).toBe(60);
      expect(cryptoResult.losersStakeTotal).toBe(30);
      // Crypto fees: 30 * 2.5% = 0.75, 30 * 1.0% = 0.3
      expect(cryptoResult.platformFee).toBe(0.75);
      expect(cryptoResult.creatorFee).toBe(0.3);
      // Crypto distributable: 60 + (30 - 0.75 - 0.3) = 88.95
      expect(cryptoResult.distributablePot).toBe(88.95);
      expect(cryptoResult.payoutsByUserId['user3']).toBeCloseTo(88.95, 2); // Only winner
      expect(cryptoResult.payoutsByUserId['user1']).toBeUndefined(); // Demo user not in crypto result

      // Verify demo fees are based ONLY on demo pot (20), not total pot (150)
      expect(demoResult.platformFee).toBe(0.5); // 20 * 2.5% = 0.5
      expect(demoResult.creatorFee).toBe(0.2); // 20 * 1.0% = 0.2

      // Verify crypto fees are based ONLY on crypto pot (30), not total pot (150)
      expect(cryptoResult.platformFee).toBe(0.75); // 30 * 2.5% = 0.75
      expect(cryptoResult.creatorFee).toBe(0.3); // 30 * 1.0% = 0.3
    });

    it('should handle mixed winners across rails', () => {
      const entries = [
        // Demo: user1 wins, user2 loses
        { userId: 'user1', optionId: 'option-a', amount: 50, provider: DEMO_PROVIDER },
        { userId: 'user2', optionId: 'option-b', amount: 25, provider: DEMO_PROVIDER },
        // Crypto: user3 loses, user4 wins
        { userId: 'user3', optionId: 'option-b', amount: 75, provider: CRYPTO_PROVIDER },
        { userId: 'user4', optionId: 'option-a', amount: 100, provider: CRYPTO_PROVIDER },
      ];

      const demoResult = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      const cryptoResult = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'crypto',
        providerMatch: (p) => p === CRYPTO_PROVIDER,
      });

      // Demo: user1 wins, user2 loses
      expect(demoResult.payoutsByUserId['user1']).toBeGreaterThan(0);
      expect(demoResult.payoutsByUserId['user2']).toBeUndefined();

      // Crypto: user4 wins, user3 loses
      expect(cryptoResult.payoutsByUserId['user4']).toBeGreaterThan(0);
      expect(cryptoResult.payoutsByUserId['user3']).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty entries', () => {
      const result = calculatePayouts({
        entries: [],
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      expect(result.totalPot).toBe(0);
      expect(result.winnersStakeTotal).toBe(0);
      expect(result.losersStakeTotal).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.creatorFee).toBe(0);
      expect(result.distributablePot).toBe(0);
      expect(Object.keys(result.payoutsByUserId).length).toBe(0);
    });

    it('should handle single winner with no losers', () => {
      const entries = [
        { userId: 'user1', optionId: 'option-a', amount: 100, provider: DEMO_PROVIDER },
      ];

      const result = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      expect(result.totalPot).toBe(100);
      expect(result.winnersStakeTotal).toBe(100);
      expect(result.losersStakeTotal).toBe(0);
      // No fees (no losing stakes)
      expect(result.platformFee).toBe(0);
      expect(result.creatorFee).toBe(0);
      // Winner gets stake back (no prize pool)
      expect(result.distributablePot).toBe(100);
      expect(result.payoutsByUserId['user1']).toBe(100);
    });

    it('should handle multiple entries from same user', () => {
      const entries = [
        { userId: 'user1', optionId: 'option-a', amount: 30, provider: DEMO_PROVIDER },
        { userId: 'user1', optionId: 'option-a', amount: 20, provider: DEMO_PROVIDER }, // Same user, same option
        { userId: 'user2', optionId: 'option-a', amount: 50, provider: DEMO_PROVIDER },
        { userId: 'user3', optionId: 'option-b', amount: 40, provider: DEMO_PROVIDER },
      ];

      const result = calculatePayouts({
        entries,
        winningOptionId: 'option-a',
        feeConfig: defaultFeeConfig,
        rail: 'demo',
        providerMatch: (p) => p === DEMO_PROVIDER,
      });

      // User1 total stake: 30 + 20 = 50
      expect(result.winnerStakesByUserId['user1']).toBe(50);
      expect(result.winnerStakesByUserId['user2']).toBe(50);

      // Total winning stake: 50 + 50 = 100
      expect(result.winnersStakeTotal).toBe(100);

      // User1 should get payout proportional to their total stake (50/100)
      const user1Payout = result.payoutsByUserId['user1'] || 0;
      const user2Payout = result.payoutsByUserId['user2'] || 0;
      expect(user1Payout).toBeGreaterThan(0);
      expect(user2Payout).toBeGreaterThan(0);
      // User1 and user2 should get equal payouts (same stake)
      expect(user1Payout).toBeCloseTo(user2Payout, 2);
    });
  });
});
