import { ISyncCache } from './i-sync-cache.contract';

type CacheEntry<T> = {
  value: T;
  expiry: number; // timestamp in milliseconds
};

export abstract class BaseLocalCache<T> implements ISyncCache<T> {
  private readonly cache: Map<string, CacheEntry<T>> = new Map();

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Stores a value in the cache with an optional TTL.
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlSeconds - The time-to-live for the cache entry in seconds, defaults to 1 hour
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const expiry = ttlSeconds
      ? Date.now() + ttlSeconds * 1000
      : Date.now() + 1000 * 60 * 60; // default 1 hour
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
