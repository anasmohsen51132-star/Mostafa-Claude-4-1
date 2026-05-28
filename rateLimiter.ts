import rateLimit from 'express-rate-limit';
import { redis } from '@/lib/redis';
import { config } from '@/config/env';
import { Request, Response } from 'express';

// Redis store for rate limiting (distributed)
const createRedisStore = (prefix: string) => ({
  async increment(key: string) {
    const redisKey = `${prefix}:${key}`;
    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.expire(redisKey, Math.ceil(config.rateLimit.windowMs / 1000));
    }
    const ttl = await redis.ttl(redisKey);
    return {
      totalHits: current,
      resetTime: new Date(Date.now() + ttl * 1000),
    };
  },
  async decrement(key: string) {
    await redis.decr(`${prefix}:${key}`);
  },
  async resetKey(key: string) {
    await redis.del(`${prefix}:${key}`);
  },
});

const keyGenerator = (req: Request) => {
  // Use user ID if authenticated, otherwise IP
  return req.user?.id || req.ip || 'unknown';
};

export const rateLimiter = {
  global: rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
      });
    },
  }),

  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => req.ip || 'unknown',
    skipSuccessfulRequests: true,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts, please try again in 15 minutes',
        },
      });
    },
  }),

  payment: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // max 20 payment attempts per hour
    keyGenerator,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'PAYMENT_RATE_LIMIT',
          message: 'Too many payment attempts',
        },
      });
    },
  }),

  upload: rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 50,
    keyGenerator,
  }),
};
