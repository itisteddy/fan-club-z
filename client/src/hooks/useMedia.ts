import { usePredictionMedia } from '@/lib/media/usePredictionMedia';

export type MediaItem = {
  id: string;
  url: string;
  alt: string;
  provider: string;
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

// For backwards compatibility with existing code
export function useMedia(
  id: string,
  prediction?: {
    id: string;
    title: string;
    description?: string;
    category?: string;
  }
) {
  // Always call the underlying hook to preserve hooks order across renders.
  // When prediction is undefined, fall back to a safe placeholder object.
  const safePrediction = prediction ?? {
    id: id || '',
    title: '',
    category: undefined as string | undefined,
  };

  // Use the new hook with a safe prediction object
  const result = usePredictionMedia(safePrediction);

  // Transform to legacy format
  const media: MediaItem = {
    id: safePrediction.id,
    url: result.url,
    alt: result.alt,
    provider: result.provider,
  };

  return {
    media,
    status: result.status as Status,
  };
}

// Legacy prefetch - now a no-op since we have caching
export function prefetchMedia(_predictions: any[], _max = 8) {
  // No-op: new system handles caching automatically
  console.log('[useMedia] prefetchMedia is deprecated - caching is automatic');
}
