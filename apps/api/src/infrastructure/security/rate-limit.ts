import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/errorHandler.js';
import { StructuredLogger } from '../observability/logger.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

class InMemoryRateLimiter {
  private requests = new Map<string, { count: number; resetAt: number }>();

  isAllowed(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
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
}

const fallbackLimiter = new InMemoryRateLimiter();

export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown_client';
    const key = `${req.path}:${ip}`;

    const { allowed, remaining, resetTime } = fallbackLimiter.isAllowed(key as string, config);

    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
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
  };
}

export const rateLimiters = {
  auth: createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many authentication attempts.' }),
  assistant: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 40, message: 'Career assistant rate limit reached.' }),
  recommendations: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 60, message: 'Recommendation query limit reached.' }),
  upload: createRateLimiter({ windowMs: 10 * 60 * 1000, maxRequests: 15, message: 'Resume upload limit reached.' }),
  general: createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 500 }),
  admin: createRateLimiter({ windowMs: 60 * 1000, maxRequests: 150 }),
};
