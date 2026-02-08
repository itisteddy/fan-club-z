/**
 * Phase 5: Basic UGC content filtering (server-side).
 *
 * Goal: Block clearly objectionable/profane content before writing UGC.
 * This is intentionally conservative and configurable via env:
 * - CONTENT_FILTER_ENABLED (default: true)
 * - CONTENT_FILTER_BANNED_TERMS (comma-separated, case-insensitive)
 */
export type ContentField = { label: string; value: string | null | undefined };

import { BLOCKED_URL_DOMAINS, DEFAULT_BANNED_TERMS } from '../moderation/wordlist';

function normalizeForScan(input: string): string {
  return input
    .toLowerCase()
    // Replace separators/punct with spaces for stable word scanning
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getBannedTerms(): string[] {
  const enabled = String(process.env.CONTENT_FILTER_ENABLED || 'true').toLowerCase();
  if (enabled === '0' || enabled === 'false' || enabled === 'off' || enabled === 'no') return [];

  const extraRaw = String(process.env.CONTENT_FILTER_BANNED_TERMS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // De-dupe while preserving order: defaults first, then env additions.
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...DEFAULT_BANNED_TERMS, ...extraRaw]) {
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function containsBannedTerm(text: string, bannedTerms: string[]): string | null {
  if (!text) return null;
  if (!bannedTerms.length) return null;

  const normalized = normalizeForScan(text);
  if (!normalized) return null;

  // Word-boundary-ish scan (on normalized space-separated tokens).
  const haystack = ` ${normalized} `;
  for (const term of bannedTerms) {
    const t = normalizeForScan(term);
    if (!t) continue;
    if (haystack.includes(` ${t} `)) return term;
  }
  return null;
}

function extractDomains(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/\bhttps?:\/\/[^\s)]+/gi) || [];
  const out: string[] = [];
  for (const raw of matches) {
    try {
      const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
      if (host) out.push(host);
    } catch {
      // Ignore unparsable URLs.
    }
  }
  return out;
}

function containsBlockedDomain(text: string): string | null {
  const domains = extractDomains(text);
  if (!domains.length) return null;
  for (const domain of domains) {
    if (BLOCKED_URL_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))) {
      return domain;
    }
  }
  return null;
}

/**
 * Throws an Error if any field contains disallowed content.
 */
export function assertContentAllowed(fields: ContentField[]) {
  const bannedTerms = getBannedTerms();
  if (!bannedTerms.length) return;

  for (const f of fields) {
    const raw = String(f.value ?? '');
    if (!raw.trim()) continue;
    const hit = containsBannedTerm(raw, bannedTerms);
    if (hit) {
      const err = new Error(`Objectionable content detected in ${f.label}`);
      (err as any).code = 'CONTENT_NOT_ALLOWED';
      (err as any).field = f.label;
      (err as any).term = hit;
      throw err;
    }
    const blockedDomain = containsBlockedDomain(raw);
    if (blockedDomain) {
      const err = new Error(`Blocked domain detected in ${f.label}`);
      (err as any).code = 'CONTENT_NOT_ALLOWED';
      (err as any).field = f.label;
      (err as any).domain = blockedDomain;
      throw err;
    }
  }
}
