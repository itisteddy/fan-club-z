import { describe, expect, it } from '@jest/globals';
import {
  buildStakeQuoteFromSnapshot,
  deriveFeeBps,
  getExistingPositionForQuote,
} from '../services/stakeQuote';

describe('stakeQuote service', () => {
  it('builds before/after quote for top-up using pool pricing', () => {
    const quote = buildStakeQuoteFromSnapshot({
      marketId: 'm1',
      outcomeId: 'o1',
      amount: 25,
      pricingModel: 'pool_parimutuel',
      totalPool: 200,
      optionPool: 80,
      existingPositionStake: 20,
      feeBps: 350,
    });

    expect(quote.marketId).toBe('m1');
    expect(quote.outcomeId).toBe('o1');
    expect(quote.current.userStake).toBe(20);
    expect(quote.after.userStake).toBe(45);
    expect(quote.after.estPayout).toBeGreaterThan(0);
    expect(quote.current.oddsOrPrice).not.toBeNull();
    expect(quote.after.oddsOrPrice).not.toBeNull();
    expect(quote.after.oddsOrPrice!).toBeLessThanOrEqual(quote.current.oddsOrPrice!);
  });

  it('finds same-outcome aggregated position and conflicting other-outcome entry in DEMO mode', () => {
    const result = getExistingPositionForQuote(
      [
        { id: 'e1', user_id: 'u1', option_id: 'o1', amount: 5, provider: null },
        { id: 'e2', user_id: 'u1', option_id: 'o1', amount: 7.5, provider: null },
        { id: 'e3', user_id: 'u1', option_id: 'o2', amount: 3, provider: null },
        { id: 'e4', user_id: 'u1', option_id: 'o1', amount: 99, provider: 'crypto-base-usdc' }, // ignored in DEMO
      ] as any,
      'o1',
      'DEMO'
    );

    expect(result.sameOutcomeEntry?.id).toBe('e1');
    expect(result.sameOutcomeStake).toBe(12.5);
    expect(result.otherOutcomeEntry?.id).toBe('e3');
  });

  it('filters positions by REAL mode provider', () => {
    const result = getExistingPositionForQuote(
      [
        { id: 'd1', user_id: 'u1', option_id: 'o1', amount: 10, provider: null },
        { id: 'r1', user_id: 'u1', option_id: 'o1', amount: 12, provider: 'crypto-base-usdc' },
      ] as any,
      'o1',
      'REAL'
    );
    expect(result.sameOutcomeEntry?.id).toBe('r1');
    expect(result.sameOutcomeStake).toBe(12);
    expect(result.otherOutcomeEntry).toBeNull();
  });

  it('derives fee bps from platform + creator percentages', () => {
    expect(
      deriveFeeBps({
        platform_fee_percentage: 2.5,
        creator_fee_percentage: 1.0,
      } as any)
    ).toBe(350);
  });
});

