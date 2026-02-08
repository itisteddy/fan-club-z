export interface CategoryDefinition {
  slug: string;
  label: string;
  sortOrder: number;
}

// Canonical category list + deterministic order for UI rendering.
// "All" is a special UI-only option and intentionally excluded here.
export const CATEGORIES: CategoryDefinition[] = [
  { slug: 'general', label: 'General', sortOrder: 0 },
  { slug: 'sports', label: 'Sports', sortOrder: 1 },
  { slug: 'pop_culture', label: 'Pop Culture', sortOrder: 2 },
  { slug: 'celebrity_gossip', label: 'Celebrity Gossip', sortOrder: 3 },
  { slug: 'family', label: 'Family', sortOrder: 4 },
  { slug: 'entertainment', label: 'Entertainment', sortOrder: 5 },
  { slug: 'politics', label: 'Politics', sortOrder: 6 },
  { slug: 'crypto', label: 'Crypto', sortOrder: 7 },
  { slug: 'finance', label: 'Finance', sortOrder: 8 },
  { slug: 'tech', label: 'Tech', sortOrder: 9 },
  { slug: 'esports', label: 'Esports', sortOrder: 10 },
  { slug: 'religion', label: 'Religion', sortOrder: 11 },
  { slug: 'work', label: 'Work', sortOrder: 12 },
  { slug: 'relationships', label: 'Relationships', sortOrder: 13 },
  { slug: 'health_fitness', label: 'Health/Fitness', sortOrder: 14 },
  { slug: 'gaming', label: 'Gaming', sortOrder: 15 },
  { slug: 'music', label: 'Music', sortOrder: 16 },
  { slug: 'movies_tv', label: 'Movies/TV', sortOrder: 17 },
  { slug: 'weather', label: 'Weather', sortOrder: 18 },
  // Keep Custom last if the backend returns it.
  { slug: 'custom', label: 'Custom', sortOrder: 99 },
];

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const CATEGORY_ORDER = new Map(CATEGORIES.map((c, index) => [c.slug, index]));
