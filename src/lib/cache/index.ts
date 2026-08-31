import { logger } from "../logger";
import { createInMemoryStore } from "./inMemoryStore";
import { createRedisStore } from "./redisStore";

export { createInMemoryStore, createRedisStore };

// To switch backends, change this single line:
export const cacheStore = createInMemoryStore();

// export const cacheStore = createRedisStore();

/**
 * Cache-aside helper: reads cache, on miss reads source, writes to cache, and returns.
 * Fallbacks gracefully to source on cache failures.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await cacheStore.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  } catch (error) {
    logger.warn({ error, key }, "Cache read failed, falling back to source");
  }

  const result = await fetchFn();

  try {
    await cacheStore.set(key, result, ttlSeconds);
  } catch (error) {
    logger.warn({ error, key }, "Cache write failed");
  }

  return result;
}
