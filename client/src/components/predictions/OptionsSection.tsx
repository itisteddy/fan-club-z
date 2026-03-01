import React from 'react';
import { TrendingUp } from 'lucide-react';

export interface PredictionOption {
  id: string;
  label: string;
  current_odds?: number;
  odds?: number;
  total_staked?: number;
  totalStaked?: number;
  percentage?: number;
}

interface OptionsSectionProps {
  options: PredictionOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

/**
 * Compact options list without excessive padding
 * Shows options with odds in a tight, scannable format
 */
export function OptionsSection({ 
  options, 
  selectedId, 
  onSelect, 
  disabled = false 
}: OptionsSectionProps) {
  return (
    <section className="rounded-2xl bg-white border shadow-sm overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {options.map((option) => {
          const odds = option.current_odds ?? option.odds ?? 1.0;
          const isSelected = selectedId === option.id;
          const percentage = option.percentage ?? 0;
          
          return (
            <li key={option.id}>
              <button
                onClick={() => !disabled && onSelect(option.id)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 border-l-2 border-l-emerald-600'
                    : 'hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{option.label}</span>
                  {percentage > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <TrendingUp className="h-3 w-3" />
                      <span>{percentage.toFixed(0)}% of pool</span>
                    </div>
                  )}
                </div>
                <span className="text-emerald-600 font-semibold ml-3">
                  {odds.toFixed(2)}x
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

