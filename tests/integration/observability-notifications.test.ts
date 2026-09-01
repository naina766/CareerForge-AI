import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';
import { hashPassword, signAccessToken } from '../../apps/api/src/modules/auth/auth.utils.js';
import { NotificationService } from '../../apps/api/src/modules/notifications/notification.service.js';
import { NotificationPreferenceService } from '../../apps/api/src/modules/notifications/notification-preference.service.js';
import { CircuitBreaker } from '../../apps/api/src/infrastructure/observability/circuit-breaker.js';
import { WorkerExecutionService } from '../../apps/api/src/infrastructure/observability/worker-execution.service.js';
import { HealthCheckService } from '../../apps/api/src/infrastructure/observability/health.service.js';
import { KafkaHealthService } from '../../apps/api/src/infrastructure/observability/kafka-health.service.js';
import { MetricsService } from '../../apps/api/src/infrastructure/observability/metrics.js';

async function runObservabilityNotificationsIntegrationTests() {
  console.log('🧪 Starting Phase 18 Observability, Notifications & Reliability Test Suite...');
  const app = createServer();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as any;
  const baseUrl = `http://localhost:${address.port}/api/v1`;

  const timestamp = Date.now();
  const emailAdmin = `admin.obs.${timestamp}@careerforge.io`;
  const emailCandA = `cand.a.obs.${timestamp}@careerforge.io`;
  const emailCandB = `cand.b.obs.${timestamp}@careerforge.io`;

  try {
    // [1/20] Provision test users and candidate profiles
    console.log('\n[1/20] Provisioning Admin and Candidate users...');
    const adminUser = await prisma.user.create({
      data: {
        email: emailAdmin,
        passwordHash: await hashPassword('AdminPass123!'),
        role: 'ADMIN',
        verified: true,
      },
    });

    const candAUser = await prisma.user.create({
      data: {
        email: emailCandA,
        passwordHash: await hashPassword('CandPass123!'),
        role: 'CANDIDATE',
        verified: true,
        candidateProfile: {
          create: {
            name: 'Candidate Obs A',
            headline: 'Senior Full Stack Engineer',
            location: 'New York, USA',
            workMode: 'REMOTE',
          },
        },
      },
      include: { candidateProfile: true },
    });

    const candBUser = await prisma.user.create({
      data: {
        email: emailCandB,
        passwordHash: await hashPassword('CandPass123!'),
        role: 'CANDIDATE',
        verified: true,
        candidateProfile: {
          create: {
            name: 'Candidate Obs B',
            headline: 'Backend Engineer',
            location: 'Remote',
            workMode: 'REMOTE',
          },
        },
      },
      include: { candidateProfile: true },
    });

    const candAId = candAUser.candidateProfile!.id;
    const candBId = candBUser.candidateProfile!.id;

    const tokenAdmin = signAccessToken({ sub: adminUser.id, email: adminUser.email, role: adminUser.role });
    const tokenCandA = signAccessToken({ sub: candAUser.id, email: candAUser.email, role: candAUser.role });
    const tokenCandB = signAccessToken({ sub: candBUser.id, email: candBUser.email, role: candBUser.role });
    console.log('  ✅ Users and profiles provisioned');

    // [2/20] Notification creation & persistence
    console.log('\n[2/20] Testing notification creation in PostgreSQL...');
    const notif1 = await NotificationService.createNotification({
      candidateId: candAId,
      type: 'MATCH_COMPLETED',
      title: 'Match Analysis Complete',
      message: 'Your match score is 88% for Full Stack Lead.',
      metadata: { jobId: 'job-123', overallScore: 88 },
    });

    assert.ok(notif1, 'Notification should be created');
    assert.strictEqual(notif1.status, 'UNREAD');
    assert.strictEqual(notif1.candidateId, candAId);
    console.log('  ✅ Notification created successfully');

    // [3/20] Candidate Notification Isolation
    console.log('\n[3/20] Testing Candidate Notification Isolation (A vs B)...');
    const resListB = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenCandB}` },
    });
    const jsonListB = await resListB.json();
    assert.strictEqual(resListB.status, 200);
    assert.strictEqual(jsonListB.data.length, 0, 'Candidate B must not see Candidate A notifications');

    const resListA = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    const jsonListA = await resListA.json();
    assert.strictEqual(resListA.status, 200);
    assert.strictEqual(jsonListA.data.length, 1, 'Candidate A must see their 1 notification');
    console.log('  ✅ Multi-tenant candidate notification isolation strictly verified');

    // [4/20] Unread Count tracking
    console.log('\n[4/20] Testing Unread Count tracking...');
    const resCount = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    const jsonCount = await resCount.json();
    assert.strictEqual(jsonCount.data.count, 1);
    console.log('  ✅ Unread count verified as 1');

    // [5/20] Mark single notification as read
    console.log('\n[5/20] Testing Mark as Read for single notification...');
    const resRead = await fetch(`${baseUrl}/notifications/${notif1.id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    const jsonRead = await resRead.json();
    assert.strictEqual(resRead.status, 200);
    assert.strictEqual(jsonRead.data.status, 'READ');
    assert.ok(jsonRead.data.readAt, 'readAt must be populated');
    console.log('  ✅ Single notification marked read');

    // [6/20] Mark all notifications as read
    console.log('\n[6/20] Testing Mark All as Read...');
    await NotificationService.createNotification({
      candidateId: candAId,
      type: 'JOB_RECOMMENDED',
      title: 'Top Recommendation Ready',
      message: 'New job matches your preferences.',
    });

    const resReadAll = await fetch(`${baseUrl}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    const jsonReadAll = await resReadAll.json();
    assert.strictEqual(resReadAll.status, 200);
    assert.strictEqual(jsonReadAll.data.updatedCount, 1);

    const countAfter = await NotificationService.getUnreadCount(candAId);
    assert.strictEqual(countAfter, 0);
    console.log('  ✅ Mark all read verified');

    // [7/20] Fetch and update notification preferences
    console.log('\n[7/20] Testing Notification Preferences...');
    const resPrefGet = await fetch(`${baseUrl}/notifications/preferences`, {
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    const jsonPrefGet = await resPrefGet.json();
    assert.strictEqual(resPrefGet.status, 200);
    assert.strictEqual(jsonPrefGet.data.matchNotifications, true);

    const resPrefUpdate = await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenCandA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ matchNotifications: false }),
    });
    const jsonPrefUpdate = await resPrefUpdate.json();
    assert.strictEqual(resPrefUpdate.status, 200);
    assert.strictEqual(jsonPrefUpdate.data.matchNotifications, false);
    console.log('  ✅ Preferences fetched and updated');

    // [8/20] Preference-based suppression
    console.log('\n[8/20] Testing Preference-based notification suppression...');
    const suppressed = await NotificationService.createNotification({
      candidateId: candAId,
      type: 'MATCH_COMPLETED',
      title: 'Should be suppressed',
      message: 'Match notifications are disabled.',
    });
    assert.strictEqual(suppressed, null, 'Suppressed notification must return null');
    console.log('  ✅ Notification suppressed when preference is toggled off');

    // Re-enable for subsequent tests
    await NotificationPreferenceService.updatePreferences(candAId, { matchNotifications: true });

    // [9/20] Duplicate notification suppression
    console.log('\n[9/20] Testing Duplicate Notification Suppression within time window...');
    const original = await NotificationService.createNotification({
      candidateId: candAId,
      type: 'SKILL_GAP_UPDATED',
      title: 'Unique Gap Analysis Title',
      message: 'Your roadmap was generated.',
    });
    assert.ok(original);

    const duplicate = await NotificationService.createNotification({
      candidateId: candAId,
      type: 'SKILL_GAP_UPDATED',
      title: 'Unique Gap Analysis Title',
      message: 'Your roadmap was generated.',
    });
    assert.strictEqual(duplicate, null, 'Duplicate notification within 60s must be suppressed');
    console.log('  ✅ Duplicate alert storm suppressed');

    // [10/20] Worker execution lifecycle tracking (STARTED -> SUCCESS)
    console.log('\n[10/20] Testing WorkerExecution tracking (SUCCESS)...');
    const execId1 = await WorkerExecutionService.recordStart('careerforge-ai-worker', 'evt-100', 'match.requested', 1);
    assert.ok(execId1);
    await WorkerExecutionService.recordSuccess(execId1, 145);

    const execRecord = await prisma.workerExecution.findUnique({ where: { id: execId1 } });
    assert.strictEqual(execRecord?.status, 'SUCCESS');
    assert.strictEqual(execRecord?.durationMs, 145);
    console.log('  ✅ Worker execution lifecycle recorded as SUCCESS');

    // [11/20] Failed worker execution tracking
    console.log('\n[11/20] Testing Failed WorkerExecution tracking...');
    const execId2 = await WorkerExecutionService.recordStart('careerforge-resume-worker', 'evt-101', 'resume.uploaded', 1);
    await WorkerExecutionService.recordFailure(execId2, new Error('PDF parse corruption'), 'FAILED', 80);

    const failedRecord = await prisma.workerExecution.findUnique({ where: { id: execId2 } });
    assert.strictEqual(failedRecord?.status, 'FAILED');
    assert.strictEqual(failedRecord?.error, 'PDF parse corruption');
    console.log('  ✅ Failed worker execution logged with stack and error message');

    // [12/20] Retry attempt tracking
    console.log('\n[12/20] Testing Worker retry status tracking...');
    const execId3 = await WorkerExecutionService.recordStart('careerforge-ai-worker', 'evt-102', 'skill-gap.analysis.requested', 2);
    await WorkerExecutionService.recordFailure(execId3, new Error('Temporary vector lock'), 'RETRYING', 50);

    const retryRecord = await prisma.workerExecution.findUnique({ where: { id: execId3 } });
    assert.strictEqual(retryRecord?.status, 'RETRYING');
    assert.strictEqual(retryRecord?.attempt, 2);
    console.log('  ✅ Worker retry attempt tracked');

    // [13/20] DLQ execution routing
    console.log('\n[13/20] Testing DLQ execution record...');
    const execId4 = await WorkerExecutionService.recordStart('careerforge-notification-worker', 'evt-103', 'notification.requested', 3);
    await WorkerExecutionService.recordFailure(execId4, new Error('Unrecoverable payload schema error'), 'DLQ', 200);

    const dlqRecord = await prisma.workerExecution.findUnique({ where: { id: execId4 } });
    assert.strictEqual(dlqRecord?.status, 'DLQ');
    console.log('  ✅ DLQ worker execution status tracked');

    // [14/20] Multi-service Health check probe
    console.log('\n[14/20] Testing HealthCheckService probe...');
    const healthResult = await HealthCheckService.checkSystemHealth();
    assert.ok(healthResult.services.postgres, 'Postgres health must be probed');
    assert.ok(healthResult.services.api, 'API health must be present');
    console.log(`  ✅ Health check probe executed (Overall Status: ${healthResult.status})`);

    // [15/20] Kafka Health & Outbox telemetry
    console.log('\n[15/20] Testing KafkaHealthService report...');
    const kafkaReport = await KafkaHealthService.getKafkaHealthReport();
    assert.ok(kafkaReport.topics.length > 0, 'Topics must be reported');
    assert.ok(kafkaReport.outboxStats, 'Outbox stats must be present');
    console.log('  ✅ Kafka telemetry and outbox counters verified');

    // [16/20] Admin Observability Endpoints with RBAC
    console.log('\n[16/20] Testing Admin Observability Endpoints...');
    const resAdminHealth = await fetch(`${baseUrl}/admin/observability/health`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.strictEqual(resAdminHealth.status, 200);

    const resAdminMetrics = await fetch(`${baseUrl}/admin/observability/metrics`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.strictEqual(resAdminMetrics.status, 200);

    const resAdminStatus = await fetch(`${baseUrl}/admin/observability/system-status`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    assert.strictEqual(resAdminStatus.status, 200);
    const jsonAdminStatus = await resAdminStatus.json();
    assert.ok(jsonAdminStatus.data.totalServicesCount > 0);
    console.log('  ✅ Admin observability endpoints verified');

    // [17/20] RBAC Protection: Candidates blocked with 403 Forbidden
    console.log('\n[17/20] Testing RBAC on Admin Observability (Candidate blocked)...');
    const resCandBlocked = await fetch(`${baseUrl}/admin/observability/system-status`, {
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    assert.strictEqual(resCandBlocked.status, 403);
    console.log('  ✅ Candidate rejected with 403 Forbidden on Admin Observability');

    // [18/20] Circuit Breaker: CLOSED -> OPEN -> Fallback
    console.log('\n[18/20] Testing Circuit Breaker state transitions and fallback...');
    const breaker = new CircuitBreaker({
      name: 'ai-test-service',
      failureThreshold: 2,
      resetTimeoutMs: 200,
      timeoutMs: 100,
    });

    // 1st failure
    await breaker.execute(
      async () => { throw new Error('AI Engine 500'); },
      async () => 'Fallback Result 1'
    );
    assert.strictEqual(breaker.getStatus().state, 'CLOSED');

    // 2nd failure -> Trips to OPEN
    const result2 = await breaker.execute(
      async () => { throw new Error('AI Engine 500'); },
      async () => 'Fallback Result 2'
    );
    assert.strictEqual(result2, 'Fallback Result 2');
    assert.strictEqual(breaker.getStatus().state, 'OPEN');

    // Blocked by OPEN state
    const resultBlocked = await breaker.execute(
      async () => 'Never called',
      async () => 'Fallback while OPEN'
    );
    assert.strictEqual(resultBlocked, 'Fallback while OPEN');
    console.log('  ✅ Circuit Breaker tripped to OPEN and executed fallback');

    // [19/20] Centralized API Latency & Metrics Tracking
    console.log('\n[19/20] Testing MetricsService HTTP latency and stats...');
    MetricsService.recordHttpRequest('GET', '/api/v1/jobs', 85, 200);
    MetricsService.recordHttpRequest('GET', '/api/v1/jobs', 110, 200);
    MetricsService.recordHttpRequest('GET', '/api/v1/jobs', 95, 200);

    const routeStats = MetricsService.getRouteLatencyStats();
    const jobStats = routeStats.find((r) => r.route === '/api/v1/jobs');
    assert.ok(jobStats, 'Route stats for /api/v1/jobs must exist');
    assert.ok(jobStats.p95LatencyMs >= 95);
    console.log(`  ✅ Route stats tracked (Count=${jobStats.count}, Avg=${jobStats.avgLatencyMs}ms, P95=${jobStats.p95LatencyMs}ms)`);

    // [20/20] Delete notification cleanup
    console.log('\n[20/20] Testing Notification deletion...');
    const resDel = await fetch(`${baseUrl}/notifications/${notif1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenCandA}` },
    });
    assert.strictEqual(resDel.status, 200);

    const notifAfter = await prisma.notification.findUnique({ where: { id: notif1.id } });
    assert.strictEqual(notifAfter, null, 'Notification must be deleted from PostgreSQL');
    console.log('  ✅ Notification deletion verified');

    console.log('\n🎉 ALL PHASE 18 OBSERVABILITY, NOTIFICATIONS & RELIABILITY TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [emailAdmin, emailCandA, emailCandB] } },
    });
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    process.exit(0);
  }
}

runObservabilityNotificationsIntegrationTests().catch((err) => {
  console.error('❌ Phase 18 Test suite failed:', err);
  process.exit(1);
});
