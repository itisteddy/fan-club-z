/**
 * Canonical prediction status UI mapping
 * 
 * Ensures consistent status labels across all prediction displays.
 * Never shows "Settled" unless actually settled.
 */

export type StatusTone = 'default' | 'success' | 'warning' | 'danger';

export interface PredictionStatusUi {
  label: string;
  tone: StatusTone;
  subtext?: string;
}

type PredictionInput = {
  status?: string | null;
  closesAt?: string | number | null;
  closedAt?: string | number | null;
  settledAt?: string | number | null;
  settled_at?: string | number | null;
  cancelledAt?: string | number | null;
  voidedAt?: string | number | null;
  disputeStatus?: string | null;
  [key: string]: any;
};

/**
 * Get canonical status UI for a prediction
 * 
 * Rules (deterministic):
 * 1) If cancelled/voided → danger badge
 * 2) Else if disputed → warning badge
 * 3) Else if settled → success badge "Complete"
 * 4) Else if closed → default badge "Closed" + "Awaiting settlement"
 * 5) Else → default badge "Active"
 */
export function getPredictionStatusUi(pred: PredictionInput): PredictionStatusUi {
  const status = (pred.status || '').toLowerCase();
  const now = Date.now();

  // Rule 1: Cancelled
  if (status === 'cancelled' || pred.cancelledAt) {
    return {
      label: 'Cancelled',
      tone: 'danger',
      subtext: pred.cancelledAt
        ? `Cancelled on ${new Date(pred.cancelledAt).toLocaleDateString()}`
        : undefined,
    };
  }

  // Rule 2: Voided
  if (status === 'voided' || pred.voidedAt) {
    return {
      label: 'Voided',
      tone: 'danger',
      subtext: pred.voidedAt
        ? `Voided on ${new Date(pred.voidedAt).toLocaleDateString()}`
        : undefined,
    };
  }

  // Rule 3: Disputed
  const disputeStatus = (pred.disputeStatus || '').toLowerCase();
  if (disputeStatus === 'open' || disputeStatus === 'active' || status === 'disputed') {
    return {
      label: 'Disputed',
      tone: 'warning',
      subtext: 'Under review',
    };
  }

  // Rule 4: Settled/Complete (highest priority after cancelled/voided/disputed)
  const hasSettledAt = !!(pred.settledAt || pred.settled_at);
  const isSettled = hasSettledAt || status === 'settled' || status === 'complete';
  
  if (isSettled) {
    const settledDate = pred.settledAt || pred.settled_at;
    return {
      label: 'Complete',
      tone: 'success',
      subtext: settledDate
        ? `Settled on ${new Date(settledDate).toLocaleDateString()}`
        : undefined,
    };
  }

  // Rule 5: Closed (but not settled)
  const hasClosedAt = !!pred.closedAt;
  const closesAtTime = pred.closesAt ? new Date(pred.closesAt).getTime() : null;
  const isPastDeadline = closesAtTime ? closesAtTime <= now : false;
  const isClosed = hasClosedAt || status === 'closed' || status === 'awaiting_settlement' || isPastDeadline;

  if (isClosed) {
    return {
      label: 'Closed',
      tone: 'default',
      subtext: 'Awaiting settlement',
    };
  }

  // Rule 6: Active (default)
  return {
    label: 'Active',
    tone: 'default',
    // Optional: Add relative time if helpers exist (not adding new formatting here)
  };
}
