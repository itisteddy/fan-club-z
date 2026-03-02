// Import canonical pool pricing directly from shared source so tests/build use the same function
// even if package barrel exports lag behind in local/dev environments.
import { getPostOddsMultiple } from '@fanclubz/shared';
import { supabase } from '../config/database';

export type StakeMode = 'DEMO' | 'REAL';

type PredictionQuoteRow = {
  id: string;
  status: string;
  entry_deadline?: string | null;
  pool_total?: number | null;
  odds_model?: string | null;
  platform_fee_percentage?: number | null;
  creator_fee_percentage?: number | null;
};

type OptionQuoteRow = {
  id: string;
  prediction_id: string;
  label?: string | null;
  total_staked?: number | null;
  current_odds?: number | null;
};

type EntryQuoteRow = {
  id: string;
  user_id: string;
  option_id: string;
  amount: number | null;
  provider?: string | null;
};

export type StakeQuoteSide = {
  userStake: number;
  oddsOrPrice: number | null;
  estPayout: number;
};

export type StakeQuoteResponse = {
  marketId: string;
  outcomeId: string;
  amount: number;
  pricingModel: string;
  current: StakeQuoteSide;
  after: StakeQuoteSide;
  disclaimer: string;
};

export class StakeQuoteError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;
const toNum = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

export function deriveFeeBps(prediction: Partial<PredictionQuoteRow>): number {
  const platformFeePct = Number(prediction.platform_fee_percentage);
  const creatorFeePct = Number(prediction.creator_fee_percentage);
  const platformFeeBps = Number.isFinite(platformFeePct) ? Math.round(platformFeePct * 100) : 250;
  const creatorFeeBps = Number.isFinite(creatorFeePct) ? Math.round(creatorFeePct * 100) : 100;
  return platformFeeBps + creatorFeeBps;
}

export function buildStakeQuoteFromSnapshot(params: {
  marketId: string;
  outcomeId: string;
  amount: number;
  pricingModel?: string | null;
  totalPool: number;
  optionPool: number;
  existingPositionStake: number;
  feeBps: number;
}): StakeQuoteResponse {
  const {
    marketId,
    outcomeId,
    amount,
    pricingModel,
    totalPool,
    optionPool,
    existingPositionStake,
    feeBps,
  } = params;

  const total = Math.max(0, toNum(totalPool));
  const selected = Math.max(0, toNum(optionPool));
  const existing = Math.max(0, toNum(existingPositionStake));
  const amt = Math.max(0, toNum(amount));

  const currentMultiple = getPostOddsMultiple({
    totalPool: total,
    optionPool: selected,
    stake: 0,
    feeBps,
  });

  const afterMultiple = getPostOddsMultiple({
    totalPool: total,
    optionPool: selected,
    stake: amt,
    feeBps,
  });

  const currentEstPayout = currentMultiple == null ? 0 : round2(existing * currentMultiple);
  const afterStakeTotal = existing + amt;
  const afterEstPayout = afterMultiple == null ? 0 : round2(afterStakeTotal * afterMultiple);

  return {
    marketId,
    outcomeId,
    amount: round2(amt),
    pricingModel: pricingModel || 'pool_parimutuel',
    current: {
      userStake: round2(existing),
      oddsOrPrice: currentMultiple == null ? null : Number(currentMultiple.toFixed(6)),
      estPayout: currentEstPayout,
    },
    after: {
      userStake: round2(afterStakeTotal),
      oddsOrPrice: afterMultiple == null ? null : Number(afterMultiple.toFixed(6)),
      estPayout: afterEstPayout,
    },
    disclaimer: 'Estimated; final payout depends on final pools at close.',
  };
}

function isEntryRelevantForMode(entry: EntryQuoteRow, mode: StakeMode): boolean {
  const provider = entry.provider || null;
  if (mode === 'REAL') return provider === 'crypto-base-usdc';
  return provider !== 'crypto-base-usdc';
}

export function getExistingPositionForQuote(
  entries: EntryQuoteRow[],
  outcomeId: string,
  mode: StakeMode
): { sameOutcomeEntry: EntryQuoteRow | null; sameOutcomeStake: number; otherOutcomeEntry: EntryQuoteRow | null } {
  const relevantEntries = entries.filter((e) => isEntryRelevantForMode(e, mode));
  const sameOutcomeEntries = relevantEntries.filter((e) => e.option_id === outcomeId);
  const sameOutcomeEntry = sameOutcomeEntries[0] || null;
  const sameOutcomeStake = sameOutcomeEntries.reduce((sum, e) => sum + toNum(e.amount), 0);
  const otherOutcomeEntry = relevantEntries.find((e) => e.option_id !== outcomeId) || null;
  return { sameOutcomeEntry, sameOutcomeStake: round2(sameOutcomeStake), otherOutcomeEntry };
}

export async function computeStakeQuoteFromDb(params: {
  predictionId: string;
  optionId: string;
  amount: number;
  userId: string;
  mode: StakeMode;
}): Promise<{
  quote: StakeQuoteResponse;
  prediction: PredictionQuoteRow;
  option: OptionQuoteRow;
  sameOutcomeEntry: EntryQuoteRow | null;
  otherOutcomeEntry: EntryQuoteRow | null;
}> {
  const { predictionId, optionId, amount, userId, mode } = params;
  const stakeAmount = toNum(amount);
  if (!(stakeAmount > 0)) {
    throw new StakeQuoteError('invalid_amount', 'Amount must be greater than 0', 400);
  }

  const { data: prediction, error: predErr } = await supabase
    .from('predictions')
    .select('id,status,entry_deadline,pool_total,odds_model,platform_fee_percentage,creator_fee_percentage')
    .eq('id', predictionId)
    .single();
  if (predErr || !prediction) {
    throw new StakeQuoteError('prediction_not_found', 'Prediction not found', 404);
  }
  if (prediction.status !== 'open') {
    throw new StakeQuoteError('prediction_not_open', `Prediction is ${prediction.status}`, 400);
  }
  if (prediction.entry_deadline && new Date(prediction.entry_deadline) <= new Date()) {
    throw new StakeQuoteError('prediction_closed', 'Prediction is closed for entries', 400);
  }

  const { data: option, error: optErr } = await supabase
    .from('prediction_options')
    .select('id,prediction_id,label,total_staked,current_odds')
    .eq('id', optionId)
    .eq('prediction_id', predictionId)
    .single();
  if (optErr || !option) {
    throw new StakeQuoteError('option_not_found', 'Option not found for this prediction', 404);
  }

  const { data: userEntries, error: entryErr } = await supabase
    .from('prediction_entries')
    .select('id,user_id,option_id,amount,provider')
    .eq('prediction_id', predictionId)
    .eq('user_id', userId)
    .eq('status', 'active');
  if (entryErr) {
    throw new StakeQuoteError('entry_lookup_failed', 'Failed to fetch user position', 500);
  }

  const entries = (userEntries || []) as EntryQuoteRow[];
  const { sameOutcomeEntry, sameOutcomeStake, otherOutcomeEntry } = getExistingPositionForQuote(entries, optionId, mode);
  const feeBps = deriveFeeBps(prediction as any);

  const quote = buildStakeQuoteFromSnapshot({
    marketId: predictionId,
    outcomeId: optionId,
    amount: stakeAmount,
    pricingModel: (prediction as any).odds_model || 'pool_parimutuel',
    totalPool: toNum((prediction as any).pool_total),
    optionPool: toNum((option as any).total_staked),
    existingPositionStake: sameOutcomeStake,
    feeBps,
  });

  return {
    quote,
    prediction: prediction as any,
    option: option as any,
    sameOutcomeEntry,
    otherOutcomeEntry,
  };
}

export async function insertPositionStakeEvent(args: {
  userId: string;
  predictionId: string;
  optionId: string;
  amount: number;
  mode: StakeMode;
  entryId?: string | null;
  quoteSnapshot: StakeQuoteResponse;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    user_id: args.userId,
    prediction_id: args.predictionId,
    option_id: args.optionId,
    entry_id: args.entryId ?? null,
    amount: round2(args.amount),
    mode: args.mode,
    quote_snapshot: args.quoteSnapshot as any,
    metadata: args.metadata ?? {},
  };

  try {
    const { error } = await supabase.from('position_stake_events').insert(payload as any);
    if (error) throw error;
  } catch (e) {
    console.warn('[STAKE-QUOTE] Failed to insert position stake event (non-fatal):', e);
  }
}
