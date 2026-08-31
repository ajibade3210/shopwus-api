import type { CacheItem, CacheStore } from "../../types/cache";

/**
 * Creates an in-memory, concurrent-safe CacheStore.
 */
export function createInMemoryStore(): CacheStore {
  const store = new Map<string, CacheItem>();

  // Prune expired entries periodically to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, item] of store.entries()) {
      if (item.expiresAt < now) {
        store.delete(key);
      }
    }
  }, 60 * 1000);

  if (interval.unref) {
    interval.unref();
  }

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
