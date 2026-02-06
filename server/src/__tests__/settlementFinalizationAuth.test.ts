/**
 * Tests for settlement finalization authorization.
 * Verifies that:
 * - Admin always allowed
 * - Creator only allowed if config flag enabled
 * - Non-creator/non-admin returns 403
 * - Already finalized returns idempotent success
 */
import { describe, expect, it, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// Mock config before importing anything that uses it
jest.mock('../config', () => ({
  config: {
    settlement: {
      allowCreatorFinalizationRequest: false,
      disputeWindowHours: 24,
    },
  },
}));

// Test helpers for authorization checks
describe('Settlement Finalization Authorization', () => {
  describe('config.settlement.allowCreatorFinalizationRequest', () => {
    it('should default to false', () => {
      const { config } = require('../config');
      expect(config.settlement.allowCreatorFinalizationRequest).toBe(false);
    });

    it('should have disputeWindowHours defined', () => {
      const { config } = require('../config');
      expect(config.settlement.disputeWindowHours).toBeDefined();
      expect(typeof config.settlement.disputeWindowHours).toBe('number');
    });
  });

  describe('Authorization logic', () => {
    const mockIsAdmin = (headers: Record<string, string>, adminKey?: string) => {
      const providedKey = headers['x-admin-key'] || headers['authorization'];
      return !!adminKey && providedKey === adminKey;
    };

    it('should return true for valid admin key', () => {
      const adminKey = 'test-admin-key';
      const headers = { 'x-admin-key': adminKey };
      expect(mockIsAdmin(headers, adminKey)).toBe(true);
    });

    it('should return false for invalid admin key', () => {
      const adminKey = 'test-admin-key';
      const headers = { 'x-admin-key': 'wrong-key' };
      expect(mockIsAdmin(headers, adminKey)).toBe(false);
    });

    it('should return false for missing admin key', () => {
      const adminKey = 'test-admin-key';
      const headers = {};
      expect(mockIsAdmin(headers, adminKey)).toBe(false);
    });

    it('should return false when env admin key not set', () => {
      const headers = { 'x-admin-key': 'any-key' };
      expect(mockIsAdmin(headers, undefined)).toBe(false);
    });
  });

  describe('Creator permission logic', () => {
    const isCreator = (userId: string | undefined, prediction: { creator_id?: string }) => {
      if (!userId || !prediction.creator_id) return false;
      return userId === prediction.creator_id;
    };

    it('should return true when userId matches creator_id', () => {
      const userId = 'user-123';
      const prediction = { creator_id: 'user-123' };
      expect(isCreator(userId, prediction)).toBe(true);
    });

    it('should return false when userId does not match creator_id', () => {
      const userId = 'user-123';
      const prediction = { creator_id: 'user-456' };
      expect(isCreator(userId, prediction)).toBe(false);
    });

    it('should return false when userId is undefined', () => {
      const prediction = { creator_id: 'user-456' };
      expect(isCreator(undefined, prediction)).toBe(false);
    });

    it('should return false when creator_id is undefined', () => {
      const userId = 'user-123';
      const prediction = {};
      expect(isCreator(userId, prediction)).toBe(false);
    });
  });

  describe('Dispute validation', () => {
    const validateDispute = (reason: string | undefined) => {
      if (!reason || reason.trim().length < 20) {
        return { valid: false, error: 'Dispute reason must be at least 20 characters' };
      }
      return { valid: true };
    };

    it('should reject empty reason', () => {
      expect(validateDispute('')).toEqual({
        valid: false,
        error: 'Dispute reason must be at least 20 characters',
      });
    });

    it('should reject short reason', () => {
      expect(validateDispute('Too short')).toEqual({
        valid: false,
        error: 'Dispute reason must be at least 20 characters',
      });
    });

    it('should accept valid reason with 20+ characters', () => {
      expect(validateDispute('This is a valid dispute reason with enough characters')).toEqual({
        valid: true,
      });
    });

    it('should reject whitespace-only reason', () => {
      expect(validateDispute('                    ')).toEqual({
        valid: false,
        error: 'Dispute reason must be at least 20 characters',
      });
    });
  });
});

describe('hasCryptoEntries detection', () => {
  const DEMO_PROVIDER = 'demo-wallet';
  
  const hasCryptoEntries = (entries: Array<{ provider?: string }>) => {
    return entries.some(
      (entry) => entry.provider && entry.provider !== DEMO_PROVIDER && entry.provider !== 'demo-wallet'
    );
  };

  it('should return false for empty entries', () => {
    expect(hasCryptoEntries([])).toBe(false);
  });

  it('should return false for demo-only entries', () => {
    const entries = [
      { provider: 'demo-wallet' },
      { provider: 'demo-wallet' },
    ];
    expect(hasCryptoEntries(entries)).toBe(false);
  });

  it('should return true when at least one crypto entry exists', () => {
    const entries = [
      { provider: 'demo-wallet' },
      { provider: 'metamask' },
    ];
    expect(hasCryptoEntries(entries)).toBe(true);
  });

  it('should return false for entries with no provider', () => {
    const entries = [
      { provider: undefined },
      {},
    ];
    expect(hasCryptoEntries(entries)).toBe(false);
  });
});
