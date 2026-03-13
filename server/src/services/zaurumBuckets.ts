export const ZAURUM_BUCKETS = [
  'claim_zaurum',
  'won_zaurum',
  'creator_fee_zaurum',
  'legacy_migrated_zaurum',
] as const;

export type ZaurumBucket = (typeof ZAURUM_BUCKETS)[number];

export type ZaurumBucketBalances = {
  claim_zaurum: number;
  won_zaurum: number;
  creator_fee_zaurum: number;
  legacy_migrated_zaurum: number;
};

function toNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function round8(value: number): number {
  return Math.round((Number(value) || 0) * 1e8) / 1e8;
}

export function normalizeBucketBalances(row: any): ZaurumBucketBalances {
  return {
    claim_zaurum: round8(toNum(row?.claim_zaurum_balance)),
    won_zaurum: round8(toNum(row?.won_zaurum_balance)),
    creator_fee_zaurum: round8(toNum(row?.creator_fee_zaurum_balance)),
    legacy_migrated_zaurum: round8(toNum(row?.legacy_migrated_zaurum_balance)),
  };
}

export function addToBucket(
  balances: ZaurumBucketBalances,
  bucket: ZaurumBucket,
  amount: number
): ZaurumBucketBalances {
  const next = { ...balances };
  next[bucket] = round8(Math.max(0, next[bucket] + amount));
  return next;
}

export function consumeStakeDebitFromBuckets(args: {
  balances: ZaurumBucketBalances;
  amount: number;
}) {
  const amount = round8(args.amount);
  const next = { ...args.balances };
  let remaining = amount;
  // Deterministic spend order: non-withdrawable sources first.
  const spendOrder: ZaurumBucket[] = [
    'claim_zaurum',
    'legacy_migrated_zaurum',
    'won_zaurum',
    'creator_fee_zaurum',
  ];
  const debits: Record<ZaurumBucket, number> = {
    claim_zaurum: 0,
    legacy_migrated_zaurum: 0,
    won_zaurum: 0,
    creator_fee_zaurum: 0,
  };

  for (const bucket of spendOrder) {
    if (remaining <= 0) break;
    const available = round8(Math.max(0, next[bucket]));
    if (available <= 0) continue;
    const take = round8(Math.min(available, remaining));
    next[bucket] = round8(available - take);
    debits[bucket] = take;
    remaining = round8(remaining - take);
  }

  return {
    next,
    debits,
    remaining,
    sufficient: remaining <= 0,
  };
}

export function extractSourceBucket(meta: any, fallback?: ZaurumBucket | null): ZaurumBucket | null {
  const explicit = String(meta?.source_bucket || '').trim().toLowerCase();
  if (ZAURUM_BUCKETS.includes(explicit as ZaurumBucket)) {
    return explicit as ZaurumBucket;
  }
  return fallback || null;
}
