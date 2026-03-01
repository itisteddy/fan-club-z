import React from 'react';
import { cn } from '@/utils/cn';
import { formatZaurumNumber } from '@/lib/format';
import { ZaurumMark } from './ZaurumMark';

interface ZaurumAmountProps {
  value: number | string;
  compact?: boolean;
  className?: string;
  markClassName?: string;
  markSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function ZaurumAmount({ value, compact = false, className, markClassName, markSize = 'sm' }: ZaurumAmountProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <ZaurumMark size={markSize} className={markClassName} />
      <span>{formatZaurumNumber(value, { compact })}</span>
    </span>
  );
}

export default ZaurumAmount;
