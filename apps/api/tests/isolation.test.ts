import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, createTestAdmin, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runIdorTests() {
  console.log('\n--- 🧪 RUNNING IDOR & CROSS-TENANT PERMISSION BOUNDARY TESTS ---');
  const candidateA = await createTestCandidate('cand-idor-a');
  const candidateB = await createTestCandidate('cand-idor-b');
  const recruiterA = await createTestRecruiter('rec-idor-a');
  const recruiterB = await createTestRecruiter('rec-idor-b');
  const admin = await createTestAdmin('admin-idor');
  const createdJobIds: string[] = [];

  try {
    // Setup resources: Job by Recruiter A, Resume & Application by Candidate A
    const jobRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiterA.authHeader)
      .send({
        title: 'IDOR Security Test Engineer',
        description: 'Verify strict cross-tenant isolation and security boundaries.',
        status: 'PUBLISHED',
      });
    assert.strictEqual(jobRes.status, 201);
    const jobA = jobRes.body.data;
    createdJobIds.push(jobA.id);

    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Candidate A IDOR Resume) >>\nendobj\n%%EOF');
    const uploadRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', pdfBuffer, 'resume.pdf');
    assert.strictEqual(uploadRes.status, 201);
    const resumeAId = uploadRes.body.data.resume.id;

    const applyRes = await supertest
      .post(`/api/v1/jobs/${jobA.id}/applications`)
      .set('Authorization', candidateA.authHeader)
      .send({ resumeId: resumeAId });
    assert.strictEqual(applyRes.status, 201);
    const appAId = applyRes.body.data.id;

    // 1. IDOR TEST: Candidate B attempts to read Candidate A's application -> 403 or 404
    const idorAppRes = await supertest
      .get(`/api/v1/applications/${appAId}`)
      .set('Authorization', candidateB.authHeader);
    assert.strictEqual(
      idorAppRes.status === 403 || idorAppRes.status === 404,
      true,
      `Candidate B must not access Candidate A application, got ${idorAppRes.status}`
    );
    console.log('  ✅ IDOR: Candidate B blocked from Candidate A application (403/404)');

    // 2. IDOR TEST: Candidate B attempts to withdraw Candidate A's application -> 403 or 404
    const idorWithdrawRes = await supertest
      .post(`/api/v1/applications/${appAId}/withdraw`)
      .set('Authorization', candidateB.authHeader);
    assert.strictEqual(
      idorWithdrawRes.status === 403 || idorWithdrawRes.status === 404,
      true,
      `Candidate B must not withdraw Candidate A application, got ${idorWithdrawRes.status}`
    );
    console.log('  ✅ IDOR: Candidate B blocked from withdrawing Candidate A application');

    // 3. IDOR TEST: Recruiter B attempts to view applicants for Recruiter A's job -> 403 or 404
    const idorRecruiterRes = await supertest
      .get(`/api/v1/recruiter/jobs/${jobA.id}/applications`)
      .set('Authorization', recruiterB.authHeader);
    assert.strictEqual(
      idorRecruiterRes.status === 403 || idorRecruiterRes.status === 404,
      true,
      `Recruiter B must not view Recruiter A job applicants, got ${idorRecruiterRes.status}`
    );
    console.log('  ✅ IDOR: Recruiter B blocked from Recruiter A job applicant pipeline');

    // 4. IDOR TEST: Recruiter B attempts to inspect match report for Candidate A on Recruiter A's job -> 403 or 404
    const idorRecMatchRes = await supertest
      .get(`/api/v1/recruiter/jobs/${jobA.id}/candidates/${candidateA.candidateProfileId}/match`)
      .set('Authorization', recruiterB.authHeader);
    assert.strictEqual(
      idorRecMatchRes.status === 403 || idorRecMatchRes.status === 404,
      true,
      `Recruiter B must not view match report on Recruiter A job, got ${idorRecMatchRes.status}`
    );
    console.log('  ✅ IDOR: Recruiter B blocked from viewing match report for Recruiter A job');

    // 5. CROSS-ROLE TEST: Candidate attempts to access Recruiter job endpoints -> 403
    const candOnRecRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', candidateA.authHeader)
      .send({ title: 'Candidate Attempting Recruiter Action', description: 'Invalid action' });
    assert.strictEqual(candOnRecRes.status, 403, `Candidate must be 403 on recruiter routes`);
    console.log('  ✅ RBAC: Candidate blocked from recruiter routes (403)');

    // 6. CROSS-ROLE TEST: Recruiter attempts to access Candidate profile endpoints -> 403
    const recOnCandRes = await supertest
      .get('/api/v1/candidates/me/profile')
      .set('Authorization', recruiterA.authHeader);
    assert.strictEqual(recOnCandRes.status, 403, `Recruiter must be 403 on candidate routes`);
    console.log('  ✅ RBAC: Recruiter blocked from candidate routes (403)');

    // 7. CROSS-ROLE TEST: Candidate attempts to access Admin observability routes -> 403
    const candOnAdminRes = await supertest
      .get('/api/v1/admin/observability/metrics')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(candOnAdminRes.status, 403, `Candidate must be 403 on admin routes`);
    console.log('  ✅ RBAC: Candidate blocked from admin routes (403)');

    // 8. CROSS-ROLE TEST: Recruiter attempts to access Admin observability routes -> 403
    const recOnAdminRes = await supertest
      .get('/api/v1/admin/observability/metrics')
      .set('Authorization', recruiterA.authHeader);
    assert.strictEqual(recOnAdminRes.status, 403, `Recruiter must be 403 on admin routes`);
    console.log('  ✅ RBAC: Recruiter blocked from admin routes (403)');

    console.log('🎉 IDOR & tenant isolation integration test suite passed!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([candidateA.id, candidateB.id, recruiterA.id, recruiterB.id, admin.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('isolation.test.ts') || process.argv[1]?.endsWith('isolation.test.js')) {
  runIdorTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ IDOR integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
