/**
 * Phase 5: Terms/Privacy/Community Guidelines acceptance.
 * Single source for current version and DB check.
 * 
 * Defensive: if the terms_acceptance table doesn't exist, we assume acceptance
 * to avoid blocking all UGC features due to missing migrations.
 */

import { supabase } from '../config/database';

export const TERMS_VERSION = '1.0';

/**
 * Check if user has accepted the current terms version.
 * Returns true if:
 * - User has a record in terms_acceptance with current version
 * - The table doesn't exist (defensive fallback)
 * - Any other error occurs (fail-open to avoid blocking users)
 */
export async function hasAcceptedTerms(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('terms_acceptance')
      .select('id')
      .eq('user_id', userId)
      .eq('terms_version', TERMS_VERSION)
      .maybeSingle();

    if (error) {
      const msg = String(error?.message || '').toLowerCase();
      const code = String(error?.code || '');
      // Postgres: undefined_table = 42P01
      const tableMissing =
        code === '42P01' ||
        msg.includes('does not exist') ||
        msg.includes('relation') && msg.includes('does not exist');

      if (tableMissing) {
        // Table doesn't exist - fail open so UGC features work
        console.warn('[termsAcceptance] terms_acceptance table missing - assuming acceptance');
        return true;
      }

      // Other errors - log but fail open to avoid blocking users
      console.warn('[termsAcceptance] Error checking terms:', error.message);
      return true;
    }

    return !!data;
  } catch (e: any) {
    // Unexpected error - fail open
    console.error('[termsAcceptance] Unexpected error:', e?.message || e);
    return true;
  }
}
