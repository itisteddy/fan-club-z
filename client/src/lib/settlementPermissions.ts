/**
 * Settlement finalization permission helpers.
 * 
 * These functions determine what finalization actions users can see/perform
 * based on their role and the prediction's crypto status.
 */

/**
 * Determines if the finalization section should be shown at all.
 * Only show for predictions with crypto entries.
 */
export function shouldShowFinalization(prediction: {
  hasCryptoEntries?: boolean;
}): boolean {
  return prediction.hasCryptoEntries === true;
}

/**
 * Check if user is admin (has admin key stored).
 * For UI purposes only - backend enforces actual authorization.
 */
export function isLocalAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  const adminKey = localStorage.getItem('fcz_admin_key');
  return !!adminKey && adminKey.trim().length > 0;
}

/**
 * Check if user is the prediction creator.
 */
export function isCreator(userId: string | undefined, prediction: { creator_id?: string }): boolean {
  if (!userId || !prediction.creator_id) return false;
  return userId === prediction.creator_id;
}

/**
 * Determines if user can request finalization (queue for admin to finalize).
 * Admin: always
 * Creator: only if allowCreatorFinalizationRequest flag is enabled (server-side enforced)
 * 
 * Note: The actual flag check happens server-side. Client optimistically shows
 * the button for creators, but server may reject with 403 if flag is disabled.
 */
export function canRequestFinalization(
  userId: string | undefined,
  prediction: { creator_id?: string },
  options: { allowCreatorRequest?: boolean } = {}
): boolean {
  // Admin can always request
  if (isLocalAdmin()) return true;
  
  // Creator can request if flag is enabled (default to true for UI, server enforces)
  if (isCreator(userId, prediction)) {
    return options.allowCreatorRequest !== false;
  }
  
  return false;
}

/**
 * Determines if user can finalize on-chain (publish merkle root).
 * This is admin-only regardless of any config flags.
 */
export function canFinalizeOnChain(): boolean {
  return isLocalAdmin();
}

/**
 * Get display text for finalization status.
 */
export function getFinalizationStatusText(
  status: string | null | undefined,
  hasCryptoEntries: boolean
): string {
  if (!hasCryptoEntries) {
    return 'Demo payouts are credited automatically after settlement.';
  }
  
  switch (status) {
    case 'queued':
      return 'Finalization queued. Awaiting admin to publish on-chain.';
    case 'running':
      return 'Publishing merkle root on-chain...';
    case 'finalized':
      return 'Finalized on-chain. Winners can now claim their payouts.';
    case 'failed':
      return 'Finalization failed. Admin retry required.';
    default:
      return 'Crypto payouts require on-chain finalization. Connect wallet to claim after finalization.';
  }
}

/**
 * User role for finalization context.
 */
export type FinalizationRole = 'admin' | 'creator' | 'participant' | 'viewer';

/**
 * Determine user's role in the context of finalization.
 */
export function getFinalizationRole(
  userId: string | undefined,
  prediction: { creator_id?: string },
  hasEntry: boolean
): FinalizationRole {
  if (isLocalAdmin()) return 'admin';
  if (isCreator(userId, prediction)) return 'creator';
  if (hasEntry) return 'participant';
  return 'viewer';
}
