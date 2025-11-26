// src/lib/media/index.ts
// Central export point for media utilities

import type { SemanticImageContext } from './buildQuery';

export { buildImageQuery } from './buildQuery';
export type { SemanticImageContext } from './buildQuery';
export { usePredictionMedia } from './usePredictionMedia';

// Re-export for convenience (if you keep the old system around during migration)
// Legacy exports retained for backward compatibility (deprecated)
// export { resolveMedia } from './resolveMedia';
// export { MEDIA_PROVIDERS } from './providers';

// Type definitions
export type PredictionMediaInput = SemanticImageContext & {
  id: string;
};

export type MediaProvider = 'pexels' | 'unsplash' | 'pixabay';

export type MediaSearchResult = {
  url: string;
  source: MediaProvider;
  query: string;
};
