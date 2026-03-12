import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';

export type FundingMode = 'crypto' | 'demo' | 'fiat';

const ZAURUM_ONLY_ENABLED = (() => {
  const walletMode = String(import.meta.env.VITE_FCZ_WALLET_MODE || '').toLowerCase().trim();
  if (walletMode === 'zaurum_only') return true;
  const legacy = String(import.meta.env.VITE_ZAURUM_MODE || '').toLowerCase().trim();
  return legacy === '1' || legacy === 'true' || legacy === 'zaurum';
})();

// Parity rule: native mobile defaults to Zaurum.
// Web can optionally enable demo via VITE_FCZ_ENABLE_DEMO.
const IS_NATIVE = Capacitor.isNativePlatform() === true;
const DEMO_ENABLED = import.meta.env.VITE_FCZ_ENABLE_DEMO === '1' || IS_NATIVE || ZAURUM_ONLY_ENABLED;

type FundingModeState = {
  mode: FundingMode;
  isDemoEnabled: boolean;
  // Fiat enabled is determined at runtime via API, not build-time env
  isFiatEnabled: boolean;
  setMode: (mode: FundingMode) => void;
  setFiatEnabled: (enabled: boolean) => void;
};

export const useFundingModeStore = create<FundingModeState>()(
  persist(
    (set, get) => ({
      // Default to 'demo' if enabled, otherwise 'crypto'
      mode: DEMO_ENABLED ? 'demo' : 'crypto',
      isDemoEnabled: DEMO_ENABLED,
      isFiatEnabled: false,
      setMode: (mode) => {
        const state = get();
        if (ZAURUM_ONLY_ENABLED && mode !== 'demo') {
          set({ mode: 'demo' });
          return;
        }
        // Validate mode is allowed
        if (mode === 'demo' && !DEMO_ENABLED) {
          set({ mode: 'crypto' });
          return;
        }
        if (mode === 'fiat' && !state.isFiatEnabled) {
          // Fallback to demo if available, else crypto
          set({ mode: DEMO_ENABLED ? 'demo' : 'crypto' });
          return;
        }
        set({ mode });
      },
      setFiatEnabled: (enabled) => {
        set({ isFiatEnabled: enabled });
        // If fiat was selected but is now disabled, switch to fallback
        const state = get();
        if (!enabled && state.mode === 'fiat') {
          set({ mode: DEMO_ENABLED ? 'demo' : 'crypto' });
        }
      },
    }),
    {
      name: 'fcz:fundingMode',
      version: 2,
      partialize: (s) => ({ mode: s.mode }),
      // If demo is disabled at runtime, always force crypto
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (ZAURUM_ONLY_ENABLED && state.mode !== 'demo') {
          state.setMode('demo');
          return;
        }
        if (!DEMO_ENABLED && state.mode === 'demo') {
          state.setMode('crypto');
        }
        // Fiat enablement is checked at runtime, don't persist it
      },
    }
  )
);
