import assert from 'node:assert';
import { supertest, createTestRecruiter, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runRecruiterTests() {
  console.log('\n--- 🧪 RUNNING RECRUITER E2E INTEGRATION TESTS ---');
  const recruiterA = await createTestRecruiter('rec-a', 'Alpha Global Tech');
  const recruiterB = await createTestRecruiter('rec-b', 'Beta Industries');
  const createdJobIds: string[] = [];

  try {
    // 1. Recruiter A creates a job posting
    const createRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiterA.authHeader)
      .send({
        title: 'Staff Site Reliability Engineer',
        description: 'Lead high-availability distributed systems operations across Kubernetes clusters.',
        status: 'DRAFT',
      });
    assert.strictEqual(createRes.status, 201);
    const jobA = createRes.body.data;
    createdJobIds.push(jobA.id);
    console.log('  ✅ Recruiter A created job posting');

    // 2. Recruiter A retrieves their own jobs list
    const listRes = await supertest
      .get('/api/v1/recruiter/jobs')
      .set('Authorization', recruiterA.authHeader);
    assert.strictEqual(listRes.status, 200);
    const hasJobA = listRes.body.data.items.some((j: any) => j.id === jobA.id);
    assert.strictEqual(hasJobA, true);
    console.log('  ✅ Recruiter A listed own jobs');

    // 3. Recruiter A updates the job
    const updateRes = await supertest
      .patch(`/api/v1/recruiter/jobs/${jobA.id}`)
      .set('Authorization', recruiterA.authHeader)
      .send({
        title: 'Principal Site Reliability Engineer',
        salaryMin: 180000,
        salaryMax: 240000,
      });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.title, 'Principal Site Reliability Engineer');
    console.log('  ✅ Recruiter A updated job details');

    // 4. Recruiter A updates job status to PUBLISHED
    const statusRes = await supertest
      .patch(`/api/v1/recruiter/jobs/${jobA.id}/status`)
      .set('Authorization', recruiterA.authHeader)
      .send({ status: 'PUBLISHED' });
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.status, 'PUBLISHED');
    console.log('  ✅ Recruiter A published the job');

    // 5. Recruiter B attempts to update Recruiter A's job -> 403 or 404 (Cross-recruiter tenant isolation)
    const crossUpdateRes = await supertest
      .patch(`/api/v1/recruiter/jobs/${jobA.id}`)
      .set('Authorization', recruiterB.authHeader)
      .send({ title: 'Hacked Title By Recruiter B' });
    assert.strictEqual(
      crossUpdateRes.status === 403 || crossUpdateRes.status === 404,
      true,
      `Recruiter B must not modify Recruiter A job, got ${crossUpdateRes.status}`
    );
    console.log('  ✅ Recruiter B blocked from modifying Recruiter A job (Cross-recruiter isolation)');

    // 6. Recruiter B attempts to alter Recruiter A's job status -> 403 or 404
    const crossStatusRes = await supertest
      .patch(`/api/v1/recruiter/jobs/${jobA.id}/status`)
      .set('Authorization', recruiterB.authHeader)
      .send({ status: 'ARCHIVED' });
    assert.strictEqual(
      crossStatusRes.status === 403 || crossStatusRes.status === 404,
      true,
      `Recruiter B must not alter Recruiter A job status, got ${crossStatusRes.status}`
    );
    console.log('  ✅ Recruiter B blocked from changing status of Recruiter A job');

    // 7. Recruiter A views recruiter stats
    const statsRes = await supertest
      .get('/api/v1/recruiter/jobs/stats')
      .set('Authorization', recruiterA.authHeader);
    assert.strictEqual(statsRes.status, 200);
    assert.strictEqual(typeof statsRes.body.data.totalJobs, 'number');
    console.log('  ✅ Recruiter A retrieved recruiter workspace metrics');

    console.log('🎉 Recruiter integration test suite passed!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([recruiterA.id, recruiterB.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('recruiter.test.ts') || process.argv[1]?.endsWith('recruiter.test.js')) {
  runRecruiterTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Recruiter integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
