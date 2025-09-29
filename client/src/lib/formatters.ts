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
