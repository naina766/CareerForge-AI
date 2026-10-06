import assert from 'node:assert';
import { supertest, createTestRecruiter, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runJobsTests() {
  console.log('\n--- 🧪 RUNNING JOBS DISCOVERY & SEARCH E2E INTEGRATION TESTS ---');
  const recruiter = await createTestRecruiter('rec-jobs');
  const createdJobIds: string[] = [];

  try {
    // 1. Recruiter creates a published job vacancy
    const createPubRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiter.authHeader)
      .send({
        title: 'Senior Cloud Platform Engineer',
        description: 'Build high-performance resilient cloud infrastructure with Kubernetes, Go, and Kafka.',
        responsibilities: 'Manage Kubernetes clusters, optimize CI/CD pipelines, and scale distributed event backbones.',
        requirements: 'At least 5 years experience with cloud architecture and microservices.',
        companyName: 'Apex Cloud Innovations',
        location: 'San Francisco, CA',
        city: 'San Francisco',
        country: 'USA',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceMin: 4,
        experienceMax: 8,
        salaryMin: 150000,
        salaryMax: 195000,
        currency: 'USD',
        salaryPeriod: 'YEARLY',
        status: 'PUBLISHED',
        skills: [
          { name: 'Kubernetes', importance: 'REQUIRED', minimumYears: 3 },
          { name: 'Go', importance: 'REQUIRED', minimumYears: 2 },
          { name: 'Kafka', importance: 'PREFERRED', minimumYears: 1 },
        ],
      });
    assert.strictEqual(createPubRes.status, 201, `Expected 201 from createJob, got ${createPubRes.status}`);
    const publishedJob = createPubRes.body.data;
    createdJobIds.push(publishedJob.id);
    console.log('  ✅ Recruiter created a PUBLISHED job posting');

    // 2. Recruiter creates a DRAFT job vacancy
    const createDraftRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiter.authHeader)
      .send({
        title: 'Unpublished Internal Architect Draft',
        description: 'Confidential draft role not yet approved for external publication.',
        status: 'DRAFT',
      });
    assert.strictEqual(createDraftRes.status, 201, `Expected 201 from draft createJob, got ${createDraftRes.status}`);
    const draftJob = createDraftRes.body.data;
    createdJobIds.push(draftJob.id);
    console.log('  ✅ Recruiter created a DRAFT job posting');

    // 3. Public Job Listing (Unauthenticated Candidate Discovery)
    const listRes = await supertest.get('/api/v1/jobs');
    assert.strictEqual(listRes.status, 200, `Expected 200 from GET /jobs, got ${listRes.status}`);
    assert.strictEqual(Array.isArray(listRes.body.data), true);
    console.log('  ✅ Public discovery returns active published jobs');

    // 4. Draft Job MUST NOT appear in public listings
    const draftInListing = listRes.body.data.some((j: any) => j.id === draftJob.id);
    assert.strictEqual(draftInListing, false, 'Draft jobs must never appear in public discovery search');
    console.log('  ✅ Draft job excluded from public discovery listings');

    // 5. Keyword search filter
    const searchRes = await supertest.get('/api/v1/jobs?search=Kubernetes');
    assert.strictEqual(searchRes.status, 200);
    const foundPublished = searchRes.body.data.some((j: any) => j.id === publishedJob.id);
    assert.strictEqual(foundPublished, true, 'Published job matching search term should be in results');
    console.log('  ✅ Search query filtering validated');

    // 6. WorkMode filter
    const workModeRes = await supertest.get('/api/v1/jobs?workMode=REMOTE');
    assert.strictEqual(workModeRes.status, 200);
    const allRemote = workModeRes.body.data.every((j: any) => j.workMode === 'REMOTE');
    assert.strictEqual(allRemote, true, 'All filtered jobs must match requested workMode');
    console.log('  ✅ WorkMode filter validated');

    // 7. Get single published job by ID
    const singleRes = await supertest.get(`/api/v1/jobs/${publishedJob.id}`);
    assert.strictEqual(singleRes.status, 200, `Expected 200, got ${singleRes.status}`);
    assert.strictEqual(singleRes.body.data.id, publishedJob.id);
    console.log('  ✅ Public single job retrieval by ID verified');

    // 8. Attempt to get DRAFT job publicly -> 404
    const draftPublicRes = await supertest.get(`/api/v1/jobs/${draftJob.id}`);
    assert.strictEqual(draftPublicRes.status, 404, `Public lookup of draft job should return 404, got ${draftPublicRes.status}`);
    console.log('  ✅ Public access to draft job correctly blocked with 404');

    // 9. Non-existent job lookup -> 404
    const missingRes = await supertest.get('/api/v1/jobs/00000000-0000-0000-0000-000000000000');
    assert.strictEqual(missingRes.status, 404, `Missing job should return 404, got ${missingRes.status}`);
    console.log('  ✅ Non-existent job correctly returned 404');

    // 10. Invalid query parameters validation -> 400
    const invalidQueryRes = await supertest.get('/api/v1/jobs?salaryMin=200000&salaryMax=100000');
    assert.strictEqual(invalidQueryRes.status, 400, `salaryMax < salaryMin should return 400, got ${invalidQueryRes.status}`);
    console.log('  ✅ Invalid filter query rejected with 400 validation error');

    console.log('🎉 Jobs discovery integration test suite passed!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([recruiter.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('jobs.test.ts') || process.argv[1]?.endsWith('jobs.test.js')) {
  runJobsTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Jobs integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
