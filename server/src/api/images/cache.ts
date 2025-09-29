import { CachedImageResult, StockImage } from './types';

export class ImageCache {
  private cache = new Map<string, CachedImageResult>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  private generateKey(query: string, seed: string, provider: string): string {
    return `${provider}:${query}:${seed}`;
  }

  get(query: string, seed: string, provider: string): StockImage[] | null {
    const key = this.generateKey(query, seed, provider);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.images;
  }

  set(query: string, seed: string, provider: string, images: StockImage[], ttl?: number): void {
    const key = this.generateKey(query, seed, provider);
    
    this.cache.set(key, {
      images,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for debugging
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const imageCache = new ImageCache();

// Clean up expired entries every 10 minutes
setInterval(() => {
  imageCache.cleanup();
}, 10 * 60 * 1000);
