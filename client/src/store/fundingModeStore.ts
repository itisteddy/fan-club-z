import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FundingMode = 'crypto' | 'demo';

const DEMO_ENABLED = import.meta.env.VITE_FCZ_ENABLE_DEMO === '1';

type FundingModeState = {
  mode: FundingMode;
  isDemoEnabled: boolean;
  setMode: (mode: FundingMode) => void;
};

export const useFundingModeStore = create<FundingModeState>()(
  persist(
    (set) => ({
      // Default to 'demo' if enabled, otherwise 'crypto'
      mode: DEMO_ENABLED ? 'demo' : 'crypto',
      isDemoEnabled: DEMO_ENABLED,
      setMode: (mode) => {
        if (!DEMO_ENABLED) {
          set({ mode: 'crypto', isDemoEnabled: false });
          return;
        }
        set({ mode });
      },
    }),
    {
      name: 'fcz:fundingMode',
      version: 1,
      partialize: (s) => ({ mode: s.mode }),
      // If demo is disabled at runtime, always force crypto
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!DEMO_ENABLED && state.mode !== 'crypto') {
          state.setMode('crypto');
        }
      },
    }
  )
);


