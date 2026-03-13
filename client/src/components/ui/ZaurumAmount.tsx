import React from 'react';
import { cn } from '@/utils/cn';
import ZaurumMark from './ZaurumMark';

type ZaurumAmountProps = {
  amount: number;
  compact?: boolean;
  showSign?: boolean;
  size?: number;
  className?: string;
  amountClassName?: string;
  iconClassName?: string;
};

export function formatZaurumNumber(
  amount: number,
  opts?: { compact?: boolean; showSign?: boolean }
): string {
  const numericAmount = Number.isFinite(amount) ? amount : 0;
  const compact = opts?.compact ?? false;
  const absValue = Math.abs(numericAmount);
  const formatted = compact
    ? new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2,
      }).format(absValue)
    : new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(absValue);
  const sign = opts?.showSign
    ? numericAmount > 0
      ? '+'
      : numericAmount < 0
        ? '−'
        : ''
    : numericAmount < 0
      ? '−'
      : '';
  return `${sign}${formatted}`;
}

export function ZaurumAmount({
  amount,
  compact = false,
  showSign = false,
  size = 12,
  className,
  amountClassName,
  iconClassName,
}: ZaurumAmountProps) {
  const display = formatZaurumNumber(amount, { compact, showSign });
  const sign = display.startsWith('+') || display.startsWith('−') ? display[0] : '';
  const number = sign ? display.slice(1) : display;

  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap', className)}>
      {sign ? <span>{sign}</span> : null}
      <ZaurumMark size={size} className={iconClassName} />
      <span className={amountClassName}>{number}</span>
    </span>
  );
}

export default ZaurumAmount;
