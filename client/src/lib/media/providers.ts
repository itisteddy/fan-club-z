// @ts-nocheck
// src/lib/media/providers.ts
import { SCORE, MEDIA_SOURCES } from './config';
import { buildQueries } from './queryBuilder';

type Candidate = {
  provider: 'unsplash'|'pexels',
  providerId: string,
  urls: { thumb: string; small: string; full: string },
  alt: string,
  attribution: { author: string; link: string }
  rawTitle: string // for scoring
};

export async function searchCandidates(title: string, category?: string): Promise<Candidate[]> {
  const { queries, exclude } = buildQueries(title, category);
  const out: Candidate[] = [];
  for (const q of queries) {
    out.push(...await searchUnsplash(q, exclude));
    out.push(...await searchPexels(q, exclude));
  }
  // de-dupe by provider+id
  const seen = new Set<string>();
  return out.filter(c => {
    const k = `${c.provider}:${c.providerId}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
}

async function searchUnsplash(query: string, exclude: string[]): Promise<Candidate[]> {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || 'KoLAbON534ZA8GNcNdZGTEoDtNBarlgJArGSokyuGkI';
  if (!accessKey) return [];

  try {
    // Build query with exclusions
    const excludeQuery = exclude.map(term => `-${term}`).join(' ');
    const fullQuery = `${query} ${excludeQuery}`.trim();
    
    const url = new URL(MEDIA_SOURCES.unsplash.base);
    url.searchParams.set('query', fullQuery);
    url.searchParams.set('per_page', '10');
    url.searchParams.set('orientation', 'squarish');
    url.searchParams.set('content_filter', 'high');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.results || []).map((photo: any): Candidate => ({
      provider: 'unsplash',
      providerId: photo.id,
      urls: {
        thumb: photo.urls.thumb || photo.urls.small,
        small: photo.urls.small,
        full: photo.urls.regular || photo.urls.full
      },
      alt: photo.alt_description || photo.description || query,
      attribution: {
        author: photo.user.name,
        link: photo.links.html
      },
      rawTitle: photo.alt_description || photo.description || ''
    }));
  } catch (error) {
    console.warn('Unsplash search failed:', error);
    return [];
  }
}

async function searchPexels(query: string, exclude: string[]): Promise<Candidate[]> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY || 'MNVZGjhI06B65Il9QFX2GVU9D3nHftQzMZhMcWVNICUQtrKYbf4JoSKf';
  if (!apiKey) return [];

  try {
    // Build query with exclusions (Pexels doesn't support - syntax, so we filter post-fetch)
    const url = new URL(MEDIA_SOURCES.pexels.base);
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '10');
    url.searchParams.set('orientation', 'square');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.photos || [])
      .filter((photo: any) => {
        // Filter out excluded terms post-fetch
        const alt = (photo.alt || '').toLowerCase();
        return !exclude.some(term => alt.includes(term.toLowerCase()));
      })
      .map((photo: any): Candidate => ({
        provider: 'pexels',
        providerId: photo.id.toString(),
        urls: {
          thumb: photo.src.tiny || photo.src.small,
          small: photo.src.small,
          full: photo.src.large || photo.src.original
        },
        alt: photo.alt || query,
        attribution: {
          author: photo.photographer,
          link: photo.url
        },
        rawTitle: photo.alt || ''
      }));
  } catch (error) {
    console.warn('Pexels search failed:', error);
    return [];
  }
}

function scoreCandidate(c: Candidate, title: string, category?: string) {
  const t = title.toLowerCase();
  const words = new Set(t.split(/\W+/).filter(Boolean));
  const matchCount = c.rawTitle.toLowerCase().split(/\W+/).filter(w => words.has(w)).length;
  const titleOverlap = Math.min(1, matchCount / 4);

  const categoryBoost = category && new RegExp(category, 'i').test(c.rawTitle) ? 1 : 0;

  const safeFilter = /nude|gore|blood|weapon/i.test(c.rawTitle) ? 0 : 1;

  return SCORE.titleOverlap*titleOverlap + SCORE.categoryBoost*categoryBoost + SCORE.safeFilter*safeFilter;
}

export function pickDeterministic(cands: Candidate[], title: string, category: string|undefined, seed: string) {
  // score then pick "best within a bucket" using a stable hash
  const scored = cands.map(c => ({ c, s: scoreCandidate(c, title, category) }))
                      .sort((a,b) => b.s - a.s);
  if (!scored.length) return null;
  // choose among top 3 using stable hash to avoid flapping
  const top = scored.slice(0, Math.min(3, scored.length));
  const idx = Math.abs(stableHash(seed)) % top.length;
  return { pick: top[idx].c, score: top[idx].s };
}

function stableHash(s: string) {
  let h = 2166136261;
  for (let i=0;i<s.length;i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return h|0;
}
