export const formatCurrency = (n: number | string, opts?: { compact?: boolean; showSign?: boolean; currency?: string }) => {
  const num = typeof n === "string" ? Number(n) : n;
  const { compact = true, showSign = false, currency = 'USD' } = opts || {};
  
  if (compact) {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });
    const formatted = formatter.format(num || 0);
    return showSign && num > 0 ? `+${formatted}` : formatted;
  }
  
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const formatted = formatter.format(num || 0);
  return showSign && num > 0 ? `+${formatted}` : formatted;
};

export const formatNumber = (n: number | string, opts?: Intl.NumberFormatOptions) => {
  const num = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
    ...opts,
  }).format(num || 0);
};

export const formatPercent = (ratio: number, digits = 0) =>
  `${(ratio * 100).toFixed(digits)}%`;

// simple duration pretty printer (2d 6h, 17d 7h, etc.)
export const formatDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(s / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days) return `${days}d ${hrs % 24}h`;
  if (hrs) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
};

// Additional formatters for backward compatibility
export const formatLargeNumber = formatNumber;
export const formatPercentage = formatPercent;
export const formatNumberShort = formatNumber;
export const formatDurationShort = formatDuration;
export const formatTimeUntil = formatDuration;
export const formatTimeLeft = formatDuration;
export const formatCompactNumber = formatNumber;
export const formatCurrencyShort = formatCurrency;
