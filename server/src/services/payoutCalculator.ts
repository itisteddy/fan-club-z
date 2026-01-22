/**
 * Deterministic payout calculator
 * 
 * Calculates payouts, fees, and distributions for a single rail (demo, crypto, or fiat).
 * This is a pure computation function with no side effects.
 * 
 * IMPORTANT: Fees are calculated on LOSING stakes only (not total pot).
 * This matches the existing settlement logic in the codebase.
 */

export type Entry = {
  userId: string;
  optionId: string;
  amount: number; // Stake amount in USD (or minor units if used)
  provider: string; // 'demo-wallet' | 'crypto-base-usdc' | etc.
};

export type FeeConfig = {
  platformFeeBps: number; // Basis points (e.g., 250 = 2.5%)
  creatorFeeBps: number; // Basis points (e.g., 100 = 1.0%)
};

export type PayoutCalculatorInput = {
  entries: Entry[];
  winningOptionId: string;
  feeConfig: FeeConfig;
  rail: 'demo' | 'crypto' | 'fiat';
  providerMatch: (provider: string) => boolean; // Used to filter entries for this rail
};

export type PayoutResult = {
  rail: 'demo' | 'crypto' | 'fiat';
  totalPot: number;
  winnersStakeTotal: number;
  losersStakeTotal: number;
  platformFee: number;
  creatorFee: number;
  distributablePot: number; // totalPot - fees (but fees are on losing stakes, so this is winnersStakeTotal + (losersStakeTotal - fees))
  payoutsByUserId: Record<string, number>; // Payout amounts for winners; losers omitted or 0
  winnerStakesByUserId: Record<string, number>; // Stake totals for winners (for downstream rendering)
};

/**
 * Round to 2 decimal places (matches existing round2 function)
 */
function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Calculate payouts for a single rail
 * 
 * @param input Calculator input with entries, winning option, fees, and rail filter
 * @returns Payout result with totals, fees, and per-user payouts
 */
export function calculatePayouts(input: PayoutCalculatorInput): PayoutResult {
  const { entries, winningOptionId, feeConfig, rail, providerMatch } = input;

  // Filter entries for this rail
  const railEntries = entries.filter((e) => providerMatch(e.provider));

  if (railEntries.length === 0) {
    return {
      rail,
      totalPot: 0,
      winnersStakeTotal: 0,
      losersStakeTotal: 0,
      platformFee: 0,
      creatorFee: 0,
      distributablePot: 0,
      payoutsByUserId: {},
      winnerStakesByUserId: {},
    };
  }

  // Calculate totals
  const totalPot = railEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const winners = railEntries.filter((e) => e.optionId === winningOptionId);
  const losers = railEntries.filter((e) => e.optionId !== winningOptionId);

  const winnersStakeTotal = winners.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const losersStakeTotal = losers.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // If no winners, no payouts (but fees may still apply depending on product rules)
  // Following existing code: if winnersStakeTotal == 0, fees are still computed but payouts are empty
  if (winnersStakeTotal === 0) {
    // Fees are still calculated on losing stakes
    const platformFee = round2((losersStakeTotal * feeConfig.platformFeeBps) / 10000);
    const creatorFee = round2((losersStakeTotal * feeConfig.creatorFeeBps) / 10000);

    return {
      rail,
      totalPot,
      winnersStakeTotal: 0,
      losersStakeTotal,
      platformFee,
      creatorFee,
      distributablePot: 0, // No winners, nothing to distribute
      payoutsByUserId: {},
      winnerStakesByUserId: {},
    };
  }

  // IMPORTANT: Fees are calculated on LOSING stakes only (not total pot)
  // This matches existing settlement logic in server/src/routes/settlement.ts
  const platformFee = round2((losersStakeTotal * feeConfig.platformFeeBps) / 10000);
  const creatorFee = round2((losersStakeTotal * feeConfig.creatorFeeBps) / 10000);

  // Prize pool = losing stakes minus fees
  const prizePool = Math.max(losersStakeTotal - platformFee - creatorFee, 0);

  // Distributable pot = winners get their stakes back + share of prize pool
  const distributablePot = round2(winnersStakeTotal + prizePool);

  // Calculate per-user payouts (proportional to stake)
  const payoutsByUserId: Record<string, number> = {};
  const winnerStakesByUserId: Record<string, number> = {};

  // Aggregate stakes by user (in case a user has multiple entries)
  const stakesByUser = new Map<string, number>();
  for (const winner of winners) {
    const current = stakesByUser.get(winner.userId) || 0;
    stakesByUser.set(winner.userId, current + Number(winner.amount || 0));
  }

  // Store winner stakes for downstream rendering
  for (const [userId, stake] of stakesByUser.entries()) {
    winnerStakesByUserId[userId] = stake;
  }

  // Calculate provisional payouts (in cents for precision)
  const payoutsCents: Array<{ userId: string; cents: number; remainder: number }> = [];
  let totalPayoutCents = 0;

  for (const [userId, stake] of stakesByUser.entries()) {
    // Proportional share: (userStake / totalWinningStake) * distributablePot
    const share = winnersStakeTotal > 0 ? stake / winnersStakeTotal : 0;
    const payoutUSD = share * distributablePot;
    const payoutCents = Math.floor(payoutUSD * 100);
    const remainder = (payoutUSD * 100) % 1; // Fractional cents

    payoutsCents.push({ userId, cents: payoutCents, remainder });
    totalPayoutCents += payoutCents;
  }

  // Calculate remainder (distributablePot in cents - allocated cents)
  const distributablePotCents = Math.floor(distributablePot * 100);
  let remainderCents = distributablePotCents - totalPayoutCents;

  // Allocate remainder deterministically: sort by userId ascending, then by remainder descending
  // This ensures consistent allocation across runs
  payoutsCents.sort((a, b) => {
    if (a.remainder !== b.remainder) {
      return b.remainder - a.remainder; // Higher remainder first
    }
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0; // Then by userId ascending
  });

  // Distribute remainder cents (one cent at a time)
  for (let i = 0; i < payoutsCents.length && remainderCents > 0; i++) {
    payoutsCents[i]!.cents += 1;
    remainderCents -= 1;
  }

  // Convert back to dollars and store
  for (const payout of payoutsCents) {
    payoutsByUserId[payout.userId] = round2(payout.cents / 100);
  }

  // Validation: ensure sum of payouts <= distributablePot (with small tolerance for rounding)
  const totalPayouts = Object.values(payoutsByUserId).reduce((sum, p) => sum + p, 0);
  if (totalPayouts > distributablePot + 0.01) {
    // This should never happen, but log a warning if it does
    console.warn(
      `[payoutCalculator] Payout sum (${totalPayouts}) exceeds distributablePot (${distributablePot})`
    );
  }

  return {
    rail,
    totalPot,
    winnersStakeTotal,
    losersStakeTotal,
    platformFee,
    creatorFee,
    distributablePot,
    payoutsByUserId,
    winnerStakesByUserId,
  };
}
