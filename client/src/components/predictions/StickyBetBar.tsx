import React from 'react';
import { Loader2 } from 'lucide-react';

interface StickyBetBarProps {
  canBet: boolean;
  onPlace: () => void;
  loading?: boolean;
  label?: string;
}

/**
 * Fixed bet bar that sits above the bottom navigation
 * Uses CSS variable --bottom-nav-h for proper spacing
 * Safe-area aware for devices with notches
 */
export function StickyBetBar({ 
  canBet, 
  onPlace, 
  loading = false,
  label = 'Place Bet'
}: StickyBetBarProps) {
  return (
    <div
      className="fixed inset-x-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom))] pointer-events-none"
      style={{ bottom: 'calc(var(--bottom-nav-h, 64px) + 8px)' }}
    >
      <div className="pointer-events-auto mx-auto max-w-screen-sm">
        <button
          disabled={!canBet || loading}
          onClick={onPlace}
          className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-semibold shadow-lg hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          <span>{loading ? 'Placing Bet...' : label}</span>
        </button>
      </div>
    </div>
  );
}

