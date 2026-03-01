/**
 * Transaction delta formatting
 * 
 * Centralizes the logic for displaying transaction amounts with correct
 * signs and colors (credits = green +, debits = red –)
 */

import { formatCurrency } from './format';

export type TxTone = 'credit' | 'debit' | 'neutral';

function normKey(v?: string) {
  return (v || '').toLowerCase().trim();
}

function keyMatchesAny(key: string, needles: string[]) {
  for (const n of needles) {
    if (!n) continue;
    if (key.includes(n)) return true;
  }
  return false;
}

/**
 * Determine transaction tone (credit/debit/neutral) from amount and optional metadata
 */
export function getTxDeltaTone(args: {
  amount: number;
  direction?: 'credit' | 'debit';
  type?: string;
  kind?: string;
}): TxTone {
  const { amount, direction, type, kind } = args;

  if (amount === 0) return 'neutral';

  // If direction is explicitly provided, use it
  if (direction === 'credit') return 'credit';
  if (direction === 'debit') return 'debit';

  // Many activity feeds store amounts as positive numbers (e.g. amountUSD is abs),
  // so we infer direction from the event key when available.
  const k = normKey(kind);
  const t = normKey(type);
  const key = `${k} ${t}`.trim();

  // Known debit-ish events (stakes/locks/losses/withdrawals/fees)
  const debitMarkers = [
    'withdraw',
    'wallet.withdraw',
    'bet_lock',
    'wallet.bet_lock',
    'bet_placed',
    'entry.create',
    'entry',
    'stake',
    'loss',
    'wallet.loss',
    'fee',
  ];

  // Known credit-ish events (deposits/unlocks/refunds/payouts/wins/claims/earnings)
  const creditMarkers = [
    'deposit',
    'wallet.deposit',
    'unlock',
    'release',
    'bet_refund',
    'refund',
    'payout',
    'wallet.payout',
    'win',
    'claim',
    'creator_fee',
    'wallet.creator_fee',
    'platform_fee',
    'wallet.platform_fee',
  ];

  if (key && keyMatchesAny(key, creditMarkers)) return 'credit';
  if (key && keyMatchesAny(key, debitMarkers)) return 'debit';

  // Fallback to numeric sign when we truly have signed amounts
  return amount > 0 ? 'credit' : 'debit';
}

/**
 * Format transaction amount with sign and tone
 */
export function formatTxAmount(args: {
  amount: number;
  currency?: string;
  direction?: 'credit' | 'debit';
  type?: string;
  kind?: string;
  compact?: boolean;
}): { tone: TxTone; display: string; absAmount: number } {
  const { amount, compact = true, currency = 'USD' } = args;
  const absAmount = Math.abs(amount);
  const tone = getTxDeltaTone({ amount, direction: args.direction, type: args.type, kind: args.kind });

  // Format the absolute amount
  const formatted = formatCurrency(absAmount, { compact, currency });

  // Add sign based on tone
  let display: string;
  if (tone === 'credit') {
    display = `+${formatted}`;
  } else if (tone === 'debit') {
    display = `–${formatted}`; // Use en-dash for better typography
  } else {
    display = formatted; // Neutral: no sign
  }

  return { tone, display, absAmount };
}

/**
 * Get CSS class for transaction tone
 * Maps to existing design language classes
 */
export function toneClass(tone: TxTone): string {
  switch (tone) {
    case 'credit':
      return 'text-emerald-600'; // Green for credits
    case 'debit':
      return 'text-red-500'; // Red for debits
    case 'neutral':
      return 'text-gray-500'; // Muted for neutral
    default:
      return 'text-gray-500';
  }
}
