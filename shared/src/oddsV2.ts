/**
 * Odds V2 — Pool-based, fee-aware payout engine.
 *
 * All money math uses integer cents. No clamp to 2.0x or floor to 1.01x.
 * Fees are taken from the LOSING pool only (winners always >= 1.0x).
 *
 * Used for: reference odds (option list), payout preview (bet slip), settlement (pool_v2).
 */

const BPS_DENOM = 10_000;

export interface ReferenceMultipleInput {
  selectedPoolCents: number;
  totalPoolCents: number;
  referenceStakeCents: number;
  platformFeeBps: number;
  creatorFeeBps: number;
}

export interface PreviewInput {
  totalPoolCents: number;
  selectedPoolCents: number;
  stakeCents: number;
  platformFeeBps: number;
  creatorFeeBps: number;
}

export interface PreviewResult {
  multiple: number;
  expectedReturnCents: number;
  expectedProfitCents: number;
  feesCents: number;
  distributableCents: number;
  selectedPoolAfterCents: number;
  otherPoolAfterCents: number;
}

/**
 * Compute reference multiple for display (e.g. option list using min stake).
 * If selectedPoolCents === 0 and referenceStakeCents === 0, returns null (cannot compute).
 * If selectedPoolCents === 0 and referenceStakeCents > 0, treats as first bettor (selectedPoolAfter = referenceStakeCents).
 */
export function computeReferenceMultiple(input: ReferenceMultipleInput): number | null {
  const {
    selectedPoolCents,
    totalPoolCents,
    referenceStakeCents,
    platformFeeBps,
    creatorFeeBps,
  } = input;

  if (selectedPoolCents === 0 && referenceStakeCents === 0) return null;

  const selectedPoolAfterCents = selectedPoolCents === 0 ? referenceStakeCents : selectedPoolCents + referenceStakeCents;
  const totalPoolAfterCents = totalPoolCents + referenceStakeCents;
  const otherPoolAfterCents = totalPoolAfterCents - selectedPoolAfterCents;

  const feeBpsTotal = platformFeeBps + creatorFeeBps;
  const feesCents = Math.floor((otherPoolAfterCents * feeBpsTotal) / BPS_DENOM);
  const distributableCents = selectedPoolAfterCents + (otherPoolAfterCents - feesCents);

  if (selectedPoolAfterCents <= 0) return null;
  return distributableCents / selectedPoolAfterCents;
}

/**
 * Compute payout preview when user enters a stake.
 * Returns null if selectedPoolCents === 0 and stakeCents === 0.
 * First-bettor: when selectedPoolCents === 0 and stakeCents > 0, selectedPoolAfter = stakeCents.
 */
export function computePreview(input: PreviewInput): PreviewResult | null {
  const {
    totalPoolCents,
    selectedPoolCents,
    stakeCents,
    platformFeeBps,
    creatorFeeBps,
  } = input;

  if (selectedPoolCents === 0 && stakeCents === 0) return null;

  const selectedPoolAfterCents = selectedPoolCents === 0 ? stakeCents : selectedPoolCents + stakeCents;
  const totalPoolAfterCents = totalPoolCents + stakeCents;
  const otherPoolAfterCents = totalPoolAfterCents - selectedPoolAfterCents;

  const feeBpsTotal = platformFeeBps + creatorFeeBps;
  const feesCents = Math.floor((otherPoolAfterCents * feeBpsTotal) / BPS_DENOM);
  const distributableCents = selectedPoolAfterCents + (otherPoolAfterCents - feesCents);

  if (selectedPoolAfterCents <= 0) return null;

  const multiple = distributableCents / selectedPoolAfterCents;
  const expectedReturnCents = Math.floor(stakeCents * multiple);
  const expectedProfitCents = expectedReturnCents - stakeCents;

  return {
    multiple,
    expectedReturnCents,
    expectedProfitCents,
    feesCents,
    distributableCents,
    selectedPoolAfterCents,
    otherPoolAfterCents,
  };
}

/**
 * Settlement: compute payout multiple for a winning option (fees from losing pool).
 * selectedPoolCents = total stake on winning option; otherPoolCents = total stake on losing options.
 */
export function computePayoutMultiple(params: {
  selectedPoolCents: number;
  otherPoolCents: number;
  platformFeeBps: number;
  creatorFeeBps: number;
}): number | null {
  const { selectedPoolCents, otherPoolCents, platformFeeBps, creatorFeeBps } = params;
  if (selectedPoolCents <= 0) return null;

  const feeBpsTotal = platformFeeBps + creatorFeeBps;
  const feesCents = Math.floor((otherPoolCents * feeBpsTotal) / BPS_DENOM);
  const distributableCents = selectedPoolCents + (otherPoolCents - feesCents);
  return distributableCents / selectedPoolCents;
}

/** Format multiple for UI (e.g. 2 decimal places). Raw value unchanged. */
export function formatMultiple(multiple: number, decimals = 2): string {
  return multiple.toFixed(decimals);
}
