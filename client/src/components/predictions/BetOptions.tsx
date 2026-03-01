import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ZaurumAmount } from '@/components/currency/ZaurumAmount';
import { ZaurumMark } from '@/components/currency/ZaurumMark';

export type BetOption = {
  id: string;
  label: string;
  odds?: number;
  percentage?: number;
  total_staked?: number;
  totalStaked?: number;
};

interface BetOptionsProps {
  options: BetOption[];
  selected?: string;
  onSelect: (id: string) => void;
  stake: string;
  onStake: (value: string) => void;
  disabled?: boolean;
  balance?: number;
}

/**
 * Compact bet options selector with stake input
 * Displays in normal document flow (not fixed)
 */
export default function BetOptions({
  options,
  selected,
  onSelect,
  stake,
  onStake,
  disabled = false,
  balance = 0
}: BetOptionsProps) {
  const stakeNum = parseFloat(stake) || 0;
  const hasStake = stakeNum > 0;
  const insufficientBalance = hasStake && stakeNum > balance;
  
  return (
    <div className="space-y-3">
      {/* Options Grid */}
      <div className="grid gap-2">
        {options.map((option) => {
          const isSelected = selected === option.id;
          const odds = option.odds ?? 1.0;
          const percentage = option.percentage ?? 0;
          
          return (
            <button
              key={option.id}
              onClick={() => !disabled && onSelect(option.id)}
              disabled={disabled}
              className={`flex items-center justify-between rounded-xl border p-3 sm:p-4 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:bg-muted/40 hover:border-muted-foreground/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-pressed={isSelected}
            >
              <div className="flex-1">
                <div className="font-medium text-foreground">{option.label}</div>
                {percentage > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3" />
                    <span>{percentage.toFixed(0)}% of pool</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-primary">
                  {odds.toFixed(2)}x
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stake Input - Only shows after selection */}
      {selected && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <label htmlFor="stake-input" className="text-sm font-medium text-foreground">
            Stake Amount (Zaurum)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <ZaurumMark className="size-4" />
            </span>
            <input
              id="stake-input"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={stake}
              onChange={(e) => onStake(e.target.value)}
              disabled={disabled}
              className={`w-full rounded-xl border bg-background pl-10 pr-4 py-3 text-lg font-semibold transition-colors ${
                insufficientBalance
                  ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                  : 'border-border focus:border-primary focus:ring-primary/20'
              } focus:outline-none focus:ring-2 disabled:opacity-50`}
              aria-invalid={insufficientBalance}
              aria-describedby={insufficientBalance ? 'stake-error' : undefined}
            />
          </div>
          
          {/* Balance & Error Messages */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Available: <ZaurumAmount value={balance} compact={false} markSize="xs" />
            </span>
            {insufficientBalance && (
              <span id="stake-error" className="text-destructive font-medium" role="alert">
                Insufficient balance
              </span>
            )}
          </div>
          
          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[10, 25, 50, 100, 250, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => onStake(amount.toString())}
                disabled={disabled || amount > balance}
                className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium hover:bg-muted hover:border-muted-foreground/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ZaurumAmount value={amount} compact={true} markSize="xs" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
