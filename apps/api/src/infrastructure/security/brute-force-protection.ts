import { AppError } from '../../middleware/errorHandler.js';
import { StructuredLogger } from '../observability/logger.js';
import { getRedisClient, isRedisAvailable } from '../redis/redis.client.js';

interface FailedAttemptRecord {
  count: number;
  lockoutUntil?: number;
}

export class BruteForceProtection {
  private static failedLogins = new Map<string, FailedAttemptRecord>();
  private static MAX_ATTEMPTS = 5;
  private static LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private static LOCKOUT_DURATION_SEC = 15 * 60;

  /**
   * Checks if an identity (email or IP) is locked out.
   */
  static async verifyLockout(identifier: string): Promise<void> {
    const key = identifier.toLowerCase();
    const redis = getRedisClient();

    if (redis && isRedisAvailable()) {
      try {
        const lockoutKey = `auth:lockout:${key}`;
        const isLocked = await redis.get(lockoutKey);

        if (isLocked) {
          const ttl = await redis.ttl(lockoutKey);
          const remainingMinutes = Math.max(1, Math.ceil(ttl / 60));

          StructuredLogger.warn(`Blocked brute-force login attempt for locked account (Redis): ${identifier}`, {
            service: 'careerforge-api',
            metadata: { identifier, remainingMinutes },
          });

          throw new AppError(
            `Account temporarily locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`,
            429,
            'ACCOUNT_LOCKED'
          );
        }
        return;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        StructuredLogger.warn(`[BruteForceProtection] Redis check error: ${err.message}. Falling back to in-memory check.`, {
          service: 'careerforge-api',
        });
      }
    }

    // In-memory fallback
    const record = this.failedLogins.get(key);
    if (!record) return;

    if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
      const remainingMinutes = Math.ceil((record.lockoutUntil - Date.now()) / 60000);
      StructuredLogger.warn(`Blocked brute-force login attempt for locked account (InMemory): ${identifier}`, {
        service: 'careerforge-api',
        metadata: { identifier, remainingMinutes },
      });

      throw new AppError(
        `Account temporarily locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`,
        429,
        'ACCOUNT_LOCKED'
      );
    }

    // Reset if lockout period expired
    if (record.lockoutUntil && Date.now() >= record.lockoutUntil) {
      this.failedLogins.delete(key);
    }
  }

  /**
   * Records a failed login attempt and applies lockout if threshold exceeded.
   */
  static async recordFailure(identifier: string): Promise<void> {
    const key = identifier.toLowerCase();
    const redis = getRedisClient();

    if (redis && isRedisAvailable()) {
      try {
        const attemptsKey = `auth:attempts:${key}`;
        const count = await redis.incr(attemptsKey);

        if (count === 1) {
          await redis.expire(attemptsKey, this.LOCKOUT_DURATION_SEC);
        }

        if (count >= this.MAX_ATTEMPTS) {
          const lockoutKey = `auth:lockout:${key}`;
          await redis.set(lockoutKey, '1', 'EX', this.LOCKOUT_DURATION_SEC);
          StructuredLogger.warn(`Account lockout triggered in Redis for: ${identifier} (${count} failed attempts)`, {
            service: 'careerforge-api',
            metadata: { identifier, lockoutDurationMs: this.LOCKOUT_DURATION_MS },
          });
        }
        return;
      } catch (err: any) {
        StructuredLogger.warn(`[BruteForceProtection] Redis record error: ${err.message}. Falling back to in-memory storage.`, {
          service: 'careerforge-api',
        });
      }
    }

    // In-memory fallback
    const record = this.failedLogins.get(key) || { count: 0 };
    record.count += 1;

    if (record.count >= this.MAX_ATTEMPTS) {
      record.lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      StructuredLogger.warn(`Account lockout triggered in memory for: ${identifier} (${record.count} failed attempts)`, {
        service: 'careerforge-api',
        metadata: { identifier, lockoutDurationMs: this.LOCKOUT_DURATION_MS },
      });
    }

    this.failedLogins.set(key, record);
  }

  /**
   * Resets failed attempts after successful login.
   */
  static async recordSuccess(identifier: string): Promise<void> {
    const key = identifier.toLowerCase();
    const redis = getRedisClient();

    if (redis && isRedisAvailable()) {
      try {
        await redis.del(`auth:attempts:${key}`, `auth:lockout:${key}`);
      } catch (err: any) {
        StructuredLogger.warn(`[BruteForceProtection] Redis reset error: ${err.message}`, {
          service: 'careerforge-api',
        });
      }
    }

    this.failedLogins.delete(key);
  }

  /**
   * Clears internal state (for testing).
   */
  static reset(): void {
    this.failedLogins.clear();
  }
}
