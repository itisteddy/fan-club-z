import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { mediaStore, type MediaItem } from '@/stores/mediaStore';
import { resolveMedia, type PredictionLike } from '@/lib/media/resolveMedia';

type Status = 'idle' | 'loading' | 'ready' | 'error';

const PLACEHOLDER: MediaItem = {
  id: 'placeholder',
  url:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f3f4f6"/><stop offset="1" stop-color="#e5e7eb"/></linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#g)"/></svg>`
    ),
  alt: '',
  provider: 'fallback',
};

function useStore<R>(selector: (s: Map<string, MediaItem>) => R): R {
  return useSyncExternalStore(
    mediaStore.subscribe,
    () => selector((mediaStore as any).state ?? (undefined as never)) // not used
  ) as unknown as R;
}

// We can't expose internal Map; implement get via memo and subscriptions
export function useMedia(id: string, prediction: PredictionLike) {
  // derive snapshot
  const media = useMemo(() => mediaStore.get(id) ?? null, [id, mediaStore.get(id)]);
  const isCached = !!media;

  const status: Status = isCached ? 'ready' : 'loading';

  useEffect(() => {
    if (mediaStore.get(id)) return;

    const inflight = mediaStore.peekInflight(id);
    if (inflight) {
      inflight
        .then((m) => mediaStore.set(id, m))
        .catch(() => mediaStore.clearInflight(id));
      return;
    }

    const p = resolveMedia(prediction)
      .then((m) => mediaStore.set(id, m))
      .catch(() => {
        // keep placeholder on error
      })
      .finally(() => mediaStore.clearInflight(id));

    mediaStore.setInflight(id, p as unknown as Promise<MediaItem>);
  }, [id, prediction]);

  // Re-render when store changes
  useSyncExternalStore(mediaStore.subscribe, () => 0);

  return {
    media: mediaStore.get(id) ?? PLACEHOLDER,
    status,
  };
}

// Optional: prefetch a page of predictions (call in Discover useEffect)
export function prefetchMedia(predictions: PredictionLike[], max = 8) {
  predictions.slice(0, max).forEach((p) => {
    if (!mediaStore.get(p.id) && !mediaStore.peekInflight(p.id)) {
      const inflight = resolveMedia(p)
        .then((m) => mediaStore.set(p.id, m))
        .finally(() => mediaStore.clearInflight(p.id));
      mediaStore.setInflight(p.id, inflight as unknown as Promise<MediaItem>);
    }
  });
}
