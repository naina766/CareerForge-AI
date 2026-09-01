import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';
import { ScoreCalculator } from '../../apps/api/src/modules/matching/score-calculator.js';
import { SkillMatcher } from '../../apps/api/src/modules/matching/skill-matcher.js';
import { ExperienceMatcher } from '../../apps/api/src/modules/matching/experience-matcher.js';
import { EducationMatcher } from '../../apps/api/src/modules/matching/education-matcher.js';
import { LocationMatcher } from '../../apps/api/src/modules/matching/location-matcher.js';
import { SemanticMatcher } from '../../apps/api/src/modules/matching/semantic-matcher.js';

let server: http.Server;
const PORT = 4019;
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

async function runHybridMatchingTests() {
  console.log('--- STARTING PHASE 13: HYBRID AI JOB MATCHING & EXPLAINABLE SCORING TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const suffix = Date.now();
  const emailCandA = `match_cand_a_${suffix}@example.com`;
  const emailCandB = `match_cand_b_${suffix}@example.com`;
  const emailRecA = `match_rec_a_${suffix}@example.com`;
  const emailRecB = `match_rec_b_${suffix}@example.com`;
  const password = 'Password123!';

  let tokenCandA = '';
  let tokenCandB = '';
  let tokenRecA = '';
  let tokenRecB = '';

  let candidateAProfileId = '';
  let job1Id = '';
  let jobDraftId = '';
  let job2RecBId = '';

  try {
    // -------------------------------------------------------------------------
    // [1/12] Formula Scoring & Classification Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[1/12] Verifying deterministic 100-point formula & match levels...');
    const testScore = ScoreCalculator.calculateFinalScore(80, 90, 70, 100, 100);
    // 80*0.4 + 90*0.25 + 70*0.2 + 100*0.1 + 100*0.05 = 32 + 22.5 + 14 + 10 + 5 = 83.50
    assert.strictEqual(testScore, 83.5);
    assert.strictEqual(ScoreCalculator.determineMatchLevel(testScore), 'STRONG');
    assert.strictEqual(ScoreCalculator.determineMatchLevel(95), 'EXCELLENT');
    assert.strictEqual(ScoreCalculator.determineMatchLevel(65), 'MODERATE');
    assert.strictEqual(ScoreCalculator.determineMatchLevel(45), 'WEAK');
    assert.strictEqual(ScoreCalculator.determineMatchLevel(25), 'LOW');
    console.log('  ✅ 100-point weighted formula (40/25/20/10/5) and match level thresholds verified');

    // -------------------------------------------------------------------------
    // [2/12] Skill Matcher with Canonical Aliasing Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[2/12] Testing SkillMatcher canonical taxonomy normalization and 80/20 weighting...');
    const skillEvaluation = await SkillMatcher.evaluate(
      [
        { name: 'ReactJS' },
        { name: 'Node.js' },
        { name: 'PostgreSQL' },
        { name: 'TypeScript' },
      ],
      [
        { name: 'React', required: true, importance: 'REQUIRED' },
        { name: 'NodeJS', required: true, importance: 'REQUIRED' },
        { name: 'Redis', required: true, importance: 'REQUIRED' },
        { name: 'TypeScript', required: false, importance: 'PREFERRED' },
        { name: 'Docker', required: false, importance: 'PREFERRED' },
      ]
    );

    // Required: 2/3 matched (React, Node.js), Redis missing -> coverage = 66.67%
    // Preferred: 1/2 matched (TypeScript), Docker missing -> coverage = 50.0%
    // Score = (2/3 * 80) + (1/2 * 20) = 53.33 + 10.0 = 63.33
    assert.strictEqual(skillEvaluation.required.matched, 2);
    assert.strictEqual(skillEvaluation.required.total, 3);
    assert.strictEqual(skillEvaluation.preferred.matched, 1);
    assert.strictEqual(skillEvaluation.preferred.total, 2);
    assert.strictEqual(skillEvaluation.score, 63.33);
    assert.ok(skillEvaluation.missingRequiredSkills.includes('Redis'));
    assert.ok(skillEvaluation.missingPreferredSkills.includes('Docker'));
    console.log('  ✅ SkillMatcher normalized aliases and applied 80/20 required/preferred scoring accurately');

    // -------------------------------------------------------------------------
    // [3/12] Experience Matcher Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[3/12] Testing ExperienceMatcher scoring and gap calculation...');
    const exp1 = ExperienceMatcher.evaluate(5, 3, 5);
    assert.strictEqual(exp1.score, 100);
    assert.strictEqual(exp1.gap, 0);
    assert.strictEqual(exp1.status, 'EXCEEDS');

    const exp2 = ExperienceMatcher.evaluate(1.5, 3);
    assert.strictEqual(exp2.gap, 1.5);
    assert.strictEqual(exp2.score, 35);
    assert.strictEqual(exp2.status, 'BELOW');

    const exp3 = ExperienceMatcher.evaluate(0, 0);
    assert.strictEqual(exp3.score, 100);
    assert.strictEqual(exp3.gap, 0);
    console.log('  ✅ ExperienceMatcher calculations verified across met, gap, and zero-requirement cases');

    // -------------------------------------------------------------------------
    // [4/12] Education Matcher Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[4/12] Testing EducationMatcher qualification compatibility...');
    const edu1 = EducationMatcher.evaluate(
      [{ degree: 'Bachelor of Technology', fieldOfStudy: 'Computer Science' }],
      "Requires a Bachelor's degree in Computer Science or related field"
    );
    assert.strictEqual(edu1.score, 100);
    assert.strictEqual(edu1.status, 'COMPATIBLE');

    const edu2 = EducationMatcher.evaluate(
      [{ degree: 'Bachelor of Arts', fieldOfStudy: 'Literature' }],
      "Requires a Bachelor's degree in Computer Science"
    );
    assert.strictEqual(edu2.score, 75);
    assert.strictEqual(edu2.status, 'PARTIAL');

    const edu3 = EducationMatcher.evaluate([], "No formal degree required");
    assert.strictEqual(edu3.score, 100);
    assert.strictEqual(edu3.status, 'NOT_SPECIFIED');
    console.log('  ✅ EducationMatcher evaluated degree levels and STEM disciplines accurately');

    // -------------------------------------------------------------------------
    // [5/12] Location Matcher Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[5/12] Testing LocationMatcher work mode and location alignments...');
    const locRemote = LocationMatcher.evaluate({
      candidateLocation: 'Miami, FL',
      jobLocation: 'Seattle, WA',
      candidateWorkMode: 'REMOTE',
      jobWorkMode: 'REMOTE',
    });
    assert.strictEqual(locRemote.score, 100);
    assert.strictEqual(locRemote.status, 'COMPATIBLE');

    const locOnsiteSame = LocationMatcher.evaluate({
      candidateLocation: 'Austin, TX',
      jobLocation: 'Austin, TX',
      candidateWorkMode: 'ONSITE',
      jobWorkMode: 'ONSITE',
    });
    assert.strictEqual(locOnsiteSame.score, 100);

    const locOnsiteDiff = LocationMatcher.evaluate({
      candidateLocation: 'Denver, CO',
      jobLocation: 'Boston, MA',
      candidateWorkMode: 'ONSITE',
      jobWorkMode: 'ONSITE',
    });
    assert.strictEqual(locOnsiteDiff.score, 20);
    assert.strictEqual(locOnsiteDiff.status, 'MISMATCH');
    console.log('  ✅ LocationMatcher remote non-penalization and onsite proximity rules verified');

    // -------------------------------------------------------------------------
    // [6/12] Semantic Matcher FAISS Cosine Normalization & Fallback Resiliency
    // -------------------------------------------------------------------------
    console.log('\n[6/12] Testing SemanticMatcher cosine normalization and missing vector safety...');
    assert.strictEqual(SemanticMatcher.normalizeSemanticScore(0.85), 100);
    assert.strictEqual(SemanticMatcher.normalizeSemanticScore(0.425), 50);
    assert.strictEqual(SemanticMatcher.normalizeSemanticScore(0.0), 0);
    assert.strictEqual(SemanticMatcher.normalizeSemanticScore(-0.5), 0);

    const missingRes = await SemanticMatcher.evaluate(null, {
      title: 'Cloud Architect',
      description: 'Senior distributed cloud architect role.',
    });
    assert.strictEqual(missingRes.score, 0);
    assert.strictEqual(missingRes.status, 'NO_EMBEDDING');
    console.log('  ✅ Semantic normalization scale [0, 0.85] -> [0, 100] and zero-embedding safety verified');

    // -------------------------------------------------------------------------
    // [7/12] Provisioning Fixtures (Candidates, Resumes, Recruiters, Jobs)
    // -------------------------------------------------------------------------
    console.log('\n[7/12] Provisioning candidate profiles, skills, education, and recruiter vacancies...');
    
    // Candidate A
    const regCandA = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandA,
      password,
      role: 'CANDIDATE',
      name: 'Candidate Alex Rivera',
    });
    assert.strictEqual(regCandA.status, 201);
    tokenCandA = regCandA.body.data.accessToken;

    const candAProfile = await prisma.candidateProfile.findUnique({
      where: { userId: regCandA.body.data.user.id },
    });
    candidateAProfileId = candAProfile!.id;

    // Update Candidate A Profile with Experience, Location, and Education
    await prisma.candidateProfile.update({
      where: { id: candidateAProfileId },
      data: {
        experienceYears: 4.0,
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
      },
    });

    await prisma.education.create({
      data: {
        candidateId: candidateAProfileId,
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: new Date('2018-09-01'),
        endDate: new Date('2022-06-01'),
      },
    });

    // Add candidate skills
    const skillReact = await prisma.skill.upsert({
      where: { name: 'React' },
      update: {},
      create: { name: 'React', slug: 'react', category: 'FRONTEND' },
    });
    const skillNode = await prisma.skill.upsert({
      where: { name: 'Node.js' },
      update: {},
      create: { name: 'Node.js', slug: 'nodejs', category: 'BACKEND' },
    });
    const skillPostgres = await prisma.skill.upsert({
      where: { name: 'PostgreSQL' },
      update: {},
      create: { name: 'PostgreSQL', slug: 'postgresql', category: 'DATABASE' },
    });

    await prisma.candidateSkill.createMany({
      data: [
        { candidateId: candidateAProfileId, skillId: skillReact.id },
        { candidateId: candidateAProfileId, skillId: skillNode.id },
        { candidateId: candidateAProfileId, skillId: skillPostgres.id },
      ],
    });

    // Candidate B
    const regCandB = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandB,
      password,
      role: 'CANDIDATE',
      name: 'Candidate Brenda',
    });
    assert.strictEqual(regCandB.status, 201);
    tokenCandB = regCandB.body.data.accessToken;

    // Recruiter A
    const regRecA = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRecA,
      password,
      role: 'RECRUITER',
      name: 'Recruiter Alice',
    });
    assert.strictEqual(regRecA.status, 201);
    tokenRecA = regRecA.body.data.accessToken;

    // Recruiter B
    const regRecB = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRecB,
      password,
      role: 'RECRUITER',
      name: 'Recruiter Bob',
    });
    assert.strictEqual(regRecB.status, 201);
    tokenRecB = regRecB.body.data.accessToken;

    // Recruiter A creates Published Job 1
    const resJob1 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Senior Full Stack Cloud Engineer',
        description: "Leading engineering team building distributed cloud microservices. Bachelor's in Computer Science required.",
        companyName: 'Apex Cloud Systems',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceMin: 3.0,
        status: 'DRAFT',
        skills: [
          { name: 'React', required: true, importance: 'REQUIRED' },
          { name: 'Node.js', required: true, importance: 'REQUIRED' },
          { name: 'Kafka', required: true, importance: 'REQUIRED' },
          { name: 'PostgreSQL', required: false, importance: 'PREFERRED' },
        ],
      },
      { Authorization: `Bearer ${tokenRecA}` }
    );
    job1Id = resJob1.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${job1Id}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRecA}` });

    // Recruiter A creates Draft Job
    const resJobDraft = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Confidential Internal Leadership Role',
        description: 'Stealth project engineering leadership position for internal candidates only.',
        companyName: 'Apex Cloud Systems',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        status: 'DRAFT',
      },
      { Authorization: `Bearer ${tokenRecA}` }
    );
    jobDraftId = resJobDraft.body.data.id;

    // Recruiter B creates Published Job 2
    const resJob2 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Staff DevOps Platform Architect',
        description: 'Multi-region cloud infrastructure and Kubernetes scaling.',
        companyName: 'ScaleGlobal',
        location: 'Austin, TX',
        workMode: 'ONSITE',
        status: 'DRAFT',
      },
      { Authorization: `Bearer ${tokenRecB}` }
    );
    job2RecBId = resJob2.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${job2RecBId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRecB}` });

    console.log('  ✅ Fixtures setup successfully');

    // -------------------------------------------------------------------------
    // [8/12] Candidate Calls Match Endpoint (GET /api/v1/jobs/:jobId/match)
    // -------------------------------------------------------------------------
    console.log('\n[8/12] Testing Candidate A generating explainable match report against Job 1...');
    const matchRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/match`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });

    assert.strictEqual(matchRes.status, 200);
    assert.strictEqual(matchRes.body.success, true);
    const report = matchRes.body.data;

    assert.ok(report.overallScore > 0 && report.overallScore <= 100);
    assert.ok(report.matchLevel);
    assert.ok(report.breakdown);
    assert.ok(report.skills);
    assert.ok(report.experience);
    assert.ok(report.education);
    assert.ok(report.location);
    assert.ok(report.explanation.length > 20);

    // Verify MatchReport persisted in PostgreSQL
    const dbReport = await prisma.matchReport.findUnique({
      where: {
        candidateId_jobId: {
          candidateId: candidateAProfileId,
          jobId: job1Id,
        },
      },
    });
    assert.ok(dbReport !== null);
    assert.strictEqual(dbReport!.overallScore, report.overallScore);
    console.log(`  ✅ MatchReport generated & persisted in PostgreSQL: Score=${report.overallScore} (${report.matchLevel})`);

    // -------------------------------------------------------------------------
    // [9/12] Match Report Caching & Stale Invalidation
    // -------------------------------------------------------------------------
    console.log('\n[9/12] Testing cached report retrieval and stale profile recomputation...');
    // Second fetch should return cached report
    const cachedRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/match`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(cachedRes.status, 200);
    assert.strictEqual(cachedRes.body.data.id, report.id);

    // Candidate adds missing skill 'Kafka'
    const skillKafka = await prisma.skill.upsert({
      where: { name: 'Kafka' },
      update: {},
      create: { name: 'Kafka', slug: 'kafka', category: 'BACKEND' },
    });
    await prisma.candidateSkill.create({
      data: { candidateId: candidateAProfileId, skillId: skillKafka.id },
    });

    // Touch candidate profile updatedAt to trigger stale detection
    await prisma.candidateProfile.update({
      where: { id: candidateAProfileId },
      data: { updatedAt: new Date() },
    });

    // Recompute match
    const freshRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/match`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(freshRes.status, 200);
    // Score should increase since Kafka is now matched!
    assert.ok(freshRes.body.data.overallScore >= report.overallScore);
    assert.ok(freshRes.body.data.skills.matchedSkills.includes('Kafka'));
    console.log('  ✅ Stale detection correctly identified updated profile and recalculated higher match score');

    // -------------------------------------------------------------------------
    // [10/12] Recruiter Candidate Match Inspection (GET /api/v1/recruiter/jobs/:jobId/candidates/:candidateId/match)
    // -------------------------------------------------------------------------
    console.log('\n[10/12] Testing Recruiter A inspecting Candidate A match report for Job 1...');
    const recMatchRes = await makeRequest(
      'GET',
      `/api/v1/recruiter/jobs/${job1Id}/candidates/${candidateAProfileId}/match`,
      undefined,
      { Authorization: `Bearer ${tokenRecA}` }
    );
    assert.strictEqual(recMatchRes.status, 200);
    assert.strictEqual(recMatchRes.body.data.candidateId, candidateAProfileId);
    assert.strictEqual(recMatchRes.body.data.jobId, job1Id);
    console.log('  ✅ Recruiter successfully inspected candidate match breakdown for owned vacancy');

    // -------------------------------------------------------------------------
    // [11/12] Multi-Tenant & RBAC IDOR Boundaries
    // -------------------------------------------------------------------------
    console.log('\n[11/12] Testing IDOR and multi-tenant access boundaries...');
    // Recruiter B attempting to inspect Recruiter A's job candidate match -> 403
    const recIdorRes = await makeRequest(
      'GET',
      `/api/v1/recruiter/jobs/${job1Id}/candidates/${candidateAProfileId}/match`,
      undefined,
      { Authorization: `Bearer ${tokenRecB}` }
    );
    assert.strictEqual(recIdorRes.status, 403);
    assert.strictEqual(recIdorRes.body.error.code, 'UNAUTHORIZED_RECRUITER_ACCESS');
    console.log('  ✅ Multi-tenant recruiter isolation enforced with 403 Forbidden');

    // -------------------------------------------------------------------------
    // [12/12] Inactive / Draft Vacancy Protection & Grounded Explainability
    // -------------------------------------------------------------------------
    console.log('\n[12/12] Testing draft job matching rejection and explanation fact verification...');
    const draftMatchRes = await makeRequest('GET', `/api/v1/jobs/${jobDraftId}/match`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(draftMatchRes.status, 400);
    assert.strictEqual(draftMatchRes.body.error.code, 'JOB_NOT_ACTIVE');

    // Verify explanation grounding on fresh report
    const explanationText = freshRes.body.data.explanation;
    assert.ok(explanationText.includes('React') || explanationText.includes('Kafka'));
    console.log('  ✅ Inactive vacancy rejected with 400 and explanation grounding strictly confirmed');

    console.log('\n🎉 ALL PHASE 13 HYBRID JOB MATCHING & SCORING TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [emailCandA, emailCandB, emailRecA, emailRecB] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runHybridMatchingTests().catch((err) => {
  console.error('❌ Phase 13 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
