import React from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/lexicon';

interface PlaceBetStickyProps {
  visible: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

/**
 * Floating "Place Bet" button that appears above bottom navigation
 * Only visible when user has selected an option and entered a stake
 */
export default function PlaceBetSticky({
  visible,
  onClick,
  disabled = false,
  loading = false,
  label = t('betVerb')
}: PlaceBetStickyProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 px-4 sm:bottom-6">
      <div className="pointer-events-auto mx-auto w-full max-w-screen-sm">
        <button
          onClick={onClick}
          disabled={disabled || loading}
          className="w-full rounded-2xl bg-emerald-500 py-3 sm:py-3.5 text-white font-semibold shadow-lg shadow-black/10 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          aria-label={label}
        >
          {loading && <Loader2 className="size-5 animate-spin" />}
          <span>{loading ? `${t('betVerb')}…` : label}</span>
        </button>
      </div>
    </div>
  );
}

