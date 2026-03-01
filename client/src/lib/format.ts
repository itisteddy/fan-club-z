type FormatCurrencyOptions = {
  compact?: boolean;
  showSign?: boolean;
  currency?: string;
};

export function formatCurrency(n: number | string, opts?: FormatCurrencyOptions): string;
export function formatCurrency(n: number | string, currency?: string, showSign?: boolean): string;
export function formatCurrency(
  n: number | string,
  optsOrCurrency?: FormatCurrencyOptions | string,
  legacyShowSign?: boolean
): string {
  const num = typeof n === 'string' ? Number(n) : n;
  const resolvedOptions: FormatCurrencyOptions =
    typeof optsOrCurrency === 'string'
      ? { currency: optsOrCurrency, showSign: legacyShowSign }
      : optsOrCurrency || {};
  const { compact = true, showSign = false } = resolvedOptions;

  const abs = Math.abs(num || 0);
  const formatted = formatZaurumNumber(abs, { compact });
  const sign = showSign ? (num > 0 ? '+' : num < 0 ? '-' : '') : '';
  return `${sign}${formatted}`;
};

export function formatZaurumNumber(
  n: number | string,
  opts?: { compact?: boolean; maxFractionDigits?: number }
): string {
  const num = typeof n === 'string' ? Number(n) : n;
  const compact = opts?.compact ?? true;
  if (compact) {
    return new Intl.NumberFormat(undefined, {
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: opts?.maxFractionDigits ?? 2,
    }).format(num || 0);
  }
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: opts?.maxFractionDigits ?? 2,
  }).format(num || 0);
}

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

// Relative time formatter (e.g., 5m ago, 2h ago)
export const formatTimeAgo = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return 'now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleString();
};

// Absolute display with fallback (local time)
export const formatDateTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
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
export const formatUSDCompact = formatCurrency;
export const formatInt = (n: number | string) => {
  const num = typeof n === "string" ? Number(n) : n;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num || 0);
};
export const formatBalance = formatCurrency;
export const formatNumberCompact = formatNumber;
export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
