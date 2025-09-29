export interface StockImage {
  url: string;              // full resolution image URL
  previewUrl: string;       // small/LQIP URL
  width: number;
  height: number;
  photographer?: string;
  provider: 'pexels' | 'unsplash';
  sourceUrl?: string;       // link to original (for optional attribution)
}

export interface ImageQuery {
  query: string;
  seed: string;
  take: number;
  provider: 'pexels' | 'unsplash';
}

export interface ImageProvider {
  search(query: string, options: {
    orientation?: 'landscape' | 'portrait' | 'square';
    perPage?: number;
    safeSearch?: boolean;
  }): Promise<StockImage[]>;
}

export interface CachedImageResult {
  images: StockImage[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}
