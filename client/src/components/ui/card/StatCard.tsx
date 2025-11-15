import React from 'react';
import { cn } from '../../../utils/cn';
import { formatUSDCompact, formatNumberShort, formatPercent, formatLargeNumber, formatPercentage, formatCurrency } from '@/lib/format';

interface StatCardProps {
  label: string;
  value?: string | number;
  icon?: React.ReactNode;
  loading?: boolean;
  error?: boolean;
  tooltip?: string;
  variant?: 'default' | 'currency' | 'percentage' | 'balance' | 'count';
  compact?: boolean;
  className?: string;
  subtitle?: string;
}

export function StatCard({ 
  label, 
  value, 
  icon, 
  loading = false, 
  error = false, 
  tooltip,
  variant = 'default',
  compact = false,
  className,
  subtitle,
}: StatCardProps) {
  const formatValue = (val: string | number | undefined) => {
    if (loading || val === undefined || val === null) {
      return '—';
    }
    
    if (error) {
      return 'Error';
    }
    
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (variant) {
      case 'currency':
        return formatUSDCompact(numValue);
      case 'percentage':
        return formatPercentage(numValue);
      case 'balance': {
        const amount = typeof numValue === 'number' ? numValue : Number(numValue || 0);
        const formatted = formatCurrency(Math.abs(amount), { compact });
        const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
        return `${sign}${formatted}`;
      }
      case 'count':
        return formatNumberShort(numValue);
      default:
        if (typeof val === 'number') {
          return formatLargeNumber(val);
        }
        return val?.toString() || '—';
    }
  };

  const getValueColor = () => {
    if (loading || error) return 'text-gray-400';
    
    if (variant === 'balance' && typeof value === 'number') {
      if (value > 0) return 'text-green-600';
      if (value < 0) return 'text-red-600';
    }
    
    return 'text-gray-900';
  };

  return (
    <div 
      className={cn(
        // Base styling matching design tokens
        'bg-white',
        'rounded-2xl',
        'border border-black/[0.06]',
        compact ? 'p-3' : 'p-4',
        // Fixed min height for consistent layout
        'min-h-[88px] md:min-h-[96px]',
        // Centered vertical layout
        'flex flex-col justify-center',
        // Interactive states
        'hover:shadow-sm transition-shadow duration-200',
        className
      )}
      title={tooltip}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          // Meta: 12–13px medium in muted color
          'text-xs md:text-sm font-medium text-gray-600',
          'leading-tight'
        )}>
          {label}
        </span>
        {icon && (
          <div className="text-gray-400 flex-shrink-0 ml-2">
            {icon}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <div className={cn(
          // Value styling
          'text-lg md:text-xl font-semibold font-mono leading-tight',
          'truncate',
          getValueColor(),
          loading && 'animate-pulse'
        )}>
          {loading && (
            <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
          )}
          {!loading && formatValue(value)}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-tight truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// StatRow component for consistent 3-up grid layout
export function StatRow({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      // Responsive grid: 3-up, break to 2/1 as needed
      'grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4',
      // Handle third card wrapping on mobile
      '[&>*:nth-child(3)]:col-span-2 md:[&>*:nth-child(3)]:col-span-1',
      className
    )}>
      {children}
    </div>
  );
}

export default StatCard;
