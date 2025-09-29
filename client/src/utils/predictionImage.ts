// Compact thumbnail system for predictions using Openverse API

type ImageHit = {
  url: string;
  thumbnail: string | null;
  title?: string;
  provider?: string;
  creator?: string;
};

const OPENVERSE_ENDPOINT =
  'https://api.openverse.engineering/v1/images/?license_type=all&format=json&per_page=1&q=';

// Fallbacks by category (small, safe thumbs)
const CATEGORY_FALLBACKS: Record<string, string[]> = {
  tech: [
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop'
  ],
  technology: [
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop'
  ],
  sports: [
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&auto=format&fit=crop'
  ],
  culture: [
    'https://images.unsplash.com/photo-1495562569060-2eec283d3391?w=400&auto=format&fit=crop'
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1495562569060-2eec283d3391?w=400&auto=format&fit=crop'
  ],
  business: [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop'
  ],
  finance: [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&auto=format&fit=crop'
  ],
  crypto: [
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&auto=format&fit=crop'
  ],
  cryptocurrency: [
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&auto=format&fit=crop'
  ],
  politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&auto=format&fit=crop'
  ],
  default: [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&auto=format&fit=crop'
  ]
};

// Cheap, deterministic key
const imageKey = (id: string) => `fcz:img:${id}`;

const fromCache = (id: string): string | null => {
  try {
    return localStorage.getItem(imageKey(id));
  } catch {
    return null;
  }
};

const toCache = (id: string, url: string) => {
  try {
    localStorage.setItem(imageKey(id), url);
  } catch {}
};

const pickFallback = (category?: string) => {
  const list = CATEGORY_FALLBACKS[(category || '').toLowerCase()] || CATEGORY_FALLBACKS.default;
  return list[Math.floor(Math.random() * list.length)];
};

export async function fetchPredictionThumb(
  predictionId: string,
  title: string,
  category?: string
): Promise<string> {
  // 1) cache
  const cached = fromCache(predictionId);
  if (cached) return cached;

  // 2) try Openverse
  try {
    const query = encodeURIComponent(`${title} ${category || ''}`.trim());
    const res = await fetch(`${OPENVERSE_ENDPOINT}${query}`, { method: 'GET' });
    if (res.ok) {
      const json = await res.json();
      const result = json?.results?.[0];
      const url: string | null =
        result?.thumbnail ||
        result?.url ||
        null;
      if (url) {
        toCache(predictionId, url);
        return url;
      }
    }
  } catch {
    // ignore
  }

  // 3) fallback
  const fb = pickFallback(category);
  toCache(predictionId, fb);
  return fb;
}
