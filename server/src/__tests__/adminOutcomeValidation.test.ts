import { describe, expect, it } from '@jest/globals';
import { OutcomeSchema } from '../routes/admin/predictions';

const validUuid = '77fdcf15-7557-4335-b56d-ed7060dffbbe';

describe('Admin outcome payload validation', () => {
  it('accepts valid payload with only optionId', () => {
    const result = OutcomeSchema.safeParse({ optionId: validUuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionId).toBe(validUuid);
      expect(result.data.resolutionSourceUrl).toBeUndefined();
    }
  });

  it('accepts valid payload with optional resolutionSourceUrl', () => {
    const result = OutcomeSchema.safeParse({
      optionId: validUuid,
      resolutionSourceUrl: 'https://example.com/result',
    });
    expect(result.success).toBe(true);
  });

  it('coerces empty resolutionSourceUrl to undefined', () => {
    const result = OutcomeSchema.safeParse({
      optionId: validUuid,
      resolutionSourceUrl: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolutionSourceUrl).toBeUndefined();
    }
  });

  it('rejects invalid optionId (not a UUID)', () => {
    const result = OutcomeSchema.safeParse({ optionId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing optionId', () => {
    const result = OutcomeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('coerces invalid resolutionSourceUrl to undefined (no 400)', () => {
    const result = OutcomeSchema.safeParse({
      optionId: validUuid,
      resolutionSourceUrl: 'not-a-valid-url',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolutionSourceUrl).toBeUndefined();
    }
  });

  it('accepts actorId as optional UUID', () => {
    const result = OutcomeSchema.safeParse({
      optionId: validUuid,
      actorId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('coerces empty actorId to undefined', () => {
    const result = OutcomeSchema.safeParse({
      optionId: validUuid,
      actorId: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actorId).toBeUndefined();
    }
  });

  it('accepts winningOptionId instead of optionId and normalizes to optionId', () => {
    const result = OutcomeSchema.safeParse({ winningOptionId: validUuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionId).toBe(validUuid);
    }
  });

  it('rejects when both optionId and winningOptionId are missing', () => {
    const result = OutcomeSchema.safeParse({ resolutionReason: 'Done' });
    expect(result.success).toBe(false);
  });

  it('accepts reason as alias for resolutionReason and normalizes', () => {
    const result = OutcomeSchema.safeParse({
      winningOptionId: validUuid,
      reason: 'Final score 2-1',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolutionReason).toBe('Final score 2-1');
    }
  });

  it('prefers resolutionReason over reason when both present', () => {
    const result = OutcomeSchema.safeParse({
      optionId: validUuid,
      reason: 'From reason',
      resolutionReason: 'From resolutionReason',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.resolutionReason).toBe('From resolutionReason');
    }
  });

  it('accepts canonical admin UI payload: winningOptionId + optionId (same value)', () => {
    const result = OutcomeSchema.safeParse({
      winningOptionId: validUuid,
      optionId: validUuid,
      resolutionReason: 'Final score 2-1',
      resolutionSourceUrl: 'https://example.com/result',
      actorId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionId).toBe(validUuid);
      expect(result.data.resolutionReason).toBe('Final score 2-1');
      expect(result.data.resolutionSourceUrl).toBe('https://example.com/result');
      expect(result.data.actorId).toBe(validUuid);
    }
  });

  it('idempotent payload: same payload parses to same optionId (no double-parse side effects)', () => {
    const payload = { optionId: validUuid };
    const first = OutcomeSchema.safeParse(payload);
    const second = OutcomeSchema.safeParse(payload);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (first.success && second.success) {
      expect(first.data.optionId).toBe(second.data.optionId);
    }
  });
});

describe('Admin settlement response contract (idempotent already-settled)', () => {
  const { buildSettlementContract } = require('../routes/settlement');

  it('alreadySettled response has shape expected by admin UI', () => {
    const res = buildSettlementContract({
      predictionId: validUuid,
      alreadySettled: true,
      winningOptionId: validUuid,
      settledAt: '2026-01-01T00:00:00.000Z',
      settledByUserId: validUuid,
      reason: 'Done',
      sourceUrl: 'https://example.com',
    });
    expect(res.ok).toBe(true);
    expect(res.alreadySettled).toBe(true);
    expect(res.predictionId).toBe(validUuid);
    expect(res.status).toBe('SETTLED');
    expect(res.settlement).toBeDefined();
    expect(res.settlement.winningOptionId).toBe(validUuid);
    expect(res.settlement.settledAt).toBeDefined();
  });
});
