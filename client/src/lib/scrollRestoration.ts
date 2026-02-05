/**
 * Scroll restoration for route + params (e.g. Discover with category/search).
 * In-memory Map for fast read; sessionStorage backup for refresh.
 */

const MEMORY = new Map<string, number>();
const STORAGE_KEY_PREFIX = 'fcz_scroll_';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function storageKey(key: string): string {
  return STORAGE_KEY_PREFIX + key;
}

/**
 * Build a stable key from route and params (e.g. discover?category=x&search=y).
 */
export function makeKey(route: string, params?: Record<string, string | null | undefined>): string {
  if (!params || Object.keys(params).length === 0) return route;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') search.set(k, v);
  }
  const q = search.toString();
  return q ? `${route}?${q}` : route;
}

/**
 * Save scroll position for a key. Persists to memory and sessionStorage.
 */
export function saveScroll(key: string, y: number): void {
  if (typeof window === 'undefined') return;
  if (y < 0) return;
  MEMORY.set(key, y);
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify({ y, t: Date.now() }));
  } catch {
    // ignore
  }
}

/**
 * Get saved scroll position for a key, or null if none or expired.
 */
export function getScroll(key: string): number | null {
  let y: number | null = MEMORY.get(key) ?? null;
  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (raw) {
      const { y: storedY, t } = JSON.parse(raw) as { y: number; t: number };
      if (Date.now() - t < TTL_MS) {
        if (y == null) y = storedY;
        MEMORY.set(key, storedY);
      } else {
        sessionStorage.removeItem(storageKey(key));
        MEMORY.delete(key);
        return null;
      }
    }
  } catch {
    // ignore
  }
  return y;
}

/**
 * Clear saved position for a key (e.g. after restore or on refresh intent).
 */
export function clearScroll(key: string): void {
  MEMORY.delete(key);
  try {
    sessionStorage.removeItem(storageKey(key));
  } catch {
    // ignore
  }
}
