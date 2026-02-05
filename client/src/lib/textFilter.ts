export type ContentField = { label: string; value: string | null | undefined };

const DEFAULT_BANNED_TERMS = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'pussy',
  'porn', 'nude', 'nudes', 'sex', 'xxx',
];

function normalizeForScan(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsBannedTerm(text: string, bannedTerms: string[]): string | null {
  if (!text) return null;
  const normalized = normalizeForScan(text);
  if (!normalized) return null;
  const haystack = ` ${normalized} `;
  for (const term of bannedTerms) {
    const t = normalizeForScan(term);
    if (!t) continue;
    if (haystack.includes(` ${t} `)) return term;
  }
  return null;
}

export function validateContent(fields: ContentField[]): { ok: true } | { ok: false; field: string } {
  for (const f of fields) {
    const raw = String(f.value ?? '');
    if (!raw.trim()) continue;
    const hit = containsBannedTerm(raw, DEFAULT_BANNED_TERMS);
    if (hit) {
      return { ok: false, field: f.label };
    }
  }
  return { ok: true };
}
