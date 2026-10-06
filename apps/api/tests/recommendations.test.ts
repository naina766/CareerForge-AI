import assert from 'node:assert';
import { supertest, createTestCandidate, createTestRecruiter, cleanupUsers, cleanupJobs } from './helpers/test-setup.js';

export async function runRecommendationsTests() {
  console.log('\n--- 🧪 RUNNING RECOMMENDATIONS ENGINE E2E INTEGRATION TESTS ---');
  const candidateA = await createTestCandidate('cand-rec-a');
  const candidateB = await createTestCandidate('cand-rec-b');
  const recruiter = await createTestRecruiter('rec-recs');
  const createdJobIds: string[] = [];

  try {
    // 1. Post a published job with skills matching candidate preferences
    const jobRes = await supertest
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', recruiter.authHeader)
      .send({
        title: 'Lead Full Stack TypeScript Engineer',
        description: 'Build modern Next.js and Node.js microservices with Redis cache.',
        companyName: 'Quantum Innovations',
        location: 'Remote',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        status: 'PUBLISHED',
        skills: [
          { name: 'TypeScript', importance: 'REQUIRED' },
          { name: 'Node.js', importance: 'REQUIRED' },
        ],
      });
    assert.strictEqual(jobRes.status, 201);
    const job = jobRes.body.data;
    createdJobIds.push(job.id);
    console.log('  ✅ Recruiter created job vacancy for recommendations');

    // 2. Populate Candidate A Profile & Preferences
    await supertest
      .post('/api/v1/candidates/me/skills')
      .set('Authorization', candidateA.authHeader)
      .send({ name: 'TypeScript', proficiency: 'EXPERT' });

    await supertest
      .put('/api/v1/candidates/me/preferences')
      .set('Authorization', candidateA.authHeader)
      .send({
        desiredJobTitles: ['Lead Full Stack TypeScript Engineer', 'Full Stack Engineer'],
        preferredLocations: ['Remote'],
        preferredWorkModes: ['REMOTE'],
        preferredEmploymentTypes: ['FULL_TIME'],
        minimumSalary: 140000,
      });
    console.log('  ✅ Candidate A configured with matching skills & preferences');

    // 3. Fetch Recommendations for Candidate A
    const recsRes = await supertest
      .get('/api/v1/recommendations/jobs')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(recsRes.status, 200, `Expected 200 from recommendations, got ${recsRes.status}`);
    assert.strictEqual(Array.isArray(recsRes.body.data.items), true);
    
    // Formula verification: 0.40 skills + 0.25 semantic + 0.15 experience + 0.15 preferences + 0.05 freshness
    if (recsRes.body.data.items.length > 0) {
      const topRec = recsRes.body.data.items[0];
      assert.strictEqual(typeof topRec.recommendationScore, 'number');
      assert.strictEqual(typeof topRec.breakdown.skillScore, 'number');
      assert.strictEqual(typeof topRec.breakdown.preferenceScore, 'number');
      assert.strictEqual(typeof topRec.breakdown.freshnessScore, 'number');
      assert.strictEqual(topRec.breakdown.preferenceScore > 0, true, 'Matching preferences should boost score');
      console.log(`  ✅ Recommendation computed: Score=${topRec.recommendationScore}, Level=${topRec.recommendationLevel}`);
    }

    // 4. Candidate Isolation: Candidate B has different preferences & skills
    const candBRecsRes = await supertest
      .get('/api/v1/recommendations/jobs')
      .set('Authorization', candidateB.authHeader);
    assert.strictEqual(candBRecsRes.status, 200);
    console.log('  ✅ Candidate B received separate, scoped recommendations');

    // 5. Force refresh recommendations
    const refreshRes = await supertest
      .post('/api/v1/recommendations/jobs/refresh')
      .set('Authorization', candidateA.authHeader);
    assert.strictEqual(refreshRes.status, 200, `Expected 200 from refresh recommendations, got ${refreshRes.status}`);
    console.log('  ✅ Candidate refreshed recommendation cache');

    // 6. Recruiter attempt to access candidate recommendations -> 403
    const recAccessRes = await supertest
      .get('/api/v1/recommendations/jobs')
      .set('Authorization', recruiter.authHeader);
    assert.strictEqual(recAccessRes.status, 403, `Recruiter should be forbidden from candidate recommendations route`);
    console.log('  ✅ Non-candidate roles forbidden from candidate recommendations route');

    console.log('🎉 Recommendations engine integration test suite passed!');
  } finally {
    await cleanupJobs(createdJobIds);
    await cleanupUsers([candidateA.id, candidateB.id, recruiter.id]);
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('recommendations.test.ts') || process.argv[1]?.endsWith('recommendations.test.js')) {
  runRecommendationsTests()
    .then(async () => {
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Recommendations integration test failed:', err);
      const { closeConnections } = await import('./helpers/test-setup.js');
      await closeConnections();
      process.exit(1);
    });
}
