import { supabase } from '../config/database';

type RecomputeResult = {
  poolTotal: number;
  participantCount: number;
  options: any[];
  prediction: any | null;
};

/**
 * Recalculate option totals, odds, pool total, and participant count
 * for a prediction after any balance-changing operation (bet, settlement, etc).
 */
export async function recomputePredictionState(predictionId: string): Promise<RecomputeResult> {
  const nowIso = new Date().toISOString();

  const { data: optionRows, error: optionsError } = await supabase
    .from('prediction_options')
    .select('id')
    .eq('prediction_id', predictionId);

  if (optionsError) {
    console.error('[PredictionMath] Failed to load options for recompute:', optionsError);
    return { poolTotal: 0, participantCount: 0, options: [], prediction: null };
  }

  const optionIds = (optionRows || []).map((row) => row.id);
  const optionCount = optionIds.length > 0 ? optionIds.length : 2;

  const { data: entryRows, error: entriesError } = await supabase
    .from('prediction_entries')
    .select('option_id, amount')
    .eq('prediction_id', predictionId);

  if (entriesError) {
    console.error('[PredictionMath] Failed to load entries for recompute:', entriesError);
  }

  const totalsByOption = new Map<string, number>();
  (entryRows || []).forEach((row) => {
    if (!row.option_id) return;
    const prev = totalsByOption.get(row.option_id) || 0;
    totalsByOption.set(row.option_id, prev + Number(row.amount || 0));
  });

  const poolTotal = Array.from(totalsByOption.values()).reduce((acc, value) => acc + value, 0);

  await Promise.all(
    optionIds.map((optionId) => {
      const stake = totalsByOption.get(optionId) || 0;
      const newOdds =
        stake > 0 && poolTotal > 0 ? Math.max(1.01, poolTotal / stake) : optionCount;

      return supabase
        .from('prediction_options')
        .update({
          total_staked: stake,
          current_odds: newOdds,
          updated_at: nowIso as any,
        })
        .eq('id', optionId);
    })
  );

  const { data: refreshedOptions, error: refreshError } = await supabase
    .from('prediction_options')
    .select('*')
    .eq('prediction_id', predictionId);

  if (refreshError) {
    console.error('[PredictionMath] Failed to reload options after update:', refreshError);
  }

  const { count: participantCount = 0, error: countError } = await supabase
    .from('prediction_entries')
    .select('id', { count: 'exact', head: true })
    .eq('prediction_id', predictionId);

  if (countError) {
    console.error('[PredictionMath] Failed to count participants:', countError);
  }

  const { data: predictionRow, error: predictionUpdateError } = await supabase
    .from('predictions')
    .update({
      pool_total: poolTotal,
      participant_count: participantCount,
      updated_at: nowIso as any,
    })
    .eq('id', predictionId)
    .select('*')
    .single();

  if (predictionUpdateError) {
    console.error('[PredictionMath] Failed to update prediction totals:', predictionUpdateError);
  }

  let fullPrediction = predictionRow || null;

  const { data: predictionWithRelations, error: predictionFetchError } = await supabase
    .from('predictions')
    .select(`
      *,
      creator:users!creator_id(id, username, full_name, avatar_url, is_verified),
      options:prediction_options!prediction_options_prediction_id_fkey(*)
    `)
    .eq('id', predictionId)
    .single();

  if (predictionFetchError) {
    console.error('[PredictionMath] Failed to fetch prediction with relations:', predictionFetchError);
  } else if (predictionWithRelations) {
    fullPrediction = predictionWithRelations;
  }

  return {
    poolTotal,
    participantCount,
    options: refreshedOptions || [],
    prediction: fullPrediction,
  };
}


