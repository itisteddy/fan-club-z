// api/media-search.ts - Vercel serverless function (root deploy)
type VercelReq = { method?: string; query?: Record<string, string>; headers?: Record<string, string> };
type VercelRes = { setHeader: (k: string, v: string) => void; status: (n: number) => VercelRes; json: (o: unknown) => void; end: () => void };

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min
const mem = new Map<string, { at: number; payload: unknown }>();

const allowlist = new Set([
  'http://localhost:5174',
  'https://app.fanclubz.app',
  'https://fanclubz-staging.vercel.app'
]);

function cors(res: VercelRes, origin?: string) {
  if (origin && allowlist.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelReq, res: VercelRes) {
  cors(res, req?.headers?.origin);
  if (req?.method === 'OPTIONS') return res.status(200).end();

  const query = req?.query ?? {};
  const q = (String(query.q ?? '')).trim();
  const per = Math.min(1, Number(query.per) || 1);
  if (!q) return res.status(400).json({ error: 'Missing q' });

  const cacheKey = `${q}:${per}`;
  const hit = mem.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=60');
    return res.status(200).json(hit.payload);
  }

  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  const result = await fetchPexels(q, per, pexelsKey).catch(() => null)
             || await fetchUnsplash(q, per, unsplashKey).catch(() => null);

  if (!result) return res.status(502).json({ error: 'Upstream providers failed' });

  const payload = { images: result };
  mem.set(cacheKey, { at: Date.now(), payload });
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=60');
  return res.status(200).json(payload);
}

async function fetchPexels(q: string, per: number, key?: string) {
  if (!key) return null;
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', q);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', String(per));
  const r = await fetch(url.toString(), { headers: { Authorization: key } });
  if (!r.ok) return null;
  const json = await r.json();
  return (json.photos || []).slice(0, per).map((p: { src?: { medium?: string; landscape?: string; original?: string }; width?: number; height?: number; photographer?: string }) => ({
    url: p.src?.medium || p.src?.landscape || p.src?.original,
    width: p.width, height: p.height,
    credit: p.photographer ?? 'Pexels'
  }));
}

async function fetchUnsplash(q: string, per: number, key?: string) {
  if (!key) return null;
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', q);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('per_page', String(per));
  url.searchParams.set('client_id', key);
  const r = await fetch(url.toString());
  if (!r.ok) return null;
  const json = await r.json();
  return (json.results || []).slice(0, per).map((p: { urls?: { small?: string; regular?: string; raw?: string }; width?: number; height?: number; user?: { name?: string } }) => ({
    url: p.urls?.small || p.urls?.regular || p.urls?.raw,
    width: p.width, height: p.height,
    credit: p.user?.name ?? 'Unsplash'
  }));
}
