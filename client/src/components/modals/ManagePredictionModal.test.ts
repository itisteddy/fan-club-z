// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { isManagePredictionSettledState } from './managePredictionSettlementState';

describe('ManagePredictionModal settled-state normalization', () => {
  it('treats settledAt (camelCase) as settled to block settle action', () => {
    expect(
      isManagePredictionSettledState({ status: 'closed', settledAt: '2026-03-13T23:12:07.004Z', settled_at: null })
    ).toBe(true);
  });

  it('treats settled_at (snake_case) as settled to block settle action', () => {
    expect(
      isManagePredictionSettledState({ status: 'closed', settled_at: '2026-03-13T23:12:07.004Z' })
    ).toBe(true);
  });

  it('treats status=settled as settled even if timestamps absent', () => {
    expect(isManagePredictionSettledState({ status: 'settled', settled_at: null, settledAt: null })).toBe(true);
  });

  it('does not mark non-settled closed prediction as settled', () => {
    expect(isManagePredictionSettledState({ status: 'closed', settled_at: null, settledAt: null })).toBe(false);
  });
});
