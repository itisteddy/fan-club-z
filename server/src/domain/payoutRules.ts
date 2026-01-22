/**
 * Payout and fee calculation invariants
 * 
 * This module defines the canonical rules for:
 * - Pot calculations
 * - Fee application per rail (demo vs crypto)
 * - Payout distribution constraints
 * - Hybrid rail behavior
 */

/**
 * Fee configuration type
 * Fees are stored as percentages in the database (e.g., 2.5 for 2.5%)
 * This type can reference existing env/config values but does not hardcode defaults
 */
export interface FeeConfig {
  /** Platform fee percentage (0-100) */
  platformFeeBps?: number; // Basis points (100 = 1%)
  /** Creator fee percentage (0-100) */
  creatorFeeBps?: number; // Basis points (100 = 1%)
}

/**
 * Convert basis points to decimal rate
 * @param bps Basis points (e.g., 250 = 2.5%)
 * @returns Decimal rate (e.g., 0.025)
 */
export function bpsToRate(bps: number): number {
  return (bps || 0) / 10000;
}

/**
 * Convert percentage to decimal rate
 * @param pct Percentage (e.g., 2.5 = 2.5%)
 * @returns Decimal rate (e.g., 0.025)
 */
export function pctToRate(pct: number): number {
  return (pct || 0) / 100;
}

/**
 * PAYOUT INVARIANTS
 * 
 * These invariants must hold for all settlement operations:
 * 
 * 1. pot_total = sum(entries.stake)
 *    - The total pot equals the sum of all entry stakes
 *    - This is computed per rail (demo pot = sum of demo entries, crypto pot = sum of crypto entries)
 * 
 * 2. fees apply per rail
 *    - Demo pot fees are computed from demo entries only
 *    - Crypto pot fees are computed from crypto entries only
 *    - Fees are applied to LOSING stakes only (not winning stakes)
 * 
 * 3. total_distributed_to_winners <= pot_total - fees
 *    - Winners receive: their stake back + proportional share of (losing stakes - fees)
 *    - payout_pool = winning_stakes + (losing_stakes - platform_fee - creator_fee)
 *    - Each winner's payout = (winner_stake / total_winning_stakes) * payout_pool
 * 
 * 4. demo payouts are off-chain credits
 *    - Demo payouts update the demo wallet balance in the database
 *    - No on-chain transaction is created for demo payouts
 *    - Demo fees are credited to creator/platform off-chain wallets
 * 
 * 5. crypto payouts are claimable on-chain
 *    - Crypto payouts are recorded as claimable amounts in the escrow contract
 *    - Users must call claim() on-chain to receive crypto payouts
 *    - Crypto payouts do NOT credit the off-chain wallet balance
 *    - Crypto fees are sent on-chain to creator/platform addresses
 * 
 * 6. fees are calculated on losing stakes only
 *    - platform_fee = (total_losing_stakes * platform_fee_percentage) / 100
 *    - creator_fee = (total_losing_stakes * creator_fee_percentage) / 100
 *    - Winning stakes are returned in full (no fees deducted)
 */

/**
 * Validate that payout amounts respect invariants
 * @param params Calculation parameters
 * @returns true if invariants are satisfied
 */
export function validatePayoutInvariants(params: {
  totalPot: number;
  winningStakes: number;
  losingStakes: number;
  platformFee: number;
  creatorFee: number;
  totalPayout: number;
}): boolean {
  const { totalPot, winningStakes, losingStakes, platformFee, creatorFee, totalPayout } = params;

  // Invariant 1: pot_total = sum(entries.stake)
  const calculatedPot = winningStakes + losingStakes;
  if (Math.abs(totalPot - calculatedPot) > 0.01) {
    return false; // Allow small floating point differences
  }

  // Invariant 2: fees apply to losing stakes only
  const maxPlatformFee = losingStakes; // Fees can't exceed losing stakes
  const maxCreatorFee = losingStakes;
  if (platformFee > maxPlatformFee || creatorFee > maxCreatorFee) {
    return false;
  }

  // Invariant 3: total_distributed_to_winners <= pot_total - fees
  const expectedPayoutPool = winningStakes + (losingStakes - platformFee - creatorFee);
  if (totalPayout > expectedPayoutPool + 0.01) { // Allow small floating point differences
    return false;
  }

  return true;
}
