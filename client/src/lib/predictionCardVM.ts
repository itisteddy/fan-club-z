/**
 * Prediction Card View Model
 * 
 * Centralizes the mapping from API data to card display values.
 * Ensures consistency across all prediction card renders.
 */

export type PredictionCardVM = {
  id: string;
  title: string;
  categoryLabel?: string;
  statusBadge: { text: string; tone: 'default' | 'success' | 'warning' | 'danger' };
  statusSubtext?: string;
  participantsCount?: number;
  yourPositionLabel?: string;
  staked: number;
  returned: number;
  profitLoss: number;
  railLabel?: 'Demo' | 'Crypto' | 'Fiat' | null;
  settledAtText?: string | null;
};

type PredictionInput = {
  id: string;
  title: string;
  category?: string;
  status: string;
  settled_at?: string | null;
  settledAt?: string | null;
  entry_deadline?: string;
  participant_count?: number;
  participants?: number;
  options?: Array<{ id: string; label: string }>;
  closedAt?: string | null;
  [key: string]: any;
};

type EntryInput = {
  id?: string;
  option_id?: string;
  amount: number;
  actual_payout?: number | null;
  status?: string;
  provider?: string;
  option?: { id?: string; label?: string };
  [key: string]: any;
};

/**
 * Build prediction card view model from API data
 */
export function buildPredictionCardVM(input: {
  prediction: PredictionInput;
  myEntry?: EntryInput | EntryInput[]; // Single entry or array of entries
  now?: number;
}): PredictionCardVM {
  const { prediction, myEntry, now = Date.now() } = input;

  // Normalize entry to array
  const entries = Array.isArray(myEntry) ? myEntry : myEntry ? [myEntry] : [];

  // Aggregate staked amount across all entries
  const staked = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Determine if prediction is settled
  const statusLower = (prediction.status || '').toLowerCase();
  const hasSettledAt = !!(prediction.settled_at || prediction.settledAt);
  const isSettled = hasSettledAt || statusLower === 'settled' || statusLower === 'complete';

  // Determine if prediction is closed (but not settled)
  // IMPORTANT: If settled, it's not "closed" - it's "complete"
  const entryDeadline = prediction.entry_deadline;
  const isPastDeadline = entryDeadline ? new Date(entryDeadline).getTime() <= now : false;
  const isClosed = !isSettled && (statusLower === 'closed' || statusLower === 'awaiting_settlement' || isPastDeadline);

  // Status badge and subtext mapping (fixes contradictions)
  let statusBadge: { text: string; tone: 'default' | 'success' | 'warning' | 'danger' };
  let statusSubtext: string | undefined;

  if (statusLower === 'cancelled' || statusLower === 'voided' || statusLower === 'refunded') {
    statusBadge = {
      text: statusLower === 'refunded' ? 'Refunded' : statusLower === 'cancelled' ? 'Cancelled' : 'Voided',
      tone: 'danger',
    };
    if (prediction.settled_at || prediction.settledAt) {
      const date = new Date(prediction.settled_at || prediction.settledAt || '');
      statusSubtext = `${statusLower === 'refunded' ? 'Refunded' : 'Cancelled'} on ${date.toLocaleDateString()}`;
    }
  } else if (isSettled) {
    statusBadge = { text: 'Complete', tone: 'success' };
    if (hasSettledAt) {
      const date = new Date(prediction.settled_at || prediction.settledAt || '');
      statusSubtext = `Settled on ${date.toLocaleDateString()}`;
    }
  } else if (isClosed) {
    statusBadge = { text: 'Closed', tone: 'default' };
    statusSubtext = 'Awaiting settlement';
    // CRITICAL: Must NOT contain word "Settled" when awaiting settlement
  } else {
    statusBadge = { text: 'Active', tone: 'default' };
    // Optional: Add relative time if helpers exist
    if (entryDeadline) {
      const deadline = new Date(entryDeadline);
      const hoursLeft = (deadline.getTime() - now) / (1000 * 60 * 60);
      if (hoursLeft > 0 && hoursLeft < 48) {
        statusSubtext = `Closes in ${Math.round(hoursLeft)}h`;
      }
    }
  }

  // Monetary fields
  // Returned: use actual_payout if settled, else 0
  const returned = isSettled
    ? entries.reduce((sum, e) => sum + (Number(e.actual_payout) || 0), 0)
    : 0;

  // Profit/Loss = returned - staked (net)
  const profitLoss = returned - staked;

  // Your position label
  let yourPositionLabel: string | undefined;
  if (entries.length > 0) {
    const firstEntry = entries[0];
    if (firstEntry) {
      const optionId = firstEntry.option_id;
    
      // Try to find option label from prediction.options
      if (prediction.options && optionId) {
        const option = prediction.options.find((o: any) => o.id === optionId);
        if (option?.label) {
          yourPositionLabel = option.label;
        }
      }
    
      // Fallback to entry.option.label if available
      if (!yourPositionLabel && firstEntry.option?.label) {
        yourPositionLabel = firstEntry.option.label;
      }
    }

    // If multiple entries across different options (rare)
    if (entries.length > 1) {
      const uniqueOptions = new Set(entries.map(e => e.option_id).filter(Boolean));
      if (uniqueOptions.size > 1) {
        yourPositionLabel = 'Multiple positions';
      }
    }
  }

  // Rail label (subtle chip)
  let railLabel: 'Demo' | 'Crypto' | 'Fiat' | null = null;
  if (entries.length > 0) {
    const firstProvider = entries[0]?.provider;
    if (firstProvider === 'demo-wallet') {
      railLabel = 'Demo';
    } else if (firstProvider && firstProvider.includes('crypto')) {
      railLabel = 'Crypto';
    } else if (firstProvider && (firstProvider.includes('fiat') || firstProvider.includes('paystack'))) {
      railLabel = 'Fiat';
    }
  }

  // Settled date text (only if actually settled)
  const settledAtText = isSettled && hasSettledAt
    ? new Date(prediction.settled_at || prediction.settledAt || '').toLocaleDateString()
    : null;

  return {
    id: prediction.id,
    title: prediction.title,
    categoryLabel: prediction.category?.replace('_', ' '),
    statusBadge,
    statusSubtext,
    participantsCount: prediction.participant_count || prediction.participants || 0,
    yourPositionLabel,
    staked,
    returned,
    profitLoss,
    railLabel,
    settledAtText,
  };
}
