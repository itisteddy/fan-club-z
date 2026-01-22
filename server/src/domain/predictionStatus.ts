/**
 * Prediction status lifecycle and transition rules
 * 
 * This module defines the canonical status types and allowed transitions
 * for predictions in Fan Club Z.
 */

/**
 * All valid prediction statuses
 */
export type PredictionStatus =
  | 'pending'      // Draft/not yet open for entries
  | 'open'         // Accepting entries
  | 'closed'       // Entry deadline passed, awaiting settlement
  | 'awaiting_settlement' // Closed and ready for settlement
  | 'settled'      // Settlement completed, payouts distributed
  | 'disputed'     // Under dispute resolution
  | 'cancelled'    // Cancelled before settlement
  | 'refunded'     // Cancelled and refunds issued
  | 'ended';       // Legacy/alternate for closed/settled

/**
 * Status constant map for reference
 */
export const PREDICTION_STATUS = {
  PENDING: 'pending',
  OPEN: 'open',
  CLOSED: 'closed',
  AWAITING_SETTLEMENT: 'awaiting_settlement',
  SETTLED: 'settled',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  ENDED: 'ended',
} as const;

/**
 * Allowed status transitions
 * Maps from current status to array of valid next statuses
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<PredictionStatus, PredictionStatus[]> = {
  pending: ['open', 'cancelled'],
  open: ['closed', 'cancelled'],
  closed: ['awaiting_settlement', 'settled', 'disputed', 'cancelled'],
  awaiting_settlement: ['settled', 'disputed', 'cancelled'],
  settled: [], // Terminal state
  disputed: ['settled', 'cancelled', 'refunded'],
  cancelled: ['refunded'], // Can issue refunds after cancellation
  refunded: [], // Terminal state
  ended: [], // Terminal/legacy state
};

/**
 * Check if a status transition is valid
 * @param from Current status
 * @param to Target status
 * @returns true if transition is allowed
 */
export function isValidTransition(from: PredictionStatus, to: PredictionStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}
