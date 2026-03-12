import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';

export type FundingMode = 'crypto' | 'demo' | 'fiat';

const ZAURUM_ONLY_ENABLED = (() => {
  const raw = String(import.meta.env.VITE_ZAURUM_MODE || '').toLowerCase().trim();
  return raw === '1' || raw === 'true' || raw === 'zaurum';
})();

// Parity rule: native mobile defaults to Demo Credits.
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
        if (ZAURUM_ONLY_ENABLED && mode === 'crypto') {
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
        if (ZAURUM_ONLY_ENABLED && state.mode === 'crypto') {
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

