import IORedis from 'ioredis';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

// ── Cache key builders ────────────────────────────────────────────
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userByPhone: (phone: string) => `user:phone:${phone}`,
  course: (id: string) => `course:${id}`,
  courseBySlug: (slug: string) => `course:slug:${slug}`,
  coursesList: (params: string) => `courses:list:${params}`,
  categories: () => `categories:all`,
  adminStats: () => `admin:dashboard:stats`,
  session: (token: string) => `session:${token}`,
  refreshTokenRevoked: (token: string) => `rt:revoked:${token}`,
  rateLimitKey: (prefix: string, key: string) => `rl:${prefix}:${key}`,
  fawryStatus: (ref: string) => `fawry:status:${ref}`,
  enrollmentAccess: (userId: string, courseId: string) => `access:${userId}:${courseId}`,
  lock: (resource: string) => `lock:${resource}`,
  analyticsOverview: () => `analytics:overview`,
} as const;

// ── TTL constants (seconds) ───────────────────────────────────────
export const TTL = {
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 3600,         // 1 hour
  DAY: 86400,         // 1 day
  WEEK: 604800,       // 1 week
  SESSION: 604800,    // 7 days
  LOCK: 30,           // 30 seconds
} as const;

// ── Distributed lock ──────────────────────────────────────────────
const LOCK_RETRY_DELAY = 100; // ms
const LOCK_MAX_RETRIES = 50;

export async function acquireLock(
  resource: string,
  ttlSeconds = TTL.LOCK,
  maxRetries = LOCK_MAX_RETRIES,
): Promise<string | null> {
  const lockKey = CacheKeys.lock(resource);
  const lockValue = `${process.pid}:${Date.now()}:${Math.random()}`;

  for (let i = 0; i < maxRetries; i++) {
    const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
    if (result === 'OK') return lockValue;

    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, LOCK_RETRY_DELAY + Math.random() * 50));
    }
  }

  logger.warn({ resource }, 'Failed to acquire distributed lock');
  return null;
}

export async function releaseLock(resource: string, lockValue: string): Promise<void> {
  const lockKey = CacheKeys.lock(resource);
  // Lua script ensures atomic check-and-delete (prevents releasing another owner's lock)
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  await (redis as any).eval(script, 1, lockKey, lockValue);
}

export async function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  ttlSeconds = TTL.LOCK,
): Promise<T> {
  const lockValue = await acquireLock(resource, ttlSeconds);
  if (!lockValue) throw new Error(`Could not acquire lock on ${resource}`);

  try {
    return await fn();
  } finally {
    await releaseLock(resource, lockValue);
  }
}

// ── Cache with automatic invalidation ────────────────────────────

export class CacheManager {
  constructor(private readonly client: IORedis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.client.get(key);
      if (!val) return null;
      return JSON.parse(val) as T;
    } catch (err) {
      logger.warn({ key, err }, 'Cache get failed');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      logger.warn({ key, err }, 'Cache set failed');
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!keys.length) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      logger.warn({ keys, err }, 'Cache del failed');
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (!keys.length) return 0;
      await this.client.del(...keys);
      return keys.length;
    } catch (err) {
      logger.warn({ pattern, err }, 'Cache invalidate pattern failed');
      return 0;
    }
  }

  async wrap<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = TTL.MEDIUM): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttlSeconds);
    }
    return value;
  }

  // Memoize with automatic background refresh
  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = TTL.MEDIUM,
    staleSeconds = TTL.SHORT,
  ): Promise<T> {
    const staleKey = `stale:${key}`;
    const cached = await this.get<T>(key);

    if (cached !== null) {
      // Check if stale marker exists
      const isStale = !(await this.client.exists(staleKey));
      if (isStale) {
        // Background revalidation
        this.set(staleKey, 1, staleSeconds).catch(() => {});
        fetcher().then((v) => this.set(key, v, ttlSeconds)).catch((err) =>
          logger.warn({ key, err }, 'Background cache revalidation failed'),
        );
      }
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlSeconds);
    await this.set(staleKey, 1, staleSeconds);
    return value;
  }

  // Pipeline multiple gets
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!keys.length) return [];
    const values = await this.client.mget(...keys);
    return values.map((v) => {
      if (!v) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return null;
      }
    });
  }

  // Atomic increment with TTL (for rate limiting counters)
  async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    const pipeline = this.client.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const results = await pipeline.exec();
    return (results?.[0]?.[1] as number) ?? 0;
  }
}

export const cacheManager = new CacheManager(redis);

// ── Session cache ─────────────────────────────────────────────────
export const sessionCache = {
  async set(token: string, data: { userId: string; role: string; phone: string }): Promise<void> {
    await cacheManager.set(CacheKeys.session(token), data, TTL.SESSION);
  },

  async get(token: string): Promise<{ userId: string; role: string; phone: string } | null> {
    return cacheManager.get(CacheKeys.session(token));
  },

  async del(token: string): Promise<void> {
    await cacheManager.del(CacheKeys.session(token));
  },
};

// ── Enrollment access cache ────────────────────────────────────────
export const accessCache = {
  async set(userId: string, courseId: string, hasAccess: boolean): Promise<void> {
    await cacheManager.set(CacheKeys.enrollmentAccess(userId, courseId), hasAccess, TTL.MEDIUM);
  },

  async get(userId: string, courseId: string): Promise<boolean | null> {
    return cacheManager.get<boolean>(CacheKeys.enrollmentAccess(userId, courseId));
  },

  async invalidate(userId: string, courseId: string): Promise<void> {
    await cacheManager.del(CacheKeys.enrollmentAccess(userId, courseId));
  },
};
