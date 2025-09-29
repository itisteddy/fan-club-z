// client/src/utils/format.ts
export function formatCompactNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n as any)) return "0";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(n));
}

export function formatCurrencyShort(
  amount: number | null | undefined,
  currency: string = "USD"
): string {
  if (amount == null || isNaN(amount as any)) return "$0";
  // If the app stores cents, adapt here (uncomment next line):
  // amount = amount / 100;
  const abs = Math.abs(amount);
  if (abs < 10000) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  }
  // compact for larger values, keep currency symbol
  const symbol = new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 })
    .formatToParts(0)
    .find(p => p.type === "currency")?.value ?? "$";
  return `${symbol}${formatCompactNumber(Math.round(amount))}`;
}

export function formatDurationShort(from: Date | string, to: Date | string): string {
  const start = new Date(from);
  const end = new Date(to);
  let ms = Math.max(0, end.getTime() - start.getTime());
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d >= 7) {
    const w = Math.floor(d / 7);
    const rd = d % 7;
    return rd ? `${w}w ${rd}d` : `${w}w`;
  }
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function timeUntil(date: Date | string): string {
  return formatDurationShort(new Date(), date);
}

export function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" • ");
}

// Legacy exports for backward compatibility (keeping existing formatters)
export const formatNumberShort = (n: number | null | undefined): string => {
  if (n == null || Number.isNaN(n as number)) return '—';
  const abs = Math.abs(n as number);
  if (abs >= 1_000_000_000) {
    const val = (n as number) / 1_000_000_000;
    return val % 1 === 0 ? `${Math.round(val)}B` : `${val.toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    const val = (n as number) / 1_000_000;
    return val % 1 === 0 ? `${Math.round(val)}M` : `${val.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const val = (n as number) / 1_000;
    return val % 1 === 0 ? `${Math.round(val)}K` : `${val.toFixed(1)}K`;
  }
  return `${Math.round(n as number)}`;
};

export const formatUSDCompact = (n: number | null | undefined, opts: {showCents?: boolean} = {}): string => {
  if (n == null || Number.isNaN(n as number)) return '$—';
  const abs = Math.abs(n as number);
  const showCents = opts.showCents ?? false;
  // Use compact for 1K+; normal for <1K
  if (abs >= 1_000) {
    const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
    return nf.format(n as number);
  }
  const nf = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: showCents ? 2 : 0, maximumFractionDigits: showCents ? 2 : 0 });
  return nf.format(n as number);
};

export const formatPercent = (fraction: number | null | undefined): string => {
  if (fraction == null || Number.isNaN(fraction as number)) return '—';
  const p = (fraction as number) * 100;
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: p >= 10 ? 0 : 1 });
  return `${nf.format(p)}%`;
};

// "17d 7h", "3h 12m", "45m", "Now"
export const formatEtaShort = (to: Date | string | number): string => {
  const target = new Date(to).getTime();
  if (!Number.isFinite(target)) return '—';
  const now = Date.now();
  let diff = Math.max(0, target - now);

  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  const weeks = Math.floor(days / 7);
  const years = Math.floor(days / 365);

  if (years  >= 1) return `${years}y ${days % 365}d`;
  if (weeks  >= 1) return `${weeks}w ${days % 7}d`;
  if (days   >= 1) return `${days}d ${hrs % 24}h`;
  if (hrs    >= 1) return `${hrs}h ${min % 60}m`;
  if (min    >= 1) return `${min}m`;
  return 'Now';
};

// Relative like "17h ago" / "in 3d"
export const formatRelative = (date: Date | string | number): string => {
  const d = new Date(date).getTime();
  if (!Number.isFinite(d)) return '—';
  const diffSec = Math.round((d - Date.now()) / 1000);
  const abs = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (abs < 60)             return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600)           return rtf.format(Math.round(diffSec/60), 'minute');
  if (abs < 86400)          return rtf.format(Math.round(diffSec/3600), 'hour');
  if (abs < 86400*30)       return rtf.format(Math.round(diffSec/86400), 'day');
  if (abs < 86400*365)      return rtf.format(Math.round(diffSec/(86400*30)), 'month');
  return rtf.format(Math.round(diffSec/(86400*365)), 'year');
};

// Legacy exports for backward compatibility
type Num = number | null | undefined;

const isNil = (v: unknown): v is null | undefined => v === null || v === undefined;

export function formatCompactNumberLegacy(n: Num, opts: Intl.NumberFormatOptions = {}) {
  if (isNil(n) || Number.isNaN(n as number)) return '—';
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
    ...opts,
  }).format(n as number);
}

export function formatCurrency(n: Num, currency = 'USD', compact = true) {
  if (isNil(n) || Number.isNaN(n as number)) return '—';
  const base: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    maximumFractionDigits: compact ? 1 : 2,
  };
  if (compact) {
    base.notation = 'compact';
    base.compactDisplay = 'short';
  }
  return new Intl.NumberFormat(undefined, base).format(n as number);
}

/** e.g., ms -> "13h 48m", "20d", "45s"  */
export function formatDuration(ms: number) {
  if (!Number.isFinite(ms)) return '—';
  const abs = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;

  if (d >= 1) return `${d}d${h ? ` ${h}h` : ''}`;
  if (h >= 1) return `${h}h${m ? ` ${m}m` : ''}`;
  if (m >= 1) return `${m}m${s ? ` ${s}s` : ''}`;
  return `${s}s`;
}

/** date/time -> "13h 48m" until end, or "Ended" */
export function formatTimeLeft(endAt: Date | number, now: number = Date.now()) {
  const end = typeof endAt === 'number' ? endAt : endAt?.getTime?.() ?? NaN;
  if (!Number.isFinite(end)) return '—';
  const diff = end - now;
  if (diff <= 0) return 'Ended';
  return formatDuration(diff);
}

/** Plain integer with commas (for odds counts, comments, etc.) */
export function formatInt(n: Num) {
  if (isNil(n) || Number.isNaN(n as number)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n as number);
}
