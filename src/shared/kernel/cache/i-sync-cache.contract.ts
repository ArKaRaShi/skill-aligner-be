export interface ISyncCache<T> {
  /**
   * Retrieves a value from the cache.
   * @param key - The key of the entry to retrieve.
   * @returns The cached value or null if not found.
   */
  get(key: string): T | null;

  /**
   * Sets a value in the cache.
   * @param key - The key of the entry to set.
   * @param value - The value to store in the cache.
   * @param ttlSeconds - The time-to-live for the cache entry, in seconds.
   */
  set(key: string, value: T, ttlSeconds?: number): void;

  /**
   * Deletes a specific entry from the cache.
   * @param key - The key of the entry to delete.
   */
  delete(key: string): void;

  /**
   * Clears all entries in the cache.
   */
  clear(): void;
}
