import IORedis from 'ioredis';
import { config } from '@/config/env';
import { logger } from '@/lib/logger';

const createRedisClient = (name = 'default') => {
  const client = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`Redis ${name}: max retries reached`);
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      if (targetErrors.some((e) => err.message.includes(e))) return true;
      return false;
    },
  });

  client.on('connect', () => logger.info(`Redis ${name}: connected`));
  client.on('ready', () => logger.info(`Redis ${name}: ready`));
  client.on('error', (err) => logger.error({ err }, `Redis ${name}: error`));
  client.on('close', () => logger.warn(`Redis ${name}: connection closed`));
  client.on('reconnecting', (time: number) =>
    logger.info({ delay: time }, `Redis ${name}: reconnecting`),
  );

  return client;
};

// Singleton for general use
declare global {
  var __redis: IORedis | undefined;
}

export const redis: IORedis = global.__redis ?? createRedisClient('main');

if (!config.isProd) {
  global.__redis = redis;
}

// Separate client for BullMQ (requires maxRetriesPerRequest: null)
export const createBullRedis = () => createRedisClient('bull');

// Cache utilities
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },

  async del(...keys: string[]): Promise<void> {
    if (keys.length > 0) await redis.del(...keys);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  },

  // Cache-aside wrapper
  async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 300,
  ): Promise<T> {
    const cached = await cache.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetcher();
    await cache.set(key, value, ttlSeconds);
    return value;
  },
};

export default redis;
