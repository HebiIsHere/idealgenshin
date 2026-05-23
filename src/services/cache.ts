/**
 * CacheService — localStorage-based TTL cache.
 * Used for caching Enka API data and optimization results.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/** Default TTL: 1 hour in milliseconds. */
const DEFAULT_TTL = 3600 * 1000;

export class CacheService {
  /**
   * Get a cached value by key.
   * @param key - Cache key
   * @returns Cached value or null if expired/missing
   */
  static get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // Check expiry
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.value;
    } catch {
      return null;
    }
  }

  /**
   * Set a cached value with TTL.
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time-to-live in milliseconds (default: 1 hour)
   */
  static set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL): void {
    try {
      const entry: CacheEntry<T> = {
        value,
        expiry: Date.now() + ttlMs,
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage may be full or unavailable; silently ignore
    }
  }

  /**
   * Remove a cached value.
   * @param key - Cache key to remove
   */
  static clear(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently ignore
    }
  }

  /**
   * Clear all cache entries matching a prefix.
   * @param prefix - Key prefix to match
   */
  static clearByPrefix(prefix: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Silently ignore
    }
  }

  /**
   * Check if a key exists and is not expired.
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  static has(key: string): boolean {
    return CacheService.get(key) !== null;
  }

  /**
   * Get remaining TTL for a cache key.
   * @param key - Cache key
   * @returns Remaining TTL in ms, or 0 if expired/missing
   */
  static getRemainingTTL(key: string): number {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return 0;

      const entry: CacheEntry<unknown> = JSON.parse(raw);
      const remaining = entry.expiry - Date.now();
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }
}
