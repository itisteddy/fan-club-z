// src/lib/media/index.ts
// Central export point for media utilities

export { buildImageQuery } from './buildQuery';
export { usePredictionMedia } from './usePredictionMedia';

// Re-export for convenience (if you keep the old system around during migration)
export { resolveMedia } from './resolveMedia';
export { MEDIA_PROVIDERS } from './providers';

// Type definitions
export type PredictionMediaInput = {
  id: string;
  title: string;
  category?: string;
};

export type MediaProvider = 'pexels' | 'unsplash' | 'pixabay';

export type MediaSearchResult = {
  url: string;
  source: MediaProvider;
  query: string;
};
