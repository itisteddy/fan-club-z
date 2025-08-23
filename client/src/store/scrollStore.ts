import { create } from 'zustand';

interface ScrollPosition {
  path: string;
  scrollY: number;
  timestamp: number;
}

interface ScrollState {
  positions: Record<string, ScrollPosition>;
  saveScrollPosition: (path: string, scrollY: number) => void;
  getScrollPosition: (path: string) => number | null;
  clearOldPositions: () => void;
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  positions: {},

  saveScrollPosition: (path: string, scrollY: number) => {
    set(state => ({
      positions: {
        ...state.positions,
        [path]: {
          path,
          scrollY,
          timestamp: Date.now()
        }
      }
    }));
  },

  getScrollPosition: (path: string) => {
    const position = get().positions[path];
    if (!position) return null;
    
    // Only return positions saved within the last 10 minutes
    const isRecent = Date.now() - position.timestamp < 10 * 60 * 1000;
    return isRecent ? position.scrollY : null;
  },

  clearOldPositions: () => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    set(state => ({
      positions: Object.fromEntries(
        Object.entries(state.positions).filter(
          ([, position]) => now - position.timestamp < tenMinutes
        )
      )
    }));
  }
}));
