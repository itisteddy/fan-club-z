/**
 * Payout UI resolver - Phase 6B
 * Resolves canonical payout fields from server (preferred) or fallback to existing fields
 */

export type PayoutUi = {
  staked: number;
  returned: number;
  net: number;
  status?: 'win' | 'loss' | 'refund' | 'pending';
  claimStatus?: 'not_applicable' | 'available' | 'claimed' | 'not_available';
  hasCanonical: boolean;
};

/**
 * Resolve payout fields from prediction payload
 * Prefers canonical server fields (Phase 6A), falls back to existing fields
 */
export function resolveMyPayout(pred: any): PayoutUi {
  if (!pred) {
    return {
      staked: 0,
      returned: 0,
      net: 0,
      hasCanonical: false,
    };
  }

  // Phase 6A: Prefer canonical fields from server
  if (
    typeof pred.myStakeTotal === 'number' ||
    typeof pred.myReturnedTotal === 'number' ||
    typeof pred.myNet === 'number'
  ) {
    return {
      staked: typeof pred.myStakeTotal === 'number' ? pred.myStakeTotal : 0,
      returned: typeof pred.myReturnedTotal === 'number' ? pred.myReturnedTotal : 0,
      net: typeof pred.myNet === 'number' ? pred.myNet : 0,
      status: pred.myStatus as any,
      claimStatus: pred.myClaimStatus as any,
      hasCanonical: true,
    };
  }

  // Fallback: Use existing fields (backward compatible)
  // These are computed from entries in predictionCardVM, but we provide safe defaults here
  const staked = pred.myStake || pred.staked || 0;
  const returned = pred.myReturned || pred.returned || 0;
  const net = returned - staked;

  return {
    staked,
    returned,
    net,
    hasCanonical: false,
  };
}

/**
 * Format payout amount using existing money formatter
 */
export function formatPayoutAmount(amount: number, options?: { compact?: boolean }): string {
  if (options?.compact) {
    // Use compact formatting if available
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
  }
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get payout tone for styling (credit/debit/neutral)
 */
export function getPayoutTone(net: number): 'credit' | 'debit' | 'neutral' {
  if (net > 0) return 'credit';
  if (net < 0) return 'debit';
  return 'neutral';
}
