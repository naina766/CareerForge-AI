import assert from 'node:assert';
import { supertest } from './helpers/test-setup.js';

export async function runSecurityTests() {
  console.log('\n--- 🧪 RUNNING SECURITY & HARDENING INTEGRATION TESTS ---');

  // 1. Helmet Security Headers Check
  const rootRes = await supertest.get('/health');
  assert.strictEqual(rootRes.status, 200);
  assert.strictEqual(rootRes.headers['x-content-type-options'], 'nosniff', 'Must include nosniff header');
  assert.strictEqual(
    rootRes.headers['x-frame-options'] === 'DENY' || rootRes.headers['x-frame-options'] === 'SAMEORIGIN',
    true,
    'Must enforce frame options (DENY or SAMEORIGIN)'
  );
  console.log('  ✅ Security headers (nosniff, frameguard) verified');

  // 2. Correlation ID Header Propagation
  assert.notStrictEqual(rootRes.headers['x-correlation-id'], undefined, 'Must propagate X-Correlation-ID');
  console.log('  ✅ Distributed tracing correlation headers propagated');

  // 3. Error Sanitization & Structured Format (No stack traces / internal paths)
  const badLoginRes = await supertest
    .post('/api/v1/auth/login')
    .send({ email: 'unknown@example.com', password: 'Password123!' });
  assert.strictEqual(badLoginRes.status, 401);
  assert.strictEqual(badLoginRes.body.stack, undefined, 'Stack traces must never leak in API responses');
  assert.strictEqual(typeof badLoginRes.body.error, 'object', 'Error object must be structured');
  assert.strictEqual(typeof badLoginRes.body.error.code, 'string');
  console.log('  ✅ Error handling sanitization verified: no leaked stack traces');

  // 4. Malformed JSON Body -> 400
  const malformedJsonRes = await supertest
    .post('/api/v1/auth/login')
    .set('Content-Type', 'application/json')
    .send('{ "email": "test@example.com", "password": ');
  assert.strictEqual(malformedJsonRes.status, 400, `Malformed JSON should return 400, got ${malformedJsonRes.status}`);
  console.log('  ✅ Malformed JSON rejected safely with 400');

  // 5. Oversized Request Body Rejection
  const oversizedPayload = 'A'.repeat(12 * 1024 * 1024); // 12 MB exceeds 10MB express.json limit
  const oversizedRes = await supertest
    .post('/api/v1/auth/login')
    .set('Content-Type', 'application/json')
    .send({ payload: oversizedPayload });
  assert.strictEqual(oversizedRes.status, 413, `Payload too large should return 413, got ${oversizedRes.status}`);
  console.log('  ✅ Oversized request payload rejected with 413 Payload Too Large');

  console.log('🎉 Security & hardening integration test suite passed!');
}

// Allow direct execution
if (process.argv[1]?.endsWith('security.test.ts') || process.argv[1]?.endsWith('security.test.js')) {
  runSecurityTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Security integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
