// Client-side image caching using IndexedDB and memory cache

export interface StockImage {
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  photographer?: string;
  provider: 'pexels' | 'unsplash';
  sourceUrl?: string;
}

export interface CachedImageEntry {
  predictionId: string;
  provider: string;
  seed: string;
  image: StockImage;
  timestamp: number;
}

class ImageCacheManager {
  private memoryCache = new Map<string, CachedImageEntry>();
  private dbName = 'auto-images';
  private storeName = 'images';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async initDB(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('predictionId', 'predictionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private generateKey(predictionId: string, provider: string, seed: string): string {
    return `${predictionId}@${provider}@${seed}`;
  }

  async get(predictionId: string, provider: string, seed: string): Promise<StockImage | null> {
    const key = this.generateKey(predictionId, provider, seed);

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      // Check if still fresh (1 hour)
      if (Date.now() - memoryEntry.timestamp < 60 * 60 * 1000) {
        return memoryEntry.image;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check IndexedDB
    try {
      await this.initDB();
      if (!this.db) return null;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          if (result && Date.now() - result.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
            // Update memory cache
            this.memoryCache.set(key, result);
            resolve(result.image);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Image cache get error:', error);
      return null;
    }
  }

  async set(predictionId: string, provider: string, seed: string, image: StockImage): Promise<void> {
    const key = this.generateKey(predictionId, provider, seed);
    const entry: CachedImageEntry = {
      predictionId,
      provider,
      seed,
      image,
      timestamp: Date.now()
    };

    // Update memory cache
    this.memoryCache.set(key, entry);

    // Update IndexedDB
    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put({ key, ...entry });

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('Image cache set error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.warn('Image cache set error:', error);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.warn('Image cache clear error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.warn('Image cache clear error:', error);
    }
  }

  // Clean up old entries (call periodically)
  async cleanup(): Promise<void> {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < cutoff) {
        this.memoryCache.delete(key);
      }
    }

    // Clean IndexedDB
    try {
      await this.initDB();
      if (!this.db) return;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('timestamp');
        const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          console.warn('Image cache cleanup error:', request.error);
          resolve();
        };
      });
    } catch (error) {
      console.warn('Image cache cleanup error:', error);
    }
  }
}

export const imageCache = new ImageCacheManager();

// Clean up cache periodically (every hour)
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageCache.cleanup();
  }, 60 * 60 * 1000);
}
