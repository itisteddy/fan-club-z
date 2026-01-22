export function setCooldown(key: string, nextEligibleAtIso: string) {
  try {
    const ms = Date.parse(nextEligibleAtIso);
    if (!Number.isFinite(ms)) return;
    localStorage.setItem(key, String(ms));
  } catch {}
}

export function getCooldown(key: string): Date | null {
  try {
    const raw = localStorage.getItem(key);
    const ms = raw ? Number(raw) : NaN;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms);
  } catch {
    return null;
  }
}

export function clearCooldown(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

