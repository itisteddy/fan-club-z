export function formatNumberShort(
  n: number,
  opts?: { currency?: 'USD' | 'NGN' | 'EUR' | string }
): string {
  if (opts?.currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: opts.currency,
        maximumFractionDigits: 1,
        notation: 'compact',
      }).format(n);
    } catch {
      // fallback to plain compact if currency unknown
    }
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(n);
}

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

export function formatDurationShort(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const year = 365 * 24 * 3600;
  const week = 7 * 24 * 3600;
  const day = 24 * 3600;
  const hour = 3600;
  const min = 60;

  if (s >= year)  return `${Math.round(s / year)}y`;
  if (s >= week)  return `${Math.round(s / week)}w`;
  if (s >= day)   return `${Math.round(s / day)}d`;
  if (s >= hour)  return `${Math.round(s / hour)}h`;
  if (s >= min)   return `${Math.round(s / min)}m`;
  return `${s}s`;
}
