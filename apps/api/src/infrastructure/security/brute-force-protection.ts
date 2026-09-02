import { AppError } from '../../middleware/errorHandler.js';
import { StructuredLogger } from '../observability/logger.js';

interface FailedAttemptRecord {
  count: number;
  lockoutUntil?: number;
}

export class BruteForceProtection {
  private static failedLogins = new Map<string, FailedAttemptRecord>();
  private static MAX_ATTEMPTS = 5;
  private static LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Checks if an identity (email or IP) is locked out.
   */
  static verifyLockout(identifier: string): void {
    const record = this.failedLogins.get(identifier.toLowerCase());
    if (!record) return;

    if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
      const remainingMinutes = Math.ceil((record.lockoutUntil - Date.now()) / 60000);
      StructuredLogger.warn(`Blocked brute-force login attempt for locked account: ${identifier}`, {
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
      this.failedLogins.delete(identifier.toLowerCase());
    }
  }

  /**
   * Records a failed login attempt and applies lockout if threshold exceeded.
   */
  static recordFailure(identifier: string): void {
    const key = identifier.toLowerCase();
    const record = this.failedLogins.get(key) || { count: 0 };
    record.count += 1;

    if (record.count >= this.MAX_ATTEMPTS) {
      record.lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      StructuredLogger.warn(`Account lockout triggered for: ${identifier} (${record.count} failed attempts)`, {
        service: 'careerforge-api',
        metadata: { identifier, lockoutDurationMs: this.LOCKOUT_DURATION_MS },
      });
    }

    this.failedLogins.set(key, record);
  }

  /**
   * Resets failed attempts after successful login.
   */
  static recordSuccess(identifier: string): void {
    this.failedLogins.delete(identifier.toLowerCase());
  }
}
