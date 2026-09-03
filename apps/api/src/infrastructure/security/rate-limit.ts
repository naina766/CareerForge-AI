import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler.js';
import { StructuredLogger } from '../observability/logger.js';
import { getRedisClient, isRedisAvailable } from '../redis/redis.client.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  prefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>();

  isAllowed(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetAt) {
      this.requests.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
    }

    if (entry.count >= config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetAt };
    }

    entry.count += 1;
    return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetAt };
  }

  reset(): void {
    this.requests.clear();
  }
}

export const fallbackLimiter = new InMemoryRateLimiter();

/**
 * Checks rate limit using Redis distributed counter with fallback to in-memory store.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis && isRedisAvailable()) {
    try {
      const redisKey = `ratelimit:${config.prefix || 'api'}:${key}`;
      const count = await redis.incr(redisKey);

      if (count === 1) {
        // First request in window, set TTL
        await redis.pexpire(redisKey, config.windowMs);
      }

      let ttl = await redis.pttl(redisKey);
      if (ttl < 0) {
        // Key didn't have TTL set (e.g. edge case failover)
        await redis.pexpire(redisKey, config.windowMs);
        ttl = config.windowMs;
      }

      const resetTime = Date.now() + ttl;
      const remaining = Math.max(0, config.maxRequests - count);
      const allowed = count <= config.maxRequests;

      return { allowed, remaining, resetTime };
    } catch (err: any) {
      StructuredLogger.warn(`[RateLimiter] Redis rate limiting error: ${err.message}. Falling back to in-memory limiter.`, {
        service: 'careerforge-api',
      });
    }
  }

  // Graceful fallback to in-memory rate limiter
  return fallbackLimiter.isAllowed(key, config);
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown_client';
    const key = `${req.path}:${ip}`;

    try {
      const { allowed, remaining, resetTime } = await checkRateLimit(key as string, config);

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));

      if (!allowed) {
        StructuredLogger.warn(`Rate limit exceeded for client ${ip} on route ${req.path}`, {
          service: 'careerforge-api',
          route: req.path,
          metadata: { ip, limit: config.maxRequests },
        });

        return next(
          new AppError(
            config.message || 'Too many requests. Please slow down and try again later.',
            429,
            'RATE_LIMIT_EXCEEDED'
          )
        );
      }

      next();
    } catch (error) {
      // Never crash user requests due to rate limiter middleware failure
      next();
    }
  };
}

export const rateLimiters = {
  auth: createRateLimiter({ prefix: 'auth', windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many authentication attempts.' }),
  assistant: createRateLimiter({ prefix: 'assistant', windowMs: 60 * 1000, maxRequests: 40, message: 'Career assistant rate limit reached.' }),
  recommendations: createRateLimiter({ prefix: 'rec', windowMs: 60 * 1000, maxRequests: 60, message: 'Recommendation query limit reached.' }),
  upload: createRateLimiter({ prefix: 'upload', windowMs: 10 * 60 * 1000, maxRequests: 15, message: 'Resume upload limit reached.' }),
  general: createRateLimiter({ prefix: 'gen', windowMs: 15 * 60 * 1000, maxRequests: 500 }),
  admin: createRateLimiter({ prefix: 'admin', windowMs: 60 * 1000, maxRequests: 150 }),
};
