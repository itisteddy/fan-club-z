import type { PredictionMediaInput } from '@/lib/media';
import { useStableImage } from '@/features/images/StableImageProvider';
import type { Prediction } from '@/features/images/useAutoImage';

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
  prediction?: PredictionMediaInput
) {
  // Normalize input so we always have a stable prediction object
  const safePrediction: PredictionMediaInput = prediction ?? {
    id: id || '',
    title: '',
    category: undefined,
  };

  // Map the semantic media input into the stable image prediction shape
  const stablePrediction: Prediction = {
    id: safePrediction.id,
    title: safePrediction.title || safePrediction.question || 'Prediction',
    category: safePrediction.category,
    description:
      safePrediction.description ??
      safePrediction.question ??
      '',
  };

  // Use the stable image pipeline backed by /api/images + IndexedDB cache.
  // This guarantees:
  // - Deterministic image selection per prediction (seeded)
  // - Pexels primary, Unsplash fallback
  // - No image "flapping" across reloads
  const {
    image,
    loading,
    error,
    usedFallback,
  } = useStableImage({
    prediction: stablePrediction,
    enabled: true,
  });

  const media: MediaItem = {
    id: stablePrediction.id,
    url: image?.url ?? '',
    alt: image
      ? `Image related to: ${stablePrediction.title}`
      : stablePrediction.title,
    provider: image?.provider ?? (usedFallback ? 'fallback' : 'none'),
  };

  let status: Status;
  if (loading && !image) status = 'loading';
  else if (image) status = 'ready';
  else if (error) status = 'error';
  else status = 'idle';

  return { media, status };
}

// Legacy prefetch - now a no-op since we have caching
export function prefetchMedia(_predictions: any[], _max = 8) {
  // No-op: new system handles caching automatically
  console.log('[useMedia] prefetchMedia is deprecated - caching is automatic');
}
