// Formatting utilities for numbers, currency, and other data types

export interface FormatCurrencyOptions {
  compact?: boolean;
  showSign?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface FormatBalanceResult {
  value: string;
  sign: '+' | '-' | '';
  color: 'green' | 'red' | 'gray';
}

/**
 * Format currency with various options
 */
export function formatCurrency(
  amount: number,
  options: FormatCurrencyOptions = {}
): string {
  const {
    compact = false,
    showSign = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (compact && Math.abs(amount) >= 1000) {
    return formatLargeNumber(amount, { style: 'currency' });
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const formatted = formatter.format(Math.abs(amount));
  
  if (showSign && amount !== 0) {
    return `${amount >= 0 ? '+' : '-'}${formatted}`;
  }
  
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format balance with sign and color indication
 */
export function formatBalance(amount: number): FormatBalanceResult {
  const absAmount = Math.abs(amount);
  let sign: '+' | '-' | '' = '';
  let color: 'green' | 'red' | 'gray' = 'gray';

  if (amount > 0) {
    sign = '+';
    color = 'green';
  } else if (amount < 0) {
    sign = '-';
    color = 'red';
  }

  return {
    value: formatCurrency(absAmount),
    sign,
    color,
  };
}

interface FormatLargeNumberOptions {
  style?: 'decimal' | 'currency';
  precision?: number;
}

/**
 * Format large numbers with compact notation (K, M, B)
 */
export function formatLargeNumber(
  num: number,
  options: FormatLargeNumberOptions = {}
): string {
  const { style = 'decimal', precision = 1 } = options;

  const absNum = Math.abs(num);
  
  // Handle small numbers
  if (absNum < 1000) {
    if (style === 'currency') {
      return formatCurrency(num, { minimumFractionDigits: 0 });
    }
    return num.toLocaleString();
  }

  const units = [
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'K' },
  ];

  for (const unit of units) {
    if (absNum >= unit.value) {
      const formatted = (num / unit.value).toFixed(precision);
      const value = parseFloat(formatted); // Remove trailing zeros
      
      if (style === 'currency') {
        return `$${value}${unit.symbol}`;
      }
      return `${value}${unit.symbol}`;
    }
  }

  if (style === 'currency') {
    return formatCurrency(num, { minimumFractionDigits: 0 });
  }
  return num.toLocaleString();
}

/**
 * Truncate text with ellipsis for display
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format time duration from milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format relative time (ago/from now)
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = targetDate.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);

  const units = [
    { ms: 365 * 24 * 60 * 60 * 1000, label: 'year' },
    { ms: 30 * 24 * 60 * 60 * 1000, label: 'month' },
    { ms: 24 * 60 * 60 * 1000, label: 'day' },
    { ms: 60 * 60 * 1000, label: 'hour' },
    { ms: 60 * 1000, label: 'minute' },
  ];

  for (const unit of units) {
    if (absDiffMs >= unit.ms) {
      const count = Math.floor(absDiffMs / unit.ms);
      const suffix = diffMs < 0 ? 'ago' : 'from now';
      return `${count} ${unit.label}${count !== 1 ? 's' : ''} ${suffix}`;
    }
  }

  return 'just now';
}