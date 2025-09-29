// src/lib/media/queryBuilder.ts
import { CATEGORY_TEMPLATES, NEGATIVE_KEYWORDS } from './config';

export function extractKeywords(title: string) {
  // naive but effective: lowercase, split, remove stopwords, dedupe
  const stop = new Set(['will','the','a','an','by','on','of','to','is','are','be','in','at','for','with','over','under','about','and','or','if','this','that','it','we']);
  return [...new Set(
    title.toLowerCase()
      .replace(/[^\w\s$]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !stop.has(w))
  )];
}

export function disambiguate(title: string, category?: string) {
  // hard-coded fixes that matter a lot
  const t = title.toLowerCase();
  const must: string[] = [];
  const exclude = [...NEGATIVE_KEYWORDS];

  if (/\bapple\b/.test(t)) {
    must.push('apple inc', 'iphone', 'logo', 'launch', 'keynote');
    exclude.push('fruit','meal','food','pie','orchard');
  }
  if (/\bbitcoin\b|\bbtc\b/.test(t)) {
    must.push('bitcoin','crypto','blockchain');
  }
  if (/\bcentral bank of nigeria\b|\bcbn\b/.test(t)) {
    must.push('nigeria','central bank','building','logo');
  }

  // category hints
  if (category && CATEGORY_TEMPLATES[category]) {
    must.push(...CATEGORY_TEMPLATES[category]);
  }

  return { must, exclude };
}

export function buildQueries(title: string, category?: string) {
  const kw = extractKeywords(title);
  const { must, exclude } = disambiguate(title, category);

  // generate a few variants from the strongest tokens
  const base = [
    [...must, ...kw].slice(0, 6).join(' '),
    kw.slice(0, 5).join(' '),
  ].filter(Boolean);

  return { queries: base, exclude };
}
