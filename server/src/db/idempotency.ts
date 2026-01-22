/**
 * Idempotency helpers for database operations
 * 
 * Prevents duplicate inserts when external_ref (or equivalent reference key) is provided.
 * Used by payouts, refunds, webhooks, and other operations that need safe retry behavior.
 */

import { supabase } from '../config/database';

/**
 * Find existing row by reference field
 * @param params Lookup parameters
 * @returns Existing row if found, null otherwise
 */
export async function findExistingByRef<T = any>(params: {
  table: string;
  refField: string;
  refValue: string | null | undefined;
  provider?: string; // For wallet_transactions, we need (provider, external_ref) unique constraint
}): Promise<T | null> {
  const { table, refField, refValue, provider } = params;

  if (!refValue) {
    return null;
  }

  // For wallet_transactions, use (provider, external_ref) unique constraint
  if (table === 'wallet_transactions' && refField === 'external_ref' && provider) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('provider', provider)
      .eq(refField, refValue)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.warn(`[idempotency] Error checking existing ${table}:`, error);
    }

    return (data as T) || null;
  }

  // For other tables, use the refField directly
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(refField, refValue)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.warn(`[idempotency] Error checking existing ${table}:`, error);
  }

  return (data as T) || null;
}

/**
 * Insert idempotently: if refValue exists, return existing row; otherwise insert and return new row
 * @param params Insert parameters
 * @returns Inserted or existing row
 */
export async function insertIdempotent<T = any>(params: {
  table: string;
  refField: string;
  refValue: string | null | undefined;
  insertFn: () => Promise<{ data: T | null; error: any }>;
  provider?: string; // For wallet_transactions, required when using external_ref
}): Promise<{ data: T | null; error: any }> {
  const { table, refField, refValue, insertFn, provider } = params;

  // If no refValue provided, just insert normally (no idempotency check)
  if (!refValue) {
    return insertFn();
  }

  // Check for existing row
  const existing = await findExistingByRef<T>({
    table,
    refField,
    refValue,
    provider,
  });

  if (existing) {
    // Return existing row (idempotent - no duplicate insert)
    return { data: existing, error: null };
  }

  // No existing row found, proceed with insert
  return insertFn();
}
