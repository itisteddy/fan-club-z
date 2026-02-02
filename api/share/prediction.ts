import { URL } from 'node:url';

const API_BASE = 'https://fan-club-z.onrender.com';

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteOrigin(req: any): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
  return `${proto}://${host}`;
}

function buildShareUrl(origin: string, id: string, slug?: string): string {
  const safeId = encodeURIComponent(id);
  const safeSlug = slug ? encodeURIComponent(slug) : '';
  return safeSlug ? `${origin}/p/${safeId}/${safeSlug}` : `${origin}/p/${safeId}`;
}

function buildSpaUrl(origin: string, id: string): string {
  return `${origin}/prediction/${encodeURIComponent(id)}`;
}

function toAbsoluteUrl(origin: string, maybeUrl: string): string {
  const u = String(maybeUrl || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (u.startsWith('/')) return `${origin}${u}`;
  return u;
}

function deriveOgCandidateUrl(coverUrl: string): string {
  try {
    const u = new URL(coverUrl);
    const parts = u.pathname.split('/');
    if (parts.length >= 2) {
      const last = parts[parts.length - 1] || '';
      // Our storage pipeline uploads: {predictionId}/cover.(webp|jpg) and {predictionId}/og.jpg
      if (/^cover\./i.test(last)) {
        parts[parts.length - 1] = 'og.jpg';
        u.pathname = parts.join('/');
        return u.toString();
      }
    }
  } catch {
    // ignore
  }
  return '';
}

async function headOk(url: string): Promise<boolean> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 1500);
    try {
      const r = await fetch(url, { method: 'HEAD', signal: ac.signal });
      return r.ok;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return false;
  }
}

// OG image priority:
// 1) OG-friendly crop (og.jpg) if it exists
// 2) Uploaded cover URL
// 3) Generic fallback
async function computeOgImageUrl(origin: string, prediction: any): Promise<string> {
  const generic = `${origin}/og-generic.svg`;
  const imageUrl =
    (typeof prediction?.image_url === 'string' && prediction.image_url.trim()) ||
    (typeof prediction?.imageUrl === 'string' && prediction.imageUrl.trim()) ||
    (typeof prediction?.coverImageUrl === 'string' && prediction.coverImageUrl.trim()) ||
    '';
  const coverAbs = toAbsoluteUrl(origin, imageUrl);
  if (!coverAbs) return generic;

  const ogCandidate = deriveOgCandidateUrl(coverAbs);
  if (ogCandidate && (await headOk(ogCandidate))) return ogCandidate;

  return coverAbs;
}

export default async function handler(req: any, res: any) {
  const origin = absoluteOrigin(req);
  const id = String((req.query.id as string) || '').trim();
  const slug = typeof req.query.slug === 'string' ? req.query.slug : undefined;

  const shareUrl = id ? buildShareUrl(origin, id, slug) : `${origin}/`;
  const spaUrl = id ? buildSpaUrl(origin, id) : `${origin}/discover`;

  // Defaults: privacy-safe
  let title = 'Fan Club Z';
  let description = 'Open to view this prediction on Fan Club Z.';
  let ogImage = `${origin}/og-generic.svg`;
  let isPrivate = true;

  if (id) {
    try {
      const r = await fetch(`${API_BASE}/api/v2/predictions/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: { 'User-Agent': 'fanclubz-og-bot' },
      });

      if (r.ok) {
        const json: any = await r.json().catch(() => null);
        const p = json?.data ?? null;

        const priv = p?.is_private ?? p?.isPrivate;
        isPrivate = Boolean(priv);

        if (!isPrivate && p) {
          title = String(p.title || p.question || 'Prediction').trim() || 'Prediction';
          description = String(p.description || '').trim() || 'Open to view details and participate.';
          ogImage = await computeOgImageUrl(origin, p);
          // Cache-bust so caches refresh when creator updates cover (updated_at changes).
          const v = p.updated_at ? String(p.updated_at) : '';
          if (v && ogImage.startsWith('http')) {
            try {
              const u = new URL(ogImage);
              u.searchParams.set('v', v);
              ogImage = u.toString();
            } catch {}
          }
        }
      }
    } catch {
      // keep defaults
    }
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    isPrivate ? 'private, no-store' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
  );

  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(shareUrl)}" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Fan Club Z" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(shareUrl)}" />
    <meta property="og:image" content="${esc(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(ogImage)}" />

    <meta http-equiv="refresh" content="1;url=${esc(spaUrl)}" />
    <script>
      setTimeout(function () { try { window.location.replace(${JSON.stringify(spaUrl)}); } catch (e) {} }, 200);
    </script>
  </head>
  <body>
    <noscript><a href="${esc(spaUrl)}">Open prediction</a></noscript>
  </body>
</html>`);
}

