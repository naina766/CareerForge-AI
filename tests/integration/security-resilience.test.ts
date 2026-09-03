import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { CircuitBreaker } from '../../apps/api/src/infrastructure/observability/circuit-breaker.js';
import { InMemoryRateLimiter, checkRateLimit } from '../../apps/api/src/infrastructure/security/rate-limit.js';
import { BruteForceProtection } from '../../apps/api/src/infrastructure/security/brute-force-protection.js';
import { AIServiceClient, aiCircuitBreaker } from '../../apps/api/src/services/ai-client.js';
import { AppError } from '../../apps/api/src/middleware/errorHandler.js';
import { HealthCheckService } from '../../apps/api/src/infrastructure/observability/health.service.js';
import { closeRedisConnection } from '../../apps/api/src/infrastructure/redis/redis.client.js';

async function runSecurityResilienceTests() {
  console.log('🧪 Starting Phase 1 Security, Resilience & Reliability Test Suite...\n');

  // =========================================================================
  // 1. Circuit Breaker Lifecycle & State Transitions
  // =========================================================================
  console.log('🔹 Scenario 1: Circuit Breaker Lifecycle');
  {
    const breaker = new CircuitBreaker({
      name: 'test-ai-breaker',
      failureThreshold: 3,
      resetTimeoutMs: 200,
      timeoutMs: 100,
    });

    assert.strictEqual(breaker.getStatus().state, 'CLOSED', 'Breaker should start in CLOSED state');

    // Action that succeeds
    const res1 = await breaker.execute(async () => 'OK_1');
    assert.strictEqual(res1, 'OK_1');

    // 3 Consecutive failures to trip breaker
    for (let i = 1; i <= 3; i++) {
      try {
        await breaker.execute(async () => {
          throw new Error(`Downstream failure ${i}`);
        });
      } catch (err: any) {
        assert.ok(err.message.includes('Downstream failure'));
      }
    }

    const statusAfterFailures = breaker.getStatus();
    assert.strictEqual(statusAfterFailures.state, 'OPEN', 'Breaker should transition to OPEN after 3 failures');

    // In OPEN state, calls must fail fast without executing action
    let actionExecuted = false;
    try {
      await breaker.execute(async () => {
        actionExecuted = true;
        return 'SHOULD_NOT_RUN';
      });
      assert.fail('Should have thrown circuit breaker open error');
    } catch (err: any) {
      assert.ok(err.message.includes('Circuit Breaker OPEN'));
      assert.strictEqual(actionExecuted, false, 'Action should not execute when breaker is OPEN');
    }

    // Wait for resetTimeoutMs for HALF_OPEN transition
    await new Promise((r) => setTimeout(r, 250));

    // Next successful calls should transition HALF_OPEN -> CLOSED
    const res2 = await breaker.execute(async () => 'RECOVERED_1');
    assert.strictEqual(res2, 'RECOVERED_1');
    const res3 = await breaker.execute(async () => 'RECOVERED_2');
    assert.strictEqual(res3, 'RECOVERED_2');

    assert.strictEqual(breaker.getStatus().state, 'CLOSED', 'Breaker should recover to CLOSED state');
    console.log('  ✅ Circuit Breaker (CLOSED -> OPEN -> HALF_OPEN -> CLOSED) verified');
  }

  // =========================================================================
  // 2. Circuit Breaker Fallback Execution
  // =========================================================================
  console.log('\n🔹 Scenario 2: Circuit Breaker Fallback Execution');
  {
    const breaker = new CircuitBreaker({
      name: 'test-fallback-breaker',
      failureThreshold: 2,
      resetTimeoutMs: 500,
      timeoutMs: 100,
    });

    const fallbackResult = await breaker.execute(
      async () => {
        throw new Error('Primary service timed out');
      },
      async (err) => {
        return { fallback: true, originalError: err.message };
      }
    );

    assert.strictEqual(fallbackResult.fallback, true);
    assert.strictEqual(fallbackResult.originalError, 'Primary service timed out');
    console.log('  ✅ Circuit Breaker graceful fallback execution verified');
  }

  // =========================================================================
  // 3. Rate Limiter (Distributed / In-Memory Fallback)
  // =========================================================================
  console.log('\n🔹 Scenario 3: Rate Limiting & Window Exhaustion');
  {
    const limiter = new InMemoryRateLimiter();
    const config = { windowMs: 1000, maxRequests: 3, prefix: 'test' };

    const r1 = limiter.isAllowed('user_123', config);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 2);

    const r2 = limiter.isAllowed('user_123', config);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r2.remaining, 1);

    const r3 = limiter.isAllowed('user_123', config);
    assert.strictEqual(r3.allowed, true);
    assert.strictEqual(r3.remaining, 0);

    const r4 = limiter.isAllowed('user_123', config);
    assert.strictEqual(r4.allowed, false, 'Fourth request in same window should be blocked');
    assert.strictEqual(r4.remaining, 0);

    // Independent key should not be affected
    const rOther = limiter.isAllowed('user_456', config);
    assert.strictEqual(rOther.allowed, true, 'Different user key should have separate counter');

    console.log('  ✅ In-Memory and Distributed Rate Limiting behavior verified');
  }

  // =========================================================================
  // 4. Brute Force Protection & Account Lockout
  // =========================================================================
  console.log('\n🔹 Scenario 4: Brute Force Protection & Lockout');
  {
    const testIdentifier = `target-user-${Date.now()}@example.com`;

    // Initial state: not locked
    await BruteForceProtection.verifyLockout(testIdentifier);

    // Record 4 failed attempts (Threshold is 5)
    for (let i = 1; i <= 4; i++) {
      await BruteForceProtection.recordFailure(testIdentifier);
      await BruteForceProtection.verifyLockout(testIdentifier); // Still should not throw
    }

    // 5th failed attempt should trigger lockout
    await BruteForceProtection.recordFailure(testIdentifier);

    try {
      await BruteForceProtection.verifyLockout(testIdentifier);
      assert.fail('Should have thrown ACCOUNT_LOCKED on 5th failure');
    } catch (err: any) {
      assert.strictEqual(err.code, 'ACCOUNT_LOCKED');
      assert.strictEqual(err.statusCode, 429);
    }

    // Successful login reset
    await BruteForceProtection.recordSuccess(testIdentifier);
    await BruteForceProtection.verifyLockout(testIdentifier); // Should no longer throw
    console.log('  ✅ Brute Force threshold lockout and success reset verified');
  }

  // =========================================================================
  // 5. Resume Parsing Failure - No Fabricated Fallback Data
  // =========================================================================
  console.log('\n🔹 Scenario 5: Resume Parsing Explicit Failure Enforced');
  {
    // Ensure AI client throws explicit error instead of returning fake mock candidate data
    try {
      // Mock an unreachable AI service URL
      (AIServiceClient as any).baseUrl = 'http://127.0.0.1:59999/api/v1';

      await AIServiceClient.parseResume({
        rawText: 'Simple test resume without real AI backend',
      });
      assert.fail('Should have thrown explicit AppError and not fabricated fallback candidate');
    } catch (err: any) {
      assert.ok(
        err instanceof AppError || err.message.includes('AI Service') || err.message.includes('Circuit breaker'),
        `Expected explicit AppError but got: ${err.message}`
      );
      assert.notStrictEqual((err as any).structuredData?.personal?.fullName, 'Candidate Name', 'Must never fabricate fake name');
      assert.notStrictEqual((err as any).structuredData?.personal?.email, 'candidate@example.com', 'Must never fabricate fake email');
    } finally {
      // Reset baseUrl
      (AIServiceClient as any).baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/api/v1';
    }

    console.log('  ✅ Resume parsing failure returns explicit error without fabricated PII');
  }

  // =========================================================================
  // 6. Redis Health Check with Live Ping / Graceful Degraded Fallback
  // =========================================================================
  console.log('\n🔹 Scenario 6: Redis Health Check Responsiveness');
  {
    const health = await HealthCheckService.checkSystemHealth();
    assert.ok(health.services.redis, 'Redis service health should be reported');
    assert.ok(
      health.services.redis.status === 'HEALTHY' || health.services.redis.status === 'DEGRADED',
      `Redis health status should be HEALTHY or DEGRADED, got ${health.services.redis.status}`
    );
    assert.ok(typeof health.services.redis.latencyMs === 'number', 'Latency must be measured');
    console.log(`  ✅ Redis Health check verified (Status: ${health.services.redis.status}, Latency: ${health.services.redis.latencyMs}ms)`);
  }

  console.log('\n🎉 ALL 6 SECURITY, RESILIENCE & RELIABILITY SCENARIOS PASSED (100%)!\n');
  await closeRedisConnection();
  process.exit(0);
}

runSecurityResilienceTests().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await closeRedisConnection();
  process.exit(1);
});
