// Generic, topic-aware image resolver for predictions
// Works with or without provider API keys (falls back to curated category images)

// =========================
// Config / Environment
// =========================
const MEDIA_ENDPOINT = import.meta.env.VITE_MEDIA_ENDPOINT || '/media/search';
const USE_PROXY = true; // Use serverless proxy to avoid CORS/429

const UNSPLASH_KEY = import.meta.env.VITE_MEDIA_UNSPLASH_KEY as string | undefined;
const PEXELS_KEY   = import.meta.env.VITE_MEDIA_PEXELS_KEY as string | undefined;

// Limits
const PROVIDER_LIMIT = 12;   // results to fetch per provider
const TIMEOUT_MS     = 6000;

// Basic stopwords to clean titles/descriptions
const STOPWORDS = new Set([
  'the','a','an','and','or','of','in','on','at','to','for','by','with','from',
  'will','is','are','be','being','been','do','does','did','can','could','should',
  'may','might','it','this','that','these','those','about','over','under','into',
  'than','as','if','then','but','so','not','no','yes','you','we','they','i',
]);

// Words we don't want (logos, vector icons, mockups) unless nothing else works
const AVOID_TERMS = ['logo','vector','illustration','icon','mockup','render','3d','sticker'];

// High-level topical "contexts" inferred from text, used to bias queries/fallbacks
type Context =
  | 'technology' | 'finance' | 'crypto' | 'sports'
  | 'politics'   | 'entertainment' | 'gaming' | 'science' | 'popCulture' | 'general';

// Keyword hints for context detection (broad and extensible)
const CONTEXT_HINTS: Record<Context, RegExp[]> = {
  technology:    [/phone|iphone|smartphone|device|ai|chip|semiconductor|laptop|app|software|hardware|startup|gadget/i],
  finance:       [/stock|market|earnings|revenue|profit|ipo|fed|rates|inflation|bank|economy|gdp|tariff/i],
  crypto:        [/bitcoin|ethereum|solana|blockchain|token|coin|defi|web3|nft/i],
  sports:        [/match|game|season|league|tournament|player|goal|score|nba|nfl|premier|fifa|olympic/i],
  politics:      [/election|vote|president|parliament|policy|government|minister|senate|congress|referendum/i],
  entertainment: [/movie|film|tv|show|series|celebrity|album|music|song|oscars|emmys|grammys/i],
  gaming:        [/game|esports|steam|nintendo|playstation|xbox|league of legends|valorant|fortnite|minecraft/i],
  science:       [/research|space|nasa|physics|biology|health|vaccine|climate|genome|quantum/i],
  popCulture:    [/trend|viral|meme|influencer|tiktok|instagram|youtube|fashion|brand/i],
  general:       [/./], // catch-all
};

// Curated, **generic** fallback image pools by context (no API keys needed).
// Use real Unsplash image IDs (direct CDN links).
const FALLBACKS: Record<Context, string[]> = {
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475', // gadgets
    'https://images.unsplash.com/photo-1510552776732-03e61cf4b144', // smartphone
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', // code
  ],
  finance: [
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e', // charts
    'https://images.unsplash.com/photo-1526304640581-8b363aa866a6', // money
  ],
  crypto: [
    'https://images.unsplash.com/photo-1621416894569-0f39d71dbe8f', // bitcoin
    'https://images.unsplash.com/photo-1518544801976-3e4e4474c1ee',
  ],
  sports: [
    'https://images.unsplash.com/photo-1459865264687-595d652de67e',
    'https://images.unsplash.com/photo-1521417531630-0a222dda9bda',
  ],
  politics: [
    'https://images.unsplash.com/photo-1530036723598-68bd9f06e1d2',
    'https://images.unsplash.com/photo-1520975916090-3105956dac38',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1515165562835-c3b8c0b0b0d6',
    'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc',
  ],
  gaming: [
    'https://images.unsplash.com/photo-1511512578047-dfb367046420',
    'https://images.unsplash.com/photo-1542751110-97427bbecf20',
  ],
  science: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31',
  ],
  popCulture: [
    'https://images.unsplash.com/photo-1514516870926-205989cdcb5a',
    'https://images.unsplash.com/photo-1516826957135-700dedea698c',
  ],
  general: [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
  ],
};

// =========================
// Types
// =========================

export type MediaItem = {
  id: string;            // provider image id or 'fallback'/'hint'
  url: string;           // final URL to use in <img>
  alt: string;           // accessible alt
  provider: 'unsplash' | 'pexels' | 'fallback' | 'hint';
};

export type PredictionLike = {
  id: string;
  title: string;
  category?: string;
  description?: string | null;
  imageHint?: string | null; // optional override (admin/editor)
};

type ProviderResult = {
  provider: 'unsplash' | 'pexels';
  id: string;
  url: string;
  alt?: string;
  tags?: string[];
};

// =========================
// Utilities
// =========================

function hashSeed(s: string): number {
  // Small fast hash → 32-bit unsigned
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0);
}

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\+]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t))
    .slice(0, 24);
}

function detectContexts(tokens: string[]): Context[] {
  const hits: Array<{ c: Context; score: number }> = [];
  for (const c of Object.keys(CONTEXT_HINTS) as Context[]) {
    const rules = CONTEXT_HINTS[c];
    const score = rules.reduce((acc, r) => acc + (tokens.some(t => r.test(t)) ? 1 : 0), 0);
    if (score > 0) hits.push({ c, score });
  }
  if (!hits.length) return ['general'];
  hits.sort((a,b) => b.score - a.score);
  const topScore = hits[0].score;
  return hits.filter(h => h.score >= topScore).map(h => h.c);
}

function buildQueries(tokens: string[], ctx: Context[]): string[] {
  const base = tokens.slice(0, 8).join(' ');

  // Context enrichers (kept generic)
  const ctxTerms: Record<Context, string[]> = {
    technology: ['technology', 'device', 'smartphone', 'product'],
    finance: ['finance', 'stock market', 'economy', 'trading'],
    crypto: ['crypto', 'blockchain'],
    sports: ['sports', 'stadium', 'game'],
    politics: ['politics', 'government'],
    entertainment: ['entertainment', 'audience'],
    gaming: ['gaming'],
    science: ['science', 'research'],
    popCulture: ['trending', 'pop culture'],
    general: [],
  };

  const qs = new Set<string>();
  qs.add(base);
  ctx.forEach(c => {
    ctxTerms[c].forEach(term => qs.add(`${base} ${term}`.trim()));
  });

  // If base is too small, add context-only queries
  if (tokens.length < 2) {
    ctx.forEach(c => ctxTerms[c].forEach(term => qs.add(term)));
  }

  // Avoid likely bad results
  AVOID_TERMS.forEach(bad => {
    for (const q of Array.from(qs)) {
      qs.add(`${q} -${bad}`);
    }
  });

  return Array.from(qs).slice(0, 12);
}

// =========================
// Providers (tiny wrappers)
// =========================

async function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function searchUnsplash(queries: string[], limit: number, seed: number): Promise<ProviderResult[]> {
  if (!UNSPLASH_KEY) return []; // skip if no key
  const results: ProviderResult[] = [];
  // Pick one query deterministically to limit API calls
  const q = queries[seed % queries.length];

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', q);
  url.searchParams.set('per_page', String(limit));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  const res = await withTimeout(fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
  }));
  if (!res.ok) return [];
  const json = await res.json();
  const items = (json?.results || []) as any[];

  for (const it of items) {
    results.push({
      provider: 'unsplash',
      id: it.id,
      url: it.urls?.regular || it.urls?.small || it.urls?.raw,
      alt: it.alt_description || it.description || '',
      tags: (it.tags || []).map((t: any) => t.title).filter(Boolean),
    });
  }
  return results;
}

async function searchPexels(queries: string[], limit: number, seed: number): Promise<ProviderResult[]> {
  if (!PEXELS_KEY) return []; // skip if no key
  const results: ProviderResult[] = [];
  const q = queries[(seed + 1) % queries.length];

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', q);
  url.searchParams.set('per_page', String(limit));
  url.searchParams.set('orientation', 'landscape');

  const res = await withTimeout(fetch(url.toString(), {
    headers: { Authorization: PEXELS_KEY },
  }));
  if (!res.ok) return [];
  const json = await res.json();
  const items = (json?.photos || []) as any[];

  for (const it of items) {
    results.push({
      provider: 'pexels',
      id: String(it.id),
      url: it.src?.large2x || it.src?.large || it.src?.medium || it.src?.original,
      alt: it.alt || '',
      tags: [], // Pexels doesn't give tags; scoring will rely on alt/url
    });
  }
  return results;
}

// =========================
// Scoring & Selection
// =========================

function overlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const A = new Set(a);
  let n = 0;
  b.forEach(t => { if (A.has(t)) n++; });
  return n / Math.max(a.length, b.length);
}

function scoreResult(r: ProviderResult, tokens: string[], ctx: Context[]): number {
  // Token overlap using (alt + url path)
  const candTokens = tokenize(`${r.alt || ''} ${new URL(r.url).pathname.replace(/\//g, ' ')}`);
  let score = overlapScore(tokens, candTokens) * 1.5;

  // Context bumps if tags/alt include context words
  const ctxWords = ctx.flatMap(c => c.split(/(?=[A-Z])/)).map(s => s.toLowerCase());
  if (candTokens.some(t => ctxWords.includes(t))) score += 0.2;

  // Penalize "AVOID_TERMS"
  if (AVOID_TERMS.some(bad => candTokens.includes(bad))) score -= 0.4;

  return score;
}

function pickDeterministic<T>(arr: T[], seed: number): T | undefined {
  if (!arr.length) return undefined;
  return arr[seed % arr.length];
}

// =========================
// Public API
// =========================

export async function resolveMedia(pred: PredictionLike): Promise<MediaItem> {
  const seed = hashSeed(pred.id);
  const text = [pred.title, pred.description || ''].join(' ');
  const tokens = tokenize(text);
  const contexts = detectContexts(tokens);

  // 1) Build provider queries
  const queries = buildQueries(tokens, contexts);

  // 2) Search providers - use proxy to avoid CORS/429
  let providerResults: ProviderResult[] = [];
  if (USE_PROXY) {
    try {
      // Use serverless proxy
      const query = queries[seed % queries.length];
      const url = new URL(MEDIA_ENDPOINT, window.location.origin);
      url.searchParams.set('q', query);
      url.searchParams.set('per', '1');
      
      const res = await withTimeout(fetch(url.toString(), { method: 'GET' }));
      if (res.ok) {
        const { images } = await res.json();
        if (images && images.length) {
          providerResults = images.map((img: any) => ({
            provider: 'unsplash' as const,
            id: 'proxy',
            url: img.url,
            alt: img.credit || '',
            tags: [],
          }));
        }
      }
    } catch {
      // Fall through to fallback
    }
  } else {
    // Direct API calls (legacy, may have CORS issues)
    try {
      const [u, p] = await Promise.allSettled([
        searchUnsplash(queries, PROVIDER_LIMIT, seed),
        searchPexels(queries, PROVIDER_LIMIT, seed),
      ]);
      if (u.status === 'fulfilled') providerResults = providerResults.concat(u.value);
      if (p.status === 'fulfilled') providerResults = providerResults.concat(p.value);
    } catch {
      // ignore network/provider errors and fall back
    }
  }

  // 3) Apply optional strong override (editor hint) if provided
  if (pred.imageHint && /^https?:\/\//i.test(pred.imageHint)) {
    return {
      id: 'hint',
      url: pred.imageHint,
      provider: 'hint',
      alt: pred.title,
    };
  }

  // 4) Score & select deterministically (but by best score band)
  if (providerResults.length) {
    const scored = providerResults
      .map(r => ({ r, s: scoreResult(r, tokens, contexts) }))
      .sort((a,b) => b.s - a.s);

    // Keep the top band (within 20% of the best score), then pick deterministically
    const best = scored[0].s;
    const band = scored.filter(x => x.s >= best - 0.2).map(x => x.r);
    const chosen = pickDeterministic(band, seed) || pickDeterministic(providerResults, seed)!;

    return {
      id: chosen.id,
      url: chosen.url,
      alt: chosen.alt || pred.title,
      provider: chosen.provider,
    };
  }

  // 5) Fallback pool by context (generic, relevant visuals)
  const ctx = contexts[0] || 'general';
  const pool = (FALLBACKS[ctx] || FALLBACKS.general);
  const chosen = pickDeterministic(pool, seed) || FALLBACKS.general[0];

  return {
    id: 'fallback',
    url: chosen,
    alt: pred.title,
    provider: 'fallback',
  };
}