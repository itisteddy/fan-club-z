/**
 * Wallet transaction insertion helpers with idempotency support
 * 
 * When external_ref is provided, inserts are idempotent (duplicates prevented).
 * When external_ref is not provided, inserts proceed normally.
 */

import { supabase } from '../config/database';
import { insertIdempotent } from './idempotency';

/**
 * Insert a wallet transaction with optional idempotency
 * 
 * If external_ref is provided, the insert is idempotent (returns existing row if found).
 * If external_ref is not provided, inserts normally.
 * 
 * @param payload Wallet transaction payload
 * @returns Insert result with data and error
 */
export async function insertWalletTransaction(payload: {
  user_id: string;
  type: string;
  direction?: 'credit' | 'debit';
  channel?: string;
  provider?: string;
  amount: number;
  currency?: string;
  status?: string;
  external_ref?: string | null;
  reference?: string | null; // Legacy field, maps to external_ref if external_ref not provided
  description?: string;
  prediction_id?: string;
  entry_id?: string;
  tx_hash?: string;
  meta?: any;
  [key: string]: any;
}): Promise<{ data: any; error: any }> {
  // Use external_ref if provided, otherwise fall back to reference
  const refValue = payload.external_ref || payload.reference || null;
  const provider = payload.provider || null;

  // If external_ref/reference exists, use idempotent insert
  if (refValue && provider) {
    return insertIdempotent({
      table: 'wallet_transactions',
      refField: 'external_ref',
      refValue,
      provider,
      insertFn: async () => {
        // Map reference to external_ref if needed
        const insertPayload = {
          ...payload,
          external_ref: refValue,
        };
        // Remove reference field if it was used as fallback
        if (!payload.external_ref && payload.reference) {
          delete (insertPayload as any).reference;
        }

        return await supabase
          .from('wallet_transactions')
          .insert(insertPayload)
          .select('id')
          .single();
      },
    });
  }

  // No external_ref provided, insert normally (existing behavior)
  const insertPayload = { ...payload };
  // Remove reference if external_ref is not set (to avoid confusion)
  if (!payload.external_ref && payload.reference) {
    // Keep reference for backward compatibility if no external_ref
  }

  return await supabase
    .from('wallet_transactions')
    .insert(insertPayload)
    .select('id')
    .single();
}
