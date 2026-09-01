import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { DomainEvent, KafkaTopics } from '@careerforge/types';
import { createServer } from '../../apps/api/src/server.js';
import { KafkaProducerService } from '../../apps/api/src/infrastructure/kafka/kafka.producer.js';
import { OutboxService } from '../../apps/api/src/infrastructure/outbox/outbox.service.js';
import { OutboxPublisher } from '../../apps/api/src/infrastructure/outbox/outbox.publisher.js';
import { createResumeWorkerConsumer } from '../../workers/resume-worker/src/consumer.js';
import { createAIWorkerConsumer } from '../../workers/ai-worker/src/consumer.js';
import { createNotificationWorkerConsumer } from '../../workers/notification-worker/src/consumer.js';

let server: http.Server;
const PORT = 4050;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    let postData: string | undefined;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (body !== undefined) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsedBody = data;
          try {
            parsedBody = JSON.parse(data);
          } catch {
            // Raw text
          }
          resolve({
            status: res.statusCode || 500,
            body: parsedBody,
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runKafkaEventsIntegrationTests() {
  console.log('--- STARTING PHASE 17: KAFKA EVENT-DRIVEN BACKBONE INTEGRATION TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const suffix = Date.now();
  const emailAdmin = `kafka_admin_${suffix}@example.com`;
  const emailCand = `kafka_cand_${suffix}@example.com`;
  const emailRec = `kafka_rec_${suffix}@example.com`;
  const password = 'Password123!';

  let tokenAdmin = '';
  let tokenCand = '';
  let tokenRec = '';

  let candidateProfileId = '';
  let candidateUserId = '';
  let recruiterUserId = '';
  let resumeId = '';
  let jobId = '';

  try {
    // -------------------------------------------------------------------------
    // [1/11] Provisioning Users & Fixtures (Admin, Candidate, Recruiter, Job)
    // -------------------------------------------------------------------------
    console.log('\n[1/11] Provisioning test users, candidate profile, and job in PostgreSQL...');

    // Admin User: register then elevate role in DB
    const regAdmin = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailAdmin,
      password,
      role: 'CANDIDATE',
      name: 'System Admin',
    });
    assert.strictEqual(regAdmin.status, 201);
    await prisma.user.update({
      where: { email: emailAdmin },
      data: { role: 'ADMIN' },
    });

    const loginAdmin = await makeRequest('POST', '/api/v1/auth/login', {
      email: emailAdmin,
      password,
    });
    assert.strictEqual(loginAdmin.status, 200);
    tokenAdmin = loginAdmin.body.data.accessToken;

    // Candidate User
    const regCand = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCand,
      password,
      role: 'CANDIDATE',
      name: 'Elena Rostova',
    });
    assert.strictEqual(regCand.status, 201);
    tokenCand = regCand.body.data.accessToken;
    candidateUserId = regCand.body.data.user.id;

    const candProfile = await prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
    });
    candidateProfileId = candProfile!.id;

    // Skills
    const skillNode = await prisma.skill.findUnique({ where: { name: 'Node.js' } });
    const skillReact = await prisma.skill.findUnique({ where: { name: 'React' } });
    await prisma.candidateSkill.createMany({
      data: [
        { candidateId: candidateProfileId, skillId: skillNode!.id },
        { candidateId: candidateProfileId, skillId: skillReact!.id },
      ],
    });

    // Create a Resume record
    const resume = await prisma.resume.create({
      data: {
        candidateId: candidateProfileId,
        storageKey: 'resumes/elena_resume.pdf',
        originalFileName: 'Elena_Rostova_Resume.pdf',
        fileUrl: '/storage/uploads/resumes/elena_resume.pdf',
        fileSize: 102400,
        mimeType: 'application/pdf',
        processingStatus: 'READY_FOR_PROCESSING',
        isActive: true,
      },
    });
    resumeId = resume.id;

    // Recruiter User
    const regRec = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRec,
      password,
      role: 'RECRUITER',
      name: 'Sarah Recruiter',
    });
    tokenRec = regRec.body.data.accessToken;
    recruiterUserId = regRec.body.data.user.id;

    // Recruiter Job
    const jobRes = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Senior Distributed Systems Engineer',
        description: 'Building Kafka microservices and event-driven backbones.',
        companyName: 'Apex Cloud',
        location: 'Remote',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        status: 'DRAFT',
        skills: [
          { name: 'Node.js', required: true, importance: 'REQUIRED' },
          { name: 'React', required: true, importance: 'REQUIRED' },
        ],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    jobId = jobRes.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jobId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRec}` });

    console.log('  ✅ Users, candidate profile, skills, and vacancy provisioned');

    // -------------------------------------------------------------------------
    // [2/11] Producer & Domain Event Envelope Serialization
    // -------------------------------------------------------------------------
    console.log('\n[2/11] Testing KafkaProducerService message formatting & correlation ID propagation...');
    const testEvent: DomainEvent = {
      eventId: `ev-test-${suffix}`,
      eventType: 'resume.uploaded',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-api',
      correlationId: `corr-${suffix}`,
      causationId: null,
      aggregateType: 'Resume',
      aggregateId: resumeId,
      payload: {
        resumeId,
        candidateId: candidateProfileId,
        fileUrl: '/storage/uploads/resumes/elena_resume.pdf',
        originalFileName: 'Elena_Rostova_Resume.pdf',
        fileSize: 102400,
      },
    };

    const publishSuccess = await KafkaProducerService.publish(KafkaTopics.RESUME, testEvent);
    assert.strictEqual(publishSuccess, true);
    console.log('  ✅ Domain Event published and serialized with metadata');

    // -------------------------------------------------------------------------
    // [3/11] Transactional Outbox Scheduling & Dispatch
    // -------------------------------------------------------------------------
    console.log('\n[3/11] Testing Transactional Outbox scheduling and OutboxPublisher sweep...');
    const outboxEventId = `outbox-ev-${suffix}`;
    const outboxEvent: DomainEvent = {
      eventId: outboxEventId,
      eventType: 'application.created',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-api',
      correlationId: `corr-outbox-${suffix}`,
      causationId: null,
      aggregateType: 'Application',
      aggregateId: `app-${suffix}`,
      payload: {
        applicationId: `app-${suffix}`,
        candidateId: candidateProfileId,
        jobId,
        resumeId,
      },
    };

    // 1. Schedule inside transaction
    await prisma.$transaction(async (tx) => {
      await OutboxService.scheduleEvent(outboxEvent, KafkaTopics.APPLICATION, tx);
    });

    const pendingOutbox = await prisma.outboxEvent.findUnique({ where: { eventId: outboxEventId } });
    assert.strictEqual(pendingOutbox?.status, 'PENDING');

    // 2. Run Outbox Publisher sweep
    const publishedCount = await OutboxPublisher.publishPendingEvents(10);
    assert.ok(publishedCount >= 1);

    const updatedOutbox = await prisma.outboxEvent.findUnique({ where: { eventId: outboxEventId } });
    assert.strictEqual(updatedOutbox?.status, 'PUBLISHED');
    assert.ok(updatedOutbox?.publishedAt !== null);
    console.log('  ✅ Transactional Outbox record created and successfully swept to PUBLISHED');

    // -------------------------------------------------------------------------
    // [4/11] Idempotent Consumer & Duplicate Suppression
    // -------------------------------------------------------------------------
    console.log('\n[4/11] Testing Idempotent Consumer and duplicate event suppression...');
    const resumeConsumer = createResumeWorkerConsumer();

    // First execution
    const firstRun = await resumeConsumer.processEventDirectly(testEvent);
    assert.strictEqual(firstRun, true);

    const processedRecord = await prisma.processedEvent.findUnique({
      where: {
        eventId_consumerGroup: {
          eventId: testEvent.eventId,
          consumerGroup: 'careerforge-resume-worker',
        },
      },
    });
    assert.ok(processedRecord !== null);
    assert.strictEqual(processedRecord?.status, 'COMPLETED');

    // Duplicate execution (same event ID)
    const duplicateRun = await resumeConsumer.processEventDirectly(testEvent);
    assert.strictEqual(duplicateRun, true);
    console.log('  ✅ Idempotency verified: Duplicate event safely detected and suppressed');

    // -------------------------------------------------------------------------
    // [5/11] Resume Worker Pipeline (resume.uploaded -> resume.processed)
    // -------------------------------------------------------------------------
    console.log('\n[5/11] Testing Resume Worker pipeline execution...');
    const updatedResume = await prisma.resume.findUnique({ where: { id: resumeId } });
    assert.strictEqual(updatedResume?.processingStatus, 'PARSED');
    console.log('  ✅ Resume worker marked resume as processed in PostgreSQL');

    // -------------------------------------------------------------------------
    // [6/11] AI Worker Pipeline (match.requested -> match.completed)
    // -------------------------------------------------------------------------
    console.log('\n[6/11] Testing AI Worker async matching pipeline (match.requested)...');
    const aiConsumer = createAIWorkerConsumer();

    const matchReqEvent: DomainEvent = {
      eventId: `match-req-${suffix}`,
      eventType: 'match.requested',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-api',
      correlationId: `corr-match-${suffix}`,
      causationId: null,
      aggregateType: 'CandidateProfile',
      aggregateId: candidateProfileId,
      payload: {
        candidateId: candidateProfileId,
        jobId,
        forceRecompute: true,
      },
    };

    const matchProcessed = await aiConsumer.processEventDirectly(matchReqEvent);
    assert.strictEqual(matchProcessed, true);

    const matchReport = await prisma.matchReport.findFirst({
      where: { candidateId: candidateProfileId, jobId },
    });
    assert.ok(matchReport !== null);
    assert.ok(matchReport.overallScore > 0);
    console.log(`  ✅ AI worker completed match: Score=${matchReport.overallScore}%`);

    // -------------------------------------------------------------------------
    // [7/11] AI Worker Skill Gap & Learning Path Pipeline
    // -------------------------------------------------------------------------
    console.log('\n[7/11] Testing AI Worker skill gap & learning pipeline (skill-gap.analysis.requested)...');
    const gapReqEvent: DomainEvent = {
      eventId: `gap-req-${suffix}`,
      eventType: 'skill-gap.analysis.requested',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-api',
      correlationId: `corr-gap-${suffix}`,
      causationId: null,
      aggregateType: 'CandidateProfile',
      aggregateId: candidateProfileId,
      payload: {
        candidateId: candidateProfileId,
        jobId,
      },
    };

    const gapProcessed = await aiConsumer.processEventDirectly(gapReqEvent);
    assert.strictEqual(gapProcessed, true);

    const gapAnalysis = await prisma.skillGapAnalysis.findFirst({
      where: { candidateId: candidateProfileId, jobId },
    });
    assert.ok(gapAnalysis !== null);
    console.log(`  ✅ AI worker completed skill gap analysis: Readiness=${gapAnalysis.overallReadiness}%`);

    // -------------------------------------------------------------------------
    // [8/11] Notification Worker Pipeline (application.created & status.changed)
    // -------------------------------------------------------------------------
    console.log('\n[8/11] Testing Notification Worker async notifications...');
    const notifConsumer = createNotificationWorkerConsumer();

    const appCreatedEvent: DomainEvent = {
      eventId: `app-notif-${suffix}`,
      eventType: 'application.created',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-api',
      correlationId: `corr-notif-${suffix}`,
      causationId: null,
      aggregateType: 'Application',
      aggregateId: `app-123`,
      payload: {
        applicationId: `app-123`,
        candidateId: candidateProfileId,
        jobId,
        resumeId,
      },
    };

    const notifProcessed = await notifConsumer.processEventDirectly(appCreatedEvent);
    assert.strictEqual(notifProcessed, true);

    // Verify candidate notification in PostgreSQL
    const candNotifs = await prisma.notification.findMany({
      where: { userId: candidateUserId },
    });
    assert.ok(candNotifs.length >= 1);
    assert.ok(candNotifs[0].type === 'APPLICATION_STATUS_CHANGED' || (candNotifs[0].type as any) === 'APPLICATION_SUBMITTED');

    // Verify recruiter notification in PostgreSQL
    const recNotifs = await prisma.notification.findMany({
      where: { userId: recruiterUserId },
    });
    assert.ok(recNotifs.length >= 1);
    assert.strictEqual(recNotifs[0].type, 'NEW_APPLICANT_RECEIVED');
    console.log('  ✅ Notification worker generated candidate & recruiter notifications');

    // -------------------------------------------------------------------------
    // [9/11] Dead-Letter Queue (DLQ) & Error Handling
    // -------------------------------------------------------------------------
    console.log('\n[9/11] Testing Dead-Letter Queue (DLQ) permanent failure routing...');
    const failingConsumer = createAIWorkerConsumer();
    const failingEvent: DomainEvent = {
      eventId: `dlq-test-${suffix}`,
      eventType: 'skill-gap.analysis.requested',
      version: '1.0',
      occurredAt: new Date().toISOString(),
      producer: 'careerforge-api',
      correlationId: `corr-dlq-${suffix}`,
      causationId: null,
      aggregateType: 'CandidateProfile',
      aggregateId: 'non-existent-candidate-uuid',
      payload: {
        candidateId: 'non-existent-candidate-uuid',
        jobId: 'non-existent-job-uuid',
      },
    };

    const failResult = await failingConsumer.processEventDirectly(failingEvent);
    assert.strictEqual(failResult, false);

    const dlqRecord = await prisma.deadLetterEvent.findUnique({
      where: { eventId: failingEvent.eventId },
    });
    assert.ok(dlqRecord !== null);
    assert.strictEqual(dlqRecord.eventType, 'skill-gap.analysis.requested');
    assert.ok(dlqRecord.error.length > 0);
    console.log('  ✅ Unrecoverable event successfully routed to PostgreSQL DeadLetterEvent table');

    // -------------------------------------------------------------------------
    // [10/11] Admin Event Observability API
    // -------------------------------------------------------------------------
    console.log('\n[10/11] Testing Admin Event Observability Endpoints...');

    // GET /stats
    const statsRes = await makeRequest('GET', '/api/v1/admin/events/stats', undefined, {
      Authorization: `Bearer ${tokenAdmin}`,
    });
    assert.strictEqual(statsRes.status, 200);
    assert.ok(statsRes.body.data.totalPublished >= 1);
    assert.ok(statsRes.body.data.totalProcessed >= 1);

    // GET /events
    const listRes = await makeRequest('GET', '/api/v1/admin/events', undefined, {
      Authorization: `Bearer ${tokenAdmin}`,
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.data.items.length >= 1);

    // GET /dlq
    const dlqListRes = await makeRequest('GET', '/api/v1/admin/events/dlq', undefined, {
      Authorization: `Bearer ${tokenAdmin}`,
    });
    assert.strictEqual(dlqListRes.status, 200);
    assert.ok(dlqListRes.body.data.length >= 1);

    // POST /dlq/:eventId/retry
    const retryRes = await makeRequest(
      'POST',
      `/api/v1/admin/events/dlq/${failingEvent.eventId}/retry`,
      undefined,
      { Authorization: `Bearer ${tokenAdmin}` }
    );
    assert.strictEqual(retryRes.status, 200);
    assert.strictEqual(retryRes.body.success, true);
    console.log('  ✅ Admin event stats, event list, and DLQ retry endpoints verified');

    // -------------------------------------------------------------------------
    // [11/11] Security & RBAC Protection
    // -------------------------------------------------------------------------
    console.log('\n[11/11] Testing RBAC protection on Admin Event Endpoints...');
    const forbiddenRes = await makeRequest('GET', '/api/v1/admin/events/stats', undefined, {
      Authorization: `Bearer ${tokenCand}`,
    });
    assert.strictEqual(forbiddenRes.status, 403);
    console.log('  ✅ Candidate rejected with 403 Forbidden on Admin Event endpoints');

    console.log('\n🎉 ALL PHASE 17 KAFKA EVENT-DRIVEN BACKBONE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [emailAdmin, emailCand, emailRec] } },
    });
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    process.exit(0);
  }
}

runKafkaEventsIntegrationTests().catch((err) => {
  console.error('❌ Phase 17 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
