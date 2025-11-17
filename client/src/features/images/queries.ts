// Keyword extraction and query building utilities

type PredictionContext = {
  title: string;
  category?: string;
  description?: string;
  tags?: string[];
  options?: Array<{ label?: string | null } | null | undefined>;
  entry_deadline?: string | null;
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'is', 'are', 'to', 'in', 'by', 'on', 'for', 'with', 'will',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would',
  'may', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs'
]);

const MAX_KEYWORDS = 8;

function extractKeywords(text?: string, limit = 4): string[] {
  if (!text) return [];

  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove punctuation, keep letters and numbers
    .split(/\s+/)
    .filter(word => word && !STOPWORDS.has(word))
    .slice(0, limit);
}

export function keywordsFromTitle(title: string): string[] {
  return extractKeywords(title);
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

const ENTITY_OVERRIDES: Array<{ keywords: string[]; query: string }> = [
  { keywords: ['taylor swift'], query: 'taylor swift singer portrait pop star' },
  { keywords: ['beyonce'], query: 'beyonce singer concert stage lights' },
  { keywords: ['super bowl'], query: 'super bowl american football crowd stadium' },
  { keywords: ['nba', 'lakers', 'celtics', 'warriors'], query: 'nba basketball arena game action' },
  { keywords: ['bitcoin'], query: 'bitcoin cryptocurrency coin digital gold' },
  { keywords: ['ethereum'], query: 'ethereum blockchain technology crypto' },
  { keywords: ['tesla'], query: 'tesla electric car futuristic automotive' },
  { keywords: ['apple', 'iphone', 'macbook'], query: 'apple product render minimalist tech' },
  { keywords: ['marvel', 'avengers'], query: 'marvel movie cinematic superhero film poster' },
  { keywords: ['nigeria', 'lagos'], query: 'lagos nigeria city skyline modern africa' },
  // Celebrity names
  { keywords: ['haaland', 'erling haaland'], query: 'soccer football player athlete striker' },
  { keywords: ['brad pitt'], query: 'hollywood actor celebrity portrait red carpet' },
  { keywords: ['messi'], query: 'lionel messi soccer football player argentina' },
  { keywords: ['ronaldo', 'cristiano ronaldo'], query: 'cristiano ronaldo soccer football player portugal' },
  { keywords: ['lebron', 'lebron james'], query: 'lebron james basketball nba player' },
  { keywords: ['curry', 'stephen curry'], query: 'stephen curry basketball nba player' }
];

type ThemeRule = {
  pattern: RegExp;
  enrichment: string;
};

const THEME_RULES: ThemeRule[] = [
  {
    pattern: /\b(playstation|xbox|nintendo|switch|console|gaming|esports|ps[45]|fc\d+|fifa|call of duty|madden)\b/i,
    enrichment: 'gaming console controller neon lights'
  },
  {
    pattern: /\b(soccer|football|premier league|champions league|world cup|uefa|goal|striker|super eagles|laliga|serie a)\b/i,
    enrichment: 'soccer football stadium crowd energy'
  },
  {
    pattern: /\b(nba|basketball|wnba|lebron|curry|lakers|warriors|celtics|bucks|slam dunk)\b/i,
    enrichment: 'basketball court arena spotlight action'
  },
  {
    pattern: /\b(baseball|mlb|yankees|mets|dodgers|home run)\b/i,
    enrichment: 'baseball stadium diamond night lights'
  },
  {
    pattern: /\b(crypto|bitcoin|ethereum|blockchain|token|defi|web3|nft)\b/i,
    enrichment: 'cryptocurrency blockchain digital finance'
  },
  {
    pattern: /\b(stock|market|nasdaq|dow|s&p|economy|inflation|interest rate|fed|earnings)\b/i,
    enrichment: 'finance stock market trading screens'
  },
  {
    pattern: /\b(election|vote|president|senate|congress|ballot|campaign|debate|primary)\b/i,
    enrichment: 'politics debate stage voters flag'
  },
  {
    pattern: /\b(ai|artificial intelligence|machine learning|automation|robot|chatgpt|openai)\b/i,
    enrichment: 'artificial intelligence neon interface'
  },
  {
    pattern: /\b(weather|storm|hurricane|rain|snow|heatwave|forecast|climate|temperature)\b/i,
    enrichment: 'weather radar satellite dramatic sky'
  },
  {
    pattern: /\b(health|medical|hospital|doctor|vaccine|covid|virus|pharma|therapy)\b/i,
    enrichment: 'healthcare medical laboratory professional'
  },
  {
    pattern: /\b(movie|film|netflix|disney|hollywood|oscars|series|streaming|celebrity|album|music)\b/i,
    enrichment: 'entertainment cinematic lights audience'
  },
  {
    pattern: /\b(travel|flight|airline|airport|tourism|hotel|vacation|cruise|passport)\b/i,
    enrichment: 'travel adventure airplane tropical destination'
  },
  {
    pattern: /\b(oil|gas|energy|petroleum|solar|wind|renewable|power grid|battery)\b/i,
    enrichment: 'energy industry infrastructure power'
  },
  {
    pattern: /\b(education|school|university|college|students|teacher|campus|graduation)\b/i,
    enrichment: 'education classroom lecture modern campus'
  },
  {
    pattern: /\b(military|war|defense|army|navy|missile|conflict|ukraine|gaza|troops)\b/i,
    enrichment: 'military strategy defense technology'
  },
  {
    pattern: /\b(taller|shorter|bigger|smaller|better|worse|faster|slower|stronger|weaker|more|less|than)\b/i,
    enrichment: 'comparison contrast comparison chart data visualization'
  },
  {
    pattern: /\b(celebrity|actor|actress|singer|musician|athlete|player|star|famous|person|people)\b/i,
    enrichment: 'celebrity portrait red carpet entertainment media'
  },
  {
    pattern: /\b(users|subscribers|followers|members|growth|hits|reaches|achieves|launches|releases)\b/i,
    enrichment: 'technology growth chart analytics dashboard startup'
  },
  {
    pattern: /\b(custom|random|misc|general|other|question|prediction)\b/i,
    enrichment: 'abstract modern business concept illustration'
  }
];

function buildTextHaystack(prediction: PredictionContext): string {
  return [
    prediction.title,
    prediction.description,
    ...(prediction.options?.map(opt => opt?.label ?? '') ?? []),
    ...(prediction.tags ?? [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchEntityOverride(prediction: PredictionContext): string | null {
  const haystack = buildTextHaystack(prediction);

  for (const override of ENTITY_OVERRIDES) {
    if (override.keywords.some(keyword => haystack.includes(keyword))) {
      return override.query;
    }
  }

  return null;
}

function getThemeEnrichments(prediction: PredictionContext): string[] {
  const haystack = buildTextHaystack(prediction);
  const enrichments = new Set<string>();

  for (const rule of THEME_RULES) {
    if (rule.pattern.test(haystack)) {
      enrichments.add(rule.enrichment);
    }
  }

  return Array.from(enrichments);
}

function detectYear(prediction: PredictionContext): string | null {
  const sources = [
    prediction.title,
    prediction.description,
    prediction.entry_deadline
  ].filter(Boolean) as string[];

  for (const source of sources) {
    const match = source.match(/20\d{2}/);
    if (match) {
      return match[0];
    }
  }

  return null;
}

function addKeywords(target: Set<string>, words: string[] = []) {
  for (const word of words) {
    if (!word) continue;
    if (word.length <= 2 && !/^\d+$/.test(word)) continue; // skip tiny words unless numeric (years)
    target.add(word);
  }
}

export function buildImageQuery(prediction: PredictionContext): string {
  // 1. Check entity overrides first (celebrity names, specific entities)
  const override = matchEntityOverride(prediction);
  if (override) {
    return override;
  }

  const keywordSet = new Set<string>();
  
  // 2. Extract keywords from title (most important)
  addKeywords(keywordSet, extractKeywords(prediction.title, 5));
  
  // 3. Add description keywords
  addKeywords(keywordSet, extractKeywords(prediction.description, 3));
  
  // 4. Add tags
  addKeywords(keywordSet, prediction.tags ?? []);
  
  // 5. Add option labels (can contain useful context)
  addKeywords(
    keywordSet,
    prediction.options
      ?.map(opt => extractKeywords(opt?.label ?? '', 2))
      .flat()
      .filter(Boolean) ?? []
  );

  // 6. Add year if detected
  const year = detectYear(prediction);
  if (year) {
    keywordSet.add(year);
  }

  // 7. Get theme enrichments (celebrity, comparison, etc.)
  const themeEnrichments = getThemeEnrichments(prediction);
  themeEnrichments.forEach(phrase => addKeywords(keywordSet, phrase.split(' ')));

  // 8. Add category context (but prioritize theme enrichments)
  if (prediction.category) {
    const normalizedCategory = prediction.category.replace('_', ' ').toLowerCase();
    
    // For "custom" category, rely more on theme enrichments and title keywords
    if (normalizedCategory === 'custom') {
      // Only add category if we don't have enough keywords from theme/title
      if (keywordSet.size < 3) {
        keywordSet.add('comparison question');
      }
    } else {
      keywordSet.add(normalizedCategory);
      const categoryQuery = CATEGORY_QUERIES[normalizedCategory];
      if (categoryQuery) {
        addKeywords(keywordSet, categoryQuery.split(' '));
      }
    }
  }

  const keywords = Array.from(keywordSet).slice(0, MAX_KEYWORDS);

  // 9. Return query if we have enough keywords
  if (keywords.length >= 2) {
    return keywords.join(' ');
  }

  // 10. Fallback to category query
  const fallbackCategory = prediction.category
    ? CATEGORY_QUERIES[prediction.category.toLowerCase()] ?? prediction.category.toLowerCase()
    : null;

  if (fallbackCategory) {
    return fallbackCategory;
  }

  // 11. Final fallback
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
