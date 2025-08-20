/**
 * Enhanced Storage Utility for Fan Club Z
 * Handles localStorage with fallbacks and error handling
 */

interface StorageOptions {
  serialize?: boolean;
  fallback?: any;
  ttl?: number; // Time to live in milliseconds
}

class EnhancedStorage {
  private prefix = 'fanclubz_';

  /**
   * Set item with optional TTL and error handling
   */
  setItem<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const { serialize = true, ttl } = options;
      const prefixedKey = this.prefix + key;
      
      let dataToStore: any = value;
      
      // Add TTL if specified
      if (ttl) {
        dataToStore = {
          value,
          expiry: Date.now() + ttl
        };
      }
      
      const serializedValue = serialize ? JSON.stringify(dataToStore) : String(dataToStore);
      localStorage.setItem(prefixedKey, serializedValue);
      return true;
    } catch (error) {
      console.warn(`Failed to store ${key}:`, error);
      return false;
    }
  }

  /**
   * Get item with TTL check and fallback
   */
  getItem<T>(key: string, options: StorageOptions = {}): T | null {
    try {
      const { serialize = true, fallback = null } = options;
      const prefixedKey = this.prefix + key;
      const stored = localStorage.getItem(prefixedKey);
      
      if (!stored) return fallback;
      
      const parsed = serialize ? JSON.parse(stored) : stored;
      
      // Check TTL if present
      if (parsed && typeof parsed === 'object' && 'expiry' in parsed) {
        if (Date.now() > parsed.expiry) {
          this.removeItem(key);
          return fallback;
        }
        return parsed.value;
      }
      
      return parsed || fallback;
    } catch (error) {
      console.warn(`Failed to retrieve ${key}:`, error);
      return options.fallback || null;
    }
  }

  /**
   * Remove item
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all app data
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      let used = 0;
      for (const key in localStorage) {
        if (key.startsWith(this.prefix)) {
          used += localStorage[key].length;
        }
      }
      
      const available = 5 * 1024 * 1024; // 5MB typical limit
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch {
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const storage = new EnhancedStorage();

// Convenience functions for common use cases
export const persistNavigation = {
  save: (tab: string) => storage.setItem('current-tab', tab),
  load: () => storage.getItem<string>('current-tab', { fallback: 'discover' }),
  clear: () => storage.removeItem('current-tab')
};

export const persistSettings = {
  save: (settings: any) => storage.setItem('user-settings', settings),
  load: () => storage.getItem('user-settings', { fallback: {} }),
  clear: () => storage.removeItem('user-settings')
};

// Storage quota monitoring
export const monitorStorage = () => {
  const info = storage.getStorageInfo();
  if (info.percentage > 80) {
    console.warn('⚠️ Storage usage high:', `${info.percentage.toFixed(1)}%`);
  }
  return info;
};