import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, createTestAdmin, cleanupUsers } from './helpers/test-setup.js';

export async function runAdminTests() {
  console.log('\n--- 🧪 RUNNING ADMIN & OBSERVABILITY E2E INTEGRATION TESTS ---');
  const candidate = await createTestCandidate('cand-admin');
  const recruiter = await createTestRecruiter('rec-admin');
  const admin = await createTestAdmin('admin-user');

  try {
    // 1. Admin accesses /admin/observability/health -> 200
    const healthRes = await supertest
      .get('/api/v1/admin/observability/health')
      .set('Authorization', admin.authHeader);
    assert.strictEqual(healthRes.status, 200, `Admin health should return 200, got ${healthRes.status}`);
    assert.strictEqual(healthRes.body.data.status !== undefined, true);
    console.log('  ✅ Admin successfully accessed /admin/observability/health');

    // 2. Admin accesses /admin/observability/metrics -> 200
    const metricsRes = await supertest
      .get('/api/v1/admin/observability/metrics')
      .set('Authorization', admin.authHeader);
    assert.strictEqual(metricsRes.status, 200, `Admin metrics should return 200, got ${metricsRes.status}`);
    console.log('  ✅ Admin successfully accessed /admin/observability/metrics');

    // 3. Admin accesses /admin/observability/workers -> 200
    const workersRes = await supertest
      .get('/api/v1/admin/observability/workers')
      .set('Authorization', admin.authHeader);
    assert.strictEqual(workersRes.status, 200);
    console.log('  ✅ Admin checked background workers status');

    // 4. Admin accesses /admin/observability/kafka -> 200
    const kafkaRes = await supertest
      .get('/api/v1/admin/observability/kafka')
      .set('Authorization', admin.authHeader);
    assert.strictEqual(kafkaRes.status, 200);
    console.log('  ✅ Admin checked Kafka KRaft cluster status');

    // 5. Candidate blocked from Admin observability -> 403
    const candBlockRes = await supertest
      .get('/api/v1/admin/observability/health')
      .set('Authorization', candidate.authHeader);
    assert.strictEqual(candBlockRes.status, 403, `Candidate must be 403 Forbidden, got ${candBlockRes.status}`);
    console.log('  ✅ Candidate forbidden from admin observability endpoints (403)');

    // 6. Recruiter blocked from Admin observability -> 403
    const recBlockRes = await supertest
      .get('/api/v1/admin/observability/health')
      .set('Authorization', recruiter.authHeader);
    assert.strictEqual(recBlockRes.status, 403, `Recruiter must be 403 Forbidden, got ${recBlockRes.status}`);
    console.log('  ✅ Recruiter forbidden from admin observability endpoints (403)');

    // 7. Unauthenticated request blocked from Admin -> 401
    const unauthBlockRes = await supertest.get('/api/v1/admin/observability/health');
    assert.strictEqual(unauthBlockRes.status, 401, `Unauthenticated request should return 401, got ${unauthBlockRes.status}`);
    console.log('  ✅ Unauthenticated user rejected with 401');

    // 8. Admin accesses /api/v1/admin/events (Outbox & event traces) -> 200
    const eventsRes = await supertest
      .get('/api/v1/admin/events')
      .set('Authorization', admin.authHeader);
    assert.strictEqual(eventsRes.status, 200);
    console.log('  ✅ Admin retrieved event backbone telemetry');

    console.log('🎉 Admin integration test suite passed!');
  } finally {
    await cleanupUsers([candidate.id, recruiter.id, admin.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('admin.test.ts') || process.argv[1]?.endsWith('admin.test.js')) {
  runAdminTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Admin integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
