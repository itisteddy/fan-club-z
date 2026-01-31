/**
 * Pool-based (pari-mutuel) odds and payout preview — single source of truth.
 *
 * Definitions:
 *   T = total pool (sum of all option pools)
 *   Wi = pool for the selected option i
 *   s = user stake
 *   feeBps = platformFeeBps + creatorFeeBps (basis points)
 *   T' = T + s,  W' = Wi + s
 *
 * Fee rule (matches settlement): fees are taken from the LOSING pool only.
 *   otherPool = T' - W'
 *   fees = otherPool * feeBps/10000
 *   distributable = W' + (otherPool - fees) = T' - fees
 *   multiplePost = distributable / W'
 *   expectedReturn = s * multiplePost
 *   profit = expectedReturn - s
 *
 * All amounts in same unit (USD or cents); outputs match input unit.
 * Round only for display; raw values used for computation.
 */

const BPS_DENOM = 10_000;

/**
 * Current odds (before user's stake): T / Wi.
 * Returns null if optionPool <= 0 (guard division by zero).
 */
export function getPreOddsMultiple(totalPool: number, optionPool: number): number | null {
  const T = Number(totalPool) || 0;
  const Wi = Number(optionPool) || 0;
  if (Wi <= 0) return null;
  return T / Wi;
}

export interface GetPostOddsMultipleInput {
  totalPool: number;
  optionPool: number;
  stake: number;
  feeBps: number;
}

/**
 * Estimated odds (with user's stake): distributable / W'.
 * Uses fees-from-losing-pool rule. Returns null if W' <= 0.
 */
export function getPostOddsMultiple(input: GetPostOddsMultipleInput): number | null {
  const { totalPool, optionPool, stake, feeBps } = input;
  const T = Number(totalPool) || 0;
  const Wi = Number(optionPool) || 0;
  const s = Number(stake) || 0;
  const Tprime = T + s;
  const Wprime = Wi + s;
  if (Wprime <= 0) return null;

  const otherPool = Tprime - Wprime;
  const fees = (otherPool * (Number(feeBps) || 0)) / BPS_DENOM;
  const distributable = Math.max(0, Tprime - fees);
  return distributable / Wprime;
}

export interface GetPayoutPreviewInput {
  totalPool: number;
  optionPool: number;
  stake: number;
  feeBps: number;
}

export interface PayoutPreviewResult {
  expectedReturn: number;
  profit: number;
  multiplePre: number | null;
  multiplePost: number | null;
  distributablePool: number;
}

/**
 * Full payout preview: current odds, estimated odds, expected return, profit.
 * Fee rule: fees from losing pool (consistent with settlement).
 * Returns null if optionPool <= 0 and stake <= 0; otherwise W' can be stake-only (first bettor).
 */
export function getPayoutPreview(input: GetPayoutPreviewInput): PayoutPreviewResult | null {
  const { totalPool, optionPool, stake, feeBps } = input;
  const T = Number(totalPool) || 0;
  const Wi = Number(optionPool) || 0;
  const s = Number(stake) || 0;
  const fee = Number(feeBps) || 0;

  if (Wi <= 0 && s <= 0) return null;

  const Tprime = T + s;
  const Wprime = Wi + s;
  if (Wprime <= 0) return null;

  const multiplePre = getPreOddsMultiple(T, Wi);
  const multiplePost = getPostOddsMultiple({ totalPool: T, optionPool: Wi, stake: s, feeBps: fee });
  if (multiplePost == null) return null;

  const otherPool = Tprime - Wprime;
  const fees = (otherPool * fee) / BPS_DENOM;
  const distributablePool = Math.max(0, Tprime - fees);

  const expectedReturn = s * multiplePost;
  const profit = expectedReturn - s;

  return {
    expectedReturn,
    profit,
    multiplePre,
    multiplePost,
    distributablePool,
  };
}
