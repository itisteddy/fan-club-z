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
/**
 * Current odds (before user's stake): T / Wi.
 * Returns null if optionPool <= 0 (guard division by zero).
 */
export declare function getPreOddsMultiple(totalPool: number, optionPool: number): number | null;
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
export declare function getPostOddsMultiple(input: GetPostOddsMultipleInput): number | null;
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
export declare function getPayoutPreview(input: GetPayoutPreviewInput): PayoutPreviewResult | null;
