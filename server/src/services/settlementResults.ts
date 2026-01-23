/**
 * Canonical settlement results service
 * Phase 6A: Persist deterministic per-user settlement outcomes
 */

import { supabase } from '../config/database';

export type SettlementUserResult = {
  predictionId: string;
  userId: string;
  provider: string; // 'demo-wallet' | 'crypto-base-usdc' | etc.
  stakeTotal: number;
  returnedTotal: number;
  net: number; // returnedTotal - stakeTotal
  status: 'win' | 'loss' | 'refund' | 'pending';
  claimStatus?: 'not_applicable' | 'available' | 'claimed' | 'not_available';
};

export type SettlementAggregates = {
  demo?: {
    pot: number;
    platformFee: number;
    creatorFee: number;
    payoutsTotal: number;
    entriesCount: number;
  };
  crypto?: {
    pot: number;
    platformFee?: number;
    creatorFee?: number;
    claimableCount?: number;
    entriesCount: number;
  };
  total: {
    pot: number;
    entriesCount: number;
  };
};

/**
 * Upsert canonical settlement result for a user/provider
 * Idempotent: overwrites same values, safe to retry
 */
export async function upsertSettlementResult(result: SettlementUserResult): Promise<void> {
  const { predictionId, userId, provider, stakeTotal, returnedTotal, net, status, claimStatus } = result;

  const { error } = await supabase
    .from('prediction_settlement_results')
    .upsert(
      {
        prediction_id: predictionId,
        user_id: userId,
        provider,
        stake_total: stakeTotal,
        returned_total: returnedTotal,
        net,
        status,
        claim_status: claimStatus || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'prediction_id,user_id,provider',
      }
    );

  if (error) {
    console.error('[settlementResults] Failed to upsert result:', error);
    throw new Error(`Failed to persist settlement result: ${error.message}`);
  }
}

/**
 * Get canonical settlement result for a user on a prediction
 */
export async function getSettlementResult(
  predictionId: string,
  userId: string,
  provider?: string
): Promise<SettlementUserResult | null> {
  let query = supabase
    .from('prediction_settlement_results')
    .select('*')
    .eq('prediction_id', predictionId)
    .eq('user_id', userId);

  if (provider) {
    query = query.eq('provider', provider);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[settlementResults] Failed to fetch result:', error);
    return null;
  }

  if (!data) return null;

  return {
    predictionId: data.prediction_id,
    userId: data.user_id,
    provider: data.provider,
    stakeTotal: Number(data.stake_total || 0),
    returnedTotal: Number(data.returned_total || 0),
    net: Number(data.net || 0),
    status: data.status as 'win' | 'loss' | 'refund' | 'pending',
    claimStatus: data.claim_status as any,
  };
}

/**
 * Get all settlement results for a prediction (for aggregates)
 */
export async function getPredictionSettlementResults(
  predictionId: string
): Promise<SettlementUserResult[]> {
  const { data, error } = await supabase
    .from('prediction_settlement_results')
    .select('*')
    .eq('prediction_id', predictionId);

  if (error) {
    console.error('[settlementResults] Failed to fetch results:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    predictionId: row.prediction_id,
    userId: row.user_id,
    provider: row.provider,
    stakeTotal: Number(row.stake_total || 0),
    returnedTotal: Number(row.returned_total || 0),
    net: Number(row.net || 0),
    status: row.status as 'win' | 'loss' | 'refund' | 'pending',
    claimStatus: row.claim_status as any,
  }));
}

/**
 * Compute aggregates from settlement results
 */
export async function computeSettlementAggregates(
  predictionId: string,
  entries: any[]
): Promise<SettlementAggregates> {
  const results = await getPredictionSettlementResults(predictionId);

  // Group by provider
  const demoResults = results.filter((r) => r.provider === 'demo-wallet');
  const cryptoResults = results.filter((r) => r.provider !== 'demo-wallet');

  const demoEntries = entries.filter((e: any) => e.provider === 'demo-wallet');
  const cryptoEntries = entries.filter((e: any) => e.provider !== 'demo-wallet');

  const aggregates: SettlementAggregates = {
    total: {
      pot: entries.reduce((sum, e: any) => sum + Number(e.amount || 0), 0),
      entriesCount: entries.length,
    },
  };

  if (demoResults.length > 0 || demoEntries.length > 0) {
    const demoPot = demoEntries.reduce((sum, e: any) => sum + Number(e.amount || 0), 0);
    const demoPayoutsTotal = demoResults.reduce((sum, r) => sum + r.returnedTotal, 0);
    // Fees are stored in bet_settlements or computed from entries; for now, compute from results
    // In practice, fees should come from settlement record, but this is a fallback
    aggregates.demo = {
      pot: demoPot,
      platformFee: 0, // Will be populated from settlement record if available
      creatorFee: 0, // Will be populated from settlement record if available
      payoutsTotal: demoPayoutsTotal,
      entriesCount: demoEntries.length,
    };
  }

  if (cryptoResults.length > 0 || cryptoEntries.length > 0) {
    const cryptoPot = cryptoEntries.reduce((sum, e: any) => sum + Number(e.amount || 0), 0);
    const claimableCount = cryptoResults.filter((r) => r.claimStatus === 'available').length;
    aggregates.crypto = {
      pot: cryptoPot,
      claimableCount,
      entriesCount: cryptoEntries.length,
    };
  }

  return aggregates;
}
