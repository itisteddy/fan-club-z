import type { ReportTargetType } from './reportContent';

const STORAGE_KEY = 'fcz:reported-content';

type ReportedItem = { type: ReportTargetType; id: string; reportedAt: number };

function loadReported(): ReportedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReportedItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.id === 'string' && typeof r.type === 'string');
  } catch {
    return [];
  }
}

function saveReported(items: ReportedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // best effort
  }
}

export function markReported(type: ReportTargetType, id: string) {
  if (!type || !id) return;
  const items = loadReported();
  if (items.some((r) => r.type === type && r.id === id)) return;
  items.push({ type, id, reportedAt: Date.now() });
  saveReported(items);
}

export function isReported(type: ReportTargetType, id: string): boolean {
  if (!type || !id) return false;
  return loadReported().some((r) => r.type === type && r.id === id);
}
