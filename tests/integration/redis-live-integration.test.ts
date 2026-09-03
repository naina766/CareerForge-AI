import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getRedisClient, isRedisAvailable, closeRedisConnection } from '../../apps/api/src/infrastructure/redis/redis.client.js';
import { checkRateLimit } from '../../apps/api/src/infrastructure/security/rate-limit.js';
import { BruteForceProtection } from '../../apps/api/src/infrastructure/security/brute-force-protection.js';
import { AppError } from '../../apps/api/src/middleware/errorHandler.js';

async function runLiveRedisSuite() {
  console.log('🧪 Starting Phase 2 Live Redis Integration & Fallback Suite...\n');

  const redis = getRedisClient();
  if (!redis) {
    console.log('⚠️ Live Redis is NOT available in this environment. Status: NOT VERIFIED');
    return;
  }

  // Wait for initial connection ready
  await new Promise((r) => setTimeout(r, 500));

  // =========================================================================
  // 1. Native Redis Operations: PING, SET, GET, TTL, INCR, DEL
  // =========================================================================
  console.log('🔹 Scenario 1: Native Redis Operations (PING, SET, GET, TTL, INCR, DEL)');
  try {
    const pong = await redis.ping();
    assert.strictEqual(pong, 'PONG', 'Redis should respond to PING with PONG');
    console.log('  ✅ PING: PONG');

    const testKey = 'cf:test:live_key_' + Date.now();
    await redis.set(testKey, 'live_redis_val', 'EX', 10);
    const val = await redis.get(testKey);
    assert.strictEqual(val, 'live_redis_val', 'Redis GET must return set value');
    console.log('  ✅ SET & GET: verified');

    const ttl = await redis.ttl(testKey);
    assert.ok(ttl > 0 && ttl <= 10, 'Redis TTL must reflect set expiration');
    console.log(`  ✅ TTL: ${ttl}s`);

    const counterKey = 'cf:test:counter_' + Date.now();
    const c1 = await redis.incr(counterKey);
    const c2 = await redis.incr(counterKey);
    assert.strictEqual(c1, 1);
    assert.strictEqual(c2, 2);
    console.log('  ✅ Atomic INCR: verified (1, 2)');

    // Cleanup
    await redis.del(testKey);
    await redis.del(counterKey);
    console.log('  ✅ Key cleanup: verified');
  } catch (err: any) {
    console.error('❌ Redis native operation failed:', err.message);
    throw err;
  }

  // =========================================================================
  // 2. Application Distributed Rate Limiting via Redis
  // =========================================================================
  console.log('\n🔹 Scenario 2: Application Distributed Rate Limiting via Redis');
  const userRateKey = 'cand_live_' + Date.now();
  const limitConfig = { windowMs: 2000, maxRequests: 3, keyPrefix: 'rl:test:live:' };

  const r1 = await checkRateLimit(userRateKey, limitConfig);
  const r2 = await checkRateLimit(userRateKey, limitConfig);
  const r3 = await checkRateLimit(userRateKey, limitConfig);
  const r4 = await checkRateLimit(userRateKey, limitConfig);

  assert.strictEqual(r1.allowed, true, 'Req 1 allowed');
  assert.strictEqual(r2.allowed, true, 'Req 2 allowed');
  assert.strictEqual(r3.allowed, true, 'Req 3 allowed');
  assert.strictEqual(r4.allowed, false, 'Req 4 must be blocked by rate limit');
  console.log('  ✅ Rate limiting enforced via live Redis (3 allowed, 4th blocked)');

  // Clean rate limit test key
  await redis.del(`rl:test:live:${userRateKey}`);

  // =========================================================================
  // 3. Brute Force Protection & Lockout via Redis
  // =========================================================================
  console.log('\n🔹 Scenario 3: Brute Force Protection & Lockout via Redis');
  const bfEmail = `attacker_${Date.now()}@example.com`;

  // First 4 failed attempts should not trigger lockout error
  for (let i = 1; i <= 4; i++) {
    await BruteForceProtection.recordFailure(bfEmail);
  }
  // verifyLockout should not throw yet
  await BruteForceProtection.verifyLockout(bfEmail);

  // 5th failed attempt triggers lockout
  await BruteForceProtection.recordFailure(bfEmail);

  let isBlocked = false;
  try {
    await BruteForceProtection.verifyLockout(bfEmail);
  } catch (err: any) {
    if (err instanceof AppError && err.code === 'ACCOUNT_LOCKED') {
      isBlocked = true;
    }
  }
  assert.strictEqual(isBlocked, true, 'Account must be locked in Redis after 5 failed attempts');
  console.log('  ✅ Brute force lockout triggered after 5 failed attempts in Redis');

  // Successful login clears lockout
  await BruteForceProtection.recordSuccess(bfEmail);
  let isUnlocked = false;
  try {
    await BruteForceProtection.verifyLockout(bfEmail);
    isUnlocked = true;
  } catch {
    isUnlocked = false;
  }
  assert.strictEqual(isUnlocked, true, 'Account must unlock after successful login in Redis');
  console.log('  ✅ Account lockout reset after successful authentication in Redis');

  // =========================================================================
  // 4. Redis Fallback Execution & Non-Crashing Resilience
  // =========================================================================
  console.log('\n🔹 Scenario 4: Redis Fallback Execution & Resilience');
  // Disconnect Redis
  await closeRedisConnection();
  assert.strictEqual(isRedisAvailable(), false, 'Redis must report unavailable after close');

  // Perform rate limit check when Redis is unavailable -> must fall back to in-memory gracefully
  const fallbackKey = 'fallback_user_' + Date.now();
  const fbResult = await checkRateLimit(fallbackKey, { windowMs: 1000, maxRequests: 2 });
  assert.strictEqual(fbResult.allowed, true, 'Fallback rate limiter must succeed without crash');
  console.log('  ✅ Graceful in-memory fallback execution verified when Redis is offline');

  console.log('\n🎉 ALL LIVE REDIS SCENARIOS PASSED (100%)!');
  await closeRedisConnection();
  process.exit(0);
}

runLiveRedisSuite().catch((err) => {
  console.error('Fatal Redis test error:', err);
  process.exit(1);
});
