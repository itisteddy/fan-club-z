import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  shouldShowFinalization,
  isLocalAdmin,
  isCreator,
  canRequestFinalization,
  canFinalizeOnChain,
  getFinalizationStatusText,
  getFinalizationRole,
} from '../settlementPermissions';

describe('settlementPermissions', () => {
  describe('shouldShowFinalization', () => {
    it('returns true when hasCryptoEntries is true', () => {
      expect(shouldShowFinalization({ hasCryptoEntries: true })).toBe(true);
    });

    it('returns false when hasCryptoEntries is false', () => {
      expect(shouldShowFinalization({ hasCryptoEntries: false })).toBe(false);
    });

    it('returns false when hasCryptoEntries is undefined', () => {
      expect(shouldShowFinalization({})).toBe(false);
    });
  });

  describe('isLocalAdmin', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('returns true when admin key exists in localStorage', () => {
      localStorage.setItem('fcz_admin_key', 'test-admin-key');
      expect(isLocalAdmin()).toBe(true);
    });

    it('returns false when admin key is empty', () => {
      localStorage.setItem('fcz_admin_key', '');
      expect(isLocalAdmin()).toBe(false);
    });

    it('returns false when admin key is whitespace only', () => {
      localStorage.setItem('fcz_admin_key', '   ');
      expect(isLocalAdmin()).toBe(false);
    });

    it('returns false when admin key does not exist', () => {
      expect(isLocalAdmin()).toBe(false);
    });
  });

  describe('isCreator', () => {
    it('returns true when userId matches creator_id', () => {
      expect(isCreator('user-123', { creator_id: 'user-123' })).toBe(true);
    });

    it('returns false when userId does not match creator_id', () => {
      expect(isCreator('user-123', { creator_id: 'user-456' })).toBe(false);
    });

    it('returns false when userId is undefined', () => {
      expect(isCreator(undefined, { creator_id: 'user-456' })).toBe(false);
    });

    it('returns false when creator_id is undefined', () => {
      expect(isCreator('user-123', {})).toBe(false);
    });
  });

  describe('canRequestFinalization', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('returns true for admin user', () => {
      localStorage.setItem('fcz_admin_key', 'admin-key');
      expect(canRequestFinalization('user-123', { creator_id: 'user-456' })).toBe(true);
    });

    it('returns true for creator when allowCreatorRequest is true', () => {
      expect(
        canRequestFinalization('user-123', { creator_id: 'user-123' }, { allowCreatorRequest: true })
      ).toBe(true);
    });

    it('returns false for creator when allowCreatorRequest is false', () => {
      expect(
        canRequestFinalization('user-123', { creator_id: 'user-123' }, { allowCreatorRequest: false })
      ).toBe(false);
    });

    it('returns true for creator by default (allowCreatorRequest not specified)', () => {
      expect(canRequestFinalization('user-123', { creator_id: 'user-123' })).toBe(true);
    });

    it('returns false for non-creator non-admin', () => {
      expect(canRequestFinalization('user-123', { creator_id: 'user-456' })).toBe(false);
    });
  });

  describe('canFinalizeOnChain', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('returns true when admin key exists', () => {
      localStorage.setItem('fcz_admin_key', 'admin-key');
      expect(canFinalizeOnChain()).toBe(true);
    });

    it('returns false when admin key does not exist', () => {
      expect(canFinalizeOnChain()).toBe(false);
    });
  });

  describe('getFinalizationStatusText', () => {
    it('returns demo message when no crypto entries', () => {
      expect(getFinalizationStatusText(null, false)).toBe(
        'Demo payouts are credited automatically after settlement.'
      );
    });

    it('returns queued message', () => {
      expect(getFinalizationStatusText('queued', true)).toBe(
        'Finalization queued. Awaiting admin to publish on-chain.'
      );
    });

    it('returns running message', () => {
      expect(getFinalizationStatusText('running', true)).toBe(
        'Publishing merkle root on-chain...'
      );
    });

    it('returns finalized message', () => {
      expect(getFinalizationStatusText('finalized', true)).toBe(
        'Finalized on-chain. Winners can now claim their payouts.'
      );
    });

    it('returns failed message', () => {
      expect(getFinalizationStatusText('failed', true)).toBe(
        'Finalization failed. Admin retry required.'
      );
    });

    it('returns default message for null status', () => {
      expect(getFinalizationStatusText(null, true)).toBe(
        'Crypto payouts require on-chain finalization. Connect wallet to claim after finalization.'
      );
    });
  });

  describe('getFinalizationRole', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it('returns admin when admin key exists', () => {
      localStorage.setItem('fcz_admin_key', 'admin-key');
      expect(getFinalizationRole('user-123', { creator_id: 'user-456' }, false)).toBe('admin');
    });

    it('returns creator when user is creator', () => {
      expect(getFinalizationRole('user-123', { creator_id: 'user-123' }, false)).toBe('creator');
    });

    it('returns participant when user has entry', () => {
      expect(getFinalizationRole('user-123', { creator_id: 'user-456' }, true)).toBe('participant');
    });

    it('returns viewer when user has no entry and is not creator', () => {
      expect(getFinalizationRole('user-123', { creator_id: 'user-456' }, false)).toBe('viewer');
    });

    it('prioritizes admin over creator', () => {
      localStorage.setItem('fcz_admin_key', 'admin-key');
      expect(getFinalizationRole('user-123', { creator_id: 'user-123' }, true)).toBe('admin');
    });
  });
});
