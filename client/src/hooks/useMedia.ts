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
  // Return default values if prediction is undefined
  if (!prediction) {
    return {
      media: {
        id: id || '',
        url: '',
        alt: '',
        provider: 'fallback',
      },
      status: 'idle' as Status,
    };
  }

  // Use the new hook
  const result = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.category,
  });

  // Transform to legacy format
  const media: MediaItem = {
    id: prediction.id,
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
