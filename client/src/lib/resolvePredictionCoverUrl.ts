/**
 * Resolve a prediction cover URL in priority order:
 * 1) Creator-uploaded cover (prediction.image_url / prediction.imageUrl)
 * 2) Any legacy/fallback fields if present (rare)
 * 3) undefined (caller can show placeholder)
 */

export function resolvePredictionCoverUrl(prediction: any): string | undefined {
  if (!prediction) return undefined;

  const candidates: Array<unknown> = [
    prediction.image_url,
    prediction.imageUrl,
    prediction.coverImageUrl,
    prediction.cover_image_url,
  ];

  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const url = c.trim();
    if (!url) continue;
    // allow absolute http(s) and relative paths (some deployments may proxy)
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;
  }

  return undefined;
}

