import type { CacheItem, CacheStore } from "../../types/cache";

/**
 * RedisCache implementation stub for multi-node deployments.
 *
 * TODO: To wire Redis for production:
 * 1. Install Redis package: `npm install ioredis`
 * 2. Configure connection parameters (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD) in env variables.
 * 3. Replace the internal Map storage below with connection client commands:
 *    - `get`: `client.get(key)` (JSON parse retrieved string)
 *    - `set`: `client.setex(key, ttlSeconds, JSON.stringify(value))`
 *    - `delete`: `client.del(key)` (or handle pattern scan + del for keys ending in *)
 *    - `exists`: `client.exists(key)`
 *    - `flush`: `client.flushdb()`
 */
export function createRedisStore(): CacheStore {
  // Functional stub using in-memory storage for test capability.
  const store = new Map<string, CacheItem>();

  return {
    get: async <T>(key: string): Promise<T | null> => {
      const item = store.get(key);
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        store.delete(key);
        return null;
      }
      return item.value as T;
    },
    set: async <T>(
      key: string,
      value: T,
      ttlSeconds: number,
    ): Promise<void> => {
      const expiresAt = Date.now() + ttlSeconds * 1000;
      store.set(key, { value, expiresAt });
    },
    delete: async (key: string): Promise<void> => {
      if (key.endsWith("*")) {
        const prefix = key.slice(0, -1);
        for (const k of store.keys()) {
          if (k.startsWith(prefix)) {
            store.delete(k);
          }
        }
      } else {
        store.delete(key);
      }
    },
    exists: async (key: string): Promise<boolean> => {
      const item = store.get(key);
      if (!item) return false;
      if (Date.now() > item.expiresAt) {
        store.delete(key);
        return false;
      }
      return true;
    },
    flush: async (): Promise<void> => {
      store.clear();
    },
  };
}
