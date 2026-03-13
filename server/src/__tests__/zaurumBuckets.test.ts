import { describe, expect, it } from '@jest/globals';
import { consumeStakeDebitFromBuckets, normalizeBucketBalances } from '../services/zaurumBuckets';

describe('zaurumBuckets', () => {
  it('normalizes nullable wallet bucket columns', () => {
    const normalized = normalizeBucketBalances({
      claim_zaurum_balance: null,
      won_zaurum_balance: '4.25',
      creator_fee_zaurum_balance: undefined,
      legacy_migrated_zaurum_balance: 3,
    });
    expect(normalized).toEqual({
      claim_zaurum: 0,
      won_zaurum: 4.25,
      creator_fee_zaurum: 0,
      legacy_migrated_zaurum: 3,
    });
  });

  it('consumes stake debit in deterministic order (claim -> migrated -> won -> creator_fee)', () => {
    const result = consumeStakeDebitFromBuckets({
      balances: {
        claim_zaurum: 2,
        legacy_migrated_zaurum: 3,
        won_zaurum: 5,
        creator_fee_zaurum: 7,
      },
      amount: 9,
    });
    expect(result.sufficient).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.debits).toEqual({
      claim_zaurum: 2,
      legacy_migrated_zaurum: 3,
      won_zaurum: 4,
      creator_fee_zaurum: 0,
    });
    expect(result.next).toEqual({
      claim_zaurum: 0,
      legacy_migrated_zaurum: 0,
      won_zaurum: 1,
      creator_fee_zaurum: 7,
    });
  });

  it('flags insufficient classified balance', () => {
    const result = consumeStakeDebitFromBuckets({
      balances: {
        claim_zaurum: 1,
        legacy_migrated_zaurum: 1,
        won_zaurum: 0,
        creator_fee_zaurum: 0,
      },
      amount: 3,
    });
    expect(result.sufficient).toBe(false);
    expect(result.remaining).toBe(1);
    expect(result.next).toEqual({
      claim_zaurum: 0,
      legacy_migrated_zaurum: 0,
      won_zaurum: 0,
      creator_fee_zaurum: 0,
    });
  });
});
