import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runCompleteCandidateLifecycleTests() {
  console.log('\n--- 🧪 RUNNING COMPLETE CANDIDATE LIFECYCLE E2E FLOW ---');
  const recruiter = await createTestRecruiter('rec-lifecycle', 'Vanguard Systems');
  const createdJobIds: string[] = [];
  const candidateEmail = `lifecycle.candidate.${Date.now()}@test.careerforge.internal`;

  try {
    // 1. Recruiter creates and publishes a target job
    const jobRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiter.authHeader)
      .send({
        title: 'Senior Systems Architect',
        description: 'Architect scalable cloud infrastructure, PostgreSQL databases, and event streaming.',
        location: 'Remote',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        status: 'PUBLISHED',
        skills: [
          { name: 'TypeScript', importance: 'REQUIRED' },
          { name: 'PostgreSQL', importance: 'REQUIRED' },
          { name: 'Kafka', importance: 'PREFERRED' },
        ],
      });
    assert.strictEqual(jobRes.status, 201);
    const job = jobRes.body.data;
    createdJobIds.push(job.id);
    console.log('  1️⃣ Recruiter created target job');

    // 2. Candidate registers
    const registerRes = await supertest
      .post('/api/v1/auth/register')
      .send({
        email: candidateEmail,
        password: 'Password123!',
        role: 'CANDIDATE',
        name: 'Jordan Architect',
      });
    assert.strictEqual(registerRes.status, 201);
    const candidateToken = registerRes.body.data.accessToken;
    const authHeader = `Bearer ${candidateToken}`;
    const candidateId = registerRes.body.data.user.id;
    console.log('  2️⃣ Candidate registered');

    // 3. Candidate verifies authentication (/me)
    const meRes = await supertest
      .get('/api/v1/auth/me')
      .set('Authorization', authHeader);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.data.user.email, candidateEmail);
    console.log('  3️⃣ Candidate authenticated');

    // 4. Candidate completes Profile Onboarding
    const profileRes = await supertest
      .patch('/api/v1/candidates/me/profile')
      .set('Authorization', authHeader)
      .send({
        headline: 'Senior Cloud & Backend Engineer',
        summary: 'Specializing in resilient high-throughput distributed microservices.',
        location: 'Remote',
        city: 'Denver',
        country: 'USA',
        workMode: 'REMOTE',
        experienceYears: 5,
      });
    assert.strictEqual(profileRes.status, 200);
    console.log('  4️⃣ Candidate updated profile');

    // 5. Candidate adds Skills
    await supertest
      .post('/api/v1/candidates/me/skills')
      .set('Authorization', authHeader)
      .send({ name: 'TypeScript', proficiency: 'EXPERT' });
    await supertest
      .post('/api/v1/candidates/me/skills')
      .set('Authorization', authHeader)
      .send({ name: 'PostgreSQL', proficiency: 'ADVANCED' });
    console.log('  5️⃣ Candidate added technical skills');

    // 6. Candidate configures Career Preferences
    const prefRes = await supertest
      .put('/api/v1/candidates/me/preferences')
      .set('Authorization', authHeader)
      .send({
        desiredJobTitles: ['Senior Systems Architect', 'Staff Software Engineer'],
        preferredLocations: ['Remote'],
        preferredWorkModes: ['REMOTE'],
        preferredEmploymentTypes: ['FULL_TIME'],
        minimumSalary: 150000,
      });
    assert.strictEqual(prefRes.status, 200);
    console.log('  6️⃣ Candidate configured career preferences');

    // 7. Candidate uploads PDF Resume
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Jordan Architect Resume) >>\nendobj\n%%EOF');
    const resumeRes = await supertest
      .post('/api/v1/candidates/me/resume')
      .set('Authorization', authHeader)
      .attach('resume', pdfBuffer, 'jordan_resume.pdf');
    assert.strictEqual(resumeRes.status, 201);
    const resumeId = resumeRes.body.data.resume.id;
    console.log('  7️⃣ Candidate uploaded verified PDF resume');

    // 8. Candidate discovers Jobs via Search
    const searchRes = await supertest.get('/api/v1/jobs?search=Architect');
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.body.data.some((j: any) => j.id === job.id), true);
    console.log('  8️⃣ Candidate discovered published job posting');

    // 9. Candidate inspects Job Details
    const detailRes = await supertest.get(`/api/v1/jobs/${job.id}`);
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.data.id, job.id);
    console.log('  9️⃣ Candidate inspected job details');

    // 10. Candidate calculates Hybrid AI Match
    const matchRes = await supertest
      .get(`/api/v1/jobs/${job.id}/match`)
      .set('Authorization', authHeader);
    assert.strictEqual(matchRes.status, 200);
    assert.strictEqual(matchRes.body.data.overallScore > 0, true);
    console.log(`  🔟 Candidate computed match score: ${matchRes.body.data.overallScore}%`);

    // 11. Candidate analyzes Skill Gap
    const gapRes = await supertest
      .get(`/api/v1/jobs/${job.id}/skill-gaps`)
      .set('Authorization', authHeader);
    assert.strictEqual(gapRes.status, 200);
    console.log('  1️⃣1️⃣ Candidate analyzed job skill gaps');

    // 12. Candidate generates Personalized Learning Path
    const lpRes = await supertest
      .get(`/api/v1/jobs/${job.id}/learning-path`)
      .set('Authorization', authHeader);
    assert.strictEqual(lpRes.status, 200);
    console.log('  1️⃣2️⃣ Candidate generated personalized learning path');

    // 13. Candidate applies to Job with uploaded resume
    const applyRes = await supertest
      .post(`/api/v1/jobs/${job.id}/applications`)
      .set('Authorization', authHeader)
      .send({
        resumeId,
        coverLetter: 'I am excited to bring my distributed systems experience to Vanguard Systems.',
      });
    assert.strictEqual(applyRes.status, 201);
    const applicationId = applyRes.body.data.id;
    console.log('  1️⃣3️⃣ Candidate submitted application');

    // 14. Candidate tracks application status
    const appTrackRes = await supertest
      .get(`/api/v1/applications/${applicationId}`)
      .set('Authorization', authHeader);
    assert.strictEqual(appTrackRes.status, 200);
    assert.strictEqual(appTrackRes.body.data.status, 'APPLIED');
    console.log('  1️⃣4️⃣ Candidate tracked application status (APPLIED)');

    console.log('🎉 Complete Candidate 14-Step Lifecycle E2E flow verified successfully!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([candidateEmail, recruiter.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('candidate-lifecycle.test.ts') || process.argv[1]?.endsWith('candidate-lifecycle.test.js')) {
  runCompleteCandidateLifecycleTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Candidate lifecycle integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
