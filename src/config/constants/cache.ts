export const CACHE_KEYS = {
  userSession: (userId: string) => `user:session:${userId}`,
  studioStorefront: (slug: string) => `studio:storefront:${slug}`,
  rateLimit: (key: string) => `ratelimit:${key}`,
} as const;

export const CACHE_TTLS = {
  USER_SESSION: 15 * 60, // 15 minutes
  STOREFRONT: 60 * 60, // 1 hour
} as const;
