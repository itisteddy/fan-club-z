/**
 * Unified ActivityItem Model
 * 
 * Normalizes all activity types (deposits, withdrawals, locks, releases, entries)
 * for consistent rendering across Wallet and Prediction pages
 */

export type ActivityKind = 
  | 'deposit'
  | 'withdraw'
  | 'lock'
  | 'release'
  | 'entry'
  | 'claim'
  | 'payout';

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  amountUSD: number;
  txHash?: string;
  createdAt: string;
  meta?: {
    predictionId?: string;
    predictionTitle?: string;
    optionId?: string;
    optionLabel?: string;
    entryId?: string;
    lockId?: string;
    userId?: string;
    provider?: string;
    channel?: string;
    description?: string;
    [key: string]: any;
  };
}

/**
 * Activity icon mapping
 */
export const ACTIVITY_ICONS: Record<ActivityKind, string> = {
  deposit: 'ArrowDownCircle',
  withdraw: 'ArrowUpCircle',
  lock: 'Lock',
  release: 'Unlock',
  entry: 'TrendingUp',
  claim: 'Gift',
  payout: 'DollarSign',
};

/**
 * Activity label mapping
 */
export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdrawal',
  lock: 'Locked',
  release: 'Released',
  entry: 'Bet Placed',
  claim: 'Claimed',
  payout: 'Payout',
};

/**
 * Normalize wallet transaction to ActivityItem
 */
export function normalizeWalletTransaction(tx: any): ActivityItem {
  const kind = mapTransactionTypeToKind(tx.type, tx.channel, tx.direction);
  
  return {
    id: tx.id,
    kind,
    amountUSD: Math.abs(Number(tx.amount || 0)),
    txHash: tx.meta?.txHash || tx.external_ref?.split(':')[0],
    createdAt: tx.created_at || tx.timestamp,
    meta: {
      predictionId: tx.prediction_id,
      predictionTitle: tx.meta?.prediction_title || tx.description,
      optionId: tx.meta?.option_id,
      optionLabel: tx.meta?.option_label,
      entryId: tx.entry_id,
      lockId: tx.meta?.lock_id,
      userId: tx.user_id,
      provider: tx.provider,
      channel: tx.channel,
      description: tx.description,
      ...tx.meta,
    },
  };
}

/**
 * Normalize escrow lock to ActivityItem
 */
export function normalizeEscrowLock(lock: any): ActivityItem {
  const kind = lock.status === 'consumed' || lock.state === 'consumed' 
    ? 'entry' 
    : lock.status === 'released' || lock.state === 'released'
    ? 'release'
    : 'lock';

  return {
    id: lock.id,
    kind,
    amountUSD: Number(lock.amount || 0),
    txHash: lock.meta?.tx_hash || lock.tx_ref,
    createdAt: lock.created_at || lock.released_at,
    meta: {
      predictionId: lock.prediction_id,
      lockId: lock.id,
      userId: lock.user_id,
      provider: lock.meta?.provider || 'crypto-base-usdc',
      ...lock.meta,
    },
  };
}

/**
 * Normalize prediction entry to ActivityItem
 */
export function normalizePredictionEntry(entry: any, prediction?: any): ActivityItem {
  return {
    id: entry.id,
    kind: 'entry',
    amountUSD: Number(entry.amount || 0),
    createdAt: entry.created_at,
    meta: {
      predictionId: entry.prediction_id,
      predictionTitle: prediction?.title,
      optionId: entry.option_id,
      optionLabel: entry.option?.label,
      entryId: entry.id,
      lockId: entry.escrow_lock_id,
      userId: entry.user_id,
      provider: entry.provider,
    },
  };
}

/**
 * Map transaction type/channel/direction to ActivityKind
 */
function mapTransactionTypeToKind(
  type: string,
  channel?: string,
  direction?: string
): ActivityKind {
  // Deposits
  if (type === 'credit' && channel === 'escrow_deposit') {
    return 'deposit';
  }
  if (type === 'credit' && channel === 'crypto') {
    return 'deposit';
  }

  // Withdrawals
  if (type === 'debit' && channel === 'escrow_withdrawal') {
    return 'withdraw';
  }
  if (type === 'debit' && channel === 'crypto') {
    return 'withdraw';
  }

  // Locks
  if (type === 'bet_lock' || channel === 'escrow_consumed') {
    return 'lock';
  }

  // Releases
  if (type === 'bet_release' || channel === 'escrow_release') {
    return 'release';
  }

  // Entries
  if (type === 'bet_entry' || channel === 'prediction_entry') {
    return 'entry';
  }

  // Claims
  if (type === 'claim' || channel === 'settlement_claim') {
    return 'claim';
  }

  // Payouts
  if (type === 'payout' || channel === 'settlement_payout') {
    return 'payout';
  }

  // Default based on direction
  if (direction === 'credit') {
    return 'deposit';
  }
  if (direction === 'debit') {
    return 'withdraw';
  }

  return 'entry';
}

/**
 * Format relative timestamp (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
  
  return then.toLocaleDateString();
}

/**
 * Get block explorer URL for transaction hash
 */
export function getBlockExplorerUrl(txHash: string, chainId?: number): string {
  // Default to Base Sepolia (84532) if chainId not provided
  const chainIdNum = chainId || 84532;
  const baseUrl = chainIdNum === 84532 
    ? 'https://sepolia.basescan.org'
    : chainIdNum === 8453
    ? 'https://basescan.org'
    : 'https://etherscan.io';
  
  return `${baseUrl}/tx/${txHash}`;
}

