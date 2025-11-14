import { describe, it, expect } from 'vitest';
import { selectEscrowAvailableUSD } from '../balanceSelector';
import type { WalletStoreState } from '@/store/walletStore';

describe('balanceSelector', () => {
  describe('selectEscrowAvailableUSD', () => {
    it('Case A: escrow=100, reserved=30 -> available=70', () => {
      const state: WalletStoreState = {
        wallet: {
          available: 0,
          reserved: 0,
          escrow: 100,
          escrowReserved: 30,
        },
      } as any;
      
      expect(selectEscrowAvailableUSD(state)).toBe(70);
    });

    it('Case B: escrow=0, reserved=0 -> available=0', () => {
      const state: WalletStoreState = {
        wallet: {
          available: 0,
          reserved: 0,
          escrow: 0,
          escrowReserved: 0,
        },
      } as any;
      
      expect(selectEscrowAvailableUSD(state)).toBe(0);
    });

    it('Case C: escrow=50, reserved=60 -> available=0 (never negative)', () => {
      const state: WalletStoreState = {
        wallet: {
          available: 0,
          reserved: 0,
          escrow: 50,
          escrowReserved: 60,
        },
      } as any;
      
      expect(selectEscrowAvailableUSD(state)).toBe(0);
    });

    it('Case D: after debit(bet_placed) updates available', () => {
      // Initial state: escrow=100, reserved=30, available=70
      const initialState: WalletStoreState = {
        wallet: {
          available: 0,
          reserved: 0,
          escrow: 100,
          escrowReserved: 30,
        },
      } as any;
      
      expect(selectEscrowAvailableUSD(initialState)).toBe(70);
      
      // After placing $20 bet: escrow=100, reserved=50 (30+20), available=50
      const afterBetState: WalletStoreState = {
        wallet: {
          available: 0,
          reserved: 0,
          escrow: 100,
          escrowReserved: 50, // Increased by bet amount
        },
      } as any;
      
      expect(selectEscrowAvailableUSD(afterBetState)).toBe(50);
    });

    it('handles undefined/null values gracefully', () => {
      const state: WalletStoreState = {
        wallet: {
          available: undefined,
          reserved: undefined,
          escrow: undefined,
          escrowReserved: undefined,
        },
      } as any;
      
      expect(selectEscrowAvailableUSD(state)).toBe(0);
    });
  });
});
