// src/utils/formatters.ts
export const formatNumberCompact = (n: number): string =>
  new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const formatCurrencyShort = (n: number, currency = 'USD'): string => {
  // Show $14.1K style; assumes USD symbol, but supports others for future
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return formatter.format(n);
};

// Additional formatters for wallet and other components
export const formatCurrency = (amount: number, options?: { compact?: boolean; showSign?: boolean; currency?: string }): string => {
  const { compact = true, showSign = false, currency = 'USD' } = options || {};
  
  if (compact) {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    const formatted = formatter.format(amount);
    return showSign && amount > 0 ? `+${formatted}` : formatted;
  }
  
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(amount);
  return showSign && amount > 0 ? `+${formatted}` : formatted;
};

export const formatLargeNumber = (n: number): string => {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

type TimeLike = Date | string | number; // ISO, ms, or Date

export const formatTimeUntil = (end: TimeLike): string => {
  const endMs = typeof end === 'number' ? end : new Date(end).getTime();
  const now = Date.now();
  const delta = Math.max(0, endMs - now);

  const s = Math.floor(delta / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const w = Math.floor(d / 7);
  const mo = Math.floor(d / 30);
  const y = Math.floor(d / 365);

  if (y > 0) return `${y}y ${d % 365}d`;
  if (mo > 0) return `${mo}mo ${d % 30}d`;
  if (w > 0) return `${w}w ${d % 7}d`;
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};