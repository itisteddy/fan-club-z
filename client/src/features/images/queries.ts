// Keyword extraction and query building utilities

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'is', 'are', 'to', 'in', 'by', 'on', 'for', 'with', 'will',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would',
  'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
]);

export function keywordsFromTitle(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove punctuation, keep letters and numbers
    .split(/\s+/)
    .filter(word => word && !STOPWORDS.has(word))
    .slice(0, 4); // Limit to 4 keywords
}

// Category to query template mapping
const CATEGORY_QUERIES: Record<string, string> = {
  tech: 'technology gadgets computer',
  technology: 'technology gadgets computer',
  sports: 'sports stadium athlete',
  crypto: 'cryptocurrency blockchain digital',
  cryptocurrency: 'cryptocurrency blockchain digital',
  politics: 'government parliament politics',
  business: 'business office corporate',
  entertainment: 'entertainment media celebrity',
  science: 'science laboratory research',
  health: 'health medical wellness',
  finance: 'finance money investment',
  education: 'education learning school',
  travel: 'travel destination landscape',
  food: 'food cooking restaurant',
  fashion: 'fashion style clothing',
  art: 'art creative design',
  music: 'music concert performance',
  gaming: 'gaming esports technology',
  automotive: 'car automotive vehicle',
  real_estate: 'house building architecture'
};

export function buildImageQuery(prediction: {
  title: string;
  category?: string;
  description?: string;
}): string {
  // First, try category-based query
  if (prediction.category) {
    const categoryQuery = CATEGORY_QUERIES[prediction.category.toLowerCase()];
    if (categoryQuery) {
      return categoryQuery;
    }
  }

  // Extract keywords from title
  const titleKeywords = keywordsFromTitle(prediction.title);
  
  // If we have good keywords, use them
  if (titleKeywords.length >= 2) {
    return titleKeywords.join(' ');
  }

  // Fallback to category or generic terms
  if (prediction.category) {
    return prediction.category.toLowerCase();
  }

  // Final fallback
  return 'abstract business technology';
}

// Generate deterministic seed from prediction data
export function generateSeed(prediction: {
  id?: string;
  slug?: string;
  title: string;
}): string {
  return prediction.id || prediction.slug || prediction.title.trim().toLowerCase();
}

// Validate and sanitize query for safety
export function sanitizeQuery(query: string): string {
  // Remove potentially problematic terms
  const blocklist = [
    'explicit', 'nsfw', 'adult', 'nude', 'naked', 'sex', 'porn',
    'violence', 'blood', 'gore', 'weapon', 'gun', 'knife',
    'hate', 'racist', 'offensive'
  ];

  let sanitized = query.toLowerCase();
  
  for (const term of blocklist) {
    sanitized = sanitized.replace(new RegExp(`\\b${term}\\b`, 'gi'), '');
  }

  // Clean up extra spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // If query becomes empty, use safe fallback
  if (!sanitized) {
    sanitized = 'abstract business';
  }

  return sanitized;
}
