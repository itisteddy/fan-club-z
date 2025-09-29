// src/lib/media/config.ts
export const MEDIA_SOURCES = {
  unsplash: { base: 'https://api.unsplash.com/search/photos' },
  pexels:   { base: 'https://api.pexels.com/v1/search' }
};

export const NEGATIVE_KEYWORDS = [
  'fruit','orchard','food','pie','dessert','salad','recipe'
];

export const CATEGORY_TEMPLATES: Record<string, string[]> = {
  tech:   ['technology', 'smartphone', 'chip', 'innovation'],
  crypto: ['bitcoin', 'cryptocurrency', 'blockchain', 'trading'],
  sports: ['sports', 'stadium', 'fans'],
  politics: ['government', 'parliament', 'flag'],
  finance: ['stock market', 'trading screen', 'banking'],
  'pop-culture': ['celebrity', 'entertainment', 'music', 'movies'],
};

export const SCORE = {
  titleOverlap: 0.6,
  categoryBoost: 0.2,
  safeFilter: 0.2,
};

export const MIN_ACCEPTABLE_SCORE = 0.45;
