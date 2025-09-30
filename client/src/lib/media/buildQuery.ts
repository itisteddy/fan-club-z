// src/lib/media/buildQuery.ts
const STOP = new Set([
  'the','a','an','of','and','or','to','by','with','for','on','in','at','is','are','be','will'
]);

const SYNONYMS: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  nfl: 'american football',
  futbol: 'soccer',
  coin: 'cryptocurrency',
};

const BRAND_RULES: Array<{
  match: (t: string) => boolean;
  query: (t: string) => string;
}> = [
  // Apple the company/products — not the fruit
  {
    match: t => /\bapple\b/.test(t) && /\b(i(phone|os|pad|watch)|mac|iphone|ios|ipad|macbook|apple inc)\b/.test(t),
    query: t => 'iPhone smartphone product shot modern ' + (/\biphone\b/.test(t) ? 'apple' : '')
  },
  {
    match: t => /\bapple\b/.test(t),
    query: _ => 'Apple Inc logo brand minimal dark'
  },
  // Crypto
  { match: t => /\bbitcoin|btc\b/.test(t), query: _ => 'bitcoin logo coin cryptocurrency' },
  { match: t => /\beth(ereum)?\b/.test(t), query: _ => 'ethereum logo coin cryptocurrency' },
  // Sports
  { match: t => /\b(nba|basketball)\b/.test(t), query: _ => 'basketball game court action' },
  { match: t => /\b(nfl|american football)\b/.test(t), query: _ => 'american football game stadium action' },
  { match: t => /\bsoccer|footballer|premier league|la liga|fifa\b/.test(t), query: _ => 'soccer football player action stadium' },
  // Finance / macro
  { match: t => /\bcentral bank|interest rate|inflation|fed|ecb|boj\b/.test(t), query: _ => 'central bank building finance macro' },
];

const CATEGORY_TEMPLATES: Record<string, string> = {
  tech: 'technology smartphone gadget product render',
  crypto: 'cryptocurrency blockchain finance digital asset',
  sports: 'sports action stadium crowd',
  politics: 'government politics podium flag press',
  finance: 'stock market finance trading charts',
  custom: 'illustration minimal abstract',
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[$€£#@.,/!?()"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandTokens(s: string) {
  const t = normalize(s).split(' ').filter(x => x && !STOP.has(x));
  return t.map(x => SYNONYMS[x] ?? x);
}

/**
 * Build an image search query from a prediction title + category label.
 * Example:
 *  - "Will Apple announce a foldable iPhone..." + "tech" -> "iPhone smartphone product shot modern apple"
 *  - "Will Bitcoin exceed $100,000..." + "crypto" -> "bitcoin logo coin cryptocurrency"
 */
export function buildImageQuery(title: string, category?: string) {
  const norm = normalize(title);
  for (const r of BRAND_RULES) {
    if (r.match(norm)) return r.query(norm);
  }

  const base = expandTokens(title)
    .filter((w, i) => i < 6) // keep it short & relevant
    .join(' ');

  const catHint = category ? (CATEGORY_TEMPLATES[category] ?? '') : '';
  return [base, catHint, 'landscape modern'].filter(Boolean).join(' ');
}
