import { CircuitBreakerState, CircuitBreakerStatus } from '@careerforge/types';
import { logger } from '../../utils/logger.js';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;     // Number of failures before opening (default: 5)
  resetTimeoutMs?: number;       // Time in ms before attempting HALF_OPEN (default: 10000ms)
  timeoutMs?: number;            // Execution timeout in ms (default: 5000ms)
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastStateChange = Date.now();

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly timeoutMs: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 10000;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  /**
   * Executes a command through the circuit breaker with timeout and fallback support.
   */
  async execute<T>(
    action: () => Promise<T>,
    fallback?: (error: Error) => Promise<T> | T
  ): Promise<T> {
    this.checkState();

    if (this.state === 'OPEN') {
      logger.warn(`[CircuitBreaker:${this.name}] Request blocked by OPEN circuit breaker`);
      if (fallback) {
        return await fallback(new Error(`Circuit breaker '${this.name}' is OPEN`));
      }
      throw new Error(`Service '${this.name}' is temporarily unavailable (Circuit Breaker OPEN)`);
    }

    try {
      // Execute with timeout
      const result = await Promise.race([
        action(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Operation timed out after ${this.timeoutMs}ms`)),
            this.timeoutMs
          )
        ),
      ]);

      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      if (fallback) {
        logger.info(`[CircuitBreaker:${this.name}] Executing graceful fallback after error: ${err.message}`);
        return await fallback(err);
      }
      throw err;
    }
  }

  private checkState(): void {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(err: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`[CircuitBreaker:${this.name}] Failure ${this.failureCount}/${this.failureThreshold}: ${err.message}`);

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
    } else if (newState === 'HALF_OPEN') {
      this.successCount = 0;
    }

    logger.warn(`[CircuitBreaker:${this.name}] State transition: ${oldState} -> ${newState}`);
  }

  /**
   * Returns current status snapshot.
   */
  getStatus(): CircuitBreakerStatus {
    this.checkState();
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : undefined,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
    };
  }

  /**
   * Resets breaker to CLOSED state.
   */
  reset(): void {
    this.transitionTo('CLOSED');
  }

  /**
   * Forcefully trips breaker to OPEN state.
   */
  trip(): void {
    this.transitionTo('OPEN');
  }
}
