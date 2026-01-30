/**
 * Phase 5: Terms/Privacy/Community Guidelines acceptance.
 * Single source for current version and DB check.
 */

import { supabase } from '../config/database';

export const TERMS_VERSION = '1.0';

export async function hasAcceptedTerms(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('terms_acceptance')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', TERMS_VERSION)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
