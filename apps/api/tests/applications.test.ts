import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runApplicationsTests() {
  console.log('\n--- 🧪 RUNNING APPLICATIONS E2E INTEGRATION TESTS ---');
  const candidateA = await createTestCandidate('cand-app-a');
  const candidateB = await createTestCandidate('cand-app-b');
  const recruiter = await createTestRecruiter('rec-app');
  const createdJobIds: string[] = [];

  try {
    // 1. Recruiter creates a published job
    const jobRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiter.authHeader)
      .send({
        title: 'Backend Systems Engineer',
        description: 'Design robust backend services using Node.js and Postgres.',
        status: 'PUBLISHED',
      });
    assert.strictEqual(jobRes.status, 201);
    const job = jobRes.body.data;
    createdJobIds.push(job.id);
    console.log('  ✅ Recruiter created job vacancy for applications flow');

    // 2. Candidate A uploads a valid resume
    const pdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (Candidate Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    const uploadRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', candidateA.authHeader)
      .attach('resume', pdfBuffer, 'resume.pdf');
    assert.strictEqual(uploadRes.status, 201);
    const resumeAId = uploadRes.body.data.resume.id;
    console.log('  ✅ Candidate A uploaded active resume');

    // 3. Candidate A applies to the job
    const applyRes = await supertest
      .post(`/api/v1/jobs/${job.id}/applications`)
      .set('Authorization', candidateA.authHeader)
      .send({
        resumeId: resumeAId,
        coverLetter: 'Excited to apply for this backend position.',
      });
    assert.strictEqual(applyRes.status, 201, `Expected 201 from apply, got ${applyRes.status}`);
    const application = applyRes.body.data;
    assert.strictEqual(application.jobId, job.id);
    assert.strictEqual(application.status, 'APPLIED');
    console.log('  ✅ Candidate A applied to job successfully');

    // 4. Duplicate Application Prevention -> 409
    const dupRes = await supertest
      .post(`/api/v1/jobs/${job.id}/applications`)
      .set('Authorization', candidateA.authHeader)
      .send({
        resumeId: resumeAId,
        coverLetter: 'Attempting duplicate application',
      });
    assert.strictEqual(dupRes.status, 409, `Duplicate application should return 409, got ${dupRes.status}`);
    console.log('  ✅ Duplicate application blocked with 409 Conflict');

    // 5. Candidate A retrieves own application details
    const getAppRes = await supertest
      .get(`/api/v1/applications/${application.id}`)
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(getAppRes.status, 200);
    assert.strictEqual(getAppRes.body.data.id, application.id);
    console.log('  ✅ Candidate retrieved own application details');

    // 6. IDOR: Candidate B cannot retrieve Candidate A's application -> 403 or 404
    const idorRes = await supertest
      .get(`/api/v1/applications/${application.id}`)
      .set('Authorization', candidateB.authHeader);
    assert.strictEqual(
      idorRes.status === 403 || idorRes.status === 404,
      true,
      `Candidate B should not access Candidate A application, got ${idorRes.status}`
    );
    console.log('  ✅ Candidate B blocked from Candidate A application (IDOR prevention)');

    // 7. Recruiter views applicants for the job
    const recruiterAppsRes = await supertest
      .get(`/api/v1/recruiter/jobs/${job.id}/applications`)
      .set('Authorization', recruiter.authHeader);
    assert.strictEqual(recruiterAppsRes.status, 200);
    const hasApp = recruiterAppsRes.body.data.some((a: any) => a.id === application.id);
    assert.strictEqual(hasApp, true, 'Recruiter pipeline must include the new application');
    console.log('  ✅ Recruiter viewed applicant in pipeline');

    // 8. Recruiter updates application status to SCREENING
    const statusRes = await supertest
      .patch(`/api/v1/applications/${application.id}/status`)
      .set('Authorization', recruiter.authHeader)
      .send({
        status: 'SCREENING',
        note: 'Candidate profile matches backend requirements.',
      });
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.data.status, 'SCREENING');
    console.log('  ✅ Recruiter updated application status to SCREENING');

    // 9. Candidate unauthorized to change status -> 403
    const candStatusRes = await supertest
      .patch(`/api/v1/applications/${application.id}/status`)
      .set('Authorization', candidateA.authHeader)
      .send({ status: 'OFFERED' });
    assert.strictEqual(candStatusRes.status, 403, `Candidate must not update status, got ${candStatusRes.status}`);
    console.log('  ✅ Candidate forbidden from altering application status');

    // 10. Candidate withdraws application
    const withdrawRes = await supertest
      .post(`/api/v1/applications/${application.id}/withdraw`)
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(withdrawRes.status, 200);
    console.log('  ✅ Candidate successfully withdrew application');

    console.log('🎉 Applications integration test suite passed!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([candidateA.id, candidateB.id, recruiter.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('applications.test.ts') || process.argv[1]?.endsWith('applications.test.js')) {
  runApplicationsTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Applications integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
