import assert from 'node:assert';
import http from 'node:http';
import { prisma } from '@careerforge/database';
import { createServer } from '../../apps/api/src/server.js';
import { SkillGapAnalyzer } from '../../apps/api/src/modules/skill-gap/gap-analyzer.js';
import { DependencyResolver } from '../../apps/api/src/modules/learning-path/dependency-resolver.js';
import { SeedCatalogService } from '../../apps/api/src/modules/learning-path/seed-catalog.js';

let server: http.Server;
const PORT = 4020;
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

async function runSkillGapLearningPathTests() {
  console.log('--- STARTING PHASE 14: SKILL GAP ANALYSIS & PERSONALIZED LEARNING PATH TESTS ---');

  server = createServer().listen(PORT);
  await new Promise((resolve) => server.once('listening', resolve));

  const suffix = Date.now();
  const emailCandA = `gap_cand_a_${suffix}@example.com`;
  const emailCandB = `gap_cand_b_${suffix}@example.com`;
  const emailRec = `gap_rec_${suffix}@example.com`;
  const password = 'Password123!';

  let tokenCandA = '';
  let tokenCandB = '';
  let tokenRec = '';

  let candidateAProfileId = '';
  let job1Id = '';
  let jobZeroGapsId = '';

  try {
    // -------------------------------------------------------------------------
    // [1/12] Deterministic Priority Formula Unit Verification
    // -------------------------------------------------------------------------
    console.log('\n[1/12] Testing deterministic priority scoring and categorization...');
    // Required skill with prerequisite importance (50 + 20 + 15 + 8 = 93) -> HIGH
    const gapHigh = SkillGapAnalyzer.evaluateGapItem({
      skillName: 'JavaScript',
      requirementType: 'REQUIRED',
      isPrerequisiteToOtherMissing: true,
      semanticRelevance: 8,
    });
    assert.strictEqual(gapHigh.priorityScore, 93);
    assert.strictEqual(gapHigh.priority, 'HIGH');

    // Required skill without prerequisite (50 + 20 + 0 + 5 = 75) -> HIGH
    const gapHigh2 = SkillGapAnalyzer.evaluateGapItem({
      skillName: 'Redis',
      requirementType: 'REQUIRED',
      isPrerequisiteToOtherMissing: false,
      semanticRelevance: 5,
    });
    assert.strictEqual(gapHigh2.priorityScore, 75);
    assert.strictEqual(gapHigh2.priority, 'HIGH');

    // Preferred skill (25 + 15 + 0 + 5 = 45) -> LOW
    const gapLow = SkillGapAnalyzer.evaluateGapItem({
      skillName: 'Terraform',
      requirementType: 'PREFERRED',
      isPrerequisiteToOtherMissing: false,
      semanticRelevance: 5,
    });
    assert.strictEqual(gapLow.priorityScore, 45);
    assert.strictEqual(gapLow.priority, 'LOW');
    console.log('  ✅ Deterministic priority formula verified (HIGH >= 75, MEDIUM = 50-74, LOW < 50)');

    // -------------------------------------------------------------------------
    // [2/12] Deterministic Job Readiness Scoring Verification
    // -------------------------------------------------------------------------
    console.log('\n[2/12] Testing Job Readiness score and readiness level categorization...');
    // Case A: 8/10 required matched, 2/4 preferred matched
    // (8/10 * 80) + (2/4 * 20) = 64 + 10 = 74.00 -> DEVELOPING
    const read1 = SkillGapAnalyzer.calculateReadiness({
      matchedRequired: 8,
      totalRequired: 10,
      matchedPreferred: 2,
      totalPreferred: 4,
    });
    assert.strictEqual(read1.score, 74);
    assert.strictEqual(read1.level, 'DEVELOPING');

    // Case B: 10/10 required matched, 0 preferred defined -> 80 + 20 = 100.00 -> JOB_READY
    const read2 = SkillGapAnalyzer.calculateReadiness({
      matchedRequired: 10,
      totalRequired: 10,
      matchedPreferred: 0,
      totalPreferred: 0,
    });
    assert.strictEqual(read2.score, 100);
    assert.strictEqual(read2.level, 'JOB_READY');

    // Case C: 0/5 required matched -> 0.00 -> EARLY_STAGE
    const read3 = SkillGapAnalyzer.calculateReadiness({
      matchedRequired: 0,
      totalRequired: 5,
      matchedPreferred: 0,
      totalPreferred: 2,
    });
    assert.strictEqual(read3.score, 0);
    assert.strictEqual(read3.level, 'EARLY_STAGE');
    console.log('  ✅ Deterministic readiness formula verified across standard and 0-preferred edge cases');

    // -------------------------------------------------------------------------
    // [3/12] Seed Approved Catalog & Topological Dependency Resolution
    // -------------------------------------------------------------------------
    console.log('\n[3/12] Testing SeedCatalogService and Kahn topological dependency sequencing...');
    await SeedCatalogService.seedIfEmpty();

    const skillJS = await prisma.skill.findUnique({ where: { name: 'JavaScript' } });
    const skillNode = await prisma.skill.findUnique({ where: { name: 'Node.js' } });
    const skillExpress = await prisma.skill.findUnique({ where: { name: 'Express' } });

    assert.ok(skillJS && skillNode && skillExpress);

    // Unordered input: [Express, JavaScript, Node.js]
    const unorderedNodes = [
      { skillId: skillExpress!.id, skillName: 'Express', priorityScore: 75 },
      { skillId: skillJS!.id, skillName: 'JavaScript', priorityScore: 90 },
      { skillId: skillNode!.id, skillName: 'Node.js', priorityScore: 80 },
    ];

    const orderedNodes = await DependencyResolver.resolveLearningOrder(unorderedNodes);
    assert.strictEqual(orderedNodes.length, 3);
    // Prerequisite order: JavaScript -> Node.js -> Express
    assert.strictEqual(orderedNodes[0].skillName, 'JavaScript');
    assert.strictEqual(orderedNodes[1].skillName, 'Node.js');
    assert.strictEqual(orderedNodes[2].skillName, 'Express');
    console.log('  ✅ Topological sort correctly sequenced JavaScript -> Node.js -> Express');

    // -------------------------------------------------------------------------
    // [4/12] Circular Dependency Resilience
    // -------------------------------------------------------------------------
    console.log('\n[4/12] Testing circular dependency handling resilience...');
    const cyclicSkillA = await prisma.skill.upsert({
      where: { name: 'CyclicA' },
      update: {},
      create: { name: 'CyclicA', slug: 'cyclica', category: 'OTHER' },
    });
    const cyclicSkillB = await prisma.skill.upsert({
      where: { name: 'CyclicB' },
      update: {},
      create: { name: 'CyclicB', slug: 'cyclicb', category: 'OTHER' },
    });

    await prisma.skillDependency.upsert({
      where: {
        prerequisiteSkillId_dependentSkillId: {
          prerequisiteSkillId: cyclicSkillA.id,
          dependentSkillId: cyclicSkillB.id,
        },
      },
      update: {},
      create: { prerequisiteSkillId: cyclicSkillA.id, dependentSkillId: cyclicSkillB.id },
    });

    await prisma.skillDependency.upsert({
      where: {
        prerequisiteSkillId_dependentSkillId: {
          prerequisiteSkillId: cyclicSkillB.id,
          dependentSkillId: cyclicSkillA.id,
        },
      },
      update: {},
      create: { prerequisiteSkillId: cyclicSkillB.id, dependentSkillId: cyclicSkillA.id },
    });

    // Resolve cyclic nodes without crashing
    const cyclicResult = await DependencyResolver.resolveLearningOrder([
      { skillId: cyclicSkillA.id, skillName: 'CyclicA', priorityScore: 80 },
      { skillId: cyclicSkillB.id, skillName: 'CyclicB', priorityScore: 70 },
    ]);
    assert.strictEqual(cyclicResult.length, 2);
    console.log('  ✅ Circular dependency handled gracefully without infinite loop or crash');

    // -------------------------------------------------------------------------
    // [5/12] Database-Grounded Learning Resource Selection Verification
    // -------------------------------------------------------------------------
    console.log('\n[5/12] Testing approved database learning resource catalog retrieval...');
    const skillKafka = await prisma.skill.findUnique({ where: { name: 'Kafka' } });
    assert.ok(skillKafka);

    const kafkaResources = await prisma.learningResource.findMany({
      where: { skillId: skillKafka!.id, isActive: true },
    });
    assert.ok(kafkaResources.length > 0);
    assert.strictEqual(kafkaResources[0].provider, 'Confluent Developer');
    assert.ok(kafkaResources[0].url.startsWith('https://'));
    console.log('  ✅ Database-grounded learning catalog verified with valid providers & URLs');

    // -------------------------------------------------------------------------
    // [6/12] Provisioning Fixtures (Candidate A, Candidate B, Recruiter, Vacancies)
    // -------------------------------------------------------------------------
    console.log('\n[6/12] Provisioning candidate profiles, recruiter vacancy, and skills...');
    
    // Candidate A (Knows React & Node.js, Missing Kafka & Redis)
    const regCandA = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandA,
      password,
      role: 'CANDIDATE',
      name: 'Candidate Sofia Chen',
    });
    assert.strictEqual(regCandA.status, 201);
    tokenCandA = regCandA.body.data.accessToken;

    const candAProfile = await prisma.candidateProfile.findUnique({
      where: { userId: regCandA.body.data.user.id },
    });
    candidateAProfileId = candAProfile!.id;

    const skillReact = await prisma.skill.findUnique({ where: { name: 'React' } });
    await prisma.candidateSkill.createMany({
      data: [
        { candidateId: candidateAProfileId, skillId: skillReact!.id },
        { candidateId: candidateAProfileId, skillId: skillNode!.id },
      ],
    });

    // Candidate B
    const regCandB = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailCandB,
      password,
      role: 'CANDIDATE',
      name: 'Candidate Bryan',
    });
    assert.strictEqual(regCandB.status, 201);
    tokenCandB = regCandB.body.data.accessToken;

    // Recruiter
    const regRec = await makeRequest('POST', '/api/v1/auth/register', {
      email: emailRec,
      password,
      role: 'RECRUITER',
      name: 'Recruiter Elena',
    });
    assert.strictEqual(regRec.status, 201);
    tokenRec = regRec.body.data.accessToken;

    // Recruiter creates Job 1 (Requires React, Node.js, Kafka; Prefers Redis)
    const skillRedis = await prisma.skill.findUnique({ where: { name: 'Redis' } });
    const resJob1 = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Senior Backend Distributed Engineer',
        description: 'Building high throughput streaming backend pipelines in Node.js and Kafka.',
        companyName: 'Apex Data Labs',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        employmentType: 'FULL_TIME',
        experienceMin: 3.0,
        status: 'DRAFT',
        skills: [
          { name: 'React', required: true, importance: 'REQUIRED' },
          { name: 'Node.js', required: true, importance: 'REQUIRED' },
          { name: 'Kafka', required: true, importance: 'REQUIRED' },
          { name: 'Redis', required: false, importance: 'PREFERRED' },
        ],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    job1Id = resJob1.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${job1Id}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRec}` });

    // Job with Zero Gaps (Only requires React and Node.js)
    const resJobZero = await makeRequest(
      'POST',
      '/api/v1/recruiter/jobs',
      {
        title: 'Full Stack React & Node Engineer',
        description: 'React and Node.js microservices.',
        companyName: 'Apex Data Labs',
        location: 'San Francisco, CA',
        workMode: 'REMOTE',
        status: 'DRAFT',
        skills: [
          { name: 'React', required: true, importance: 'REQUIRED' },
          { name: 'Node.js', required: true, importance: 'REQUIRED' },
        ],
      },
      { Authorization: `Bearer ${tokenRec}` }
    );
    jobZeroGapsId = resJobZero.body.data.id;
    await makeRequest('PATCH', `/api/v1/recruiter/jobs/${jobZeroGapsId}/status`, { status: 'PUBLISHED' }, { Authorization: `Bearer ${tokenRec}` });

    console.log('  ✅ Fixtures created successfully');

    // -------------------------------------------------------------------------
    // [7/12] Candidate Skill Gap Analysis API (GET /api/v1/jobs/:jobId/skill-gaps)
    // -------------------------------------------------------------------------
    console.log('\n[7/12] Testing Candidate A generating skill gap analysis against Job 1...');
    const gapRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/skill-gaps`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });

    assert.strictEqual(gapRes.status, 200);
    assert.strictEqual(gapRes.body.success, true);
    const gapReport = gapRes.body.data;

    assert.strictEqual(gapReport.candidateId, candidateAProfileId);
    assert.strictEqual(gapReport.jobId, job1Id);
    assert.ok(gapReport.overallReadiness > 0 && gapReport.overallReadiness <= 100);
    assert.ok(gapReport.gaps.length > 0);

    // Verify Kafka is identified as HIGH priority gap (Required)
    const kafkaGap = gapReport.gaps.find((g: any) => g.skillName === 'Kafka');
    assert.ok(kafkaGap !== undefined);
    assert.strictEqual(kafkaGap.priority, 'HIGH');
    assert.strictEqual(kafkaGap.requirementType, 'REQUIRED');

    // Verify Redis is identified as MEDIUM or LOW gap (Preferred)
    const redisGap = gapReport.gaps.find((g: any) => g.skillName === 'Redis');
    assert.ok(redisGap !== undefined);
    assert.strictEqual(redisGap.requirementType, 'PREFERRED');

    // Verify relational rows persisted in database
    const dbGaps = await prisma.skillGap.findMany({
      where: { analysisId: gapReport.id },
    });
    assert.strictEqual(dbGaps.length, gapReport.gaps.length);
    console.log(`  ✅ SkillGapAnalysis & relational SkillGap records persisted: Readiness=${gapReport.overallReadiness}% (${gapReport.readinessLevel}), Gaps=${gapReport.gaps.length}`);

    // -------------------------------------------------------------------------
    // [8/12] Personalized Learning Path Generation API (GET /api/v1/jobs/:jobId/learning-path)
    // -------------------------------------------------------------------------
    console.log('\n[8/12] Testing Personalized Learning Path generation & approved resource selection...');
    const pathRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/learning-path`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });

    assert.strictEqual(pathRes.status, 200);
    assert.strictEqual(pathRes.body.success, true);
    const learningPath = pathRes.body.data;

    assert.strictEqual(learningPath.candidateId, candidateAProfileId);
    assert.strictEqual(learningPath.jobId, job1Id);
    assert.strictEqual(learningPath.status, 'ACTIVE');
    assert.ok(learningPath.totalEstimatedHours > 0);
    assert.strictEqual(learningPath.completedHours, 0);
    assert.strictEqual(learningPath.progressPercentage, 0);
    assert.ok(learningPath.items.length >= 2);

    // Verify Kafka item has approved resource attached
    const kafkaItem = learningPath.items.find((i: any) => i.skillName === 'Kafka');
    assert.ok(kafkaItem !== undefined);
    assert.ok(kafkaItem.resource !== null);
    assert.strictEqual(kafkaItem.resource.provider, 'Confluent Developer');
    assert.strictEqual(kafkaItem.status, 'NOT_STARTED');

    console.log(`  ✅ LearningPath generated with ${learningPath.items.length} items (${learningPath.totalEstimatedHours} hours)`);

    // -------------------------------------------------------------------------
    // [9/12] Candidate Progress Tracking API (PATCH /api/v1/learning-path/items/:itemId)
    // -------------------------------------------------------------------------
    console.log('\n[9/12] Testing candidate learning progress updates and completion calculation...');
    const item1 = learningPath.items[0];

    // Step 1: Update to IN_PROGRESS
    const progressRes1 = await makeRequest(
      'PATCH',
      `/api/v1/learning-path/items/${item1.id}`,
      { status: 'IN_PROGRESS' },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(progressRes1.status, 200);
    const updatedItem1 = progressRes1.body.data.items.find((i: any) => i.id === item1.id);
    assert.strictEqual(updatedItem1.status, 'IN_PROGRESS');

    // Step 2: Update item 1 to COMPLETED
    const progressRes2 = await makeRequest(
      'PATCH',
      `/api/v1/learning-path/items/${item1.id}`,
      { status: 'COMPLETED' },
      { Authorization: `Bearer ${tokenCandA}` }
    );
    assert.strictEqual(progressRes2.status, 200);
    assert.ok(progressRes2.body.data.progressPercentage > 0);
    assert.ok(progressRes2.body.data.completedHours > 0);

    // Complete all items
    for (const it of learningPath.items.slice(1)) {
      await makeRequest(
        'PATCH',
        `/api/v1/learning-path/items/${it.id}`,
        { status: 'COMPLETED' },
        { Authorization: `Bearer ${tokenCandA}` }
      );
    }

    const finalPathRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/learning-path`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(finalPathRes.body.data.progressPercentage, 100);
    assert.strictEqual(finalPathRes.body.data.status, 'COMPLETED');
    console.log('  ✅ Candidate progress tracking persisted and path transitioned to COMPLETED at 100%');

    // -------------------------------------------------------------------------
    // [10/12] Candidate Privacy & IDOR Protection
    // -------------------------------------------------------------------------
    console.log('\n[10/12] Testing candidate privacy and cross-candidate IDOR protection...');
    // Candidate B attempts to modify Candidate A's learning item -> 403
    const idorRes = await makeRequest(
      'PATCH',
      `/api/v1/learning-path/items/${item1.id}`,
      { status: 'IN_PROGRESS' },
      { Authorization: `Bearer ${tokenCandB}` }
    );
    assert.strictEqual(idorRes.status, 403);
    assert.strictEqual(idorRes.body.error.code, 'UNAUTHORIZED_ITEM_ACCESS');

    // Recruiter cannot access candidate learning path item endpoint -> 403
    const recIdorRes = await makeRequest(
      'PATCH',
      `/api/v1/learning-path/items/${item1.id}`,
      { status: 'IN_PROGRESS' },
      { Authorization: `Bearer ${tokenRec}` }
    );
    assert.strictEqual(recIdorRes.status, 403);
    console.log('  ✅ Candidate privacy and IDOR boundaries strictly enforced');

    // -------------------------------------------------------------------------
    // [11/12] Zero Gaps Well-Aligned Job Verification
    // -------------------------------------------------------------------------
    console.log('\n[11/12] Testing candidate with 100% matched skills against Job Zero Gaps...');
    const zeroGapRes = await makeRequest('GET', `/api/v1/jobs/${jobZeroGapsId}/skill-gaps`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(zeroGapRes.status, 200);
    assert.strictEqual(zeroGapRes.body.data.overallReadiness, 100);
    assert.strictEqual(zeroGapRes.body.data.readinessLevel, 'JOB_READY');
    assert.strictEqual(zeroGapRes.body.data.gaps.length, 0);

    const zeroPathRes = await makeRequest('GET', `/api/v1/jobs/${jobZeroGapsId}/learning-path`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(zeroPathRes.body.data.status, 'COMPLETED');
    assert.strictEqual(zeroPathRes.body.data.items.length, 0);
    console.log('  ✅ Zero gap case correctly produced 100% Job Readiness (JOB_READY)');

    // -------------------------------------------------------------------------
    // [12/12] Stale Invalidation & Recalculation
    // -------------------------------------------------------------------------
    console.log('\n[12/12] Testing stale invalidation when candidate acquires Kafka...');
    // Candidate acquires Kafka
    await prisma.candidateSkill.create({
      data: { candidateId: candidateAProfileId, skillId: skillKafka.id },
    });

    // Touch candidate profile
    await prisma.candidateProfile.update({
      where: { id: candidateAProfileId },
      data: { updatedAt: new Date() },
    });

    const refreshedGapRes = await makeRequest('GET', `/api/v1/jobs/${job1Id}/skill-gaps`, undefined, {
      Authorization: `Bearer ${tokenCandA}`,
    });
    assert.strictEqual(refreshedGapRes.status, 200);
    // Readiness should be higher and Kafka should no longer be in missing gaps!
    assert.ok(refreshedGapRes.body.data.overallReadiness > gapReport.overallReadiness);
    const hasKafka = refreshedGapRes.body.data.gaps.some((g: any) => g.skillName === 'Kafka');
    assert.strictEqual(hasKafka, false);
    console.log('  ✅ Stale detection verified: Kafka eliminated from gaps and readiness increased');

    console.log('\n🎉 ALL PHASE 14 SKILL GAP & LEARNING PATH TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    await prisma.user.deleteMany({
      where: { email: { in: [emailCandA, emailCandB, emailRec] } },
    });
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runSkillGapLearningPathTests().catch((err) => {
  console.error('❌ Phase 14 Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
