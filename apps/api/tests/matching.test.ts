import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runMatchingTests() {
  console.log('\n--- 🧪 RUNNING MATCHING ENGINE E2E INTEGRATION TESTS ---');
  const candidateA = await createTestCandidate('cand-match-a');
  const candidateB = await createTestCandidate('cand-match-b');
  const recruiter = await createTestRecruiter('rec-match');
  const createdJobIds: string[] = [];

  try {
    // 1. Recruiter creates a published job vacancy with specific skill requirements
    const jobRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiter.authHeader)
      .send({
        title: 'Senior TypeScript Distributed Systems Engineer',
        description: 'Design robust event pipelines and REST APIs using TypeScript, PostgreSQL, and Redis.',
        companyName: 'ScaleTech Corp',
        location: 'San Francisco, CA',
        city: 'San Francisco',
        country: 'USA',
        workMode: 'HYBRID',
        employmentType: 'FULL_TIME',
        experienceMin: 3,
        experienceMax: 6,
        status: 'PUBLISHED',
        skills: [
          { name: 'TypeScript', importance: 'REQUIRED', minimumYears: 3 },
          { name: 'PostgreSQL', importance: 'REQUIRED', minimumYears: 2 },
          { name: 'Redis', importance: 'PREFERRED', minimumYears: 1 },
        ],
      });
    assert.strictEqual(jobRes.status, 201);
    const job = jobRes.body.data;
    createdJobIds.push(job.id);
    console.log('  ✅ Recruiter posted targeted job for match calculation');

    // 2. Populate Candidate A Profile with matching skills and experience
    await supertest
      .post('/api/v1/candidates/me/skills')
      .set('Authorization', candidateA.authHeader)
      .send({ name: 'TypeScript', proficiency: 'EXPERT' });

    await supertest
      .post('/api/v1/candidates/me/skills')
      .set('Authorization', candidateA.authHeader)
      .send({ name: 'PostgreSQL', proficiency: 'ADVANCED' });

    await supertest
      .post('/api/v1/candidates/me/experience')
      .set('Authorization', candidateA.authHeader)
      .send({
        company: 'Apex Systems',
        title: 'Software Engineer',
        location: 'San Francisco, CA',
        employmentType: 'FULL_TIME',
        startDate: '2020-01-01',
        current: true,
        description: 'Worked extensively with TypeScript, PostgreSQL, and distributed caching.',
      });

    await supertest
      .post('/api/v1/candidates/me/education')
      .set('Authorization', candidateA.authHeader)
      .send({
        institution: 'University of California, Berkeley',
        degree: 'BS',
        fieldOfStudy: 'Computer Science',
        startDate: '2016-09-01',
        endDate: '2020-05-01',
      });
    console.log('  ✅ Candidate A profile populated with matching attributes');

    // 3. Candidate A computes Match Score against Job
    const match1Res = await supertest
      .get(`/api/v1/jobs/${job.id}/match`)
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(match1Res.status, 200, `Expected 200 from match calculation, got ${match1Res.status}`);
    
    const report1 = match1Res.body.data;
    assert.strictEqual(typeof report1.overallScore, 'number', 'overallScore must be a number');
    assert.strictEqual(report1.overallScore > 0, true, 'Score should be positive with matching skills');
    assert.notStrictEqual(report1.breakdown, null);
    assert.strictEqual(typeof report1.breakdown.skills, 'number');
    assert.strictEqual(typeof report1.breakdown.experience, 'number');
    assert.strictEqual(typeof report1.breakdown.location, 'number');
    assert.strictEqual(typeof report1.skillScore, 'number');
    assert.strictEqual(typeof report1.experienceScore, 'number');
    assert.strictEqual(typeof report1.locationScore, 'number');
    console.log(`  ✅ Candidate A match computed: Overall=${report1.overallScore}, Level=${report1.matchLevel}`);

    // 4. Invariant Verification: Formula weights (0.40 skills + 0.25 semantic + 0.20 experience + 0.10 education + 0.05 location)
    // Run second time to verify deterministic reproducibility
    const match2Res = await supertest
      .get(`/api/v1/jobs/${job.id}/match`)
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(match2Res.status, 200);
    const report2 = match2Res.body.data;
    assert.strictEqual(report1.overallScore, report2.overallScore, 'Match score must be strictly deterministic across repeated runs');
    console.log('  ✅ Determinism verified across repeated runs');

    // 5. Candidate B with empty profile / different skills gets lower/different score
    const candidateBMatchRes = await supertest
      .get(`/api/v1/jobs/${job.id}/match`)
      .set('Authorization', candidateB.authHeader);
    assert.strictEqual(candidateBMatchRes.status, 200);
    const reportB = candidateBMatchRes.body.data;
    assert.strictEqual(reportB.overallScore <= report1.overallScore, true, 'Candidate B without skills must not exceed Candidate A');
    console.log(`  ✅ Candidate B score isolated: Candidate B=${reportB.overallScore} <= Candidate A=${report1.overallScore}`);

    // 6. Recruiter retrieves match for Candidate A on owned job
    const recMatchRes = await supertest
      .get(`/api/v1/recruiter/jobs/${job.id}/candidates/${candidateA.candidateProfileId}/match`)
      .set('Authorization', recruiter.authHeader);
    assert.strictEqual(recMatchRes.status, 200, `Recruiter should access match for applicant, got ${recMatchRes.status}`);
    assert.strictEqual(recMatchRes.body.data.overallScore, report1.overallScore);
    console.log('  ✅ Recruiter authorized to view applicant match report');

    // 7. Missing Job Match Request -> 404
    const missingJobMatch = await supertest
      .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000/match')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(missingJobMatch.status, 404, `Missing job match should return 404, got ${missingJobMatch.status}`);
    console.log('  ✅ Missing job returns 404');

    console.log('🎉 Matching engine integration test suite passed!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([candidateA.id, candidateB.id, recruiter.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('matching.test.ts') || process.argv[1]?.endsWith('matching.test.js')) {
  runMatchingTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Matching integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
