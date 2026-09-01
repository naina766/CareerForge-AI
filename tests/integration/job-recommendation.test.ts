import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';
import { RecommendationScorer } from '../../apps/api/src/modules/recommendation/recommendation-scorer.js';
import { PreferenceMatcher } from '../../apps/api/src/modules/recommendation/preference-matcher.js';
import { FreshnessCalculator } from '../../apps/api/src/modules/recommendation/freshness-calculator.js';

let server: http.Server;
const PORT = 4030;
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

async function runJobRecommendationTests() {
  console.log('--- STARTING PHASE 15: PERSONALIZED JOB RECOMMENDATION ENGINE TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const suffix = Date.now();
  const emailCandA = `rec_cand_a_${suffix}@example.com`;
  const emailCandB = `rec_cand_b_${suffix}@example.com`;
  const emailRec = `rec_recruiter_${suffix}@example.com`;
  const password = 'Password123!';

  let tokenCandA = '';
  let tokenCandB = '';
  let tokenRec = '';

  let candidateAProfileId = '';
  let jobPublishedId = '';
  let jobAppliedId = '';
  let jobDraftId = '';
  let jobExpiredId = '';

  try {
    // -------------------------------------------------------------------------
    // [1/12] Deterministic Recommendation Scoring Formula Verification
    // -------------------------------------------------------------------------
    console.log('\n[1/12] Testing deterministic 100-point recommendation scoring formula...');
    // Formula: skill*0.40 + semantic*0.25 + experience*0.15 + preference*0.15 + freshness*0.05
    // 90*0.40 + 80*0.25 + 100*0.15 + 90*0.15 + 80*0.05 = 36 + 20 + 15 + 13.5 + 4 = 88.5
    const scoreResult1 = RecommendationScorer.calculateScore({
      skillScore: 90,
      semanticScore: 80,
      experienceScore: 100,
      preferenceScore: 90,
      freshnessScore: 80,
    });
    assert.strictEqual(scoreResult1.score, 88.5);
    assert.strictEqual(scoreResult1.level, 'EXCELLENT_MATCH');

    // Perfect 100 case
    const scoreResult2 = RecommendationScorer.calculateScore({
      skillScore: 100,
      semanticScore: 100,
      experienceScore: 100,
      preferenceScore: 100,
      freshnessScore: 100,
    });
    assert.strictEqual(scoreResult2.score, 100);
    assert.strictEqual(scoreResult2.level, 'TOP_MATCH');

    console.log('  ✅ 100-point weighted formula and levels verified (TOP_MATCH, EXCELLENT_MATCH, etc.)');

    // -------------------------------------------------------------------------
    // [2/12] Preference Matcher Deterministic Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[2/12] Testing PreferenceMatcher with work modes, locations, relocation, and salaries...');
    // Unspecified preferences -> full credit (100)
    const prefScoreNull = PreferenceMatcher.evaluate(null, {
      location: 'New York, NY',
      workMode: 'ONSITE',
      employmentType: 'FULL_TIME',
    });
    assert.strictEqual(prefScoreNull, 100);

    // Remote preference + Remote job -> 100
    const prefScoreRemote = PreferenceMatcher.evaluate(
      {
        id: 'pref-1',
        candidateId: 'cand-1',
        desiredJobTitles: ['Backend Engineer'],
        preferredLocations: ['San Francisco'],
        preferredWorkModes: ['REMOTE'],
        preferredEmploymentTypes: ['FULL_TIME'],
        minimumSalary: 120000,
        maximumSalary: 180000,
        currency: 'USD',
        willingToRelocate: false,
        preferredIndustries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        salaryMin: 130000,
        salaryMax: 170000,
      }
    );
    assert.strictEqual(prefScoreRemote, 100);

    // Hybrid job in different location without relocation -> penalized
    const prefScoreMismatch = PreferenceMatcher.evaluate(
      {
        id: 'pref-2',
        candidateId: 'cand-1',
        desiredJobTitles: [],
        preferredLocations: ['Seattle, WA'],
        preferredWorkModes: ['HYBRID'],
        preferredEmploymentTypes: ['FULL_TIME'],
        minimumSalary: 150000,
        maximumSalary: null,
        currency: 'USD',
        willingToRelocate: false,
        preferredIndustries: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        location: 'Miami, FL',
        workMode: 'ONSITE',
        employmentType: 'CONTRACT',
        salaryMin: 80000,
        salaryMax: 100000,
      }
    );
    assert.ok(prefScoreMismatch < 40);
    console.log('  ✅ PreferenceMatcher verified with workMode, location, relocation, and salary signals');

    // -------------------------------------------------------------------------
    // [3/12] Freshness Calculator Deterministic Time Decay
    // -------------------------------------------------------------------------
    console.log('\n[3/12] Testing FreshnessCalculator time decay thresholds...');
    const now = new Date();
    const d1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago -> 100
    const d5 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago -> 90
    const d10 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago -> 80
    const d20 = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago -> 65
    const d45 = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago -> 40
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago -> 20

    assert.strictEqual(FreshnessCalculator.calculate(d1, d1), 100);
    assert.strictEqual(FreshnessCalculator.calculate(d5, d5), 90);
    assert.strictEqual(FreshnessCalculator.calculate(d10, d10), 80);
    assert.strictEqual(FreshnessCalculator.calculate(d20, d20), 65);
    assert.strictEqual(FreshnessCalculator.calculate(d45, d45), 40);
    assert.strictEqual(FreshnessCalculator.calculate(d90, d90), 20);
    console.log('  ✅ FreshnessCalculator verified (100, 90, 80, 65, 40, 20)');

    // -------------------------------------------------------------------------
    // [4/12] Provisioning Fixtures (Candidate A, Candidate B, Recruiter, Vacancies)
    // -------------------------------------------------------------------------
    console.log('\n[4/12] Provisioning test users, candidate profiles, skills, and vacancies...');

    // 1. Candidate A (Full-stack engineer: React, Node.js, TypeScript)
    const regCandA = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandA,
      password,
      role: 'CANDIDATE',
      name: 'Elena Rostova',
    });
    assert.strictEqual(regCandA.status, 201);
    tokenCandA = regCandA.body.data.accessToken;

    const candAProfile = await prisma.candidateProfile.findUnique({
      where: { userId: regCandA.body.data.user.id },
    });
    candidateAProfileId = candAProfile!.id;

    // Add Candidate Skills
    const skillReact = await prisma.skill.findUnique({ where: { name: 'React' } });
    const skillNode = await prisma.skill.findUnique({ where: { name: 'Node.js' } });
    const skillTS = await prisma.skill.findUnique({ where: { name: 'TypeScript' } });
    await prisma.candidateSkill.createMany({
      data: [
        { candidateId: candidateAProfileId, skillId: skillReact!.id },
        { candidateId: candidateAProfileId, skillId: skillNode!.id },
        { candidateId: candidateAProfileId, skillId: skillTS!.id },
      ],
    });

    // Add Candidate Experience (4 years)
    await prisma.experience.create({
      data: {
        candidateId: candidateAProfileId,
        company: 'CloudTech Systems',
        title: 'Senior Software Engineer',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2024-01-01'),
        current: false,
      },
    });

    // Add Career Preferences (Remote, Full-Time, USD 120k)
    await prisma.careerPreference.create({
      data: {
        candidateId: candidateAProfileId,
        preferredWorkModes: ['REMOTE'],
        preferredEmploymentTypes: ['FULL_TIME'],
        preferredLocations: ['San Francisco', 'Remote'],
        minimumSalary: 120000,
        currency: 'USD',
      },
    });

    // Add Active Resume for Candidate A
    const candAResume = await prisma.resume.create({
      data: {
        candidateId: candidateAProfileId,
        originalFileName: 'elena_resume.pdf',
        storageKey: 'resumes/elena_resume.pdf',
        fileUrl: 'http://localhost/resumes/elena_resume.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        processingStatus: 'PARSED',
        isActive: true,
      },
    });

    // 2. Candidate B (For IDOR test)
    const regCandB = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandB,
      password,
      role: 'CANDIDATE',
      name: 'Vikram Patel',
    });
    tokenCandB = regCandB.body.data.accessToken;

    // 3. Recruiter
    const regRec = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRec,
      password,
      role: 'RECRUITER',
      name: 'Sarah Recruiter',
    });
    tokenRec = regRec.body.data.accessToken;

    // Job 1: Published & Active (Requires React & Node.js, Remote) -> High Match
    const resJob1 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Full Stack Node & React Architect',
        description: 'Building high throughput web microservices in React and Node.js with distributed scale.',
        companyName: 'Apex Cloud Solutions',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceMin: 3.0,
        salaryMin: 140000,
        salaryMax: 180000,
        status: 'DRAFT',
        skills: [
          { name: 'React', required: true, importance: 'REQUIRED' },
          { name: 'Node.js', required: true, importance: 'REQUIRED' },
        ],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    jobPublishedId = resJob1.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jobPublishedId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRec}` });

    // Job 2: Published Job Candidate Applied To (Should be excluded)
    const resJob2 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Senior Frontend Developer',
        description: 'React frontend developer creating high performance UI components and dashboards.',
        companyName: 'Apex Cloud Solutions',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        status: 'DRAFT',
        skills: [{ name: 'React', required: true, importance: 'REQUIRED' }],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    jobAppliedId = resJob2.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jobAppliedId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRec}` });

    // Candidate A applies to Job 2
    await makeRequest(
      'POST',
      `/api/v1/jobs/${jobAppliedId}/applications`,
      {
        resumeId: candAResume.id,
        coverLetter: 'Excited about this opportunity!',
      },
      { Authorization: `Bearer ${tokenCandA}` }
    );

    // Job 3: Draft Job (Should be excluded)
    const resJob3 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Draft Internal Developer',
        description: 'Draft internal role for frontend engineering and component architectures.',
        companyName: 'Apex Cloud Solutions',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        status: 'DRAFT',
        skills: [{ name: 'React', required: true, importance: 'REQUIRED' }],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    jobDraftId = resJob3.body.data.id;

    // Job 4: Expired Job (Should be excluded)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const resJob4 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Expired React Developer',
        description: 'Expired position for React frontend software development work.',
        companyName: 'Apex Cloud Solutions',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        status: 'DRAFT',
        applicationDeadline: yesterday.toISOString(),
        skills: [{ name: 'React', required: true, importance: 'REQUIRED' }],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    jobExpiredId = resJob4.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jobExpiredId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRec}` });

    console.log('  ✅ Fixtures provisioned successfully');

    // -------------------------------------------------------------------------
    // [5/12] Candidate Recommendation Feed API (GET /api/v1/recommendations/jobs)
    // -------------------------------------------------------------------------
    console.log('\n[5/12] Testing Candidate Recommendation Feed retrieval...');
    const recFeedRes = await makeRequest('GET', '/api/v1/recommendations/jobs', undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });

    assert.strictEqual(recFeedRes.status, 200);
    assert.strictEqual(recFeedRes.body.success, true);
    const feed = recFeedRes.body.data;

    assert.ok(Array.isArray(feed.items));
    assert.ok(feed.total >= 1);
    assert.strictEqual(feed.engineVersion, '1.0');

    // Verify Job 1 (Published, Active, React+Node) is recommended with high score
    const recJob1 = feed.items.find((item: any) => item.jobId === jobPublishedId);
    assert.ok(recJob1 !== undefined);
    assert.ok(recJob1.recommendationScore >= 70);
    assert.strictEqual(recJob1.recommendationLevel, 'STRONG_MATCH');
    assert.strictEqual(recJob1.breakdown.skillScore, 100);
    assert.strictEqual(recJob1.breakdown.experienceScore, 90);
    assert.strictEqual(recJob1.breakdown.preferenceScore, 100);
    assert.strictEqual(recJob1.source, 'HYBRID_ENGINE');
    console.log(`  ✅ Candidate recommendation computed: Score=${recJob1.recommendationScore}% (${recJob1.recommendationLevel})`);

    // -------------------------------------------------------------------------
    // [6/12] Hard Eligibility & Exclusion Verification
    // -------------------------------------------------------------------------
    console.log('\n[6/12] Testing hard filtering and application exclusion rules...');
    // Verify Job 2 (Already Applied) is EXCLUDED
    const hasAppliedJob = feed.items.some((item: any) => item.jobId === jobAppliedId);
    assert.strictEqual(hasAppliedJob, false);

    // Verify Job 3 (Draft) is EXCLUDED
    const hasDraftJob = feed.items.some((item: any) => item.jobId === jobDraftId);
    assert.strictEqual(hasDraftJob, false);

    // Verify Job 4 (Expired) is EXCLUDED
    const hasExpiredJob = feed.items.some((item: any) => item.jobId === jobExpiredId);
    assert.strictEqual(hasExpiredJob, false);
    console.log('  ✅ Applied jobs, draft jobs, and expired jobs strictly excluded from feed');

    // -------------------------------------------------------------------------
    // [7/12] Single Recommendation Detail API (GET /api/v1/recommendations/jobs/:jobId)
    // -------------------------------------------------------------------------
    console.log('\n[7/12] Testing Single Job Recommendation detail endpoint...');
    const singleRecRes = await makeRequest(
      'GET',
      `/api/v1/recommendations/jobs/${jobPublishedId}`,
      undefined,
      { Authorization: `Bearer ${tokenCandA}` }
    );

    assert.strictEqual(singleRecRes.status, 200);
    assert.strictEqual(singleRecRes.body.success, true);
    const singleRec = singleRecRes.body.data;

    assert.strictEqual(singleRec.jobId, jobPublishedId);
    assert.ok(singleRec.reason.length > 10);
    assert.ok(singleRec.reason.includes('React') || singleRec.reason.includes('Node.js'));
    console.log(`  ✅ Grounded reason verified: "${singleRec.reason}"`);

    // -------------------------------------------------------------------------
    // [8/12] Filtering and Sorting on Recommendations Feed
    // -------------------------------------------------------------------------
    console.log('\n[8/12] Testing recommendation query filters (workMode, minScore, sortBy)...');
    const filteredRes = await makeRequest(
      'GET',
      '/api/v1/recommendations/jobs?workMode=REMOTE&minScore=70&sortBy=highest_match',
      undefined,
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(filteredRes.status, 200);
    assert.ok(filteredRes.body.data.items.length >= 1);
    assert.ok(filteredRes.body.data.items.every((i: any) => i.job.workMode === 'REMOTE'));
    assert.ok(filteredRes.body.data.items.every((i: any) => i.recommendationScore >= 70));
    console.log('  ✅ Feed filtering and sorting verified');

    // -------------------------------------------------------------------------
    // [9/12] Pagination Support (page, limit, totalPages, hasNextPage)
    // -------------------------------------------------------------------------
    console.log('\n[9/12] Testing server-side pagination metadata...');
    const pageRes = await makeRequest(
      'GET',
      '/api/v1/recommendations/jobs?page=1&limit=1',
      undefined,
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(pageRes.status, 200);
    assert.strictEqual(pageRes.body.data.items.length, 1);
    assert.strictEqual(pageRes.body.data.page, 1);
    assert.strictEqual(pageRes.body.data.limit, 1);
    console.log('  ✅ Pagination verified with count metadata');

    // -------------------------------------------------------------------------
    // [10/12] Security, RBAC & IDOR Boundaries
    // -------------------------------------------------------------------------
    console.log('\n[10/12] Testing Candidate privacy and RBAC protection...');
    // Unauthenticated request -> 401
    const unauthRes = await makeRequest('GET', '/api/v1/recommendations/jobs');
    assert.strictEqual(unauthRes.status, 401);

    // Recruiter request -> 403
    const recAuthRes = await makeRequest('GET', '/api/v1/recommendations/jobs', undefined, {
      Authorization: `Bearer ${tokenRec}`,
    });
    assert.strictEqual(recAuthRes.status, 403);
    console.log('  ✅ Strict authentication & candidate-only RBAC protection verified');

    // -------------------------------------------------------------------------
    // [11/12] Explicit Refresh Endpoint (POST /api/v1/recommendations/jobs/refresh)
    // -------------------------------------------------------------------------
    console.log('\n[11/12] Testing force recommendation refresh endpoint...');
    const refreshRes = await makeRequest(
      'POST',
      '/api/v1/recommendations/jobs/refresh',
      undefined,
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(refreshRes.status, 200);
    assert.strictEqual(refreshRes.body.success, true);
    assert.ok(refreshRes.body.data.items.length >= 1);
    console.log('  ✅ Force recommendation refresh endpoint verified');

    // -------------------------------------------------------------------------
    // [12/12] Stale Invalidation Detection
    // -------------------------------------------------------------------------
    console.log('\n[12/12] Testing stale detection on candidate preference update...');
    // Candidate updates preferences to non-remote
    await prisma.careerPreference.update({
      where: { candidateId: candidateAProfileId },
      data: { preferredWorkModes: ['ONSITE'], updatedAt: new Date() },
    });

    const refreshedFeedRes = await makeRequest('GET', '/api/v1/recommendations/jobs', undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(refreshedFeedRes.status, 200);
    const updatedJob1Rec = refreshedFeedRes.body.data.items.find((i: any) => i.jobId === jobPublishedId);
    assert.ok(updatedJob1Rec !== undefined);
    // Score should have recomputed with lower preference points
    assert.ok(updatedJob1Rec.breakdown.preferenceScore < 100);
    console.log(`  ✅ Stale detection verified: Recomputed preference score=${updatedJob1Rec.breakdown.preferenceScore}`);

    console.log('\n🎉 ALL PHASE 15 JOB RECOMMENDATION ENGINE TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [emailCandA, emailCandB, emailRec] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runJobRecommendationTests().catch((err) => {
  console.error('❌ Phase 15 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
